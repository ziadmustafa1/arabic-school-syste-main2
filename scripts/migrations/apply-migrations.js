#!/usr/bin/env node

/**
 * Unified Database Migration System
 * 
 * This script applies all database migrations to Supabase in a consistent order
 * It tracks which migrations have been applied and only applies new ones
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const SCRIPTS_DIR = path.join(__dirname);
const MIGRATION_LOG = path.join(__dirname, 'migration_log.json');

// Ordered list of migration scripts - maintain this order for dependencies
const MIGRATION_SCRIPTS = [
  { name: 'create-database-schema.sql', description: 'Base database schema' },
  { name: 'create-helper-functions.sql', description: 'Helper functions' },
  { name: 'create-stored-procedures.sql', description: 'Generic stored procedures' },
  { name: 'create-system-configuration.sql', description: 'Configurable settings system' },
  { name: 'create-class-tables.sql', description: 'Class management tables' },
  { name: 'create-attendance-tables.sql', description: 'Attendance tracking system' },
  { name: 'create-messaging-tables.sql', description: 'Messaging system' },
  { name: 'create-rewards-tables.sql', description: 'Rewards system' },
  { name: 'create-points-analytics-functions.sql', description: 'Points analytics' },
  { name: 'create-user-points-function.sql', description: 'User points calculations' },
  { name: 'create-system-stats-function.sql', description: 'System statistics' },
  { name: 'create-report-procedures.sql', description: 'Reporting procedures' },
  { name: 'enhance-reporting-system.sql', description: 'Enhanced academic reporting' },
  { name: 'update-rewards-table.sql', description: 'Role-specific rewards' },
  { name: 'complete-role-specific-rewards.sql', description: 'Complete role-specific rewards system' },
  { name: 'create-username-generation.sql', description: 'Username generation' },
  { name: 'create-parent-student-system.sql', description: 'Parent-student relationships' },
  { name: 'create-badges-system.sql', description: 'Badges and achievements' },
  { name: 'create-penalty-cards-system.sql', description: 'Penalty cards system' },
  { name: 'create-points-payment-system.sql', description: 'Points payment system' },
  { name: 'fix-ambiguous-column-references.sql', description: 'Fix column ambiguity' },
  { name: 'fix-points-functions.sql', description: 'Fix points calculation' },
  { name: 'fix-user-rank.sql', description: 'Fix user ranking' },
  { name: 'fix-monthly-points.sql', description: 'Fix monthly points report' },
  { name: 'fix-messaging-tables.sql', description: 'Fix messaging system' },
  { name: 'combined-fix-functions.sql', description: 'Combined function fixes' },
  { name: 'apply-system-updates.sql', description: 'Apply system updates' }
];

// Get list of previously applied migrations
function getPreviousMigrations() {
  try {
    if (fs.existsSync(MIGRATION_LOG)) {
      const log = JSON.parse(fs.readFileSync(MIGRATION_LOG, 'utf8'));
      return log.applied || [];
    }
  } catch (error) {
    console.error('Error reading migration log:', error);
  }
  return [];
}

// Save applied migrations
function saveMigrationLog(applied) {
  try {
    fs.writeFileSync(MIGRATION_LOG, JSON.stringify({ applied, last_updated: new Date().toISOString() }, null, 2));
  } catch (error) {
    console.error('Error writing migration log:', error);
  }
}

// Create a single timestamped migration file from multiple scripts
async function createMigrationFile(migrations) {
  try {
    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('Creating migrations directory...');
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const migrationName = `${timestamp}_combined_migration`;
    const migrationFilePath = path.join(MIGRATIONS_DIR, `${migrationName}.sql`);

    let combinedSQL = '-- Combined migration file\n\n';

    // Add transaction wrapper
    combinedSQL += 'BEGIN;\n\n';

    // Create migrations tracking table if it doesn't exist
    combinedSQL += `
-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

`;

    // Add each migration script
    for (const migration of migrations) {
      const scriptPath = path.join(SCRIPTS_DIR, migration.name);
      if (fs.existsSync(scriptPath)) {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        combinedSQL += `-- Migration: ${migration.name}\n`;
        combinedSQL += `-- Description: ${migration.description}\n`;
        combinedSQL += scriptContent;
        combinedSQL += '\n\n';
        
        // Add record of this migration
        combinedSQL += `-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('${migration.name}', '${migration.description}')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;
\n\n`;
      } else {
        console.warn(`Warning: Migration script ${migration.name} not found`);
      }
    }

    // Close transaction
    combinedSQL += 'COMMIT;';

    // Write the combined file
    fs.writeFileSync(migrationFilePath, combinedSQL);
    console.log(`Combined migration file created: ${migrationFilePath}`);
    
    return migrationFilePath;
  } catch (error) {
    console.error('Error creating migration file:', error);
    throw error;
  }
}

// Apply migration using Supabase CLI
async function applyMigration(migrationFilePath) {
  try {
    console.log('Applying migration to database...');
    
    // Option 1: Using supabase CLI
    try {
      const { stdout, stderr } = await execPromise('npx supabase db push');
      console.log('Migration applied successfully with Supabase CLI!');
      console.log(stdout);
      if (stderr) {
        console.warn('Migration warnings:', stderr);
      }
      return true;
    } catch (error) {
      console.error('Error applying migration with Supabase CLI:', error);
      console.log('Falling back to alternative method...');
      
      // Option 2: Direct SQL execution via environment variables
      try {
        // Create a temporary script to execute the SQL using the Supabase credentials
        const tempScriptPath = path.join(__dirname, 'temp_execute_migration.js');
        
        const scriptContent = `
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const migrationSQL = fs.readFileSync('${migrationFilePath}', 'utf8');
    console.log('Executing SQL migration...');
    await pool.query(migrationSQL);
    console.log('Migration successfully applied!');
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeMigration();
`;

        fs.writeFileSync(tempScriptPath, scriptContent);
        
        try {
          await execPromise('node ' + tempScriptPath);
          console.log('Migration applied successfully with direct SQL!');
          // Clean up temporary script
          fs.unlinkSync(tempScriptPath);
          return true;
        } catch (execError) {
          console.error('Error executing direct SQL migration:', execError);
          // Clean up temporary script
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
          }
        }
      } catch (fallbackError) {
        console.error('Error with fallback migration method:', fallbackError);
      }
      
      // Option 3: Manual instructions
      console.log('\nAutomatic migration failed. Please apply this migration manually:');
      console.log(`1. Go to the Supabase dashboard SQL Editor`);
      console.log(`2. Open and execute the migration file: ${migrationFilePath}`);
      console.log(`3. Or execute it via the Supabase CLI: npx supabase db push`);
      
      return false;
    }
  } catch (error) {
    console.error('Migration application error:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting database migration process...');
    
    // Get previously applied migrations
    const appliedMigrations = getPreviousMigrations();
    
    // Filter out already applied migrations
    const pendingMigrations = MIGRATION_SCRIPTS.filter(
      migration => !appliedMigrations.includes(migration.name)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No new migrations to apply. Database is up to date!');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations to apply:`);
    pendingMigrations.forEach(migration => {
      console.log(`- ${migration.name}: ${migration.description}`);
    });
    
    // Create combined migration file
    const migrationFilePath = await createMigrationFile(pendingMigrations);
    
    // Apply the migration
    const success = await applyMigration(migrationFilePath);
    
    if (success) {
      // Update the log of applied migrations
      const newAppliedList = [
        ...appliedMigrations,
        ...pendingMigrations.map(m => m.name)
      ];
      saveMigrationLog(newAppliedList);
      
      console.log('Migration process completed successfully!');
    } else {
      console.log('Migration was not fully automated. Please complete it manually and update the migration log.');
    }
    
  } catch (error) {
    console.error('Error during migration process:', error);
    process.exit(1);
  }
}

// Execute main function
main(); 