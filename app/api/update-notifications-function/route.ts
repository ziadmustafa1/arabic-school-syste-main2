import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const adminClient = await createAdminClient();

    // Update the mark_all_notifications_read function to properly set updated_at
    // @ts-ignore - Using raw query which might not be in type definitions
    await adminClient.query(`
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
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: "Notification mark-as-read function updated successfully" 
    });
  } catch (error: any) {
    console.error("Error updating notification function:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
} 