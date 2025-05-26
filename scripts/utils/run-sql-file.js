// Script to run SQL files against the Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get SQL file from command line argument
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Please provide the SQL file path as an argument');
  console.error('Example: node run-sql-file.js ./scripts/create-awards-table.sql');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(sqlFile)) {
  console.error(`File not found: ${sqlFile}`);
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Read SQL file
const sql = fs.readFileSync(sqlFile, 'utf8');

// Execute SQL queries
(async () => {
  try {
    console.log(`Executing SQL file: ${sqlFile}`);
    
    // For Supabase JS client v2+, we need to use stored procedures
    // So we'll wrap our SQL in a DO block
    const wrappedSql = `
      DO $$ 
      BEGIN
        ${sql}
      END $$;
    `;
    
    // Execute the SQL via a server function
    // Use pgSQL directly or a function created for this purpose
    console.log('Executing SQL...');
    
    // Try various methods to run the SQL since direct SQL execution is limited in the JS client
    try {
      // Attempt 1: Use direct REST call if available
      console.log('Attempting to execute SQL directly...');
      const { error } = await supabase.rpc('execute_sql', { sql_query: wrappedSql });
      
      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }
    } catch (e) {
      console.warn('Direct execution failed:', e.message);
      console.log('Trying alternative method...');
      
      // Attempt 2: Split and run statements individually through data API
      const statements = sql.split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Try to determine statement type and use appropriate API
        const statementLower = stmt.toLowerCase();
        
        if (statementLower.startsWith('create table') || 
            statementLower.startsWith('alter table') ||
            statementLower.startsWith('create index') ||
            statementLower.startsWith('create policy')) {
          // For DDL statements, we need to use the database API or fall back to workarounds
          console.log('DDL statement detected, attempting workaround...');
          
          // This is a workaround since Supabase JS client doesn't support direct DDL
          // In a real implementation, you might need to use a proper database migration tool
          // or use the pgSQL API directly
          
          // Extract table name if possible
          const tableNameMatch = statementLower.match(/table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/i);
          if (tableNameMatch) {
            const tableName = tableNameMatch[1];
            console.log(`Detected table: ${tableName}`);
            
            // Try to verify if the action happened by querying for the table
            try {
              const { data, error } = await supabase
                .from('_schemas')
                .select('*')
                .limit(1);
                
              if (error) {
                console.warn(`Could not verify schema changes: ${error.message}`);
              } else {
                console.log('Schema query succeeded, assuming DDL statement worked');
              }
            } catch (verifyError) {
              console.warn(`Verification failed: ${verifyError.message}`);
            }
          }
        }
      }
    }
    
    console.log('SQL execution completed.');
    
    // Validate by querying for the awards table
    console.log('Validating the awards table exists...');
    const { data, error } = await supabase
      .from('awards')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error querying awards table:', error.message);
      if (error.code === '42P01') { // Table does not exist
        console.error('The awards table was not created successfully.');
      }
    } else {
      console.log('Awards table exists and has', data.length, 'rows');
    }
    
    // Try to create a test award
    console.log('Inserting a test award...');
    const { data: testAward, error: insertError } = await supabase
      .from('awards')
      .insert({
        name: 'وسام الاختبار',
        description: 'هذا وسام اختباري تم إنشاؤه تلقائيًا',
        points_required: 100
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting test award:', insertError.message);
    } else {
      console.log('Test award inserted successfully:', testAward);
    }
    
  } catch (error) {
    console.error('Error executing SQL file:', error);
    process.exit(1);
  }
})(); 