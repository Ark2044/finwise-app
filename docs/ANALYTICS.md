# FinWise Financial Analytics & AI Coaching System 🚀

## Overview

FinWise now includes advanced financial analytics and AI coaching capabilities, similar to BHIM UPI's merchant categorization system. The app automatically extracts MCC (Merchant Category Codes) from UPI QR codes, categorizes transactions, and generates a comprehensive "Financial DNA" profile for AI-powered coaching.

## 🆕 New Features

### 1. **MCC-Based Transaction Categorization**
- **Automatic MCC Extraction**: Scans UPI QR codes to extract 4-digit Merchant Category Codes
- **Smart Categorization**: Maps 200+ MCC codes to 15 spending categories
- **Merchant Recognition**: Pattern-matches popular Indian merchants (Swiggy, Zomato, Uber, etc.)
- **Fallback Logic**: Uses merchant name patterns when MCC is unavailable

### 2. **Financial Analytics Dashboard**
- **Spending Buckets**: Visual breakdown by category with percentages
- **Top Merchants**: Most frequent payment recipients
- **Behavioral Patterns**: Peak spending hours and days
- **Trend Analysis**: Increasing/decreasing spending patterns
- **Risk Assessment**: Overdraft risk calculation

### 3. **Financial DNA Generation**
- **Comprehensive Profiling**: 25+ financial behavioral indicators
- **Income Analysis**: Pattern recognition for regular/irregular/gig income
- **Spending Velocity**: Transaction frequency analysis
- **Impulse Purchase Detection**: Small transaction pattern identification
- **Emergency Fund Assessment**: Financial safety net evaluation

### 4. **AI Coaching Integration**
- **RESTful API**: Structured data export for AI models
- **Real-time Analysis**: Transaction-level coaching data
- **Personalized Insights**: Category-specific recommendations
- **Risk Alerts**: Unusual activity detection and warnings

## 📊 Spending Categories

The system categorizes transactions into these buckets:

- 🍽️ **Food & Dining**: Restaurants, cafes, food delivery
- 🛒 **Groceries**: Supermarkets, grocery delivery
- 🚗 **Transport**: Ride-sharing, public transport, parking
- ⛽ **Fuel**: Petrol stations, fuel payments
- 🛍️ **Shopping**: Retail stores, e-commerce, clothing
- 🎬 **Entertainment**: Movies, streaming, gaming, events
- 💡 **Utilities**: Phone, internet, electricity, gas bills
- 🏥 **Healthcare**: Hospitals, doctors, pharmacy, insurance
- 📚 **Education**: Schools, courses, books, training
- ✈️ **Travel**: Hotels, flights, vacation expenses
- 📄 **Bills**: Government payments, taxes, official fees
- 💰 **Transfers**: Bank transfers, P2P payments
- 📈 **Investments**: Mutual funds, stocks, SIP
- 📦 **Other**: Miscellaneous transactions

## 🔧 Technical Implementation

### Database Schema

New tables added for analytics:
- `spending_buckets`: Category-wise spending summaries
- `financial_dna`: User financial behavior profiles
- `top_merchants`: Frequent merchant tracking
- `ai_coaching_logs`: AI interaction history
- `financial_goals`: User-defined financial targets
- `income_transactions`: Income source tracking
- `budget_allocations`: Category budget management

### API Endpoints

#### Analytics Endpoints
```
GET /analytics/spending/buckets?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /analytics/spending/merchants?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
POST /analytics/financial-dna/generate
GET /analytics/financial-dna
POST /analytics/ai/coaching-data
POST /analytics/ai/coaching-response
```

#### Financial DNA Structure
```json
{
  "userId": "uuid",
  "generatedAt": timestamp,
  "periodStart": timestamp,
  "periodEnd": timestamp,
  
  // Spending Analysis
  "totalSpent": 15000.0,
  "spendingBuckets": [...],
  "topMerchants": [...],
  "averageDailySpend": 500.0,
  
  // Income Analysis
  "incomePattern": {
    "frequency": "regular|irregular|gig",
    "averageMonthlyIncome": 50000.0,
    "incomeVariability": 0.15,
    "incomeSources": ["Salary", "Freelance"]
  },
  "savingsRate": 20.5,
  
  // Behavioral Patterns
  "spendingVelocity": 3.2,
  "peakSpendingHours": [12, 19, 21],
  "peakSpendingDays": ["Saturday", "Sunday"],
  "impulsePurchaseRatio": 25.0,
  
  // Risk Indicators
  "overdraftRisk": "low|medium|high",
  "budgetAdherence": 85,
  "unusualActivityFlags": [...],
  
  // Context
  "currentBalance": 25000.0,
  "emergencyFundMonths": 3.2
}
```

## 🚀 Setup Instructions

### 1. Database Setup
```bash
cd backend
npm run setup-analytics
```

This will:
- Create all analytics tables
- Add MCC and category columns to transactions
- Set up database functions for calculations
- Create indexes for performance

### 2. Mobile App Features

#### QR Scanning with MCC
When scanning QR codes, the app now:
1. Extracts MCC from the QR code data
2. Maps MCC to spending category
3. Identifies merchant type
4. Shows category badge on payment confirmation
5. Stores analytics data with transaction

#### Analytics Dashboard
Access via main dashboard "Analytics" button:
- Period selection (7D, 30D, 90D)
- Visual spending breakdown
- Financial overview cards
- AI insights and recommendations
- Risk assessment indicators

### 3. AI Coaching Integration

#### Getting Financial DNA for AI Model
```javascript
// POST /analytics/ai/coaching-data
{
  "requestType": "spending_analysis",
  "userQuery": "Analyze my spending and give recommendations"
}

// Response includes complete Financial DNA
{
  "success": true,
  "coachingRequest": {
    "financialDNA": { ... },
    "currentTransaction": { ... },
    "userQuery": "...",
    "requestType": "spending_analysis"
  }
}
```

#### Use Cases for AI Coaching
1. **Transaction-Level Advice**: Real-time spending guidance
2. **Weekly Reviews**: Spending pattern analysis
3. **Budget Planning**: Category-wise recommendations
4. **Risk Warnings**: Overdraft and unusual activity alerts
5. **Goal Setting**: Savings and investment guidance

## 📱 User Experience Flow

### 1. **Enhanced QR Scanning**
```
User scans QR → Extract MCC → Categorize → Show merchant type → Confirm payment
```

### 2. **Transaction Processing**
```
Process payment → Store with analytics data → Update spending buckets → Generate insights
```

### 3. **Analytics Dashboard**
```
View dashboard → Select period → See spending breakdown → Get AI insights → Request coaching
```

### 4. **AI Coaching**
```
Request analysis → Generate Financial DNA → Send to AI model → Receive recommendations → Log response
```

## 🎯 AI Coaching Model Integration

Your AI model will receive structured data including:

- **Spending Patterns**: Category breakdown, trends, velocity
- **Income Analysis**: Regularity, sources, variability
- **Behavioral Data**: Peak times, impulse purchases, merchants
- **Risk Indicators**: Overdraft risk, unusual activity
- **Context**: Balance, goals, budget adherence

### Sample AI Prompts
Based on the Financial DNA, you can create prompts like:

```
"User spends 35% on food delivery, has irregular income, 
overdraft risk is medium, and makes 40% impulse purchases. 
Provide personalized financial coaching advice."
```

## 🔒 Privacy & Security

- All financial data is encrypted and stored securely
- Row-Level Security (RLS) ensures user data isolation
- API endpoints require JWT authentication
- Audit logging tracks all analytics operations
- No sensitive data is exposed in API responses

## 🚀 Future Enhancements

1. **Machine Learning**: Automatic anomaly detection
2. **Predictive Analytics**: Future spending forecasts
3. **Goal Tracking**: Progress monitoring and alerts
4. **Social Features**: Anonymous benchmarking
5. **Advanced AI**: Conversational financial advisor
6. **Investment Tracking**: Portfolio analysis integration

## 📊 Sample Financial DNA Output

For a user with 30 days of transaction data:

```json
{
  "userId": "user123",
  "totalSpent": 18500,
  "spendingBuckets": [
    {"category": "food_dining", "totalAmount": 6475, "percentage": 35.0},
    {"category": "transport", "totalAmount": 3700, "percentage": 20.0},
    {"category": "shopping", "totalAmount": 2775, "percentage": 15.0}
  ],
  "spendingVelocity": 2.3,
  "savingsRate": 22.5,
  "overdraftRisk": "low",
  "peakSpendingHours": [13, 20, 22],
  "impulsePurchaseRatio": 28.0,
  "emergencyFundMonths": 4.2,
  "unusualActivityFlags": [],
  "budgetAdherence": 92
}
```

This Financial DNA provides a complete picture of the user's financial behavior, enabling personalized AI coaching and recommendations.

## 🎉 Success Metrics

Track these KPIs to measure the system's effectiveness:
- **Categorization Accuracy**: % of transactions correctly categorized
- **User Engagement**: Analytics dashboard usage
- **AI Coaching Uptake**: Requests for financial advice
- **Behavioral Change**: Improvement in financial metrics
- **User Satisfaction**: Feedback on insights quality

Your FinWise app now provides BHIM-level transaction intelligence with AI-ready financial profiling! 🚀