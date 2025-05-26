import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    
    // Create the fix_rls_policies function if it doesn't exist
    await supabase.query(`
      CREATE OR REPLACE FUNCTION public.fix_rls_policies()
      RETURNS void AS $$
      BEGIN
        -- Enable RLS on tables if not already enabled
        ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS public.user_messages ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies to avoid duplicates
        DROP POLICY IF EXISTS "Users can view all users" ON public.users;
        DROP POLICY IF EXISTS "Users can view all roles" ON public.roles;
        
        -- Add RLS policies for the users table 
        CREATE POLICY "Users can view all users"
        ON public.users
        FOR SELECT
        USING (true);
        
        -- Add RLS policies for the roles table
        CREATE POLICY "Users can view all roles"
        ON public.roles
        FOR SELECT
        USING (true);
        
        -- Re-create policies for conversations table
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
        
        -- Re-create policies for user_messages table
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
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    
    // Execute the function to apply the policies
    await supabase.rpc('fix_rls_policies')
    
    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies have been fixed' 
    })
  } catch (error) {
    console.error('Error fixing RLS policies:', error)
    return NextResponse.json(
      { success: false, message: 'Error fixing RLS policies', error },
      { status: 500 }
    )
  }
}

// Also handle POST requests for the RLS policies fix
export async function POST() {
  return GET()
} 