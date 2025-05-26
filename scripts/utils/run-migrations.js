/**
 * Run migrations script
 * 
 * This script will read all SQL migration files from the supabase/migrations directory
 * and execute them against the Supabase database.
 * 
 * Usage:
 * 1. Ensure you have the SUPABASE_URL and SUPABASE_SERVICE_KEY set in your environment
 * 2. Run: node scripts/run-migrations.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration - override these with environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

// Extract database connection details from service key
function getDatabaseConnectionFromUrl(url) {
  try {
    // The URL should be in the format: postgres://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
    const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('Invalid PostgreSQL connection URL format');
    }
    
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5],
    };
  } catch (error) {
    console.error('Error parsing database URL:', error.message);
    throw error;
  }
}

async function runMigrations() {
  console.log('Starting database migrations...');
  
  // Get database connection details
  let connectionDetails;
  try {
    // Extract connection details from URL (if you have the full connection URL)
    connectionDetails = getDatabaseConnectionFromUrl(SUPABASE_URL);
    
    // If you prefer to set these manually:
    // connectionDetails = {
    //   user: 'postgres',
    //   password: SUPABASE_SERVICE_KEY,
    //   host: 'your-project.supabase.co',
    //   port: 5432,
    //   database: 'postgres',
    //   ssl: { rejectUnauthorized: false }
    // };
    
    connectionDetails.ssl = { rejectUnauthorized: false };
  } catch (error) {
    console.error('Failed to get database connection details:', error.message);
    process.exit(1);
  }
  
  // Create database connection
  const pool = new Pool(connectionDetails);
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Connected to database successfully');
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Run each migration
      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        try {
          await client.query(sql);
          console.log(`Migration ${file} completed successfully`);
        } catch (err) {
          console.error(`Error running migration ${file}:`, err.message);
          await client.query('ROLLBACK');
          throw err;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('All migrations completed successfully');
    } catch (err) {
      console.error('Migration failed:', err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 