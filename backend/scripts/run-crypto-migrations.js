/**
 * Run Crypto Migrations Script
 * Executes SQL migrations for crypto features (004 and 005)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured in .env file!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting crypto migrations...\n');

    // Migration 004: Crypto columns
    console.log('📝 Running migration 004_crypto_columns.sql...');
    const migration004 = fs.readFileSync(
      path.join(__dirname, '../migrations/004_crypto_columns.sql'),
      'utf8'
    );
    await client.query(migration004);
    console.log('✅ Migration 004 completed successfully\n');

    // Migration 005: Crypto transactions table
    console.log('📝 Running migration 005_crypto_transactions.sql...');
    const migration005 = fs.readFileSync(
      path.join(__dirname, '../migrations/005_crypto_transactions.sql'),
      'utf8'
    );
    await client.query(migration005);
    console.log('✅ Migration 005 completed successfully\n');

    // Verify migrations
    console.log('🔍 Verifying migrations...');
    
    // Check if columns exist
    const columnsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('eth_balance', 'eth_balance_inr', 'eth_wallet_address', 'last_eth_sync')
      ORDER BY column_name;
    `);
    
    console.log('✓ Added columns to users table:');
    columnsCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check if crypto_transactions table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'crypto_transactions';
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✓ crypto_transactions table created');
      
      // Show table structure
      const structureCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'crypto_transactions'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n  Columns in crypto_transactions:');
      structureCheck.rows.forEach(row => {
        console.log(`    - ${row.column_name} (${row.data_type})`);
      });
    }

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added ETH balance tracking to users table');
    console.log('  - Created crypto_transactions table');
    console.log('  - Added necessary indexes');
    console.log('\n🎉 Database is ready for crypto features!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
