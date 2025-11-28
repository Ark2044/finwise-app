/**
 * Fix Financial DNA dates - regenerate for current period
 */

const pool = require('../config/db');

async function fixFinancialDNA() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Financial DNA records...\n');
    
    // Delete all existing Financial DNA records
    await client.query('DELETE FROM financial_dna');
    console.log('✓ Cleared old Financial DNA records\n');
    
    // Get all users
    const usersResult = await client.query('SELECT id, name, balance FROM users');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users\n`);
    
    for (const user of users) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      console.log(`Processing ${user.name}...`);
      
      // Calculate stats from transactions in the last 30 days
      const stats = await client.query(
        `SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_spent,
          AVG(CASE WHEN status = 'success' THEN amount ELSE NULL END) as avg_amount,
          COUNT(CASE WHEN is_impulse_purchase = true THEN 1 END) as impulse_count
         FROM transactions
         WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3`,
        [user.id, startDate, endDate]
      );
      
      const totalSpent = parseFloat(stats.rows[0].total_spent || 0);
      const avgDaily = totalSpent / 30;
      const txnCount = parseInt(stats.rows[0].total_count);
      const impulseRatio = txnCount > 0 
        ? (stats.rows[0].impulse_count / txnCount) * 100 
        : 0;
      
      console.log(`  Transactions: ${txnCount}, Total spent: ₹${totalSpent.toFixed(2)}`);
      
      // Determine risk level
      let overdraftRisk = 'low';
      const daysOfSpending = avgDaily > 0 ? user.balance / avgDaily : 999;
      if (daysOfSpending < 5) overdraftRisk = 'high';
      else if (daysOfSpending < 15) overdraftRisk = 'medium';
      
      // Calculate emergency fund months (cap at 99.9 to avoid overflow)
      const emergencyFundMonths = avgDaily > 0 
        ? Math.min(user.balance / (avgDaily * 30), 99.9)
        : 0;
      
      // Insert new DNA record
      await client.query(
        `INSERT INTO financial_dna (
          user_id, period_start, period_end, total_spent, average_daily_spend,
          total_income, savings_rate, spending_velocity, impulse_purchase_ratio,
          overdraft_risk, budget_adherence, current_balance, emergency_fund_months,
          peak_spending_hours, peak_spending_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          user.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          totalSpent,
          avgDaily,
          50000, // Simulated monthly income
          20, // 20% savings rate
          txnCount / 30, // Velocity
          impulseRatio,
          overdraftRisk,
          85, // Budget adherence
          user.balance,
          emergencyFundMonths,
          [10, 14, 19], // Peak hours
          ['Saturday', 'Sunday'] // Peak days
        ]
      );
      
      console.log(`  ✓ DNA generated for period ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
    }
    
    console.log('✅ All Financial DNA records fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixFinancialDNA()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
