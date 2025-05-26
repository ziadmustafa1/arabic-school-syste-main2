#!/usr/bin/env node

// Simple script to fix the database schema by adding missing columns
// Run with: node scripts/fix-db-schema.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function main() {
  // Read Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Error: Missing Supabase credentials in .env.local file')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
    process.exit(1)
  }
  
  console.log('Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  console.log('Running SQL to add missing columns if they do not exist...')
  
  // SQL to add missing columns if they don't exist
  const sql = `
    DO $$ 
    BEGIN
      -- Check if the delivered_at column exists
      IF NOT EXISTS (SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_rewards' 
                    AND column_name = 'delivered_at') THEN
        
        -- Add the delivered_at column
        ALTER TABLE user_rewards ADD COLUMN delivered_at TIMESTAMPTZ DEFAULT NULL;
        
        RAISE NOTICE 'Added missing delivered_at column to user_rewards table';
      ELSE
        RAISE NOTICE 'delivered_at column already exists in user_rewards table';
      END IF;

      -- Check if the admin_notes column exists
      IF NOT EXISTS (SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'user_rewards' 
                    AND column_name = 'admin_notes') THEN
        
        -- Add the admin_notes column
        ALTER TABLE user_rewards ADD COLUMN admin_notes TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Added missing admin_notes column to user_rewards table';
      ELSE
        RAISE NOTICE 'admin_notes column already exists in user_rewards table';
      END IF;
    END $$;
  `
  
  try {
    // First check if execute_raw_sql function exists
    const { data: functions, error: functionCheckError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'execute_raw_sql')
    
    if (functionCheckError) {
      throw new Error(`Error checking for execute_raw_sql function: ${functionCheckError.message}`)
    }
    
    if (!functions || functions.length === 0) {
      console.log('execute_raw_sql function not found, executing SQL directly...')
      
      // Direct SQL execution using POST request
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({ sql })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to execute SQL: ${JSON.stringify(errorData)}`)
      }
      
      console.log('SQL executed successfully via REST API')
    } else {
      // Use the RPC function
      console.log('Using execute_raw_sql RPC function...')
      const { error } = await supabase.rpc('execute_raw_sql', { sql })
      
      if (error) {
        throw error
      }
    }
    
    console.log('✅ Database schema fixed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error executing SQL:', error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
}) 