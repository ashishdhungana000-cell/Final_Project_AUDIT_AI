const SYSTEM_PROMPT = `You are an expert financial auditor AI assistant. The user has uploaded transaction data. Answer their questions about fraud patterns, risk scores, flagged transactions, and give practical audit advice. Be concise and professional. Use emojis where helpful.`;

let messageHistory = [];

export async function getAIResponse(userQuery, stats, flags) {
  // Add user message to history
  messageHistory.push({ role: 'user', text: userQuery });
  
  // Keep last 10 messages
  if (messageHistory.length > 10) {
    messageHistory = messageHistory.slice(-10);
  }

  // Construct context for the AI
  const context = stats ? `
    CURRENT AUDIT STATS:
    - Total Transactions: ${stats.total}
    - Flagged Items: ${stats.flagged}
    - Risk Score: ${stats.riskScore}/100
    - Data Integrity: ${stats.integrity}%
    
    TOP FLAGGED ITEMS:
    ${flags.slice(0, 5).map(f => `- ${f.Description || f.description || 'Transaction'} ($${f.Amount || f.amount}) on ${f.Date || f.date}: ${f._flags.map(r => r.reason).join(', ')}`).join('\n')}
  ` : `No transactions uploaded yet.`;

  try {
    return await simulateAIResponse(userQuery, stats, flags);
  } catch (error) {
    console.error('Chat AI Error:', error);
    return "I'm having trouble connecting to my intelligence core right now. Please try again in a moment. 🛠️";
  }
}

async function simulateAIResponse(query, stats, flags) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!stats || !flags) {
    return 'Please upload a transaction file first so I can analyze your specific data.';
  }

  const q = query.toLowerCase();

  // Find duplicates
  const duplicates = flags.filter(f => f.flagReason && f.flagReason.toLowerCase().includes('duplicate'));
  const dupSum = duplicates.reduce((sum, f) => sum + parseFloat(f.Amount || 0), 0);

  // Find highest risk transaction
  const sortedByRisk = [...flags].sort((a, b) => b.riskScore - a.riskScore);
  const highestRisk = sortedByRisk[0];

  // What is my highest risk transaction?
  if (q.includes('highest') || q.includes('high risk') || q.includes('worst') || q.includes('most suspicious')) {
    if (highestRisk) {
      return `Your highest risk transaction is **${highestRisk.Description}** on **${highestRisk.Date}** for **$${parseFloat(highestRisk.Amount).toLocaleString()}**! 

It was flagged as **${highestRisk.riskLevel}** Risk with a score of **${highestRisk.riskScore}/100** because: 
👉 *${highestRisk.flagReason}* 

I highly recommend investigating this immediately. 🔍`;
    } else {
      return `No transaction anomalies or flagged items were detected in your ledger! Everything looks compliant. 🟢`;
    }
  }

  // How many duplicates were found?
  if (q.includes('duplicate') || q.includes('double')) {
    if (duplicates.length > 0) {
      return `I identified **${duplicates.length} potential duplicate transactions** on identical dates! 

The total exposure from these duplicates is **$${dupSum.toLocaleString()}**. 
Please verify if these are ledger entry errors or unauthorized double payments:
${duplicates.slice(0, 3).map(d => `- **${d.Description}** ($${parseFloat(d.Amount).toLocaleString()}) on ${d.Date}`).join('\n')}
${duplicates.length > 3 ? `*(and ${duplicates.length - 3} more...)*` : ''} 🧐`;
    } else {
      return `No duplicate transaction amounts on identical dates were detected in this dataset! 🟢`;
    }
  }

  // What should I do first? / advice / action plan
  if (q.includes('first') || q.includes('action') || q.includes('remed') || q.includes('what should i do') || q.includes('advice')) {
    const actions = [];
    if (duplicates.length > 0) {
      actions.push(`Investigate the **${duplicates.length} duplicate payments** (expose: **$${dupSum.toLocaleString()}**).`);
    }
    if (highestRisk) {
      actions.push(`Perform ledger audit validation on your peak anomaly outlier: **${highestRisk.Description}** ($${parseFloat(highestRisk.Amount).toLocaleString()}) with **${highestRisk.riskScore}%** risk score.`);
    }
    const unknownCount = flags.filter(t => t.Category === 'Unknown').length;
    if (unknownCount > 0) {
      actions.push(`Reclassify the **${unknownCount} unknown categories** to clear visual bookkeeping blind spots.`);
    }
    actions.push(`Implement automated entry validation controls to improve general ledger data integrity.`);

    return `Here is your strategic pre-audit action list prioritized by risk:
${actions.map((act, i) => `${i + 1}. **[${i === 0 ? 'URGENT' : 'REVIEW'}]** ${act}`).join('\n')} 🛡️`;
  }

  // General questions about risk score
  if (q.includes('risk') || q.includes('score') || q.includes('compliance')) {
    const highCount = flags.filter(f => f.riskLevel === 'HIGH').length;
    const medCount = flags.filter(f => f.riskLevel === 'MEDIUM').length;
    return `Your overall ledger risk score is **${stats.riskScore}/100**. 

This is calculated from a weighted index of **${flags.length} total anomalies** detected in this spreadsheet:
- **${highCount} High-Risk** exposure items 🔴
- **${medCount} Medium-Risk** warning items 🟡
Review the **Flagged Items** tab for the full visual catalog of anomalies. 📊`;
  }

  // General questions about amounts, total, volume
  if (q.includes('total') || q.includes('amount') || q.includes('volume') || q.includes('how much') || q.includes('many')) {
    return `This audit dataset contains **${stats.total} total transactions** representing a processed volume of **$${parseFloat(stats.totalAmount).toLocaleString()}**. 

Out of these, **${stats.flagged} items** were flagged for forensic auditor review (approx. **${Math.round(stats.flagged / stats.total * 100)}%** of the ledger volume). 📊`;
  }

  // Default response
  return `I have completed the deep forensic scan of **${stats.total} transactions** from your uploaded sheet. 

I identified **${stats.flagged} anomalies** contributing to a **${stats.riskScore}/100** compliance risk rating. Ask me specifically about duplicate payouts, outlier spikes, or click one of the quick replies above to get immediate answers! 👨‍💼`;
}

export async function generateReportContent(stats, flags, filename = 'transactions.csv') {
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const riskLabel = parseFloat(stats.riskScore || 0) > 70 ? 'High' : (parseFloat(stats.riskScore || 0) >= 30 ? 'Medium' : 'Low');
  
  const summary = `On ${dateStr}, a comprehensive forensic financial audit was conducted on the transaction ledger source file "${filename}". A total of ${stats.total} transactions were ingested and evaluated, resulting in ${stats.flagged} flagged anomaly occurrences. Based on the weighted severity of these items, the database has been assigned an overall risk level of ${stats.riskScore}% (${riskLabel} Risk). To mitigate potential exposure, immediate execution of the remediation recommendations outlined in Section 4 is strongly recommended.`;

  const recommendations = [];
  
  // 1. Duplicates
  const duplicates = flags.filter(f => f._flags.some(r => r.reason.toLowerCase().includes('duplicate')));
  if (duplicates.length > 0) {
    recommendations.push(`Review the ${duplicates.length} duplicate transaction(s) immediately to identify double-payouts or entry errors.`);
  }

  // 2. High Risk
  const highRisk = flags.filter(f => f._highestLevel === 'High');
  if (highRisk.length > 0) {
    recommendations.push(`Conduct a detailed forensic check on the ${highRisk.length} transaction(s) flagged as HIGH risk.`);
  }

  // 3. Outlier
  if (stats.highestAmount && parseFloat(stats.highestAmount) > 0) {
    recommendations.push(`Investigate the peak transaction outlier of $${parseFloat(stats.highestAmount).toLocaleString()} to verify valid authorization and supporting documents.`);
  }

  // 4. Unknown Categories
  const unknownCount = flags.filter(f => f.Category === 'Unknown').length;
  if (unknownCount > 0) {
    recommendations.push(`Reclassify the ${unknownCount} transaction(s) categorized as "Unknown" to maintain complete audit visibility.`);
  }

  // 5. Data Integrity fallback
  if (parseFloat(stats.integrity || 100) < 95) {
    recommendations.push(`Establish stricter data validation rules to improve transaction data integrity (currently at ${stats.integrity}%).`);
  }

  // Ensure at least 3 recommendations
  if (recommendations.length < 3) {
    recommendations.push(`Implement routine automated pre-audit scans to prevent anomalies before final ledger posting.`);
    recommendations.push(`Provide staff training on category matching guidelines to reduce unclassified entries.`);
  }

  // Cap between 3 and 5 recommendations
  const finalRecs = recommendations.slice(0, 5);

  return { summary, recommendations: finalRecs };
}
