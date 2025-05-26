#!/usr/bin/env node

/**
 * This script applies database migrations to Supabase
 * It creates a migration file with the attendance tables SQL
 * and uses the Supabase CLI to apply the migration
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Migration directory
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Create timestamp for migration name
const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const migrationName = `${timestamp}_attendance_tables`;
const migrationFilePath = path.join(MIGRATIONS_DIR, `${migrationName}.sql`);

async function main() {
  try {
    console.log('Setting up attendance tables migration...');

    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('Creating migrations directory...');
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    // Read the SQL for attendance tables
    const attendanceTablesSQL = fs.readFileSync(
      path.join(__dirname, 'create-attendance-tables.sql'),
      'utf8'
    );

    // Create migration file
    fs.writeFileSync(migrationFilePath, attendanceTablesSQL);
    console.log(`Migration file created: ${migrationFilePath}`);

    // Apply migration using Supabase CLI
    console.log('Applying migration to database...');
    
    // Option 1: Using supabase CLI directly (if installed)
    try {
      const { stdout, stderr } = await execPromise('npx supabase db push');
      console.log('Migration applied successfully!');
      console.log(stdout);
      if (stderr) {
        console.error('Migration warnings:', stderr);
      }
    } catch (error) {
      console.error('Error applying migration with Supabase CLI:', error);
      console.log('Attempting alternative method...');
      
      // Option 2: Alternative direct DB connection approach
      console.log('To apply this migration, you have a few options:');
      console.log('1. Run the migration using the Supabase CLI:');
      console.log('   npx supabase db push');
      console.log('2. Run the SQL directly in the Supabase dashboard SQL editor');
      console.log('3. Use the REST API to execute the SQL on your database');
      
      console.log('\nThe migration file has been created and is ready to use.');
    }
  } catch (error) {
    console.error('Error during migration setup:', error);
    process.exit(1);
  }
}

main(); 