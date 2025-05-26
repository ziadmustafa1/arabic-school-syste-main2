import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface FixResult {
  success: boolean;
  schema_fixed: boolean;
  errors: string[];
  messages: string[];
}

export async function GET() {
  try {
    const adminClient = await createAdminClient();
    const fixResult: FixResult = {
      success: false,
      schema_fixed: false,
      errors: [],
      messages: []
    };
    
    // Step 1: Check if points_threshold column exists
    try {
      const { data, error } = await adminClient.rpc(
        'execute_sql',
        {
          sql_query: `
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'badges' 
              AND column_name = 'points_threshold'
            ) as exists
          `
        }
      );
      
      if (error) {
        fixResult.errors.push(`Error checking column existence: ${error.message}`);
        
        // Fallback: Try querying the badges table to see if points_threshold exists
        const { data: badgesData, error: badgesError } = await adminClient
          .from('badges')
          .select('*')
          .limit(1);
          
        if (badgesError && badgesError.code === '42703') {
          fixResult.messages.push('The column points_threshold already does not exist');
          
          // Check if min_points exists
          const { data: minPointsData, error: minPointsError } = await adminClient
            .from('badges')
            .select('min_points')
            .limit(1);
            
          if (!minPointsError) {
            fixResult.messages.push('The min_points column already exists');
            fixResult.success = true;
            return NextResponse.json(fixResult);
          } else {
            fixResult.errors.push(`Error checking min_points: ${minPointsError.message}`);
          }
        }
      } else {
        const columnExists = data && data.length > 0 ? data[0].exists : false;
        
        if (columnExists) {
          fixResult.messages.push('The points_threshold column exists and needs to be renamed');
          
          // Step 2: Rename points_threshold to min_points
          const { error: renameError } = await adminClient.rpc(
            'execute_sql',
            {
              sql_query: `
                ALTER TABLE public.badges 
                RENAME COLUMN points_threshold TO min_points;
              `
            }
          );
          
          if (renameError) {
            fixResult.errors.push(`Error renaming column: ${renameError.message}`);
          } else {
            fixResult.messages.push('Successfully renamed points_threshold to min_points');
            fixResult.schema_fixed = true;
          }
          
          // Step 3: Add max_points column if it doesn't exist
          const { error: addColumnError } = await adminClient.rpc(
            'execute_sql',
            {
              sql_query: `
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'badges' 
                    AND column_name = 'max_points'
                  ) THEN
                    ALTER TABLE public.badges ADD COLUMN max_points INTEGER;
                  END IF;
                END $$;
              `
            }
          );
          
          if (addColumnError) {
            fixResult.errors.push(`Error adding max_points column: ${addColumnError.message}`);
          } else {
            fixResult.messages.push('Successfully added max_points column (if it did not exist)');
          }
          
          // Step 4: Set default max_points value
          const { error: updateError } = await adminClient.rpc(
            'execute_sql',
            {
              sql_query: `
                UPDATE public.badges SET max_points = 99999 WHERE max_points IS NULL;
              `
            }
          );
          
          if (updateError) {
            fixResult.errors.push(`Error updating max_points: ${updateError.message}`);
          } else {
            fixResult.messages.push('Successfully set default max_points values');
          }
          
          // Step 5: Make max_points NOT NULL
          const { error: notNullError } = await adminClient.rpc(
            'execute_sql',
            {
              sql_query: `
                ALTER TABLE public.badges ALTER COLUMN max_points SET NOT NULL;
              `
            }
          );
          
          if (notNullError) {
            fixResult.errors.push(`Error setting NOT NULL constraint: ${notNullError.message}`);
          } else {
            fixResult.messages.push('Successfully set NOT NULL constraint on max_points');
          }
        } else {
          fixResult.messages.push('The points_threshold column does not exist, schema is already updated');
          fixResult.success = true;
        }
      }
    } catch (error: any) {
      fixResult.errors.push(`Unexpected error: ${error.message}`);
    }
    
    // If there are no errors, mark as success
    if (fixResult.errors.length === 0) {
      fixResult.success = true;
    }
    
    return NextResponse.json(fixResult);
  } catch (error: any) {
    console.error("Error fixing badges schema:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred"
    }, { status: 500 });
  }
} 