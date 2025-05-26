import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const results: Record<string, any> = {};

    // 1. Check and fix notifications table
    const { data: notificationColumns, error: notificationError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as count_read,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') as count_is_read
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read';
      `
    });

    if (notificationError) {
      results.notifications = { error: notificationError.message };
    } else {
      const result = notificationColumns && notificationColumns[0] 
        ? notificationColumns[0] 
        : { count_read: 0, count_is_read: 0 };
      
      if (result.count_read > 0 && result.count_is_read === 0) {
        // If 'read' exists but 'is_read' doesn't, rename the column
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE notifications RENAME COLUMN "read" TO "is_read";`
        });
        results.notifications = { 
          status: 'fixed', 
          message: 'Renamed "read" column to "is_read" in notifications table' 
        };
      } else if (result.count_read === 0 && result.count_is_read === 0) {
        results.notifications = { 
          status: 'missing', 
          message: 'Neither "read" nor "is_read" column exists in notifications table' 
        };
      } else {
        results.notifications = { 
          status: 'ok', 
          message: 'Notifications table is properly configured with "is_read" column' 
        };
      }
    }

    // 2. Check messages table
    const { data: messageColumns, error: messageError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as count_read,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'user_messages' AND column_name = 'is_read') as count_is_read
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_messages' AND column_name = 'read';
      `
    });

    if (messageError) {
      results.messages = { error: messageError.message };
    } else {
      const result = messageColumns && messageColumns[0] 
        ? messageColumns[0] 
        : { count_read: 0, count_is_read: 0 };
      
      if (result.count_read > 0 && result.count_is_read === 0) {
        // If 'read' exists but 'is_read' doesn't, rename the column
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE user_messages RENAME COLUMN "read" TO "is_read";`
        });
        results.messages = { 
          status: 'fixed', 
          message: 'Renamed "read" column to "is_read" in user_messages table' 
        };
      } else if (result.count_read === 0 && result.count_is_read === 0) {
        results.messages = { 
          status: 'missing', 
          message: 'Neither "read" nor "is_read" column exists in user_messages table' 
        };
      } else {
        results.messages = { 
          status: 'ok', 
          message: 'user_messages table is properly configured with "is_read" column' 
        };
      }
    }

    return NextResponse.json({ 
      success: true, 
      results 
    });
  } catch (error: any) {
    console.error('Error checking schema:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 