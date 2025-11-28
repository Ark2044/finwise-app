/**
 * Seed Dummy Data Script
 * Populates the database with realistic dummy data for testing analytics
 */

const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Merchant categories and names
const merchantData = {
  food: ['Swiggy', 'Zomato', 'McDonald\'s', 'Domino\'s Pizza', 'Starbucks', 'Cafe Coffee Day'],
  shopping: ['Amazon Pay', 'Flipkart', 'Myntra', 'BigBasket', 'DMart Ready', 'Reliance Fresh'],
  transportation: ['Uber', 'Ola Cabs', 'Rapido', 'Indian Oil', 'HP Petrol', 'Metro Card'],
  utilities: ['BSES Electricity', 'Tata Sky', 'Jio Fiber', 'Airtel Postpaid', 'Vi Mobile', 'Gas Cylinder'],
  entertainment: ['BookMyShow', 'Netflix', 'Amazon Prime', 'Spotify', 'YouTube Premium', 'PVR Cinemas'],
  healthcare: ['Apollo Pharmacy', 'Practo', 'PharmEasy', 'Medlife', 'Dr. Reddy\'s Lab', 'Max Hospital'],
  education: ['Udemy', 'Coursera', 'Byju\'s', 'Khan Academy', 'Unacademy', 'Skillshare'],
  other: ['Amazon', 'Paytm Mall', 'Google Play', 'Microsoft Store', 'Apple Store']
};

const vpaTemplates = [
  '@paytm', '@phonepe', '@googlepay', '@amazonpay', '@bhim', '@ybl'
];

// MCC codes by category
const mccByCategory = {
  food: '5812',
  shopping: '5311',
  transportation: '4121',
  utilities: '4900',
  entertainment: '7832',
  healthcare: '8011',
  education: '8299',
  other: '5999'
};

// Generate random date within last N days
function randomDateInPast(daysAgo) {
  const now = new Date();
  const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

// Generate random amount based on category
function randomAmount(category) {
  const ranges = {
    food: [50, 800],
    shopping: [200, 5000],
    transportation: [30, 500],
    utilities: [300, 2500],
    entertainment: [100, 1500],
    healthcare: [150, 3000],
    education: [500, 5000],
    other: [100, 2000]
  };
  const [min, max] = ranges[category] || [50, 1000];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate VPA
function generateVPA(name) {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomNum = Math.floor(Math.random() * 9999);
  const provider = vpaTemplates[Math.floor(Math.random() * vpaTemplates.length)];
  return `${cleanName}${randomNum}${provider}`;
}

async function seedData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Create dummy users
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const users = [
      { name: 'Rahul Sharma', mobile: '+919876543210', email: 'rahul.sharma@example.com', vpa: 'rahul.sharma@paytm', balance: 15000 },
      { name: 'Priya Patel', mobile: '+919876543211', email: 'priya.patel@example.com', vpa: 'priya.patel@phonepe', balance: 22000 },
      { name: 'Amit Kumar', mobile: '+919876543212', email: 'amit.kumar@example.com', vpa: 'amit.kumar@googlepay', balance: 8500 },
      { name: 'Sneha Reddy', mobile: '+919876543213', email: 'sneha.reddy@example.com', vpa: 'sneha.reddy@paytm', balance: 35000 },
      { name: 'Vikram Singh', mobile: '+919876543214', email: 'vikram.singh@example.com', vpa: 'vikram.singh@phonepe', balance: 12000 }
    ];
    
    console.log('👤 Creating users...');
    const userIds = [];
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (id, name, mobile_number, email, vpa, upi_pin_hash, password_hash, balance, kyc_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (mobile_number) DO UPDATE SET balance = EXCLUDED.balance
         RETURNING id`,
        [uuidv4(), user.name, user.mobile, user.email, user.vpa, hashedPassword, hashedPassword, user.balance]
      );
      userIds.push({ id: result.rows[0].id, name: user.name, balance: user.balance });
      console.log(`   ✓ ${user.name}`);
    }
    
    // Generate transactions for each user
    console.log('\n💳 Generating transactions...');
    let totalTransactions = 0;
    
    for (const user of userIds) {
      const numTransactions = 50 + Math.floor(Math.random() * 100); // 50-150 transactions per user
      
      for (let i = 0; i < numTransactions; i++) {
        const category = Object.keys(merchantData)[Math.floor(Math.random() * Object.keys(merchantData).length)];
        const merchants = merchantData[category];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const amount = randomAmount(category);
        const date = randomDateInPast(90); // Last 90 days
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const mcc = mccByCategory[category];
        const isImpulse = amount < 500;
        
        // 95% success rate
        const status = Math.random() < 0.95 ? 'success' : 'failed';
        
        try {
          const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
          await client.query(
            `INSERT INTO transactions (
              id, transaction_id, user_id, amount, receiver_name, receiver_vpa, transaction_note,
              status, mcc, category, merchant_type, transaction_hour,
              transaction_day_of_week, is_impulse_purchase, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              uuidv4(),
              transactionId,
              user.id,
              amount,
              merchant,
              generateVPA(merchant),
              `Payment to ${merchant}`,
              status,
              mcc,
              category,
              merchant,
              hour,
              dayOfWeek,
              isImpulse,
              date
            ]
          );
          totalTransactions++;
        } catch (error) {
          // Log first error for debugging
          if (totalTransactions === 0) {
            console.error('   Transaction insert error:', error.message);
          }
        }
      }
      console.log(`   ✓ ${user.name}: Generated ~${numTransactions} transactions`);
    }
    
    console.log(`   Total: ${totalTransactions} transactions created`);
    
    // Generate income transactions
    console.log('\n💰 Generating income transactions...');
    let totalIncome = 0;
    
    for (const user of userIds) {
      // 3 months of salary
      for (let month = 0; month < 3; month++) {
        const salaryDate = new Date();
        salaryDate.setMonth(salaryDate.getMonth() - month);
        salaryDate.setDate(1); // First of the month
        
        const salary = 30000 + Math.floor(Math.random() * 50000); // 30k-80k
        
        await client.query(
          `INSERT INTO income_transactions (
            id, user_id, amount, source, source_type, description, transaction_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            user.id,
            salary,
            'Monthly Salary',
            'regular',
            'Salary credited',
            salaryDate
          ]
        );
        totalIncome++;
        
        // Random freelance income (50% chance)
        if (Math.random() < 0.5) {
          const freelanceDate = randomDateInPast(90);
          const freelanceAmount = 5000 + Math.floor(Math.random() * 20000);
          
          await client.query(
            `INSERT INTO income_transactions (
              id, user_id, amount, source, source_type, description, transaction_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              user.id,
              freelanceAmount,
              'Freelance Project',
              'irregular',
              'Project payment received',
              freelanceDate
            ]
          );
          totalIncome++;
        }
      }
      console.log(`   ✓ ${user.name}: Income records created`);
    }
    
    console.log(`   Total: ${totalIncome} income transactions created`);
    
    // Generate Financial DNA for each user
    console.log('\n🧬 Generating Financial DNA...');
    
    for (const user of userIds) {
      // Use current date for DNA generation
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      // Calculate stats from transactions in the last 30 days
      const stats = await client.query(
        `SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_spent,
          AVG(CASE WHEN status = 'success' THEN amount ELSE NULL END) as avg_amount,
          COUNT(CASE WHEN is_impulse_purchase = true THEN 1 END) as impulse_count
         FROM transactions
         WHERE user_id = $1 AND created_at >= $2`,
        [user.id, startDate]
      );
      
      const totalSpent = parseFloat(stats.rows[0].total_spent || 0);
      const avgDaily = totalSpent / 30;
      const impulseRatio = stats.rows[0].total_count > 0 
        ? (stats.rows[0].impulse_count / stats.rows[0].total_count) * 100 
        : 0;
      
      // Determine risk level
      let overdraftRisk = 'low';
      const daysOfSpending = avgDaily > 0 ? user.balance / avgDaily : 999;
      if (daysOfSpending < 5) overdraftRisk = 'high';
      else if (daysOfSpending < 15) overdraftRisk = 'medium';
      
      // Calculate emergency fund months (cap at 99.9 to avoid overflow)
      const emergencyFundMonths = avgDaily > 0 
        ? Math.min(user.balance / (avgDaily * 30), 99.9)
        : 0;
      
      await client.query(
        `INSERT INTO financial_dna (
          id, user_id, period_start, period_end, total_spent, average_daily_spend,
          total_income, savings_rate, spending_velocity, impulse_purchase_ratio,
          overdraft_risk, budget_adherence, current_balance, emergency_fund_months,
          peak_spending_hours, peak_spending_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (user_id, period_start, period_end) DO UPDATE SET
          total_spent = EXCLUDED.total_spent,
          average_daily_spend = EXCLUDED.average_daily_spend`,
        [
          uuidv4(),
          user.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          totalSpent,
          avgDaily,
          50000, // Simulated monthly income
          20, // 20% savings rate
          stats.rows[0].total_count / 30, // Velocity
          impulseRatio,
          overdraftRisk,
          85, // Budget adherence
          user.balance,
          emergencyFundMonths,
          [10, 14, 19], // Peak hours
          ['Saturday', 'Sunday'] // Peak days
        ]
      );
      console.log(`   ✓ ${user.name}: DNA generated`);
    }
    
    // Generate financial goals
    console.log('\n🎯 Creating financial goals...');
    const goalTypes = [
      { type: 'savings', name: 'Emergency Fund', target: 100000 },
      { type: 'savings', name: 'Vacation Fund', target: 50000 },
      { type: 'budget', name: 'Monthly Food Budget', target: 10000, category: 'food' },
      { type: 'budget', name: 'Monthly Shopping Budget', target: 15000, category: 'shopping' }
    ];
    
    let totalGoals = 0;
    for (const user of userIds) {
      // Random 2-3 goals per user
      const numGoals = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numGoals; i++) {
        const goal = goalTypes[Math.floor(Math.random() * goalTypes.length)];
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 6); // 6 months from now
        
        const currentAmount = Math.floor(goal.target * (0.2 + Math.random() * 0.3)); // 20-50% progress
        
        await client.query(
          `INSERT INTO financial_goals (
            id, user_id, goal_type, goal_name, target_amount, current_amount,
            target_date, category, is_active, progress_percentage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            user.id,
            goal.type,
            goal.name,
            goal.target,
            currentAmount,
            targetDate,
            goal.category || null,
            true,
            (currentAmount / goal.target) * 100
          ]
        );
        totalGoals++;
      }
    }
    console.log(`   Total: ${totalGoals} goals created`);
    
    // Generate budget allocations
    console.log('\n📊 Creating budget allocations...');
    const categories = ['food', 'shopping', 'transportation', 'utilities', 'entertainment'];
    let totalBudgets = 0;
    
    for (const user of userIds) {
      const startDate = new Date();
      startDate.setDate(1); // First of month
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month
      
      for (const category of categories) {
        const allocated = 2000 + Math.floor(Math.random() * 8000); // 2k-10k per category
        
        // Calculate spent from transactions
        const spentResult = await client.query(
          `SELECT COALESCE(SUM(amount), 0) as spent
           FROM transactions
           WHERE user_id = $1 AND category = $2 
           AND created_at >= $3 AND status = 'success'`,
          [user.id, category, startDate]
        );
        
        const spent = parseFloat(spentResult.rows[0].spent);
        
        await client.query(
          `INSERT INTO budget_allocations (
            id, user_id, category, allocated_amount, spent_amount,
            budget_period, start_date, end_date, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (user_id, category, start_date, end_date) DO UPDATE SET
            spent_amount = EXCLUDED.spent_amount`,
          [
            uuidv4(),
            user.id,
            category,
            allocated,
            spent,
            'monthly',
            startDate,
            endDate,
            true
          ]
        );
        totalBudgets++;
      }
    }
    console.log(`   Total: ${totalBudgets} budget allocations created`);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log(`\n📈 Summary:`);
    console.log(`   Users: ${userIds.length}`);
    console.log(`   Transactions: ${totalTransactions}`);
    console.log(`   Income Records: ${totalIncome}`);
    console.log(`   Financial DNA: ${userIds.length}`);
    console.log(`   Goals: ${totalGoals}`);
    console.log(`   Budgets: ${totalBudgets}`);
    console.log(`\n🔑 Login credentials for all users:`);
    console.log(`   Password: Password123!`);
    console.log(`   Mobile numbers: +919876543210 to +919876543214`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed script
seedData()
  .then(() => {
    console.log('\n🎉 Seeding process finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
