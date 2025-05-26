import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    
    // Check if user_messages table exists using direct query instead of RPC
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_messages')
      
    if (tableError || !tableExists || tableExists.length === 0) {
      // Create messaging tables
      await createMessagingTables(supabase)
    }
    
    return NextResponse.json({ success: true, message: 'Database checked and fixed if needed' })
  } catch (error) {
    console.error('Error checking database:', error)
    return NextResponse.json(
      { success: false, message: 'Error checking database', error },
      { status: 500 }
    )
  }
}

async function createMessagingTables(supabase: any) {
  try {
    // Create conversations table if it doesn't exist
    await supabase.query(`
      -- Create conversations table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.conversations (
        id SERIAL PRIMARY KEY,
        user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT different_users CHECK (user1_id <> user2_id),
        CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
      );
      
      -- Create user_messages table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.user_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
      CREATE INDEX IF NOT EXISTS idx_user_messages_conversation_id ON public.user_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_user_messages_sender ON public.user_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON public.user_messages(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON public.user_messages(created_at);
      
      -- Enable RLS on both tables
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
      
      -- Add RLS policies for conversations
      DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
      CREATE POLICY "Users can view their own conversations"
      ON public.conversations
      FOR SELECT
      USING (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      DROP POLICY IF EXISTS "Users can create conversations they are part of" ON public.conversations;
      CREATE POLICY "Users can create conversations they are part of"
      ON public.conversations
      FOR INSERT
      WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
      CREATE POLICY "Users can update their conversations"
      ON public.conversations
      FOR UPDATE
      USING (auth.uid() = user1_id OR auth.uid() = user2_id);
      
      -- Add RLS policies for user_messages
      DROP POLICY IF EXISTS "Users can view their own messages" ON public.user_messages;
      CREATE POLICY "Users can view their own messages"
      ON public.user_messages
      FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
      
      DROP POLICY IF EXISTS "Users can insert messages they send" ON public.user_messages;
      CREATE POLICY "Users can insert messages they send"
      ON public.user_messages
      FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
      
      DROP POLICY IF EXISTS "Users can update their own received messages" ON public.user_messages;
      CREATE POLICY "Users can update their own received messages"
      ON public.user_messages
      FOR UPDATE
      USING (auth.uid() = recipient_id);
      
      -- Add RLS policies for the users table if they don't exist
      DROP POLICY IF EXISTS "Users can view all users" ON public.users;
      CREATE POLICY "Users can view all users"
      ON public.users
      FOR SELECT
      USING (true);
      
      -- Add RLS policies for the roles table if they don't exist
      DROP POLICY IF EXISTS "Users can view all roles" ON public.roles;
      CREATE POLICY "Users can view all roles"
      ON public.roles
      FOR SELECT
      USING (true);
    `)
  } catch (error) {
    console.error('Error creating messaging tables:', error)
    throw error
  }
}

// This route creates the database tables
export async function POST() {
  try {
    const supabase = await createAdminClient()
    
    // Create messaging tables
    await createMessagingTables(supabase)
    
    return NextResponse.json({ success: true, message: 'Messaging tables created successfully' })
  } catch (error) {
    console.error('Error creating messaging tables:', error)
    return NextResponse.json(
      { success: false, message: 'Error creating messaging tables', error },
      { status: 500 }
    )
  }
} 