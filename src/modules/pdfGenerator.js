import { jsPDF } from 'jspdf';
import { generateReportContent } from './chatEngine.js';

export async function generatePDF(stats, flags, filename) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const riskVal = parseFloat(stats.riskScore || 0);
  const riskLabel = riskVal > 70 ? 'HIGH' : (riskVal >= 30 ? 'MEDIUM' : 'LOW');
  const riskColor = riskVal > 70 ? [239, 68, 68] : (riskVal >= 30 ? [245, 158, 11] : [16, 185, 129]);

  // ==========================================
  // PAGE 1 — COVER PAGE
  // ==========================================
  
  // Decorative top bar
  doc.setFillColor(16, 185, 129); // Teal
  doc.rect(0, 0, 210, 15, 'F');

  // App Name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(16, 185, 129);
  doc.text('AUDIT AI', 20, 50);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(20, 60, 190, 60);

  // Title
  doc.setFontSize(36);
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.text('Financial Audit\nReport', 20, 85);

  // Meta Information
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // Gray

  doc.setFont('Helvetica', 'bold');
  doc.text('AUDIT METADATA', 20, 140);
  
  doc.setFont('Helvetica', 'normal');
  doc.text(`Date of Audit:`, 20, 150);
  doc.setFont('Helvetica', 'bold');
  doc.text(dateStr, 55, 150);

  doc.setFont('Helvetica', 'normal');
  doc.text(`Source File:`, 20, 158);
  doc.setFont('Helvetica', 'bold');
  doc.text(filename || 'Unknown File', 55, 158);

  doc.setFont('Helvetica', 'normal');
  doc.text(`Analyzed By:`, 20, 166);
  doc.setFont('Helvetica', 'bold');
  doc.text('Audit AI Deep Forensic Engine v1.0', 55, 166);

  // Risk Score Badge
  doc.setFillColor(248, 250, 252); // Light bg
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 190, 170, 45, 4, 4, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERALL LEDGER COMPLIANCE STATUS', 30, 202);

  doc.setFontSize(24);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`${stats.riskScore}% RISK`, 30, 222);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`CLASSIFICATION: ${riskLabel} RISK EXPOSURE`, 95, 220);

  // Footer cover
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Financial Intelligence • Generated automatically by Audit AI', 105, 280, { align: 'center' });


  // ==========================================
  // PAGE 2 — EXECUTIVE SUMMARY
  // ==========================================
  doc.addPage();

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('AUDIT AI  |  EXECUTIVE SUMMARY', 15, 13);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE AUDIT SUMMARY', 15, 38);

  // AI-generated summary paragraph
  const content = await generateReportContent(stats, flags, filename);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);

  const summaryText = content.summary;
  const splitSummary = doc.splitTextToSize(summaryText, 180);
  doc.text(splitSummary, 15, 48);

  // 4 Key Metric Boxes Grid
  const gridY = 95;
  const boxW = 85;
  const boxH = 30;

  // Box 1: Total Transactions
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, gridY, boxW, boxH, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TRANSACTIONS', 20, gridY + 10);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(String(stats.total), 20, gridY + 22);

  // Box 2: Total Amount
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, gridY, boxW, boxH, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL AMOUNT ANALYZED', 115, gridY + 10);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${parseFloat(stats.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 115, gridY + 22);

  // Box 3: Flagged Items
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, gridY + boxH + 8, boxW, boxH, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('FLAGGED ITEM COUNT', 20, gridY + boxH + 18);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  if (stats.flagged > 0) {
    doc.setTextColor(239, 68, 68);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(String(stats.flagged), 20, gridY + boxH + 30);

  // Box 4: Overall Risk Score
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, gridY + boxH + 8, boxW, boxH, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERALL RISK SCORE', 115, gridY + boxH + 18);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`${stats.riskScore}%`, 115, gridY + boxH + 30);

  // Visual decorative elements
  doc.setDrawColor(241, 245, 249);
  doc.line(15, 185, 195, 185);

  // Subtitle/Footer details
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Audit AI Financial Insights Protocol • File: ${filename}`, 15, 280);
  doc.text('Page 2', 195, 280, { align: 'right' });


  // ==========================================
  // PAGE 3 — FLAGGED TRANSACTIONS TABLE
  // ==========================================
  doc.addPage();

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('AUDIT AI  |  FLAGGED TRANSACTIONS DETAILED REPORT', 15, 13);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('ANOMALY & FLAGGED FINDINGS', 15, 38);

  // Table Headers
  const tableY = 48;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, tableY, 180, 8, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATE', 17, tableY + 5.5);
  doc.text('DESCRIPTION', 38, tableY + 5.5);
  doc.text('AMOUNT', 95, tableY + 5.5);
  doc.text('RISK LEVEL', 120, tableY + 5.5);
  doc.text('REASON FLAGGED', 148, tableY + 5.5);

  let currentY = tableY + 8;
  const maxTableY = 265;

  if (flags.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('No transaction anomalies or flagged cash activities detected in this ledger.', 15, currentY + 10);
  } else {
    flags.forEach((item) => {
      if (currentY > maxTableY) {
        // Handle overflow on same page by splitting table if extremely long, or cap
        return;
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const dateVal = item.Date || 'N/A';
      const descVal = doc.splitTextToSize(item.Description || 'N/A', 50)[0];
      const amountVal = `$${parseFloat(item.Amount || 0).toLocaleString()}`;
      const level = item.riskLevel || 'LOW';
      
      // Reason text wrapping
      const reasonVal = item.flagReason || 'Unclassified flag';
      const splitReason = doc.splitTextToSize(reasonVal, 45);

      // Row Line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 9, 195, 9 + currentY);

      doc.text(dateVal, 17, currentY + 5.5);
      doc.text(descVal, 38, currentY + 5.5);
      doc.text(amountVal, 95, currentY + 5.5);

      // Color coding Risk Level
      if (level === 'HIGH') {
        doc.setTextColor(239, 68, 68); // Red
        doc.setFont('Helvetica', 'bold');
      } else if (level === 'MEDIUM') {
        doc.setTextColor(245, 158, 11); // Yellow
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(16, 185, 129); // Green
      }
      doc.text(level, 120, currentY + 5.5);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      // Render first line of reason
      doc.text(splitReason[0] || '', 148, currentY + 5.5);
      if (splitReason[1]) {
        // Draw subtitle on next row space
        doc.setFontSize(7);
        doc.text(splitReason[1], 148, currentY + 8);
      }

      currentY += 10;
    });
  }

  // Footer details
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Audit AI Anomaly Mapping Protocol • confidential findings`, 15, 280);
  doc.text('Page 3', 195, 280, { align: 'right' });


  // ==========================================
  // PAGE 4 — AI STRATEGIC RECOMMENDATIONS
  // ==========================================
  doc.addPage();

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('AUDIT AI  |  REMEDIATION STRATEGY & ACTIONS', 15, 13);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('RECOMMENDED REMEDIATION ACTIONS', 15, 38);

  // Recommendations Loop
  let recY = 55;
  const recsList = content.recommendations || [];

  recsList.forEach((rec, index) => {
    // Determine priority levels based on contents
    let priority = 'GOOD';
    let pColor = [16, 185, 129]; // Green
    
    const textLower = rec.toLowerCase();
    if (textLower.includes('urgent') || textLower.includes('duplicate') || textLower.includes('high risk')) {
      priority = 'URGENT';
      pColor = [239, 68, 68]; // Red
    } else if (textLower.includes('reclassify') || textLower.includes('unknown') || textLower.includes('review')) {
      priority = 'REVIEW';
      pColor = [245, 158, 11]; // Yellow
    }

    // Draw box for recommendation
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(15, recY, 180, 28, 2, 2, 'FD');

    // Priority Tag
    doc.setFillColor(pColor[0], pColor[1], pColor[2]);
    doc.roundedRect(22, recY + 5, 22, 6, 1, 1, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(priority, 33, recY + 9.2, { align: 'center' });

    // Index number
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}.`, 22, recY + 20);

    // Text
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const splitRecText = doc.splitTextToSize(rec, 145);
    doc.text(splitRecText, 32, recY + 18);

    recY += 34;
  });

  // Footer details
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Audit AI Remediation Protocol`, 15, 280);
  doc.text('Page 4', 195, 280, { align: 'right' });


  // Save PDF document
  doc.save(`AuditAI-Report-${dateStr}.pdf`);
}

export function generateReportPDF() {
  // Retained stub for the custom styled HTML download if needed
  const element = document.getElementById('report-content');
  if (!element) return;
  // Dynamic report content handling
}
