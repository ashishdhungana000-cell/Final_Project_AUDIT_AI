import { parseFile } from './src/modules/parser.js';
import { runAIAudit } from './src/modules/auditEngine.js';
import { updateDashboard } from './src/modules/dashboard.js';
import { getAIResponse, generateReportContent } from './src/modules/chatEngine.js';
import { generatePDF, generateReportPDF } from './src/modules/pdfGenerator.js';
import Chart from 'chart.js/auto';

let auditData = null;
let auditStats = null;
let flaggedItems = null;
let currentFilename = 'Unknown File';

// Initialize Lucide Icons
window.lucide.createIcons();

// Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard-section');
const flaggedTableBody = document.getElementById('flagged-table-body');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const chatMessages = document.getElementById('chat-messages');
const exportPdfBtn = document.getElementById('export-pdf');
const clearDataBtn = document.getElementById('clear-data-btn');
const chatInterface = document.getElementById('chat-interface');
const chatToggle = document.getElementById('chat-toggle');
const closeChatBtn = document.getElementById('close-chat');
const flaggedCountBadge = document.getElementById('flagged-count-badge');
const flaggedSection = document.getElementById('flagged-section');
const flaggedCardsContainer = document.getElementById('flagged-cards-container');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const filterBtns = document.querySelectorAll('.btn-filter');
const reportsSection = document.getElementById('reports-section');
const downloadReportBtn = document.getElementById('download-report-pdf');
const uploadIdle = document.getElementById('upload-idle');
const uploadLoading = document.getElementById('upload-loading');
const toastContainer = document.getElementById('toast-container');

// Detailed Analysis & Settings selectors
const analysisSection = document.getElementById('analysis-section');
const settingsSection = document.getElementById('settings-section');
const analysisSearch = document.getElementById('analysis-search');
const analysisCategoryFilter = document.getElementById('analysis-category-filter');
const analysisTableBody = document.getElementById('analysis-table-body');
const analysisEmpty = document.getElementById('analysis-empty');
const settingsClearBtn = document.getElementById('settings-clear-btn');

// Filter panel selectors
const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');
const filterCategory = document.getElementById('filter-category');
const filterRiskLevel = document.getElementById('filter-risk-level');

// Detailed charts instances
let detailedCategoryChartInstance = null;
let detailedTimelineChartInstance = null;

// Table sort state
let analysisSortColumn = 'Date';
let analysisSortDirection = 'desc';

// Navigation Logic
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const section = item.getAttribute('data-section');
    if (!section) return;
    
    e.preventDefault();
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    // Hide all sections
    dashboardSection.classList.add('hidden');
    uploadSection.classList.add('hidden');
    flaggedSection.classList.add('hidden');
    reportsSection.classList.add('hidden');
    analysisSection.classList.add('hidden');
    settingsSection.classList.add('hidden');

    if (section === 'overview') {
      pageTitle.textContent = 'Audit Overview';
      pageSubtitle.textContent = 'Real-time financial anomaly detection and risk assessment.';
      if (auditData) {
        dashboardSection.classList.remove('hidden');
      } else {
        uploadSection.classList.remove('hidden');
      }
    } else if (section === 'flagged') {
      flaggedSection.classList.remove('hidden');
      pageTitle.textContent = 'Flagged Transactions';
      pageSubtitle.textContent = 'Detailed breakdown of high-risk anomalies detected.';
      updateTabViewState('flagged');
      if (auditData) renderFlaggedCards();
    } else if (section === 'analysis') {
      analysisSection.classList.remove('hidden');
      pageTitle.textContent = 'Detailed Analysis';
      pageSubtitle.textContent = 'Full interactive table of transactions with search and filter controls.';
      updateTabViewState('analysis');
      if (auditData) renderDetailedAnalysis();
    } else if (section === 'settings') {
      settingsSection.classList.remove('hidden');
      pageTitle.textContent = 'Settings';
      pageSubtitle.textContent = 'Configure standard audit anomaly limits and reset local storage caches.';
    } else if (section === 'reports') {
      reportsSection.classList.remove('hidden');
      pageTitle.textContent = 'Audit Reports';
      pageSubtitle.textContent = 'Professional documentation of audit findings and recommendations.';
      updateTabViewState('reports');
      renderHistorySidebar();
      if (auditData) renderReport();
    }
  });
});

function updateTabViewState(section) {
  if (section === 'flagged') {
    const activeEl = document.getElementById('active-flagged-view');
    const emptyEl = document.getElementById('empty-flagged-view');
    if (activeEl && emptyEl) {
      if (auditData) {
        activeEl.classList.remove('hidden');
        emptyEl.classList.add('hidden');
      } else {
        activeEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      }
    }
  } else if (section === 'analysis') {
    const activeEl = document.getElementById('active-analysis-view');
    const emptyEl = document.getElementById('empty-analysis-view');
    if (activeEl && emptyEl) {
      if (auditData) {
        activeEl.classList.remove('hidden');
        emptyEl.classList.add('hidden');
      } else {
        activeEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      }
    }
  } else if (section === 'reports') {
    updateReportsTabViewState();
  }
}

// Filter Logic
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderFlaggedCards(btn.getAttribute('data-filter'));
  });
});

// Chat Toggle Logic
chatToggle.addEventListener('click', () => {
  chatInterface.classList.add('open');
});

closeChatBtn.addEventListener('click', () => {
  chatInterface.classList.remove('open');
});

// File Upload Logic
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('active');
  dropzone.style.borderColor = 'var(--primary)';
  dropzone.style.background = 'rgba(16, 185, 129, 0.05)';
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('active');
  dropzone.style.borderColor = 'var(--border)';
  dropzone.style.background = 'transparent';
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('active');
  dropzone.style.borderColor = 'var(--border)';
  dropzone.style.background = 'transparent';
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

const sampleTransactions = [
  { Date: '2024-01-05', Description: 'Office Supplies', Amount: 245.00, Category: null },
  { Date: '2024-01-05', Description: 'Office Supplies', Amount: 245.00, Category: null },
  { Date: '2024-01-08', Description: 'Client Dinner', Amount: 5000.00, Category: null },
  { Date: '2024-01-10', Description: 'Software License', Amount: 99.99, Category: null },
  { Date: '2024-01-12', Description: 'Unknown Vendor', Amount: 1000.00, Category: null },
  { Date: '2024-01-15', Description: 'Travel Expense', Amount: 380.50, Category: null },
  { Date: '2024-01-15', Description: 'Travel Expense', Amount: 380.50, Category: null },
  { Date: '2024-01-18', Description: 'Marketing Agency', Amount: 4500.00, Category: null },
  { Date: '2024-01-20', Description: 'Utilities', Amount: 210.00, Category: null },
  { Date: '2024-01-22', Description: 'Unknown Transfer', Amount: 3000.00, Category: null }
];

async function handleSampleData() {
  currentFilename = 'Sample_Transactions.csv';
  uploadIdle.classList.add('hidden');
  uploadLoading.style.display = 'flex';
  const heroVisual = document.querySelector('.hero-image-wrapper');
  if (heroVisual) heroVisual.classList.add('hidden');

  updatePipelineStep(1, 'pending');
  updatePipelineStep(2, 'pending');
  updatePipelineStep(3, 'pending');
  updatePipelineStep(4, 'pending');
  updateProgressBar(0);
  window.lucide.createIcons();

  try {
    // STEP 1 — Reading file and extracting transactions
    updatePipelineStep(1, 'active');
    updateProgressBar(0);
    window.lucide.createIcons();

    // Call AI analysis
    const aiResponse = await runAIAudit(sampleTransactions);

    await new Promise(resolve => setTimeout(resolve, 1000));
    updatePipelineStep(1, 'completed');
    updateProgressBar(25);
    window.lucide.createIcons();

    // STEP 2 — Classifying transaction categories
    updatePipelineStep(2, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1200));

    updatePipelineStep(2, 'completed');
    updateProgressBar(50);
    window.lucide.createIcons();

    // STEP 3 — Detecting anomalies and risk patterns
    updatePipelineStep(3, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1200));

    updatePipelineStep(3, 'completed');
    updateProgressBar(75);
    window.lucide.createIcons();

    // STEP 4 — Generating audit report and recommendations
    updatePipelineStep(4, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1000));

    updatePipelineStep(4, 'completed');
    updateProgressBar(100);
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Save AI response to sessionStorage
    sessionStorage.setItem('active_audit_analysis', JSON.stringify(aiResponse));
    sessionStorage.setItem('active_audit_filename', currentFilename);

    // Populate data model
    auditData = aiResponse.transactions;
    auditData.forEach(t => {
      t._riskScore = t.riskScore;
      t._highestLevel = t.riskLevel.charAt(0).toUpperCase() + t.riskLevel.slice(1).toLowerCase();
      if (t.flagReason) {
        t._flags = [{ reason: t.flagReason, level: t._highestLevel }];
      } else {
        t._flags = [];
      }
    });

    auditStats = {
      total: aiResponse.summary.totalTransactions,
      flagged: aiResponse.summary.flaggedCount,
      riskScore: aiResponse.summary.overallRiskScore.toFixed(1),
      totalAmount: aiResponse.summary.totalAmount.toFixed(2),
      averageAmount: (aiResponse.summary.totalAmount / aiResponse.summary.totalTransactions || 0).toFixed(2),
      highestAmount: Math.max(...aiResponse.transactions.map(t => t.Amount || 0)).toFixed(2),
      integrity: 100,
      categories: {}
    };

    // Calculate category counts
    aiResponse.transactions.forEach(t => {
      const cat = t.Category || 'Unknown';
      auditStats.categories[cat] = (auditStats.categories[cat] || 0) + 1;
    });

    flaggedItems = auditData.filter(t => t.flagReason !== null);

    displayResults();

  } catch (error) {
    console.error('Audit Error:', error);
    uploadIdle.classList.remove('hidden');
    uploadLoading.style.display = 'none';
    const heroVisual = document.querySelector('.hero-image-wrapper');
    if (heroVisual) heroVisual.classList.remove('hidden');
    showToast('Analysis failed — please try again', true);
  }
}

const btnSampleData = document.getElementById('btn-sample-data');
if (btnSampleData) {
  btnSampleData.addEventListener('click', () => handleSampleData());
}

function updatePipelineStep(stepIndex, status) {
  const stepEl = document.getElementById(`pipeline-step-${stepIndex}`);
  const numEl = document.getElementById(`step-num-${stepIndex}`);
  const spinnerEl = document.getElementById(`step-spinner-${stepIndex}`);
  const checkEl = document.getElementById(`step-check-${stepIndex}`);
  const textEl = document.getElementById(`step-text-${stepIndex}`);

  if (!stepEl || !numEl || !spinnerEl || !checkEl || !textEl) return;

  stepEl.classList.remove('active', 'completed');
  numEl.classList.add('hidden');
  spinnerEl.classList.add('hidden');
  checkEl.classList.add('hidden');

  // Default step styling
  stepEl.style.borderColor = 'var(--border)';
  stepEl.style.background = 'rgba(255, 255, 255, 0.02)';
  
  // Default text styling
  textEl.style.color = 'var(--text-muted)';
  textEl.style.fontWeight = 'normal';
  textEl.style.textDecoration = 'none';

  if (status === 'active') {
    stepEl.classList.add('active');
    spinnerEl.classList.remove('hidden');
    stepEl.style.borderColor = 'var(--primary)';
    stepEl.style.background = 'rgba(16, 185, 129, 0.04)';

    // Active text styling: white and bold
    textEl.style.color = '#ffffff';
    textEl.style.fontWeight = '700';
  } else if (status === 'completed') {
    stepEl.classList.add('completed');
    checkEl.classList.remove('hidden');
    stepEl.style.borderColor = 'rgba(255, 255, 255, 0.08)';

    // Completed text styling: gray with strikethrough
    textEl.style.color = 'var(--text-muted)';
    textEl.style.textDecoration = 'line-through';
  } else {
    numEl.classList.remove('hidden');
  }
}

function updateProgressBar(percentage) {
  const bar = document.getElementById('pipeline-progress-bar');
  const text = document.getElementById('pipeline-percentage');
  if (bar) bar.style.width = `${percentage}%`;
  if (text) text.textContent = `${percentage}% Completed`;
}

function extractColumns(rawData) {
  return rawData.map(row => {
    let date = '';
    let description = '';
    let amount = 0;
    let category = null;

    const keys = Object.keys(row);
    
    // Date
    const dateKey = keys.find(k => /date/i.test(k));
    if (dateKey) date = String(row[dateKey] || '').trim();

    // Description or Name
    const descKey = keys.find(k => /desc/i.test(k) || /name/i.test(k));
    if (descKey) description = String(row[descKey] || '').trim();

    // Amount
    const amountKey = keys.find(k => /amount/i.test(k) || /val/i.test(k) || /price/i.test(k) || /sum/i.test(k));
    if (amountKey) {
      const val = row[amountKey];
      if (typeof val === 'number') {
        amount = val;
      } else if (val) {
        amount = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
      }
    }

    // Category
    const catKey = keys.find(k => /cat/i.test(k) || /type/i.test(k));
    if (catKey) category = String(row[catKey] || '').trim() || null;

    return {
      Date: date,
      Description: description,
      Amount: amount,
      Category: category
    };
  });
}

async function handleFile(file) {
  // Validate file extension
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension !== 'csv' && extension !== 'xlsx' && extension !== 'xls') {
    showToast('Error: Only CSV or Excel (.xlsx, .xls) files are supported.', true);
    return;
  }

  // Warning if file size exceeds 5MB
  if (file.size > 5 * 1024 * 1024) {
    showToast('Warning: Large file detected (> 5MB). Processing may take longer.', false);
  }

  currentFilename = file.name;
  uploadIdle.classList.add('hidden');
  uploadLoading.style.display = 'flex';
  const heroVisual = document.querySelector('.hero-image-wrapper');
  if (heroVisual) heroVisual.classList.add('hidden');

  updatePipelineStep(1, 'pending');
  updatePipelineStep(2, 'pending');
  updatePipelineStep(3, 'pending');
  updatePipelineStep(4, 'pending');
  updateProgressBar(0);
  window.lucide.createIcons();

  try {
    // Stage 1: Parse and execute backend calculations
    const rawData = await parseFile(file);
    const data = extractColumns(rawData);

    // STEP 1 — Reading file and extracting transactions
    updatePipelineStep(1, 'active');
    updateProgressBar(0);
    window.lucide.createIcons();

    // Call AI analysis
    const aiResponse = await runAIAudit(data);

    await new Promise(resolve => setTimeout(resolve, 1000));
    updatePipelineStep(1, 'completed');
    updateProgressBar(25);
    window.lucide.createIcons();

    // STEP 2 — Classifying transaction categories
    updatePipelineStep(2, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1200));

    updatePipelineStep(2, 'completed');
    updateProgressBar(50);
    window.lucide.createIcons();

    // STEP 3 — Detecting anomalies and risk patterns
    updatePipelineStep(3, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1200));

    updatePipelineStep(3, 'completed');
    updateProgressBar(75);
    window.lucide.createIcons();

    // STEP 4 — Generating audit report and recommendations
    updatePipelineStep(4, 'active');
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 1000));

    updatePipelineStep(4, 'completed');
    updateProgressBar(100);
    window.lucide.createIcons();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Save AI response to sessionStorage
    sessionStorage.setItem('active_audit_analysis', JSON.stringify(aiResponse));
    sessionStorage.setItem('active_audit_filename', currentFilename);

    // Populate data model
    auditData = aiResponse.transactions;
    auditData.forEach(t => {
      t._riskScore = t.riskScore;
      t._highestLevel = t.riskLevel.charAt(0).toUpperCase() + t.riskLevel.slice(1).toLowerCase();
      if (t.flagReason) {
        t._flags = [{ reason: t.flagReason, level: t._highestLevel }];
      } else {
        t._flags = [];
      }
    });

    auditStats = {
      total: aiResponse.summary.totalTransactions,
      flagged: aiResponse.summary.flaggedCount,
      riskScore: aiResponse.summary.overallRiskScore.toFixed(1),
      totalAmount: aiResponse.summary.totalAmount.toFixed(2),
      averageAmount: (aiResponse.summary.totalAmount / aiResponse.summary.totalTransactions || 0).toFixed(2),
      highestAmount: Math.max(...aiResponse.transactions.map(t => t.Amount || 0)).toFixed(2),
      integrity: 100,
      categories: {}
    };

    // Calculate category counts
    aiResponse.transactions.forEach(t => {
      const cat = t.Category || 'Unknown';
      auditStats.categories[cat] = (auditStats.categories[cat] || 0) + 1;
    });

    flaggedItems = auditData.filter(t => t.flagReason !== null);

    displayResults();

  } catch (error) {
    console.error('File Analysis Error:', error);
    uploadIdle.classList.remove('hidden');
    uploadLoading.style.display = 'none';
    const heroVisual = document.querySelector('.hero-image-wrapper');
    if (heroVisual) heroVisual.classList.remove('hidden');
    if (fileInput) fileInput.value = '';
    showToast('Analysis failed — please try again', true);
  }
}

function displayResults() {
  uploadSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  
  // Update Badge
  if (auditStats.flagged > 0) {
    flaggedCountBadge.textContent = auditStats.flagged;
    flaggedCountBadge.style.display = 'inline-block';
  } else {
    flaggedCountBadge.style.display = 'none';
  }

  updateDashboard(auditStats, auditData);
  renderTopSuspiciousTable();
  renderActionPlan();

  // Show Chat toggle
  if (chatToggle) chatToggle.classList.remove('hidden');

  // Show Clear Data button
  if (clearDataBtn) clearDataBtn.style.display = 'flex';

  // Save audit results to localStorage history log
  saveAuditToHistory(currentFilename, auditData, auditStats, flaggedItems);

  showToast(`Audit complete! ${auditStats.total} transactions analyzed.`);
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  if (isError) {
    toast.style.background = 'var(--danger)';
    toast.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.4)';
  } else if (message.toLowerCase().includes('warning')) {
    toast.style.background = 'var(--warning)';
    toast.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.4)';
  }
  
  const icon = isError ? 'alert-triangle' : (message.toLowerCase().includes('warning') ? 'alert-circle' : 'check-circle');
  
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  window.lucide.createIcons();

  const duration = message.includes('Analysis cleared') ? 3000 : 4000;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function renderFlaggedCards(filter = 'all') {
  flaggedCardsContainer.innerHTML = '';
  
  const filtered = filter === 'all' 
    ? flaggedItems 
    : flaggedItems.filter(item => item._highestLevel === filter);

  if (filtered.length === 0) {
    flaggedCardsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No flagged items found for this filter.</div>';
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'flagged-card';
    
    const badgeClass = item._highestLevel === 'High' ? 'badge-danger' : 
                       item._highestLevel === 'Medium' ? 'badge-warning' : 'badge-success';

    card.innerHTML = `
      <div class="flagged-card-header">
        <div class="warning-icon"><i data-lucide="alert-circle"></i></div>
        <span class="badge ${badgeClass}">${item._highestLevel}</span>
      </div>
      <div>
        <div class="flagged-desc">${item.Description || 'N/A'}</div>
        <div class="flagged-date">${item.Date || 'N/A'}</div>
      </div>
      <div class="flagged-amount">$${parseFloat(item.Amount || 0).toLocaleString()}</div>
      <div class="flagged-reason">
        <strong>Detected Pattern:</strong><br>
        ${item._flags.map(f => f.reason).join(', ')}
      </div>
    `;
    flaggedCardsContainer.appendChild(card);
  });
  window.lucide.createIcons();
}

async function renderReport() {
  if (!auditData) return;

  const { summary, recommendations } = await generateReportContent(auditStats, flaggedItems, currentFilename);

  // Update Summary
  document.getElementById('executive-summary').textContent = summary;
  document.getElementById('report-date').textContent = `Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  // Update Section 2: Key Metrics Table
  const metricsTableBody = document.getElementById('report-metrics-table-body');
  if (metricsTableBody) {
    metricsTableBody.innerHTML = `
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Total Transactions</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600;">${auditStats.total}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Total Amount</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600;">$${parseFloat(auditStats.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Average Transaction</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600;">$${parseFloat(auditStats.averageAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Highest Transaction</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600;">$${parseFloat(auditStats.highestAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Flagged Items</td>
        <td style="padding: 0.75rem 1rem; font-weight: 600; color: ${auditStats.flagged > 0 ? 'var(--danger)' : 'inherit'};">${auditStats.flagged}</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem 1rem; font-weight: 500;">Overall Risk Score</td>
        <td style="padding: 0.75rem 1rem; font-weight: 700; color: ${parseFloat(auditStats.riskScore) > 70 ? 'var(--danger)' : (parseFloat(auditStats.riskScore) >= 30 ? 'var(--warning)' : 'var(--primary)')};">
          ${auditStats.riskScore}% (${parseFloat(auditStats.riskScore) > 70 ? 'High Risk' : (parseFloat(auditStats.riskScore) >= 30 ? 'Medium Risk' : 'Low Risk')})
        </td>
      </tr>
    `;
  }

  // Update Section 3: Flagged Transactions (High and Medium only)
  const findingsTable = document.getElementById('report-findings-table');
  findingsTable.innerHTML = '';
  
  const highMedItems = flaggedItems ? flaggedItems.filter(item => item._highestLevel === 'High' || item._highestLevel === 'Medium') : [];
  
  if (highMedItems.length === 0) {
    findingsTable.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No High or Medium risk transactions detected.
        </td>
      </tr>
    `;
  } else {
    highMedItems.forEach(item => {
      const tr = document.createElement('tr');
      const reasons = item._flags ? item._flags.map(f => f.reason).join(', ') : 'N/A';
      const badgeClass = item._highestLevel === 'High' ? 'badge-danger' : 'badge-warning';
      
      tr.innerHTML = `
        <td style="padding: 0.75rem 1rem;">${item.Date || 'N/A'}</td>
        <td style="padding: 0.75rem 1rem;">${item.Description || 'N/A'}</td>
        <td class="amount-cell" style="padding: 0.75rem 1rem;">$${parseFloat(item.Amount || 0).toLocaleString()}</td>
        <td style="padding: 0.75rem 1rem;"><span class="badge ${badgeClass}">${item._highestLevel}</span></td>
        <td class="reason-cell" style="padding: 0.75rem 1rem; font-size: 0.85rem;">${reasons}</td>
      `;
      findingsTable.appendChild(tr);
    });
  }

  // Update Section 4: AI Recommendations
  const recList = document.getElementById('ai-recommendations');
  recList.innerHTML = '';
  recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.style.marginBottom = '0.5rem';
    li.innerHTML = rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    recList.appendChild(li);
  });
  
  window.lucide.createIcons();
}

downloadReportBtn.addEventListener('click', async () => {
  showToast('Generating your professional PDF report... 📄');
  try {
    await generatePDF(auditStats, flaggedItems, currentFilename);
    showToast('Report downloaded successfully!');
  } catch (err) {
    console.error(err);
    showToast('Failed to export PDF report.', true);
  }
});

function renderTopSuspiciousTable() {
  const tableBody = document.getElementById('top-suspicious-table');
  tableBody.innerHTML = '';
  
  // Sort flagged items: High > Medium > Low
  const sorted = [...flaggedItems].sort((a, b) => {
    const levels = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return levels[b._highestLevel] - levels[a._highestLevel];
  }).slice(0, 5);

  sorted.forEach(item => {
    const tr = document.createElement('tr');
    const reasons = item._flags.map(f => f.reason).join(', ');
    const badgeClass = item._highestLevel === 'High' ? 'badge-danger' : 
                       item._highestLevel === 'Medium' ? 'badge-warning' : 'badge-success';

    tr.innerHTML = `
      <td>${item.Date || item.date || 'N/A'}</td>
      <td>${item.Description || item.description || 'N/A'}</td>
      <td class="amount-cell">$${parseFloat(item.Amount || item.amount || 0).toLocaleString()}</td>
      <td><span class="badge ${badgeClass}">${item._highestLevel}</span></td>
      <td class="reason-cell">${reasons}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Chat Logic
function formatChatMessage(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function addMessage(text, isAi = false) {
  const div = document.createElement('div');
  div.className = `message ${isAi ? 'message-ai' : 'message-user'}`;
  div.innerHTML = formatChatMessage(text);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

let chatMessageTimestamps = [];

sendChatBtn.addEventListener('click', async () => {
  const query = chatInput.value.trim();
  if (!query) return;

  // Rate Limiter: Max 5 messages per minute (60,000 ms)
  const now = Date.now();
  chatMessageTimestamps = chatMessageTimestamps.filter(t => now - t < 60000);
  if (chatMessageTimestamps.length >= 5) {
    addMessage('Please wait before sending another message.', true);
    return;
  }
  chatMessageTimestamps.push(now);

  addMessage(query, false);
  chatInput.value = '';

  showTypingIndicator();
  
  try {
    const response = await getAIResponse(query, auditStats, flaggedItems);
    removeTypingIndicator();
    addMessage(response, true);
  } catch (error) {
    removeTypingIndicator();
    addMessage("Analysis failed — please try again", true);
  }
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatBtn.click();
});

// Quick Reply Suggestion Buttons
const chatSuggests = document.querySelectorAll('.btn-chat-suggest');
chatSuggests.forEach(btn => {
  btn.addEventListener('click', () => {
    const query = btn.getAttribute('data-query');
    if (query) {
      chatInput.value = query;
      sendChatBtn.click();
    }
  });
});

// PDF Export
exportPdfBtn.addEventListener('click', async () => {
  if (!auditData) {
    showToast('Please upload and analyze a file first before exporting', true);
    return;
  }
  showToast('Generating your professional PDF report... 📄');
  try {
    await generatePDF(auditStats, flaggedItems, currentFilename);
    showToast('Report downloaded successfully!');
  } catch (err) {
    console.error(err);
    showToast('Failed to export PDF report.', true);
  }
});

function resetUpload() {
  uploadSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  uploadIdle.classList.remove('hidden');
  uploadLoading.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ==========================================
// AUDIT HISTORY LIFE-CYCLE LOGIC
// ==========================================

function saveAuditToHistory(filename, data, stats, flags) {
  try {
    const history = JSON.parse(localStorage.getItem('audit_history') || '[]');
    
    // Auto-generate summaries of the top 3 findings
    const topFindings = flags.slice(0, 3).map(f => {
      const reason = f._flags && f._flags[0] ? f._flags[0].reason : 'Flagged Anomaly';
      return `${f.Description || f.description || 'Transaction'} ($${parseFloat(f.Amount || f.amount || 0).toLocaleString()}): ${reason}`;
    });

    const newEntry = {
      id: 'audit_' + Date.now(),
      filename: filename,
      timestamp: new Date().toISOString(),
      totalTx: stats.total,
      flaggedTx: stats.flagged,
      riskScore: stats.riskScore,
      topFindings: topFindings,
      auditData: data,
      auditStats: stats,
      flaggedItems: flags
    };

    history.unshift(newEntry); // Newest first
    
    // Save to localStorage
    localStorage.setItem('audit_history', JSON.stringify(history));
    renderHistorySidebar();
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    showToast('Warning: Audit completed but history could not be saved (storage quota full). ⚠️');
  }
}

function renderHistorySidebar() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  historyList.innerHTML = '';
  
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('audit_history') || '[]');
  } catch (e) {
    console.error('Failed to parse audit history:', e);
  }

  if (history.length === 0) {
    historyList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem;">
        No past audits recorded.
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const card = document.createElement('div');
    
    const score = parseFloat(item.riskScore || 0);
    let riskClass = 'risk-low';
    if (score > 70) riskClass = 'risk-high';
    else if (score >= 30) riskClass = 'risk-medium';

    const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const findingsLi = item.topFindings && item.topFindings.length > 0
      ? item.topFindings.map(f => `<li>${f}</li>`).join('')
      : '<li>No anomalies detected</li>';

    card.className = `history-card ${riskClass}`;
    card.innerHTML = `
      <div class="history-card-header">
        <div>
          <div class="history-card-filename" title="${item.filename}">${item.filename}</div>
          <div class="history-card-date">${dateStr}</div>
        </div>
        <span class="badge ${score > 70 ? 'badge-danger' : score >= 30 ? 'badge-warning' : 'badge-success'}">${score}% Risk</span>
      </div>
      <div class="history-card-stats">
        <span><i data-lucide="database" style="width: 12px; height: 12px;"></i> ${item.totalTx} Tx</span>
        <span style="color: ${item.flaggedTx > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: ${item.flaggedTx > 0 ? '600' : 'normal'};">
          <i data-lucide="flag" style="width: 12px; height: 12px;"></i> ${item.flaggedTx} Flagged
        </span>
      </div>
      <div class="history-card-findings">
        <strong>Top Findings:</strong>
        <ul>
          ${findingsLi}
        </ul>
      </div>
      <div class="history-card-actions">
        <button class="history-card-btn-view" data-id="${item.id}">
          <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Full Report
        </button>
        <button class="history-card-btn-delete" data-id="${item.id}" title="Delete Audit">
          <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;

    historyList.appendChild(card);
  });

  // Bind individual card buttons
  const viewBtns = historyList.querySelectorAll('.history-card-btn-view');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      loadAuditFromHistory(id);
    });
  });

  const deleteBtns = historyList.querySelectorAll('.history-card-btn-delete');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      deleteAuditFromHistory(id);
    });
  });

  window.lucide.createIcons();
}

function loadAuditFromHistory(id) {
  try {
    const history = JSON.parse(localStorage.getItem('audit_history') || '[]');
    const item = history.find(entry => entry.id === id);
    if (!item) return;

    auditData = item.auditData;
    auditStats = item.auditStats;
    flaggedItems = item.flaggedItems;
    currentFilename = item.filename;

    // Load results into memory
    if (auditStats.flagged > 0) {
      flaggedCountBadge.textContent = auditStats.flagged;
      flaggedCountBadge.style.display = 'inline-block';
    } else {
      flaggedCountBadge.style.display = 'none';
    }

    updateDashboard(auditStats, auditData);
    renderTopSuspiciousTable();
    renderActionPlan();

    if (clearDataBtn) clearDataBtn.style.display = 'flex';

    // Trigger report rendering
    renderReport();

    // Hide empty state on reports tab and show active report paper
    updateReportsTabViewState();

    showToast(`Loaded audit history: ${item.filename}`);

    // Switch screen to Dashboard Overview
    const dashboardNavBtn = document.querySelector('[data-section="overview"]');
    if (dashboardNavBtn) dashboardNavBtn.click();

  } catch (e) {
    console.error('Failed to load audit from history:', e);
    showToast('Error loading historical audit results. ⚠️');
  }
}

function deleteAuditFromHistory(id) {
  try {
    let history = JSON.parse(localStorage.getItem('audit_history') || '[]');
    const index = history.findIndex(entry => entry.id === id);
    if (index === -1) return;

    const filename = history[index].filename;
    history.splice(index, 1);
    localStorage.setItem('audit_history', JSON.stringify(history));
    renderHistorySidebar();
    
    showToast(`Deleted audit history entry: ${filename}`);

    // If active audit in memory was the deleted one, let's reset memory or keep it
    if (history.length === 0) {
      updateReportsTabViewState();
    }
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
}

function clearAllAuditHistory() {
  if (confirm('Are you sure you want to clear all audit history? This action is permanent.')) {
    try {
      localStorage.removeItem('audit_history');
      renderHistorySidebar();
      updateReportsTabViewState();
      showToast('All audit history cleared.');
    } catch (e) {
      console.error('Failed to clear audit history:', e);
    }
  }
}

function updateReportsTabViewState() {
  const activeReportView = document.getElementById('active-report-view');
  const emptyReportView = document.getElementById('empty-report-view');
  
  if (auditData) {
    if (activeReportView) activeReportView.classList.remove('hidden');
    if (emptyReportView) emptyReportView.classList.add('hidden');
  } else {
    if (activeReportView) activeReportView.classList.add('hidden');
    if (emptyReportView) emptyReportView.classList.remove('hidden');
  }
}

// ==========================================
// DETAILED ANALYSIS PAGE LOGIC
// ==========================================

function renderDetailedAnalysis() {
  if (!analysisTableBody) return;
  if (!auditData) {
    analysisTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">Please upload transaction data to run detailed analysis.</td></tr>';
    return;
  }

  const searchQuery = (analysisSearch ? analysisSearch.value : '').toLowerCase().trim();
  const startDateVal = filterStartDate ? filterStartDate.value : '';
  const endDateVal = filterEndDate ? filterEndDate.value : '';
  const categoryFilterVal = filterCategory ? filterCategory.value : 'all';
  const riskFilterVal = filterRiskLevel ? filterRiskLevel.value : 'all';

  analysisTableBody.innerHTML = '';
  
  // Filter data based on search, date range, category, and risk level
  const filtered = auditData.filter(row => {
    // 1. Search query on Description
    const desc = (row.Description || row.description || '').toLowerCase();
    const matchesSearch = desc.includes(searchQuery);

    // 2. Date Range
    const rowDateStr = row.Date || row.date || '';
    let matchesDate = true;
    if (startDateVal) {
      matchesDate = matchesDate && (rowDateStr >= startDateVal);
    }
    if (endDateVal) {
      matchesDate = matchesDate && (rowDateStr <= endDateVal);
    }

    // 3. Category
    const cat = row.Category || row.category || 'Unknown';
    const matchesCategory = categoryFilterVal === 'all' || cat === categoryFilterVal;

    // 4. Risk Level
    const risk = row._highestLevel || 'Low';
    const matchesRisk = riskFilterVal === 'all' || risk === riskFilterVal;

    return matchesSearch && matchesDate && matchesCategory && matchesRisk;
  });

  if (filtered.length === 0) {
    if (analysisEmpty) analysisEmpty.classList.remove('hidden');
    
    // Destroy charts or draw empty if no data matches
    if (detailedCategoryChartInstance) detailedCategoryChartInstance.destroy();
    if (detailedTimelineChartInstance) detailedTimelineChartInstance.destroy();
    return;
  }

  if (analysisEmpty) analysisEmpty.classList.add('hidden');

  // Sort filtered transactions based on sort states
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[analysisSortColumn] || '';
    let valB = b[analysisSortColumn] || '';

    if (analysisSortColumn === 'Risk Score') {
      valA = a._riskScore !== undefined ? a._riskScore : 10;
      valB = b._riskScore !== undefined ? b._riskScore : 10;
    } else if (analysisSortColumn === 'Amount') {
      valA = parseFloat(a.Amount || a.amount || 0);
      valB = parseFloat(b.Amount || b.amount || 0);
    } else if (analysisSortColumn === 'Date') {
      valA = new Date(a.Date || a.date || 0).getTime();
      valB = new Date(b.Date || b.date || 0).getTime();
    } else if (analysisSortColumn === 'Category') {
      valA = a.Category || a.category || 'Unknown';
      valB = b.Category || b.category || 'Unknown';
    } else if (analysisSortColumn === 'Description') {
      valA = (a.Description || a.description || '').toLowerCase();
      valB = (b.Description || b.description || '').toLowerCase();
    }

    if (valA < valB) return analysisSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return analysisSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  sorted.forEach(row => {
    const tr = document.createElement('tr');
    
    // Subtle Row Class Styling
    const risk = row._highestLevel || 'Low';
    const rowClass = risk === 'High' ? 'risk-row-high' : 
                     risk === 'Medium' ? 'risk-row-medium' : 'risk-row-low';
    tr.className = rowClass;

    const amount = parseFloat(row.Amount || row.amount || 0);
    const date = row.Date || row.date || 'N/A';
    const desc = row.Description || row.description || 'N/A';
    const cat = row.Category || row.category || 'Unknown';
    const score = row._riskScore !== undefined ? row._riskScore : 10;
    
    const badgeClass = score > 70 ? 'badge-danger' : 
                       score >= 30 ? 'badge-warning' : 'badge-success';

    // Status details
    let statusText = `<span style="color: var(--primary); font-weight: 600;"><i data-lucide="check-circle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;"></i> Clear</span>`;
    
    // Check if this transaction exists in flaggedItems
    const flaggedMatch = flaggedItems ? flaggedItems.find(f => {
      const fAmt = parseFloat(f.Amount || f.amount || 0);
      const fDate = f.Date || f.date || '';
      const fDesc = (f.Description || f.description || '').toLowerCase();
      return fAmt === amount && fDate === date && fDesc.toLowerCase() === desc.toLowerCase();
    }) : null;

    if (flaggedMatch && flaggedMatch._flags && flaggedMatch._flags.length > 0) {
      statusText = flaggedMatch._flags.map(f => {
        const iconColor = f.level === 'High' ? 'var(--danger)' : f.level === 'Medium' ? 'var(--warning)' : 'var(--primary)';
        return `<span style="color: ${iconColor}; display: block; font-size: 0.8rem; margin-bottom: 0.25rem;">
          <i data-lucide="alert-triangle" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 0.15rem;"></i>
          ${f.reason}
        </span>`;
      }).join('');
    }

    tr.innerHTML = `
      <td>${date}</td>
      <td style="font-weight: 500;">${desc}</td>
      <td><span class="badge ${cat === 'Unknown' ? 'badge-warning' : 'badge-success'}" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border);">${cat}</span></td>
      <td class="amount-cell">$${amount.toLocaleString()}</td>
      <td><span class="badge ${badgeClass}">${score}%</span></td>
      <td>${statusText}</td>
    `;

    analysisTableBody.appendChild(tr);
  });

  // ==========================================
  // DOUBLE SIDE-BY-SIDE CHARTS RENDERING
  // ==========================================

  // Chart 1: Spending by Category sum (Pie Chart)
  const catSums = {};
  filtered.forEach(row => {
    const cat = row.Category || row.category || 'Unknown';
    const amt = parseFloat(row.Amount || row.amount || 0);
    catSums[cat] = (catSums[cat] || 0) + amt;
  });

  const categories = Object.keys(catSums);
  const catValues = Object.values(catSums);

  if (detailedCategoryChartInstance) detailedCategoryChartInstance.destroy();
  const ctxCat = document.getElementById('analysisCategoryChart').getContext('2d');
  detailedCategoryChartInstance = new Chart(ctxCat, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        label: 'Spending ($)',
        data: catValues,
        backgroundColor: [
          '#10b981', // Emerald
          '#6366f1', // Indigo
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#a855f7', // Purple
          '#3b82f6', // Blue
          '#06b6d4', // Cyan
        ],
        borderWidth: 1,
        borderColor: '#1a2a3a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#9ca3af', font: { family: "'Outfit', sans-serif" } }
        }
      }
    }
  });

  // Chart 2: Timeline plotting each transaction as a point sorted by date
  const sortedForTimeline = [...filtered].sort((a, b) => new Date(a.Date || a.date || 0) - new Date(b.Date || b.date || 0));
  const timelineDates = sortedForTimeline.map(t => t.Date || t.date || 'N/A');
  const timelineAmounts = sortedForTimeline.map(t => parseFloat(t.Amount || t.amount || 0));

  // Determine flagged status for point styles
  const pointColors = sortedForTimeline.map(t => {
    const isFlagged = flaggedItems && flaggedItems.some(f => {
      const fAmt = parseFloat(f.Amount || f.amount || 0);
      const fDate = f.Date || f.date || '';
      const fDesc = (f.Description || f.description || '').toLowerCase();
      const tAmt = parseFloat(t.Amount || t.amount || 0);
      const tDate = t.Date || t.date || '';
      const tDesc = (t.Description || t.description || '').toLowerCase();
      return fAmt === tAmt && fDate === tDate && fDesc === tDesc;
    });
    return isFlagged ? '#ef4444' : '#10b981';
  });

  const pointSizes = sortedForTimeline.map(t => {
    const isFlagged = flaggedItems && flaggedItems.some(f => {
      const fAmt = parseFloat(f.Amount || f.amount || 0);
      const fDate = f.Date || f.date || '';
      const fDesc = (f.Description || f.description || '').toLowerCase();
      const tAmt = parseFloat(t.Amount || t.amount || 0);
      const tDate = t.Date || t.date || '';
      const tDesc = (t.Description || t.description || '').toLowerCase();
      return fAmt === tAmt && fDate === tDate && fDesc === tDesc;
    });
    return isFlagged ? 8 : 4;
  });

  const pointHoverSizes = pointSizes.map(s => s + 2);

  if (detailedTimelineChartInstance) detailedTimelineChartInstance.destroy();
  const ctxTime = document.getElementById('analysisTimelineChart').getContext('2d');
  detailedTimelineChartInstance = new Chart(ctxTime, {
    type: 'line',
    data: {
      labels: timelineDates,
      datasets: [{
        label: 'Transaction Amount ($)',
        data: timelineAmounts,
        borderColor: '#10b981', // Color the line teal
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: false,
        tension: 0.1,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: pointSizes,
        pointHoverRadius: pointHoverSizes,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Transaction Volume Over Time',
          color: '#f9fafb',
          font: {
            size: 16,
            family: "'Outfit', sans-serif",
            weight: '600'
          }
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              const tx = sortedForTimeline[index];
              return `Date: ${tx.Date || tx.date || 'N/A'}`;
            },
            label: function(context) {
              const index = context.dataIndex;
              const tx = sortedForTimeline[index];
              const amt = parseFloat(tx.Amount || tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return [
                `Description: ${tx.Description || tx.description || 'N/A'}`,
                `Amount: $${amt}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1a2a3a' },
          ticks: { color: '#9ca3af', font: { family: "'Outfit', sans-serif" } }
        },
        y: {
          grid: { color: '#1a2a3a' },
          ticks: { color: '#9ca3af', font: { family: "'Outfit', sans-serif" } }
        }
      }
    }
  });

  window.lucide.createIcons();
}

// Bind Detailed Analysis search and filtering
if (analysisSearch) {
  analysisSearch.addEventListener('input', () => renderDetailedAnalysis());
}

if (filterStartDate) {
  filterStartDate.addEventListener('change', () => renderDetailedAnalysis());
}

if (filterEndDate) {
  filterEndDate.addEventListener('change', () => renderDetailedAnalysis());
}

if (filterCategory) {
  filterCategory.addEventListener('change', () => renderDetailedAnalysis());
}

if (filterRiskLevel) {
  filterRiskLevel.addEventListener('change', () => renderDetailedAnalysis());
}

// Header column sorting triggers
const bindHeaderSort = (elementId, columnName) => {
  const el = document.getElementById(elementId);
  if (el) {
    el.addEventListener('click', () => {
      if (analysisSortColumn === columnName) {
        analysisSortDirection = analysisSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        analysisSortColumn = columnName;
        analysisSortDirection = 'asc';
      }
      renderDetailedAnalysis();
    });
  }
};

bindHeaderSort('header-date', 'Date');
bindHeaderSort('header-desc', 'Description');
bindHeaderSort('header-amount', 'Amount');
bindHeaderSort('header-cat', 'Category');
bindHeaderSort('header-risk', 'Risk Score');

// ==========================================
// STARTUP INITIALIZATION & HISTORICAL LOAD
// ==========================================

renderHistorySidebar();

// Initialize the report date dynamically with today's date
const reportDateEl = document.getElementById('report-date');
if (reportDateEl) {
  reportDateEl.textContent = `Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

// Clear active analysis keys from localStorage on startup/refresh
const keysToClear = ['auditData', 'auditResults', 'transactionData', 'analysisResults', 'sampleData', 'active_audit_analysis', 'active_audit_filename'];
keysToClear.forEach(key => localStorage.removeItem(key));

// Bind Theme settings selection
const settingTheme = document.getElementById('setting-theme');
if (settingTheme) {
  const savedTheme = localStorage.getItem('audit_theme_mode') || 'dark';
  settingTheme.value = savedTheme;
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  settingTheme.addEventListener('change', (e) => {
    const theme = e.target.value;
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      localStorage.setItem('audit_theme_mode', 'light');
      showToast('Interface set to Light Mode!');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('audit_theme_mode', 'dark');
      showToast('Interface set to Dark Mode!');
    }
  });
}

const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearAllAuditHistory);
}

// Bind Settings Clear button
if (settingsClearBtn) {
  settingsClearBtn.addEventListener('click', clearAllAuditHistory);
}

// Bind Settings average multiplier trigger
const settingsAvgMultiplier = document.getElementById('setting-avg-multiplier');
if (settingsAvgMultiplier) {
  settingsAvgMultiplier.addEventListener('change', (e) => {
    showToast(`AI standard deviation spike configuration set to ${e.target.value}.0x!`);
  });
}

// Bind Detailed Analysis search and filtering
if (analysisSearch) {
  analysisSearch.addEventListener('input', () => renderDetailedAnalysis());
}

if (analysisCategoryFilter) {
  analysisCategoryFilter.addEventListener('change', () => renderDetailedAnalysis());
}

// ==========================================
// AI STRATEGIC ACTION PLAN GENERATOR & RENDERER
// ==========================================

function generateActionPlan(data, stats, flags) {
  const recommendations = [];

  if (!data || data.length === 0) return recommendations;

  // 1. Duplicate transactions
  const duplicateFlags = flags.filter(f => f._flags.some(r => r.reason.toLowerCase().includes('duplicate')));
  if (duplicateFlags.length > 0) {
    const totalDuplicateAmount = duplicateFlags.reduce((sum, f) => sum + parseFloat(f.Amount || f.amount || 0), 0);
    recommendations.push({
      priority: 'URGENT',
      text: `You have **${duplicateFlags.length} duplicate transactions** totalling **$${totalDuplicateAmount.toLocaleString()}** — investigate immediately to prevent double payouts.`
    });
  }

  // 2. High risk transactions
  const highRiskFlags = flags.filter(f => f._highestLevel === 'High');
  if (highRiskFlags.length > 0) {
    recommendations.push({
      priority: 'URGENT',
      text: `Detected **${highRiskFlags.length} transaction(s) flagged as HIGH risk** (extreme outlier spikes or negative entries). Prioritize these for immediate forensic ledger verification.`
    });
  } else {
    recommendations.push({
      priority: 'GOOD',
      text: `No transactions flagged as HIGH risk — your transaction profiles look generally stable and compliant.`
    });
  }

  // 3. Unknown category ratio
  const unknownCount = data.filter(row => row.Category === 'Unknown').length;
  const unknownRatio = data.length > 0 ? (unknownCount / data.length * 100) : 0;
  if (unknownRatio > 15) {
    recommendations.push({
      priority: 'REVIEW',
      text: `Your Unknown category transactions are unusually high at **${unknownRatio.toFixed(0)}%** (${unknownCount} items) — review and recategorize to clear operational audit blind spots.`
    });
  } else if (unknownCount > 0) {
    recommendations.push({
      priority: 'REVIEW',
      text: `Found **${unknownCount} transaction(s)** classified in the Unknown category. Establish automated field validators to ensure complete bookkeeping entries.`
    });
  }

  // 4. Round number anomalies
  const roundCount = flags.filter(f => f._flags.some(r => r.reason.toLowerCase().includes('round'))).length;
  if (roundCount > 0) {
    recommendations.push({
      priority: 'REVIEW',
      text: `Found **${roundCount} transactions containing suspicious round figures** (multiples of $500 or $1000). Audit internal controls to verify authorized transaction hanks.`
    });
  }

  // 5. Negative / zero entries
  const negativeCount = flags.filter(f => f._flags.some(r => r.reason.toLowerCase().includes('negative') || r.reason.toLowerCase().includes('zero'))).length;
  if (negativeCount > 0) {
    recommendations.push({
      priority: 'URGENT',
      text: `Detected **${negativeCount} ledger entries containing negative or zero amounts**. Cleanse database source files to resolve entry errors.`
    });
  }

  // Cap recommendations to a maximum of 5, minimum of 3
  if (recommendations.length < 3) {
    recommendations.push({
      priority: 'GOOD',
      text: `All classified transaction patterns align with standard accounts. Distribution profiles reflect healthy ledger activity.`
    });
  }

  return recommendations.slice(0, 5);
}

function renderActionPlan() {
  const container = document.getElementById('action-plan-list');
  if (!container) return;

  container.innerHTML = '';
  
  if (!auditData) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem;">No recommendations generated yet.</div>';
    return;
  }

  const recommendations = generateActionPlan(auditData, auditStats, flaggedItems);

  recommendations.forEach(rec => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.padding = '1rem';
    item.style.borderRadius = '12px';
    item.style.background = 'rgba(255,255,255,0.01)';
    item.style.border = '1px solid var(--border)';
    
    const priorityBadge = rec.priority === 'URGENT' ? 'badge-danger' :
                           rec.priority === 'REVIEW' ? 'badge-warning' : 'badge-success';

    // Simple bold markdown conversion for recommendations text
    const textFormatted = rec.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    item.innerHTML = `
      <span class="badge ${priorityBadge}" style="font-weight: 700; min-width: 80px; text-align: center; margin-right: 1.25rem; font-size: 0.75rem; letter-spacing: 0.05em;">${rec.priority}</span>
      <div style="font-size: 0.9rem; color: var(--text-main); line-height: 1.4;">${textFormatted}</div>
    `;

    container.appendChild(item);
  });
  
  window.lucide.createIcons();
}

if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    // Create confirmation modal backdrop dynamically
    const backdrop = document.createElement('div');
    backdrop.className = 'clear-modal-backdrop';
    backdrop.innerHTML = `
      <div class="clear-modal-card">
        <div class="clear-modal-title">Confirm Reset</div>
        <div class="clear-modal-text">Are you sure you want to clear the current analysis? This cannot be undone.</div>
        <div class="clear-modal-actions">
          <button class="btn-confirm" id="modal-confirm-clear">Confirm</button>
          <button class="btn-cancel" id="modal-cancel-clear">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    
    // Trigger fade-in transition
    setTimeout(() => backdrop.classList.add('open'), 10);
    
    // Bind Cancel action
    backdrop.querySelector('#modal-cancel-clear').addEventListener('click', () => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 300);
    });
    
    // Bind Confirm action
    backdrop.querySelector('#modal-confirm-clear').addEventListener('click', () => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 300);
      performClear();
    });
  });
}

function performClear() {
  // Clear active current session analysis data from sessionStorage completely
  sessionStorage.clear();

  // Clear analysis variables in memory
  auditData = null;
  auditStats = null;
  flaggedItems = null;

  // Reset the Overview page back to the empty state showing the hero heading, stat cards, OECD image and upload bar
  dashboardSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  uploadIdle.classList.remove('hidden');
  uploadLoading.style.display = 'none';
  
  const heroVisual = document.querySelector('.hero-image-wrapper');
  if (heroVisual) heroVisual.classList.remove('hidden');

  // Reset upload file input value
  if (fileInput) fileInput.value = '';

  // Hide flagged badge and reset count
  flaggedCountBadge.style.display = 'none';
  flaggedCountBadge.textContent = '0';

  // Clear Detailed Analysis page back to No Data Available
  updateTabViewState('analysis');

  // Clear Flagged Items page back to No Data Available
  updateTabViewState('flagged');

  // Reset the chat assistant back to its default welcome message
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div class="message message-ai">
        Hello! I've analyzed your transaction data. Feel free to ask me questions about specific flags or overall risk patterns.
      </div>
    `;
  }

  // Hide the Clear Data button
  if (clearDataBtn) clearDataBtn.style.display = 'none';

  // Hide floating chat interface but keep toggle visible
  if (chatInterface) chatInterface.classList.remove('open');

  // Show a small green toast notification that disappears after 3 seconds
  showToast('✅ Analysis cleared — ready for new upload');
}

// ==========================================
// MOBILE OVERLAY HAMBURGER NAVIGATION HANDLERS
// ==========================================
const hamburgerBtn = document.getElementById('hamburger-btn');
const sidebar = document.querySelector('aside');

if (hamburgerBtn && sidebar) {
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && e.target !== hamburgerBtn && !hamburgerBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Also close the sidebar when a nav item is clicked on mobile
  const navItemsMobile = document.querySelectorAll('.nav-item');
  navItemsMobile.forEach(item => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  });
}
