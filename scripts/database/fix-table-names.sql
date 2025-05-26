-- Check if messages table exists and rename it to user_messages 
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    ALTER TABLE public.messages RENAME TO user_messages;
    RAISE NOTICE 'Table messages renamed to user_messages';
  ELSIF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_messages') THEN
    -- Create user_messages table if neither exists
    CREATE TABLE IF NOT EXISTS public.user_messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create the same indexes as in the schema
    CREATE INDEX IF NOT EXISTS idx_user_messages_conversation_id ON public.user_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id ON public.user_messages(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON public.user_messages(is_read);
    
    -- Add RLS policies
    ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own messages"
    ON public.user_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

    CREATE POLICY "Users can update their own received messages"
    ON public.user_messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id);
    
    RAISE NOTICE 'Table user_messages created';
  ELSE
    RAISE NOTICE 'Table user_messages already exists';
  END IF;
END $$;

-- Check if reward_redemptions table exists and handle inconsistency with user_rewards
DO $$ 
BEGIN
  -- If reward_redemptions exists but user_rewards doesn't, rename it
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_redemptions') 
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_rewards') THEN
    
    ALTER TABLE public.reward_redemptions RENAME TO user_rewards;
    RAISE NOTICE 'Table reward_redemptions renamed to user_rewards';
  
  -- If both exist, we need to handle data migration
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_redemptions') 
      AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_rewards') THEN
    
    RAISE NOTICE 'Both reward_redemptions and user_rewards exist. Manual data migration may be required.';
  
  -- If user_rewards exists but code is using reward_redemptions, create a view for compatibility
  ELSIF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_redemptions')
      AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_rewards') THEN
    
    CREATE OR REPLACE VIEW public.reward_redemptions AS
    SELECT * FROM public.user_rewards;
    
    RAISE NOTICE 'Created view reward_redemptions pointing to user_rewards table for backward compatibility';
  
  -- If neither exists, create user_rewards as per schema
  ELSIF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_rewards') THEN
    CREATE TABLE IF NOT EXISTS public.user_rewards (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      reward_id INTEGER NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
      redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending',
      points_spent INTEGER NOT NULL
    );
    
    -- Add RLS policies
    ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own reward redemptions"
    ON public.user_rewards
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
    
    -- Create a view for compatibility with existing code
    CREATE OR REPLACE VIEW public.reward_redemptions AS
    SELECT * FROM public.user_rewards;
    
    RAISE NOTICE 'Created user_rewards table and reward_redemptions view for compatibility';
  END IF;
END $$; 