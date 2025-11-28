// Spending category buckets
export type SpendingCategory = 
  | 'food_dining'
  | 'groceries'
  | 'transport'
  | 'fuel'
  | 'shopping'
  | 'entertainment'
  | 'utilities'
  | 'healthcare'
  | 'education'
  | 'travel'
  | 'bills'
  | 'transfers'
  | 'investments'
  | 'other';

export interface UPITransaction {
  id: string;
  amount: number;
  receiverVPA: string;
  receiverName: string;
  transactionNote?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  transactionRef?: string;
  paymentMethod: 'UPI';
  // MCC and categorization
  mcc?: string; // Merchant Category Code (4-digit)
  category?: SpendingCategory;
  merchantType?: string; // Human readable merchant type
}

export interface UPIQRData {
  pa: string; // Payee Address (VPA)
  pn: string; // Payee Name
  am?: string; // Amount
  cu?: string; // Currency
  tn?: string; // Transaction Note
  mc?: string; // Merchant Code
  tid?: string; // Transaction ID
  tr?: string; // Transaction Reference
  url?: string; // URL
  mode?: string; // Payment Mode
}

export interface User {
  id: string;
  name: string;
  vpa: string; // Virtual Payment Address
  mobileNumber: string;
  balance: number;
  upiPin?: string;
}

export interface PaymentRequest {
  amount: number;
  receiverVPA: string;
  receiverName: string;
  note?: string;
}

export interface TransactionReceipt {
  transactionId: string;
  amount: number;
  receiverName: string;
  receiverVPA: string;
  timestamp: number;
  status: 'success' | 'failed';
  utr?: string; // Unique Transaction Reference
  mcc?: string;
  category?: SpendingCategory;
}

// ============ FINANCIAL DNA & ANALYTICS ============

export interface SpendingBucket {
  category: SpendingCategory;
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
  averageTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastMonthAmount?: number;
}

export interface IncomePattern {
  frequency: 'regular' | 'irregular' | 'gig';
  averageMonthlyIncome: number;
  incomeVariability: number; // 0-1 scale
  incomeSources: string[];
  lastIncomeDate?: number;
}

export interface FinancialDNA {
  userId: string;
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  
  // Spending Analysis
  totalSpent: number;
  spendingBuckets: SpendingBucket[];
  topMerchants: { name: string; amount: number; count: number }[];
  averageDailySpend: number;
  highestSpendDay: { day: string; amount: number };
  
  // Income Analysis
  incomePattern: IncomePattern;
  totalIncome: number;
  savingsRate: number; // percentage
  
  // Behavioral Patterns
  spendingVelocity: number; // transactions per day
  peakSpendingHours: number[]; // hours of day (0-23)
  peakSpendingDays: string[]; // days of week
  impulsePurchaseRatio: number; // small frequent transactions
  
  // Risk Indicators
  overdraftRisk: 'low' | 'medium' | 'high';
  budgetAdherence: number; // 0-100 score
  unusualActivityFlags: string[];
  
  // Goals & Recommendations Context
  currentBalance: number;
  monthlyBudget?: number;
  savingsGoal?: number;
  emergencyFundMonths: number;
}

export interface AICoachingRequest {
  financialDNA: FinancialDNA;
  currentTransaction?: UPITransaction;
  userQuery?: string;
  requestType: 'transaction_advice' | 'spending_analysis' | 'savings_recommendation' | 'budget_alert' | 'general_coaching';
}

export interface AICoachingResponse {
  advice: string;
  severity: 'info' | 'warning' | 'alert';
  actionItems?: string[];
  relatedInsights?: string[];
}
