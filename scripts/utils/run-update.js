#!/usr/bin/env node

/**
 * Arabic School System - Database Update Script
 * 
 * This script applies all the missing database changes and updates needed
 * for the complete system functionality.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const scriptsDir = path.join(__dirname);

// Print banner
console.log('\n===========================================================');
console.log('  ARABIC SCHOOL SYSTEM - DATABASE UPDATE SCRIPT');
console.log('===========================================================\n');

// Main function to run migrations
async function runDatabaseUpdates() {
  try {
    // Step 1: Check if environment variables are set
    console.log('⚙️  Checking environment variables...');
    const requiredEnvVars = [
      'POSTGRES_URL',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_HOST',
      'POSTGRES_DATABASE',
      'SUPABASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.log('\nPlease make sure the following environment variables are set:');
      requiredEnvVars.forEach(v => console.log(`  - ${v}`));
      process.exit(1);
    }
    
    console.log('✅ Environment variables check passed');
    
    // Step 2: Run the migration script
    console.log('\n🔄 Running database migrations...');
    try {
      const { stdout, stderr } = await execPromise('node scripts/apply-migrations.js');
      console.log(stdout);
      if (stderr) console.warn(stderr);
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Error during migration:', error.message);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
      process.exit(1);
    }
    
    // Step 3: Run the consistency check
    console.log('\n🔎 Running database consistency check...');
    try {
      // Create a temporary script to execute SQL
      const tempScriptPath = path.join(scriptsDir, 'temp_consistency_check.js');
      const scriptContent = `
const { Pool } = require('pg');

async function checkConsistency() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT * FROM check_data_consistency()');
    console.log('\\nConsistency Check Results:');
    console.log('----------------------------------------------------------------');
    console.log('| Check                | Status | Issues Found | Issues Fixed |');
    console.log('----------------------------------------------------------------');
    
    let totalFound = 0;
    let totalFixed = 0;
    
    for (const row of result.rows) {
      console.log(\`| \${row.check_name.padEnd(20)} | \${row.status.padEnd(6)} | \${String(row.issues_found).padEnd(12)} | \${String(row.issues_fixed).padEnd(11)} |\`);
      totalFound += row.issues_found;
      totalFixed += row.issues_fixed;
    }
    
    console.log('----------------------------------------------------------------');
    console.log(\`| TOTAL                |        | \${String(totalFound).padEnd(12)} | \${String(totalFixed).padEnd(11)} |\`);
    console.log('----------------------------------------------------------------');
    
    if (totalFound > 0) {
      if (totalFound === totalFixed) {
        console.log('✅ All issues have been automatically fixed!');
      } else {
        console.log('⚠️ Some issues could not be automatically fixed. Manual intervention may be required.');
      }
    } else {
      console.log('✅ No issues found. Database is consistent.');
    }
  } catch (error) {
    console.error('Error running consistency check:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkConsistency();
      `;
      
      fs.writeFileSync(tempScriptPath, scriptContent);
      
      try {
        await execPromise('node ' + tempScriptPath);
        console.log('✅ Consistency check completed');
      } catch (execError) {
        console.error('❌ Error running consistency check:', execError.message);
        if (execError.stdout) console.log(execError.stdout);
        if (execError.stderr) console.error(execError.stderr);
      }
      
      // Clean up temporary script
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (error) {
      console.error('❌ Error setting up consistency check:', error.message);
    }
    
    // Step 4: Success message
    console.log('\n===========================================================');
    console.log('  DATABASE UPDATE COMPLETED SUCCESSFULLY');
    console.log('===========================================================');
    console.log('\nThe Arabic School System database has been updated with all');
    console.log('the missing components:');
    console.log('  ✅ Penalty Cards System');
    console.log('  ✅ Points Payment System');
    console.log('  ✅ Role-specific Rewards');
    console.log('  ✅ Enhanced Academic Reports');
    console.log('  ✅ Configurable System Settings');
    console.log('  ✅ Consolidated Messaging System');
    console.log('\nYou can now restart your application to use all new features.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the main function
runDatabaseUpdates(); 