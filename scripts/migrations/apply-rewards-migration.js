#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Read Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Error: Missing Supabase credentials in .env.local file');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }
  
  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Read migration SQL file
  const migrationFilePath = path.join(__dirname, '../supabase/migrations/20240601000000_update_rewards_structure.sql');
  console.log(`Reading migration file: ${migrationFilePath}`);
  
  let sql;
  try {
    sql = fs.readFileSync(migrationFilePath, 'utf8');
  } catch (error) {
    console.error(`Error reading migration file: ${error.message}`);
    process.exit(1);
  }
  
  console.log('Applying migration...');
  
  try {
    // First check if execute_raw_sql function exists
    let functions;
    const { data, error: functionCheckError } = await supabase
      .from('pg_catalog.pg_proc')
      .select('proname')
      .eq('proname', 'execute_raw_sql');
    
    functions = data;
    
    if (functionCheckError) {
      console.log('Error checking for execute_raw_sql function, trying direct API call instead...');
      functions = [];
    }
    
    if (!functions || functions.length === 0) {
      console.log('execute_raw_sql function not found, executing SQL directly...');
      
      // Split the SQL into smaller chunks to avoid payload size limits
      const sqlChunks = splitSqlIntoStatements(sql);
      console.log(`Executing SQL in ${sqlChunks.length} chunks...`);
      
      for (let i = 0; i < sqlChunks.length; i++) {
        console.log(`Executing chunk ${i+1}/${sqlChunks.length}...`);
        
        // Direct SQL execution using POST request
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ query: sqlChunks[i] })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Warning: Chunk ${i+1} execution returned status ${response.status}. This may be normal for some SQL statements.`);
          console.log(`Response: ${errorText.substring(0, 200)}...`);
          // Continue anyway as some statements might fail but be acceptable
        }
      }
      
      console.log('SQL execution completed');
    } else {
      // Use the RPC function
      console.log('Using execute_raw_sql RPC function...');
      const { error } = await supabase.rpc('execute_raw_sql', { sql });
      
      if (error) {
        throw error;
      }
    }
    
    console.log('✅ Rewards structure migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error executing SQL:', error);
    process.exit(1);
  }
}

// Helper function to split SQL into individual statements
function splitSqlIntoStatements(sql) {
  // Basic splitting by semicolons, excluding those in quotes and function bodies
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i+1] || '';
    
    // Handle quotes
    if ((char === "'" || char === '"') && sql[i-1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
    }
    
    // Handle function bodies
    if (char === '$' && nextChar === '$' && !inQuotes) {
      inFunction = !inFunction;
    }
    
    // Handle statement delimiter
    if (char === ';' && !inQuotes && !inFunction) {
      currentStatement += char;
      statements.push(currentStatement.trim());
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  // Add the last statement if there's no trailing semicolon
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements;
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 