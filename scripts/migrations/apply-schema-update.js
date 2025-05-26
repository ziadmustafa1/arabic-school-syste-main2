// Script to apply the rewards structure update
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Read the migration SQL file content
const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20240601000000_update_rewards_structure.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});

async function applySchemaUpdate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting schema update...');
    
    // Execute the entire SQL file as a single query
    // This is safer for complex SQL with functions, triggers, etc.
    await client.query(sqlContent);
    
    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Schema update failed:', error.message);
    
    // Check for specific error types and provide more helpful messages
    if (error.message.includes('column "points_threshold" does not exist')) {
      console.log('SOLUTION: The migration is trying to rename a column that doesn\'t exist.');
      console.log('This likely means the column has already been renamed or has a different name.');
      console.log('The script has been updated to safely check for column existence first.');
    }
    
    if (error.message.includes('relation "emblems" already exists')) {
      console.log('SOLUTION: The emblems table already exists. This is not a problem, the migration is safe to run again.');
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applySchemaUpdate(); 