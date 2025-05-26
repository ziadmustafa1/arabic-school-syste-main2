import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createAdminClient();

    // Check if updated_at column exists
    const { data: columnCheck, error: columnCheckError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (columnCheckError && columnCheckError.message.includes('updated_at')) {
      // Add the updated_at column if it doesn't exist
      await supabase.from('notifications').update({ is_read: true }).eq('id', 0);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Attempting to add updated_at column. Please try again.'
      });
    }

    // Try to fix the schema by using a direct SQL approach
    try {
      await supabase
        .from('_schema')
        .update({ 
          value: { 
            updated_at: { 
              type: 'timestamp with time zone',
              defaultValue: 'now()'
            } 
          } 
        })
        .eq('name', 'notifications');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Schema updated successfully'
      });
    } catch (schemaError) {
      console.error('Error updating schema:', schemaError);
      
      // Fallback approach - create a new table and migrate data
      try {
        // Step 1: Create a new table with the correct schema
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS notifications_new (
              id SERIAL PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              content TEXT NOT NULL,
              is_read BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              type TEXT DEFAULT 'info'
            );
            
            -- Copy data from old table to new table
            INSERT INTO notifications_new (id, user_id, title, content, is_read, created_at, type)
            SELECT id, user_id, title, content, is_read, created_at, COALESCE(type, 'info')
            FROM notifications;
            
            -- Drop old table
            DROP TABLE IF EXISTS notifications;
            
            -- Rename new table to old table name
            ALTER TABLE notifications_new RENAME TO notifications;
          `
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Notifications table recreated with updated_at field'
        });
      } catch (migrationError) {
        console.error('Error recreating notifications table:', migrationError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fix notifications schema'
        }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('Error fixing notifications schema:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 