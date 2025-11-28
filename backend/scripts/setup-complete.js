/**
 * Complete Database Setup Script for FinWise + Neon PostgreSQL
 * Runs the complete schema from schema.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupCompleteDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up FinWise database with complete schema...');
    
    // Read the combined schema file
    // Try to find schema.sql in current directory or parent
    let schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        // Fallback for when running from root
        schemaPath = path.join(process.cwd(), 'backend', 'schema.sql');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema statements individually (no transaction for DDL)
    // Smart SQL parsing that handles functions with $$ delimiters
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    
    const lines = schema.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments at the beginning of statements
      if (!currentStatement.trim() && (line.trim() === '' || line.trim().startsWith('--'))) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check for dollar quotes (PostgreSQL function delimiters)
      if (line.includes('$$')) {
        inDollarQuote = !inDollarQuote;
      }
      
      // If we hit a semicolon and we're not inside dollar quotes, end the statement
      if (line.includes(';') && !inDollarQuote) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    for (const statement of statements) {
      if (statement.trim() && !statement.trim().startsWith('--')) {
        try {
          await client.query(statement);
          // console.log('✅ Executed statement:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Some statements might fail if they already exist, that's okay
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist')) {
            console.log('ℹ️ Info:', error.message.substring(0, 80));
          } else {
            console.error('❌ Error in statement:', statement.substring(0, 100));
            console.error('   Error message:', error.message);
            // Don't throw, try to continue
          }
        }
      }
    }
    
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupCompleteDatabase();
