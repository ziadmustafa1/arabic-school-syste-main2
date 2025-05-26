import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const adminClient = await createAdminClient();

    // First, try to modify the notifications table to add updated_at if missing
    try {
      // @ts-ignore - Using raw query which might not be in type definitions
      await adminClient.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
            AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
          END IF;
        END
        $$;
      `);
      console.log("Checked and added updated_at column if needed");
    } catch (tableError) {
      console.error("Error modifying notifications table:", tableError);
    }

    // Create function to execute raw SQL safely
    // @ts-ignore - Using raw query which might not be in type definitions
    await adminClient.query(`
      -- Execute raw SQL function that doesn't trigger updated_at issues
      CREATE OR REPLACE FUNCTION execute_raw_sql(query text, params text[] DEFAULT '{}')
      RETURNS json AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE query USING params;
        RETURN json_build_object('success', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
          'success', false,
          'error', SQLERRM,
          'code', SQLSTATE
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Also create a simplified function for marking notifications as read
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
      message: "Database functions created successfully" 
    });
  } catch (error: any) {
    console.error("Error setting up database functions:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
} 