import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createAdminClient();

    // First, check if 'read' field exists but 'is_read' doesn't
    const { data: columnCheck, error: columnCheckError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as count_read,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') as count_is_read
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read';
      `
    });

    if (columnCheckError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Error checking columns: ' + columnCheckError.message 
      }, { status: 500 });
    }

    const result = columnCheck && columnCheck[0] ? columnCheck[0] : { count_read: 0, count_is_read: 0 };
    console.log('Column check result:', result);

    if (result.count_read > 0 && result.count_is_read === 0) {
      // If 'read' exists but 'is_read' doesn't, rename the column
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE notifications 
          RENAME COLUMN "read" TO "is_read";
        `
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully renamed "read" column to "is_read"'
      });
    }
    
    // If both exist or neither exists, create or update the notifications table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          type TEXT NOT NULL DEFAULT 'info',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
        
        -- Add column if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'notifications' 
                       AND column_name = 'is_read') THEN
            ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
          END IF;
        END
        $$;
        
        -- Drop the old 'read' column if it exists (to avoid confusion)
        DO $$
        BEGIN
          IF EXISTS(SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'read') THEN
            ALTER TABLE notifications DROP COLUMN "read";
          END IF;
        END
        $$;
      `
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notifications schema has been updated to use is_read field'
    });
  } catch (error: any) {
    console.error('Error fixing notifications schema:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 