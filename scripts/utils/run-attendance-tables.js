// This script runs the SQL to create attendance tables

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables (if using dotenv)
// require('dotenv').config();

async function main() {
  console.log('Creating attendance tables...');

  // Initialize Supabase client with admin privileges
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-attendance-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('pg_execute', { sql: sqlContent });

    if (error) {
      console.error('Error creating tables:', error);
      process.exit(1);
    }

    console.log('✅ Attendance tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

main(); 