#!/usr/bin/env node

import { createAdminClient } from '../lib/supabase/server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log('🔧 Adding missing delivered_at column to user_rewards table...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'fix-user-rewards-delivered-at.sql'),
      'utf8'
    );
    
    // Create admin client
    const adminClient = await createAdminClient();
    
    // Execute the SQL script
    const { error } = await adminClient.rpc('execute_sql_with_params', {
      sql_query: sqlContent,
      params: []
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ Fixed user_rewards table successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main(); 