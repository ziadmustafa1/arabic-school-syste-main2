#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🔧 Adding backward compatibility execute_raw_sql function...');
  
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }
  
  try {
    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Read the migration SQL file
    const sqlContent = readFileSync(
      join(__dirname, '..', 'supabase', 'migrations', '20240801000000_create_execute_raw_sql.sql'),
      'utf8'
    );
    
    console.log('SQL content loaded, executing...');
    
    // Execute the SQL using the existing execute_sql_with_params function
    const { data, error } = await supabase.rpc('execute_sql_with_params', {
      sql_query: sqlContent,
      params: []
    });
    
    if (error) {
      console.error('❌ Error applying migration:', error);
      
      // Try alternate approach - direct API call
      console.log('Trying direct SQL execution via REST API...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql_with_params`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ 
          sql_query: sqlContent,
          params: []
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to execute SQL via REST API: ${errorData}`);
      }
      
      console.log('✅ Migration applied successfully via REST API!');
    } else {
      console.log('✅ Migration applied successfully via RPC!');
    }
    
    console.log('The execute_raw_sql function has been created as a wrapper around execute_sql_with_params');
    console.log('All calls to execute_raw_sql will now be forwarded to execute_sql_with_params');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main(); 