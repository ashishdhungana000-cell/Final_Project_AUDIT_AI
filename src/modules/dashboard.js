import Chart from 'chart.js/auto';

let volumeChart = null;
let categoryChart = null;

function animateValue(id, start, end, duration, isCurrency = false, isDecimal = false) {
  const obj = document.getElementById(id);
  if (!obj) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Easing outQuad: f(t) = t*(2-t)
    const easedProgress = progress * (2 - progress);
    const currentValue = start + easedProgress * (end - start);
    
    if (isCurrency) {
      obj.textContent = `$${Math.floor(currentValue).toLocaleString()}`;
    } else if (isDecimal) {
      if (id === 'gauge-score-value') {
        obj.textContent = `${currentValue.toFixed(1)}%`;
      } else {
        obj.textContent = currentValue.toFixed(1);
      }
    } else {
      obj.textContent = Math.floor(currentValue).toLocaleString();
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      if (isCurrency) {
        obj.textContent = `$${parseFloat(end).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (isDecimal) {
        if (id === 'gauge-score-value') {
          obj.textContent = `${parseFloat(end).toFixed(1)}%`;
        } else {
          obj.textContent = parseFloat(end).toFixed(1);
        }
      } else {
        obj.textContent = Math.floor(end).toLocaleString();
      }
    }
  };
  window.requestAnimationFrame(step);
}

export function updateDashboard(stats, data) {
  const score = parseFloat(stats.riskScore);

  // Update Cards with counting animations over 1.5 seconds (1500ms)
  animateValue('total-tx', 0, stats.total, 1500, false, false);
  animateValue('flagged-tx', 0, stats.flagged, 1500, false, false);
  animateValue('total-amount', 0, parseFloat(stats.totalAmount), 1500, true, false);
  animateValue('risk-score', 0, score, 1500, false, true);
  animateValue('gauge-score-value', 0, score, 1500, false, true);
  
  // Rotate Speedometer needle
  const needle = document.getElementById('gauge-needle');
  if (needle) {
    const angle = -90 + (score / 100) * 180;
    needle.style.transform = `rotate(${angle}deg)`;
  }

  // Dynamic Risk Border & Colors
  const riskCard = document.getElementById('risk-score-card');
  const riskEl = document.getElementById('risk-score');
  const riskIcon = document.getElementById('risk-score-icon');
  
  let riskColor = '#10b981'; // Green
  if (score > 70) {
    riskColor = '#ef4444'; // Red
  } else if (score >= 30) {
    riskColor = '#f59e0b'; // Yellow
  }
  
  if (riskCard) riskCard.style.borderLeft = `4px solid ${riskColor}`;
  if (riskEl) riskEl.style.color = riskColor;
  if (riskIcon) riskIcon.style.color = riskColor;

  // Volume Chart (Transactions over time)
  const sortedData = [...data].sort((a, b) => new Date(a.Date || a.date) - new Date(b.Date || b.date));
  const dates = [...new Set(sortedData.map(d => d.Date || d.date))];
  const counts = dates.map(date => sortedData.filter(d => (d.Date || d.date) === date).length);
  const risks = dates.map(date => sortedData.filter(d => (d.Date || d.date) === date && d._flags).length);

  if (volumeChart) volumeChart.destroy();
  const ctxV = document.getElementById('volumeChart').getContext('2d');
  volumeChart = new Chart(ctxV, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Transaction Volume',
          data: counts,
          backgroundColor: '#6366f1',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af' } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });

  // Category Chart
  const categories = Object.keys(stats.categories);
  const catValues = Object.values(stats.categories);

  if (categoryChart) categoryChart.destroy();
  const ctxC = document.getElementById('categoryChart').getContext('2d');
  categoryChart = new Chart(ctxC, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        data: catValues,
        backgroundColor: [
          '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f43f5e'
        ],
        borderWidth: 2,
        borderColor: '#0f172a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#9ca3af' } }
      }
    }
  });
}
