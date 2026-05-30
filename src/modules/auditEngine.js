export async function runAIAudit(data) {
  // Simulate AI analysis delay
  await new Promise(resolve => setTimeout(resolve, 2500));

  const transactions = [];
  let flaggedCount = 0;
  let totalAmount = 0;
  let riskScoreSum = 0;

  // Process rows
  const amounts = data.map(d => parseFloat(d.Amount || 0)).filter(a => !isNaN(a));
  const totalSum = amounts.reduce((a, b) => a + b, 0);
  const averageAmount = data.length > 0 ? totalSum / data.length : 0;

  data.forEach((row, index) => {
    const amount = parseFloat(row.Amount || 0);
    const date = row.Date || '';
    const desc = (row.Description || '').toLowerCase();
    
    // Auto-classify category if null or not exists
    let assignedCategory = row.Category || 'Unknown';
    if (!row.Category || row.Category === 'Unknown') {
      const foodKeywords = ['dinner', 'lunch', 'breakfast', 'meal', 'restaurant', 'grocer', 'food', 'cafe', 'starbucks', 'supermarket', 'mcdonald', 'burger', 'pizza', 'bakery', 'eat'];
      const transportKeywords = ['taxi', 'uber', 'lyft', 'gas', 'fuel', 'flight', 'travel', 'car', 'train', 'bus', 'metro', 'transit', 'airline', 'toll'];
      const salaryKeywords = ['salary', 'wage', 'paycheck', 'direct deposit', 'income', 'bonus', 'payroll', 'compensation'];
      const utilitiesKeywords = ['rent', 'aws', 'amazon web services', 'hosting', 'server', 'electricity', 'water', 'power', 'cleaning', 'internet', 'telephone', 'utility', 'bills', 'heating', 'maintenance'];

      if (foodKeywords.some(kw => desc.includes(kw))) {
        assignedCategory = 'Food';
      } else if (transportKeywords.some(kw => desc.includes(kw))) {
        assignedCategory = 'Transport';
      } else if (salaryKeywords.some(kw => desc.includes(kw))) {
        assignedCategory = 'Salary';
      } else if (utilitiesKeywords.some(kw => desc.includes(kw))) {
        assignedCategory = 'Utilities';
      }
    }

    // Flag checks
    const flags = [];
    
    // 1. Duplicate
    const isDuplicate = data.some((other, idx) => {
      if (idx === index) return false;
      const otherAmt = parseFloat(other.Amount || 0);
      const otherDate = other.Date || '';
      return otherAmt === amount && otherDate === date;
    });
    if (isDuplicate) {
      flags.push('Duplicate amount on the same date');
    }

    // 2. Round Numbers
    const isRound = (amount > 0) && (amount === 1000 || amount === 5000 || amount % 1000 === 0 || amount % 500 === 0);
    if (isRound) {
      flags.push(`Suspicious round number pattern ($${amount})`);
    }

    // 3. Outlier 3x average
    if (amount > 3 * averageAmount) {
      flags.push(`Amount ($${amount.toLocaleString()}) is 3x higher than average ($${averageAmount.toFixed(2)})`);
    }

    // 4. Unknown Category
    if (assignedCategory === 'Unknown') {
      flags.push('Unclassified transaction matching Unknown category');
    }

    // 5. Negative/Zero
    if (isNaN(amount) || amount <= 0) {
      flags.push('Negative or zero amount entry');
    }

    // Compute risk score
    let score = 10; // base risk
    flags.forEach(f => {
      if (f.includes('Negative or zero')) score += 70;
      else if (f.includes('3x higher than average')) score += 65;
      else if (f.includes('Duplicate amount')) score += 45;
      else if (f.includes('round number')) score += 25;
      else if (f.includes('Unknown category')) score += 15;
    });
    score = Math.min(100, score);
    riskScoreSum += score;

    let level = 'LOW';
    if (score > 70) {
      level = 'HIGH';
    } else if (score >= 30) {
      level = 'MEDIUM';
    }

    const flagReason = flags.length > 0 ? flags.join('; ') : null;
    if (flagReason) {
      flaggedCount++;
    }

    totalAmount += isNaN(amount) ? 0 : amount;

    transactions.push({
      Date: date,
      Description: row.Description || '',
      Amount: amount,
      Category: assignedCategory,
      riskScore: score,
      riskLevel: level,
      flagReason: flagReason
    });
  });

  const overallRiskScore = data.length > 0 ? Math.round(riskScoreSum / data.length) : 0;

  // Generate recommendations (3 to 5)
  const recommendations = [];
  if (flaggedCount > 0) {
    const duplicates = transactions.filter(t => t.flagReason && t.flagReason.includes('Duplicate'));
    if (duplicates.length > 0) {
      recommendations.push(`Review the ${duplicates.length} duplicate transaction(s) immediately to identify double-payouts or entry errors.`);
    }
    
    const highRisk = transactions.filter(t => t.riskLevel === 'HIGH');
    if (highRisk.length > 0) {
      recommendations.push(`Conduct a detailed forensic check on the ${highRisk.length} transaction(s) flagged as HIGH risk.`);
    }

    const unknownCount = transactions.filter(t => t.Category === 'Unknown').length;
    if (unknownCount > 0) {
      recommendations.push(`Reclassify the ${unknownCount} transaction(s) categorized as "Unknown" to maintain complete audit visibility.`);
    }
  }

  // Fallback recommendations if we need more to reach 3-5
  if (recommendations.length < 3) {
    recommendations.push('Establish stricter data validation rules to improve transaction data integrity.');
    recommendations.push('Implement routine automated pre-audit scans to prevent anomalies before final ledger posting.');
  }
  if (recommendations.length < 4) {
    recommendations.push('Provide staff training on category matching guidelines to reduce unclassified entries.');
  }

  return {
    transactions,
    summary: {
      totalTransactions: transactions.length,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      flaggedCount,
      overallRiskScore,
      recommendations: recommendations.slice(0, 5)
    }
  };
}
