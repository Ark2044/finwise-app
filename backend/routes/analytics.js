/**
 * Financial Analytics and AI Coaching API Endpoints
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logTransaction } = require('../middleware/auditLogger');

function createAnalyticsRoutes(pool) {
  const router = express.Router();

  /**
   * Process and categorize a transaction with MCC
   */
  router.post('/transaction/categorize', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const { transactionId, mcc, category, merchantType } = req.body;
      const userId = req.user.id || req.user.userId;

      // Update transaction with categorization data
      await client.query(
        `UPDATE transactions 
         SET mcc = $1, category = $2, merchant_type = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [mcc, category, merchantType, transactionId, userId]
      );

      logTransaction('TRANSACTION_CATEGORIZED', { transactionId, category, mcc }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Transaction categorization error:', error);
      res.status(500).json({ error: 'Failed to categorize transaction' });
    } finally {
      client.release();
    }
  });

  /**
   * Get spending buckets for a user
   */
  router.get('/spending/buckets', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id || req.user.userId;
      const { startDate, endDate } = req.query;
      
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      // Use the database function to calculate spending buckets
      const result = await client.query(
        `SELECT * FROM calculate_spending_buckets($1, $2, $3) ORDER BY total_amount DESC`,
        [userId, start, end]
      );

      res.json({
        success: true,
        spendingBuckets: result.rows,
        period: { startDate: start, endDate: end }
      });
    } catch (error) {
      console.error('Spending buckets error:', error);
      res.status(500).json({ error: 'Failed to calculate spending buckets' });
    } finally {
      client.release();
    }
  });

  /**
   * Get top merchants for a user
   */
  router.get('/spending/merchants', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id || req.user.userId;
      const { startDate, endDate, limit = 10 } = req.query;
      
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const result = await client.query(`
        SELECT 
          receiver_name as name,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count,
          AVG(amount) as average_transaction,
          category,
          merchant_type
        FROM transactions 
        WHERE user_id = $1 
        AND created_at::date BETWEEN $2 AND $3
        AND status = 'success'
        AND receiver_name IS NOT NULL
        GROUP BY receiver_name, category, merchant_type
        ORDER BY total_amount DESC
        LIMIT $4
      `, [userId, start, end, limit]);

      res.json({
        success: true,
        topMerchants: result.rows.map(row => ({
          name: row.name,
          amount: parseFloat(row.total_amount),
          count: parseInt(row.transaction_count),
          averageTransaction: parseFloat(row.average_transaction),
          category: row.category,
          merchantType: row.merchant_type
        })),
        period: { startDate: start, endDate: end }
      });
    } catch (error) {
      console.error('Top merchants error:', error);
      res.status(500).json({ error: 'Failed to get top merchants' });
    } finally {
      client.release();
    }
  });

  /**
   * Generate Financial DNA for a user
   */
  router.post('/financial-dna/generate', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      // Debug logging
      console.log('req.user:', req.user);
      console.log('req.user.id:', req.user?.id);
      console.log('req.user.userId:', req.user?.userId);
      
      // Check if user is authenticated
      if (!req.user || (!req.user.id && !req.user.userId)) {
        console.error('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userId = req.user.id || req.user.userId;
      const { periodStart, periodEnd } = req.body;
      
      const start = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = periodEnd || new Date().toISOString();

      console.log('Generating Financial DNA for user:', userId);
      console.log('Period:', start, 'to', end);

      // Get user's transactions for the period
      const transactionsResult = await client.query(`
        SELECT 
          id, amount, receiver_name, receiver_vpa, transaction_note,
          created_at, status, mcc, category, merchant_type,
          transaction_hour, transaction_day_of_week, is_impulse_purchase
        FROM transactions 
        WHERE user_id = $1 
        AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `, [userId, start, end]);

      console.log('Found', transactionsResult.rows.length, 'transactions');

      // Get user's current balance
      const userResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
      const currentBalance = parseFloat(userResult.rows[0]?.balance || 0);

      // Get income transactions (for now, we'll simulate this - you can add income tracking)
      let incomeResult = { rows: [] };
      try {
        incomeResult = await client.query(`
          SELECT amount, created_at as date, 'simulated' as source, 'regular' as source_type
          FROM income_transactions 
          WHERE user_id = $1 
          AND transaction_date BETWEEN $2 AND $3
          ORDER BY transaction_date DESC
        `, [userId, start.split('T')[0], end.split('T')[0]]);
      } catch (incomeError) {
        console.log('No income transactions found, continuing with empty result:', incomeError.message);
        incomeResult = { rows: [] };
      }

      // Calculate analytics
      const transactions = transactionsResult.rows;
      const totalSpent = transactions.filter(t => t.status === 'success').reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Calculate spending buckets
      const bucketResult = await client.query(
        `SELECT * FROM calculate_spending_buckets($1, $2, $3) ORDER BY total_amount DESC`,
        [userId, start.split('T')[0], end.split('T')[0]]
      );

      // Calculate behavioral patterns
      const successfulTxns = transactions.filter(t => t.status === 'success');
      const daysDiff = Math.max(1, (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
      const spendingVelocity = successfulTxns.length / daysDiff;
      
      // Peak spending hours
      const hourCounts = new Array(24).fill(0);
      successfulTxns.forEach(t => {
        if (t.transaction_hour !== null) hourCounts[t.transaction_hour]++;
      });
      const peakSpendingHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => item.hour);

      // Peak spending days
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayCounts = new Array(7).fill(0);
      successfulTxns.forEach(t => {
        if (t.transaction_day_of_week !== null) dayCounts[t.transaction_day_of_week]++;
      });
      const peakSpendingDays = dayCounts
        .map((count, day) => ({ day: dayNames[day], count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
        .map(item => item.day);

      // Risk assessment
      const avgDailySpend = totalSpent / daysDiff;
      let overdraftRisk = 'low';
      const daysOfSpendingLeft = avgDailySpend > 0 ? currentBalance / avgDailySpend : 999;
      if (daysOfSpendingLeft < 3) overdraftRisk = 'high';
      else if (daysOfSpendingLeft < 10) overdraftRisk = 'medium';

      // Unusual activity flags
      const unusualActivityFlags = [];
      const amounts = successfulTxns.map(t => parseFloat(t.amount));
      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const maxAmount = Math.max(...amounts);
        if (maxAmount > avgAmount * 5) {
          unusualActivityFlags.push('Large unusual transaction detected');
        }
      }

      // Impulse purchases
      const impulsePurchases = successfulTxns.filter(t => t.is_impulse_purchase).length;
      const impulsePurchaseRatio = successfulTxns.length > 0 ? (impulsePurchases / successfulTxns.length) * 100 : 0;

      // Financial DNA object
      const financialDNA = {
        userId,
        generatedAt: Date.now(),
        periodStart: new Date(start).getTime(),
        periodEnd: new Date(end).getTime(),
        
        // Spending Analysis
        totalSpent,
        spendingBuckets: bucketResult.rows,
        topMerchants: [], // Will be populated separately
        averageDailySpend: avgDailySpend,
        highestSpendDay: { day: '', amount: 0 }, // Can be calculated from transactions
        
        // Income Analysis (simulated for now)
        incomePattern: {
          frequency: 'regular',
          averageMonthlyIncome: totalSpent * 1.2, // Assuming 20% savings rate
          incomeVariability: 0.1,
          incomeSources: ['Salary']
        },
        totalIncome: incomeResult.rows.reduce((sum, i) => sum + parseFloat(i.amount), 0),
        savingsRate: 20, // Simulated
        
        // Behavioral Patterns
        spendingVelocity,
        peakSpendingHours,
        peakSpendingDays,
        impulsePurchaseRatio,
        
        // Risk Indicators
        overdraftRisk,
        budgetAdherence: 85, // Simulated
        unusualActivityFlags,
        
        // Context
        currentBalance,
        monthlyBudget: null,
        savingsGoal: null,
        emergencyFundMonths: avgDailySpend > 0 ? currentBalance / (avgDailySpend * 30) : 0
      };

      // Verify userId before database insert
      if (!userId) {
        console.error('CRITICAL: userId is undefined before insert!');
        console.error('req.user:', req.user);
        throw new Error('UserId is undefined - cannot insert Financial DNA');
      }

      console.log('About to insert DNA for userId:', userId);

      // Store Financial DNA
      await client.query(`
        INSERT INTO financial_dna (
          user_id, period_start, period_end, total_spent, average_daily_spend,
          total_income, savings_rate, spending_velocity, impulse_purchase_ratio,
          overdraft_risk, budget_adherence, unusual_activity_flags,
          current_balance, emergency_fund_months, peak_spending_hours, peak_spending_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (user_id, period_start, period_end) DO UPDATE SET
          total_spent = EXCLUDED.total_spent,
          average_daily_spend = EXCLUDED.average_daily_spend
      `, [
        userId, start.split('T')[0], end.split('T')[0], totalSpent, avgDailySpend,
        financialDNA.totalIncome, financialDNA.savingsRate, spendingVelocity, impulsePurchaseRatio,
        overdraftRisk, financialDNA.budgetAdherence, unusualActivityFlags,
        currentBalance, financialDNA.emergencyFundMonths, peakSpendingHours, peakSpendingDays
      ]);

      logTransaction('FINANCIAL_DNA_GENERATED', { userId, periodDays: daysDiff }, req);

      res.json({
        success: true,
        financialDNA
      });
    } catch (error) {
      console.error('Financial DNA generation error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        user: req.user
      });
      res.status(500).json({ 
        error: 'Failed to generate Financial DNA',
        details: error.message 
      });
    } finally {
      client.release();
    }
  });

  /**
   * Get Financial DNA for AI coaching
   */
  router.get('/financial-dna', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id || req.user.userId;
      const { startDate, endDate } = req.query;
      
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      console.log('Fetching Financial DNA for user:', userId, 'period:', start, 'to', end);

      // Get latest Financial DNA - try to find one that overlaps with the period
      const dnaResult = await client.query(`
        SELECT * FROM financial_dna 
        WHERE user_id = $1 
        AND (
          (period_start::date <= $2::date AND period_end::date >= $2::date) OR
          (period_start::date <= $3::date AND period_end::date >= $3::date) OR
          (period_start::date >= $2::date AND period_end::date <= $3::date)
        )
        ORDER BY generated_at DESC 
        LIMIT 1
      `, [userId, start, end]);

      console.log('DNA query result:', dnaResult.rows.length, 'records found');

      // If no matching DNA found, try to get the most recent one for this user
      if (dnaResult.rows.length === 0) {
        console.log('No matching DNA, fetching most recent for user');
        const latestDna = await client.query(`
          SELECT * FROM financial_dna 
          WHERE user_id = $1
          ORDER BY generated_at DESC 
          LIMIT 1
        `, [userId]);
        
        if (latestDna.rows.length === 0) {
          console.log('No Financial DNA found for user:', userId);
          return res.status(404).json({ 
            error: 'No Financial DNA found. Generate one first.',
            userId: userId 
          });
        }
        
        dnaResult.rows[0] = latestDna.rows[0];
      }

      const dna = dnaResult.rows[0];

      // Get spending buckets
      const bucketsResult = await client.query(
        `SELECT * FROM calculate_spending_buckets($1, $2, $3) ORDER BY total_amount DESC`,
        [userId, start, end]
      );

      // Get top merchants
      const merchantsResult = await client.query(`
        SELECT 
          receiver_name as name,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM transactions 
        WHERE user_id = $1 
        AND created_at::date BETWEEN $2 AND $3
        AND status = 'success'
        GROUP BY receiver_name
        ORDER BY amount DESC
        LIMIT 10
      `, [userId, start, end]);

      const financialDNA = {
        userId: dna.user_id,
        generatedAt: dna.generated_at,
        periodStart: new Date(dna.period_start).getTime(),
        periodEnd: new Date(dna.period_end).getTime(),
        
        totalSpent: parseFloat(dna.total_spent),
        spendingBuckets: bucketsResult.rows,
        topMerchants: merchantsResult.rows.map(m => ({
          name: m.name,
          amount: parseFloat(m.amount),
          count: parseInt(m.count)
        })),
        averageDailySpend: parseFloat(dna.average_daily_spend),
        
        incomePattern: {
          frequency: dna.income_frequency || 'regular',
          averageMonthlyIncome: parseFloat(dna.average_monthly_income || 0),
          incomeVariability: parseFloat(dna.income_variability || 0),
          incomeSources: ['Salary'] // Simplified
        },
        totalIncome: parseFloat(dna.total_income || 0),
        savingsRate: parseFloat(dna.savings_rate || 0),
        
        spendingVelocity: parseFloat(dna.spending_velocity),
        peakSpendingHours: dna.peak_spending_hours || [],
        peakSpendingDays: dna.peak_spending_days || [],
        impulsePurchaseRatio: parseFloat(dna.impulse_purchase_ratio || 0),
        
        overdraftRisk: dna.overdraft_risk,
        budgetAdherence: parseInt(dna.budget_adherence || 100),
        unusualActivityFlags: dna.unusual_activity_flags || [],
        
        currentBalance: parseFloat(dna.current_balance),
        monthlyBudget: dna.monthly_budget ? parseFloat(dna.monthly_budget) : null,
        savingsGoal: dna.savings_goal ? parseFloat(dna.savings_goal) : null,
        emergencyFundMonths: parseFloat(dna.emergency_fund_months || 0)
      };

      res.json({
        success: true,
        financialDNA
      });
    } catch (error) {
      console.error('Financial DNA retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve Financial DNA' });
    } finally {
      client.release();
    }
  });

  /**
   * AI Coaching endpoint - provides financial DNA for external AI model
   */
  router.post('/ai/suggest', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id || req.user.userId;
      const { transactionId, requestType, userQuery } = req.body;

      // Get Financial DNA
      const dnaResult = await client.query(`
        SELECT * FROM financial_dna 
        WHERE user_id = $1 
        ORDER BY generated_at DESC 
        LIMIT 1
      `, [userId]);

      if (dnaResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'No Financial DNA found. Please generate your financial profile first.' 
        });
      }

      const dna = dnaResult.rows[0];

      // Get current transaction if specified
      let currentTransaction = null;
      if (transactionId) {
        const txnResult = await client.query(`
          SELECT * FROM transactions 
          WHERE id = $1 AND user_id = $2
        `, [transactionId, userId]);
        
        if (txnResult.rows.length > 0) {
          const txn = txnResult.rows[0];
          currentTransaction = {
            id: txn.id,
            amount: parseFloat(txn.amount),
            receiverVPA: txn.receiver_vpa,
            receiverName: txn.receiver_name,
            transactionNote: txn.transaction_note,
            timestamp: new Date(txn.created_at).getTime(),
            status: txn.status,
            mcc: txn.mcc,
            category: txn.category,
            merchantType: txn.merchant_type
          };
        }
      }

      // Get spending buckets
      const bucketsResult = await client.query(
        `SELECT * FROM calculate_spending_buckets($1, $2, $3) ORDER BY total_amount DESC`,
        [userId, dna.period_start, dna.period_end]
      );

      // Prepare AI coaching request data
      const financialDNA = {
        userId: dna.user_id,
        generatedAt: new Date(dna.generated_at).getTime(),
        periodStart: new Date(dna.period_start).getTime(),
        periodEnd: new Date(dna.period_end).getTime(),
        
        totalSpent: parseFloat(dna.total_spent),
        spendingBuckets: bucketsResult.rows,
        averageDailySpend: parseFloat(dna.average_daily_spend),
        
        savingsRate: parseFloat(dna.savings_rate || 0),
        spendingVelocity: parseFloat(dna.spending_velocity),
        impulsePurchaseRatio: parseFloat(dna.impulse_purchase_ratio || 0),
        
        overdraftRisk: dna.overdraft_risk,
        budgetAdherence: parseInt(dna.budget_adherence || 100),
        unusualActivityFlags: dna.unusual_activity_flags || [],
        
        currentBalance: parseFloat(dna.current_balance),
        emergencyFundMonths: parseFloat(dna.emergency_fund_months || 0)
      };

      const aiCoachingRequest = {
        financialDNA,
        currentTransaction,
        userQuery: userQuery || null,
        requestType: requestType || 'general_coaching'
      };

      // Log the AI coaching request
      await client.query(`
        INSERT INTO ai_coaching_logs (user_id, transaction_id, request_type, user_query, ai_advice, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, transactionId, requestType, userQuery, 'Coaching data provided', 'info']);

      res.json({
        success: true,
        coachingRequest: aiCoachingRequest,
        message: 'Financial DNA data ready for AI coaching model'
      });
    } catch (error) {
      console.error('AI coaching data error:', error);
      res.status(500).json({ error: 'Failed to prepare AI coaching data' });
    } finally {
      client.release();
    }
  });

  /**
   * Log AI coaching response
   */
  router.post('/ai/coaching-response', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id;
      const { 
        transactionId, 
        requestType, 
        advice, 
        severity, 
        actionItems = [], 
        relatedInsights = [] 
      } = req.body;

      await client.query(`
        INSERT INTO ai_coaching_logs (
          user_id, transaction_id, request_type, ai_advice, 
          severity, action_items, related_insights
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, transactionId, requestType, advice, severity, actionItems, relatedInsights]);

      res.json({ success: true, message: 'AI coaching response logged' });
    } catch (error) {
      console.error('AI coaching response logging error:', error);
      res.status(500).json({ error: 'Failed to log AI coaching response' });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = createAnalyticsRoutes;