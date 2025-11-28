// Financial Analytics Service
// Provides spending analysis, financial DNA generation, and AI coaching data

import { FinancialDNA, IncomePattern, SpendingBucket, SpendingCategory, UPITransaction } from '@/types/upi';
import { getCategoryFromMCC, getCategoryFromMerchantName } from '@/utils/mcc-mapping';

export class FinancialAnalyticsService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = 'http://localhost:3000') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Categorize a transaction using MCC or merchant name
   */
  public categorizeTransaction(transaction: {
    mcc?: string;
    receiverName: string;
    amount: number;
  }): { category: SpendingCategory; merchantType: string; isImpulsePurchase: boolean } {
    let category: SpendingCategory = 'other';
    let merchantType = 'General Merchant';

    // Try MCC first
    if (transaction.mcc) {
      const mccResult = getCategoryFromMCC(transaction.mcc);
      category = mccResult.category;
      merchantType = mccResult.merchantType;
    } else {
      // Fallback to merchant name pattern matching
      const nameResult = getCategoryFromMerchantName(transaction.receiverName);
      if (nameResult) {
        category = nameResult.category;
        merchantType = nameResult.merchantType;
      }
    }

    // Simple impulse purchase detection (under ₹500)
    const isImpulsePurchase = transaction.amount < 500;

    return { category, merchantType, isImpulsePurchase };
  }

  /**
   * Calculate spending buckets from transactions
   */
  public calculateSpendingBuckets(transactions: UPITransaction[]): SpendingBucket[] {
    const successfulTransactions = transactions.filter(t => t.status === 'success');
    const totalSpent = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categoryMap = new Map<SpendingCategory, {
      total: number;
      count: number;
      transactions: UPITransaction[];
    }>();

    successfulTransactions.forEach(transaction => {
      const category = transaction.category || 'other';
      const existing = categoryMap.get(category) || { total: 0, count: 0, transactions: [] };
      
      categoryMap.set(category, {
        total: existing.total + transaction.amount,
        count: existing.count + 1,
        transactions: [...existing.transactions, transaction]
      });
    });

    // Convert to SpendingBucket array
    const buckets: SpendingBucket[] = Array.from(categoryMap.entries()).map(([category, data]) => {
      return {
        category,
        totalAmount: data.total,
        transactionCount: data.count,
        percentageOfTotal: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
        averageTransaction: data.count > 0 ? data.total / data.count : 0,
        trend: this.calculateTrend(data.transactions),
      };
    });

    // Sort by total amount descending
    return buckets.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Calculate spending trend for a category
   */
  private calculateTrend(transactions: UPITransaction[]): 'increasing' | 'decreasing' | 'stable' {
    if (transactions.length < 4) return 'stable';

    // Sort by timestamp
    const sorted = transactions.sort((a, b) => a.timestamp - b.timestamp);
    
    // Split into first and second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);

    const firstHalfAvg = firstHalf.length > 0 ? firstHalfTotal / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalfTotal / secondHalf.length : 0;

    const changeRatio = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0;

    if (changeRatio > 0.1) return 'increasing';
    if (changeRatio < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze income pattern
   */
  public analyzeIncomePattern(incomeTransactions: {
    amount: number;
    date: number;
    source: string;
    sourceType: 'regular' | 'irregular' | 'gig';
  }[]): IncomePattern {
    if (incomeTransactions.length === 0) {
      return {
        frequency: 'irregular',
        averageMonthlyIncome: 0,
        incomeVariability: 1,
        incomeSources: [],
      };
    }

    // Calculate average monthly income
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const sortedByDate = incomeTransactions.sort((a, b) => a.date - b.date);
    const firstDate = sortedByDate[0].date;
    const lastDate = sortedByDate[sortedByDate.length - 1].date;
    const monthsSpan = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));
    const averageMonthlyIncome = totalIncome / monthsSpan;

    // Determine frequency pattern
    const sourceTypes = incomeTransactions.map(t => t.sourceType);
    const regularCount = sourceTypes.filter(s => s === 'regular').length;
    const irregularCount = sourceTypes.filter(s => s === 'irregular').length;
    const gigCount = sourceTypes.filter(s => s === 'gig').length;

    let frequency: 'regular' | 'irregular' | 'gig' = 'irregular';
    if (regularCount > irregularCount && regularCount > gigCount) frequency = 'regular';
    else if (gigCount > irregularCount && gigCount > regularCount) frequency = 'gig';

    // Calculate income variability (coefficient of variation)
    const amounts = incomeTransactions.map(t => t.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const incomeVariability = mean > 0 ? Math.min(1, stdDev / mean) : 1;

    // Get unique income sources
    const incomeSources = Array.from(new Set(incomeTransactions.map(t => t.source)));

    return {
      frequency,
      averageMonthlyIncome,
      incomeVariability,
      incomeSources,
      lastIncomeDate: lastDate,
    };
  }

  /**
   * Detect unusual spending patterns
   */
  public detectUnusualActivity(transactions: UPITransaction[]): string[] {
    const flags: string[] = [];
    const successfulTransactions = transactions.filter(t => t.status === 'success');

    if (successfulTransactions.length === 0) return flags;

    // Calculate average transaction amount
    const amounts = successfulTransactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);

    // Large transaction flag
    if (maxAmount > avgAmount * 5) {
      flags.push('Large unusual transaction detected');
    }

    // High frequency spending (more than 10 transactions in a day)
    const transactionsByDate = new Map<string, number>();
    successfulTransactions.forEach(t => {
      const date = new Date(t.timestamp).toDateString();
      transactionsByDate.set(date, (transactionsByDate.get(date) || 0) + 1);
    });

    const maxDailyTransactions = Math.max(...transactionsByDate.values());
    if (maxDailyTransactions > 10) {
      flags.push('High frequency spending detected');
    }

    // Midnight spending (between 12 AM - 5 AM)
    const nightTransactions = successfulTransactions.filter(t => {
      const hour = new Date(t.timestamp).getHours();
      return hour >= 0 && hour <= 5;
    });

    if (nightTransactions.length > successfulTransactions.length * 0.1) {
      flags.push('Unusual late-night spending pattern');
    }

    // New merchant category surge
    const categoryCounts = new Map<SpendingCategory, number>();
    successfulTransactions.forEach(t => {
      const category = t.category || 'other';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const entertainmentCount = categoryCounts.get('entertainment') || 0;
    if (entertainmentCount > successfulTransactions.length * 0.3) {
      flags.push('High entertainment spending detected');
    }

    const shoppingCount = categoryCounts.get('shopping') || 0;
    if (shoppingCount > successfulTransactions.length * 0.4) {
      flags.push('High shopping activity detected');
    }

    return flags;
  }

  /**
   * Calculate overdraft risk
   */
  public calculateOverdraftRisk(
    currentBalance: number,
    avgDailySpend: number,
    monthlyIncome: number
  ): 'low' | 'medium' | 'high' {
    const daysOfSpendingLeft = avgDailySpend > 0 ? currentBalance / avgDailySpend : 999;
    const balanceToIncomeRatio = monthlyIncome > 0 ? currentBalance / monthlyIncome : 1;

    if (daysOfSpendingLeft < 3 || balanceToIncomeRatio < 0.1) return 'high';
    if (daysOfSpendingLeft < 10 || balanceToIncomeRatio < 0.25) return 'medium';
    return 'low';
  }

  /**
   * Generate complete Financial DNA
   */
  public async generateFinancialDNA(
    userId: string,
    periodStart: number,
    periodEnd: number,
    transactions: UPITransaction[],
    incomeTransactions: {
      amount: number;
      date: number;
      source: string;
      sourceType: 'regular' | 'irregular' | 'gig';
    }[],
    currentBalance: number,
    monthlyBudget?: number,
    savingsGoal?: number
  ): Promise<FinancialDNA> {
    
    const successfulTransactions = transactions.filter(t => t.status === 'success');
    const totalSpent = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const spendingBuckets = this.calculateSpendingBuckets(transactions);
    const incomePattern = this.analyzeIncomePattern(incomeTransactions);
    const unusualActivityFlags = this.detectUnusualActivity(transactions);
    
    // Calculate daily spend
    const daysDiff = Math.max(1, (periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    const averageDailySpend = totalSpent / daysDiff;
    
    // Peak spending analysis
    const spendingByHour = new Array(24).fill(0);
    const spendingByDay = new Array(7).fill(0);
    
    successfulTransactions.forEach(t => {
      const date = new Date(t.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      spendingByHour[hour] += t.amount;
      spendingByDay[dayOfWeek] += t.amount;
    });
    
    const peakSpendingHours = spendingByHour
      .map((amount, hour) => ({ hour, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map(item => item.hour);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakSpendingDays = spendingByDay
      .map((amount, day) => ({ day: dayNames[day], amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 2)
      .map(item => item.day);
    
    // Find highest spend day
    const spendingByDate = new Map<string, number>();
    successfulTransactions.forEach(t => {
      const date = new Date(t.timestamp).toDateString();
      spendingByDate.set(date, (spendingByDate.get(date) || 0) + t.amount);
    });
    
    let highestSpendDay = { day: '', amount: 0 };
    spendingByDate.forEach((amount, date) => {
      if (amount > highestSpendDay.amount) {
        highestSpendDay = { day: date, amount };
      }
    });
    
    // Top merchants
    const merchantMap = new Map<string, { amount: number; count: number }>();
    successfulTransactions.forEach(t => {
      const merchant = t.receiverName;
      const existing = merchantMap.get(merchant) || { amount: 0, count: 0 };
      merchantMap.set(merchant, {
        amount: existing.amount + t.amount,
        count: existing.count + 1
      });
    });
    
    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    // Risk calculations
    const overdraftRisk = this.calculateOverdraftRisk(
      currentBalance, 
      averageDailySpend, 
      incomePattern.averageMonthlyIncome
    );
    
    const impulsePurchaseCount = successfulTransactions.filter(t => t.amount < 500).length;
    const impulsePurchaseRatio = successfulTransactions.length > 0 
      ? (impulsePurchaseCount / successfulTransactions.length) * 100 
      : 0;
    
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;
    const spendingVelocity = successfulTransactions.length / daysDiff;
    
    // Budget adherence (if budget is set)
    let budgetAdherence = 100;
    if (monthlyBudget && monthlyBudget > 0) {
      const monthlySpend = totalSpent * (30 / daysDiff); // Normalize to monthly
      budgetAdherence = Math.max(0, Math.min(100, ((monthlyBudget - monthlySpend) / monthlyBudget) * 100));
    }
    
    // Emergency fund calculation (months of expenses covered)
    const monthlyExpenses = totalSpent * (30 / daysDiff);
    const emergencyFundMonths = monthlyExpenses > 0 ? currentBalance / monthlyExpenses : 0;
    
    const financialDNA: FinancialDNA = {
      userId,
      generatedAt: Date.now(),
      periodStart,
      periodEnd,
      
      // Spending Analysis
      totalSpent,
      spendingBuckets,
      topMerchants,
      averageDailySpend,
      highestSpendDay,
      
      // Income Analysis
      incomePattern,
      totalIncome,
      savingsRate,
      
      // Behavioral Patterns
      spendingVelocity,
      peakSpendingHours,
      peakSpendingDays,
      impulsePurchaseRatio,
      
      // Risk Indicators
      overdraftRisk,
      budgetAdherence,
      unusualActivityFlags,
      
      // Goals & Context
      currentBalance,
      monthlyBudget,
      savingsGoal,
      emergencyFundMonths,
    };
    
    return financialDNA;
  }

  /**
   * Get spending insights and recommendations
   */
  public getSpendingInsights(financialDNA: FinancialDNA): {
    insights: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    const { spendingBuckets, savingsRate, overdraftRisk, budgetAdherence, impulsePurchaseRatio } = financialDNA;

    // Spending pattern insights
    const topCategory = spendingBuckets[0];
    if (topCategory) {
      insights.push(`Your largest spending category is ${topCategory.category.replace('_', ' ')} (${topCategory.percentageOfTotal.toFixed(1)}% of total spend)`);
      
      if (topCategory.category === 'food_dining' && topCategory.percentageOfTotal > 30) {
        recommendations.push('Consider cooking more meals at home to reduce dining expenses');
      }
      
      if (topCategory.category === 'shopping' && topCategory.percentageOfTotal > 25) {
        recommendations.push('Try implementing a 24-hour waiting period before making non-essential purchases');
      }
      
      if (topCategory.category === 'entertainment' && topCategory.percentageOfTotal > 20) {
        recommendations.push('Look for free or low-cost entertainment alternatives');
      }
    }

    // Savings insights
    if (savingsRate < 10) {
      alerts.push('Your savings rate is very low. Consider increasing income or reducing expenses.');
      recommendations.push('Aim to save at least 20% of your income for a healthy financial future');
    } else if (savingsRate < 20) {
      recommendations.push('Good start on savings! Try to increase your savings rate to 20% for better financial security');
    } else {
      insights.push(`Excellent savings rate of ${savingsRate.toFixed(1)}%! You're on track for financial security`);
    }

    // Risk alerts
    if (overdraftRisk === 'high') {
      alerts.push('High overdraft risk detected. Consider reducing spending immediately.');
    } else if (overdraftRisk === 'medium') {
      recommendations.push('Monitor your spending closely to avoid potential overdraft');
    }

    // Budget adherence
    if (budgetAdherence < 70) {
      alerts.push('You are significantly over your monthly budget');
      recommendations.push('Review your spending categories and identify areas to cut back');
    } else if (budgetAdherence < 90) {
      recommendations.push('You are slightly over budget. Small adjustments can get you back on track');
    }

    // Impulse purchase insights
    if (impulsePurchaseRatio > 40) {
      insights.push('You make frequent small purchases which can add up quickly');
      recommendations.push('Consider bundling small purchases or using a shopping list to reduce impulse buying');
    }

    // Emergency fund
    if (financialDNA.emergencyFundMonths < 3) {
      recommendations.push('Build an emergency fund covering at least 3-6 months of expenses');
    } else if (financialDNA.emergencyFundMonths >= 6) {
      insights.push('Great job! You have a solid emergency fund');
    }

    return { insights, recommendations, alerts };
  }
}

export default new FinancialAnalyticsService();