const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`);
  
  const filePath = path.join(__dirname, '..', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✅ Successfully ran migration: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to run migration ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migrations...\n');
  
  const migrations = [
    '004_crypto_columns.sql',
    '005_crypto_transactions.sql'
  ];
  
  let successCount = 0;
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) successCount++;
  }
  
  console.log(`\n✨ Completed ${successCount}/${migrations.length} migrations`);
  
  await pool.end();
  process.exit(successCount === migrations.length ? 0 : 1);
}

main();
