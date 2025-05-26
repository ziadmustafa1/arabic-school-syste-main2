import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const adminClient = await createAdminClient();

    // Add the updated_at column to the notifications table if it doesn't exist
    await adminClient.rpc('exec_sql', {
      sql_query: `
        -- Add updated_at column if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'notifications' 
                      AND column_name = 'updated_at') THEN
            ALTER TABLE public.notifications 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            
            -- Update existing rows to have updated_at equal to created_at
            UPDATE public.notifications 
            SET updated_at = created_at 
            WHERE updated_at IS NULL;
          END IF;
        END
        $$;
      `
    });
    
    // Update the mark_all_notifications_read function to properly set updated_at
    await adminClient.rpc('exec_sql', {
      sql_query: `
        -- Function to mark all notifications as read for a user
        CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param UUID)
        RETURNS json AS $$
        BEGIN
          UPDATE notifications
          SET is_read = true,
              updated_at = NOW() -- Explicitly update the updated_at timestamp
          WHERE user_id = user_id_param
          AND is_read = false;
          
          -- Return the number of rows affected for verification
          RETURN json_build_object(
            'success', true,
            'rows_affected', FOUND
          );
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Notifications schema has been updated to include updated_at column" 
    });
  } catch (error: any) {
    console.error("Error updating notifications schema:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
} 