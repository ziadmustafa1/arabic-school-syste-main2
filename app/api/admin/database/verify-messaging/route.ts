import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createAdminClient()
    const results: string[] = []

    // 1. Check if conversations table exists
    const { error: checkConversationsError } = await supabase
      .from("conversations")
      .select("id")
      .limit(1)
    
    if (checkConversationsError && checkConversationsError.message.includes("does not exist")) {
      // Create conversations table
      results.push("إنشاء جدول المحادثات")
      const createConversationsQuery = `
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          user1_id UUID NOT NULL REFERENCES auth.users(id),
          user2_id UUID NOT NULL REFERENCES auth.users(id),
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          CONSTRAINT different_users CHECK (user1_id <> user2_id)
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
      `
      
      const { error: createError } = await supabase.rpc("exec_sql", { 
        sql: createConversationsQuery 
      }).catch(() => {
        // If exec_sql doesn't exist, try direct query (will only work with service role)
        return supabase.sql(createConversationsQuery)
      })
      
      if (createError) {
        return NextResponse.json({
          success: false,
          message: "فشل في إنشاء جدول المحادثات",
          details: [createError.message]
        })
      }
    } else {
      results.push("جدول المحادثات موجود بالفعل")
    }
    
    // 2. Check if user_messages table exists
    const { error: checkMessagesError } = await supabase
      .from("user_messages")
      .select("id")
      .limit(1)
    
    if (checkMessagesError && checkMessagesError.message.includes("does not exist")) {
      // Create user_messages table
      results.push("إنشاء جدول الرسائل")
      const createMessagesQuery = `
        CREATE TABLE IF NOT EXISTS user_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES auth.users(id),
          recipient_id UUID NOT NULL REFERENCES auth.users(id),
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON user_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON user_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_recipient ON user_messages(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_messages_is_read ON user_messages(is_read);
      `
      
      const { error: createMsgError } = await supabase.rpc("exec_sql", { 
        sql: createMessagesQuery 
      }).catch(() => {
        // If exec_sql doesn't exist, try direct query
        return supabase.sql(createMessagesQuery)
      })
      
      if (createMsgError) {
        return NextResponse.json({
          success: false,
          message: "فشل في إنشاء جدول الرسائل",
          details: [createMsgError.message]
        })
      }
    } else {
      results.push("جدول الرسائل موجود بالفعل")
    }
    
    // 3. Check if exec_sql function exists
    let execSqlExists = true
    try {
      const { error: testError } = await supabase.rpc("exec_sql", { sql: "SELECT 1 as test" })
      if (testError && testError.message.includes("does not exist")) {
        execSqlExists = false
      }
    } catch (e) {
      execSqlExists = false
    }
    
    if (!execSqlExists) {
      results.push("إنشاء دالة exec_sql")
      const createFunctionQuery = `
        -- Function to execute arbitrary SQL (admin only)
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER -- Runs with the privileges of the function creator
        SET search_path = public -- Set the search path to limit usage to public schema
        AS $$
        DECLARE
          result JSONB;
        BEGIN
          -- Only allow admins to execute this function
          IF (SELECT auth.uid() IS NULL) OR (SELECT role_id FROM public.users WHERE id = auth.uid()) != 4 THEN
            RAISE EXCEPTION 'Access denied. Only administrators can execute this function.';
          END IF;
          
          EXECUTE sql;
          result := jsonb_build_object('success', true);
          RETURN result;
        EXCEPTION
          WHEN OTHERS THEN
            result := jsonb_build_object(
              'success', false,
              'error', SQLERRM,
              'detail', SQLSTATE
            );
            RETURN result;
        END;
        $$;
        
        -- Grant execution to authenticated users (function will still validate admin role internally)
        GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
      `
      
      // We have to use service role for this, since we're creating the function
      const { error: createFuncError } = await supabase.sql(createFunctionQuery)
      
      if (createFuncError) {
        return NextResponse.json({
          success: false,
          message: "فشل في إنشاء دالة exec_sql",
          details: [createFuncError.message]
        })
      }
    } else {
      results.push("دالة exec_sql موجودة بالفعل")
    }
    
    // 4. Set up RLS policies for messages and conversations
    results.push("تكوين سياسات أمان الجداول")
    const setupRlsQuery = `
      -- Enable RLS on conversations
      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
      
      -- Policies for conversations
      DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
      CREATE POLICY "Users can view their conversations" 
        ON conversations FOR SELECT 
        USING (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      DROP POLICY IF EXISTS "Users can insert their conversations" ON conversations;
      CREATE POLICY "Users can insert their conversations" 
        ON conversations FOR INSERT 
        WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
      CREATE POLICY "Users can update their conversations" 
        ON conversations FOR UPDATE 
        USING (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      -- Enable RLS on messages
      ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
      
      -- Policies for messages
      DROP POLICY IF EXISTS "Users can view messages in their conversations" ON user_messages;
      CREATE POLICY "Users can view messages in their conversations" 
        ON user_messages FOR SELECT 
        USING (
          auth.uid() = sender_id OR 
          auth.uid() = recipient_id
        );
      
      DROP POLICY IF EXISTS "Users can send messages" ON user_messages;
      CREATE POLICY "Users can send messages" 
        ON user_messages FOR INSERT 
        WITH CHECK (auth.uid() = sender_id);
      
      DROP POLICY IF EXISTS "Recipients can mark messages as read" ON user_messages;
      CREATE POLICY "Recipients can mark messages as read" 
        ON user_messages FOR UPDATE 
        USING (auth.uid() = recipient_id)
        WITH CHECK (
          is_read = true AND
          auth.uid() = recipient_id
        );
      
      DROP POLICY IF EXISTS "Senders can delete their messages" ON user_messages;
      CREATE POLICY "Senders can delete their messages" 
        ON user_messages FOR DELETE 
        USING (auth.uid() = sender_id);
    `
    
    const { error: rlsError } = await supabase.rpc("exec_sql", { 
      sql: setupRlsQuery 
    }).catch(() => {
      // If exec_sql doesn't exist (which shouldn't happen now), try direct query
      return supabase.sql(setupRlsQuery)
    })
    
    if (rlsError) {
      return NextResponse.json({
        success: false,
        message: "فشل في تكوين سياسات أمان الجداول",
        details: [rlsError.message]
      })
    }
    
    return NextResponse.json({
      success: true,
      message: "تم إصلاح جميع مشاكل قاعدة البيانات المتعلقة بنظام الرسائل",
      details: results
    })
    
  } catch (error) {
    console.error("Error fixing database:", error)
    return NextResponse.json({
      success: false,
      message: "حدث خطأ أثناء إصلاح قاعدة البيانات",
      details: [error instanceof Error ? error.message : "خطأ غير معروف"]
    })
  }
} 