// Simple script to fix the badges table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixBadgesSchema() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Starting badge schema fix...');
    
    // 1. Check if points_threshold column exists and min_points doesn't
    const { data: columnInfo, error: columnError } = await supabase.rpc('check_column_exists', {
      table_name: 'badges',
      column_name: 'points_threshold'
    });
    
    if (columnError) {
      console.error('Error checking column existence:', columnError.message);
      
      // Try an alternative approach - let's query the badges table
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .limit(1);
        
      if (badgesError) {
        console.error('Error querying badges table:', badgesError.message);
        console.log('Creating a simple fix:');
        
        // We'll try a basic fix with direct SQL
        const { error: fixError } = await supabase.rpc('fix_badges_schema');
        
        if (fixError) {
          console.error('Error applying fix:', fixError.message);
          console.log('Manual SQL needs to be run to fix the schema. Please update the database directly.');
        } else {
          console.log('Fix applied successfully!');
        }
      } else {
        // Check the structure of the returned data
        const firstBadge = badgesData[0];
        console.log('Current badge structure:', Object.keys(firstBadge).join(', '));
        
        if (firstBadge.points_threshold !== undefined && firstBadge.min_points === undefined) {
          console.log('The table needs to be fixed - points_threshold exists but min_points does not');
          
          // Create the SQL function to fix it if needed
          const { error: createFuncError } = await supabase.rpc('create_fix_badges_schema_function');
          
          if (createFuncError) {
            console.error('Error creating fix function:', createFuncError.message);
          } else {
            // Execute the fix
            const { error: fixError } = await supabase.rpc('fix_badges_schema');
            
            if (fixError) {
              console.error('Error applying fix:', fixError.message);
            } else {
              console.log('Fix applied successfully!');
            }
          }
        } else if (firstBadge.min_points !== undefined) {
          console.log('Schema already fixed - min_points column exists');
        } else {
          console.log('Unknown schema state, manual intervention required');
        }
      }
    } else {
      if (columnInfo) {
        console.log('The points_threshold column exists, needs to be renamed to min_points');
        
        // Execute the fix
        const { error: fixError } = await supabase.rpc('fix_badges_schema');
        
        if (fixError) {
          console.error('Error applying fix:', fixError.message);
        } else {
          console.log('Fix applied successfully!');
        }
      } else {
        console.log('Schema already fixed - points_threshold column does not exist');
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

fixBadgesSchema(); 