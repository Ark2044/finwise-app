const pool = require('../config/db');

async function checkRahul() {
  const client = await pool.connect();
  try {
    // Find Rahul's user
    const userResult = await client.query(
      `SELECT id, name, email, mobile_number FROM users WHERE name LIKE '%Rahul%' OR email LIKE '%rahul%'`
    );
    console.log('Rahul users:', JSON.stringify(userResult.rows, null, 2));
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      console.log('\nChecking Financial DNA for user:', userId);
      
      const dnaResult = await client.query(
        `SELECT * FROM financial_dna WHERE user_id = $1`,
        [userId]
      );
      console.log('Financial DNA records:', dnaResult.rows.length);
      if (dnaResult.rows.length > 0) {
        console.log(JSON.stringify(dnaResult.rows, null, 2));
      }
      
      const txnResult = await client.query(
        `SELECT COUNT(*) FROM transactions WHERE user_id = $1`,
        [userId]
      );
      console.log('\nTransaction count:', txnResult.rows[0].count);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRahul();
