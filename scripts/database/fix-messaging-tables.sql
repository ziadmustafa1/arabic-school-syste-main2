-- 1. Check user_messages table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_messages'
ORDER BY ordinal_position;

-- 2. Check if the 'messages' table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'messages'
) AS messages_table_exists;

-- 3. Create a view for backward compatibility if needed
DO $$
BEGIN
  -- Check if 'messages' table doesn't exist but code might be using it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_messages'
  ) THEN
    -- Create a view for backward compatibility
    EXECUTE 'CREATE OR REPLACE VIEW public.messages AS SELECT * FROM public.user_messages';
    RAISE NOTICE 'Created messages view pointing to user_messages table for backward compatibility';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_messages'
  ) THEN
    RAISE NOTICE 'Both messages and user_messages tables exist. Manual data migration may be required.';
  ELSE
    RAISE NOTICE 'No issue detected with messaging tables.';
  END IF;
END $$;

-- 4. Check conversations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;

-- 5. Check if there's any data in the tables
SELECT 'conversations' as table_name, COUNT(*) as record_count FROM conversations;
SELECT 'user_messages' as table_name, COUNT(*) as record_count FROM user_messages;

-- Check if the messages view exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'messages';

-- Suggestion for using the messaging system
SELECT 'RECOMMENDATION: The messaging system is using user_messages table. If your code references "messages" table, update it to use "user_messages" instead or make sure the view exists.' as recommendation;

-- Fix messaging system with consolidated tables structure

-- Create the conversation last message update function first
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create send message function
CREATE OR REPLACE FUNCTION send_message(
    conversation_id_param INTEGER,
    sender_id_param UUID,
    recipient_id_param UUID,
    content_param TEXT
) RETURNS INTEGER AS $$
DECLARE
    message_id INTEGER;
BEGIN
    -- Insert the message
    INSERT INTO public.messages(
        conversation_id,
        sender_id,
        recipient_id,
        content,
        is_read,
        created_at
    ) VALUES (
        conversation_id_param,
        sender_id_param,
        recipient_id_param,
        content_param,
        FALSE,
        NOW()
    ) RETURNING id INTO message_id;
    
    -- Return the message ID
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- First, check if both tables exist
DO $$ 
DECLARE
    messages_exists BOOLEAN;
    user_messages_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) INTO messages_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_messages'
    ) INTO user_messages_exists;

    -- Only proceed if both tables exist
    IF messages_exists AND user_messages_exists THEN
        -- Step 1: Create a temporary table to merge data
        CREATE TEMP TABLE merged_messages AS
        -- Get data from messages table
        SELECT 
            COALESCE(m.id, NULL) AS old_messages_id,
            COALESCE(um.id, NULL) AS old_user_messages_id,
            COALESCE(m.conversation_id, um.conversation_id) AS conversation_id,
            COALESCE(m.sender_id, um.sender_id) AS sender_id,
            COALESCE(m.recipient_id, um.recipient_id) AS recipient_id,
            COALESCE(m.content, um.content) AS content,
            COALESCE(m.is_read, um.is_read) AS is_read,
            COALESCE(m.created_at, um.created_at) AS created_at
        FROM 
            public.messages m
        FULL OUTER JOIN 
            public.user_messages um 
        ON 
            m.conversation_id = um.conversation_id 
            AND m.sender_id = um.sender_id 
            AND m.recipient_id = um.recipient_id;

        -- Step 2: Create the new consolidated messages table
        CREATE TABLE IF NOT EXISTS public.consolidated_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES public.conversations(id),
            sender_id UUID NOT NULL REFERENCES public.users(id),
            recipient_id UUID NOT NULL REFERENCES public.users(id),
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Step 3: Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_conversation_id ON public.consolidated_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_sender_id ON public.consolidated_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_recipient_id ON public.consolidated_messages(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_created_at ON public.consolidated_messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_is_read ON public.consolidated_messages(is_read);

        -- Step 4: Insert merged data into the new table
        INSERT INTO public.consolidated_messages (
            conversation_id, 
            sender_id, 
            recipient_id, 
            content, 
            is_read, 
            created_at
        )
        SELECT 
            conversation_id, 
            sender_id, 
            recipient_id, 
            content, 
            is_read, 
            created_at
        FROM 
            merged_messages
        WHERE 
            content IS NOT NULL;

        -- Step 5: Update conversations with last message timestamp
        UPDATE public.conversations c
        SET last_message_at = (
            SELECT MAX(created_at)
            FROM public.consolidated_messages
            WHERE conversation_id = c.id
        )
        WHERE EXISTS (
            SELECT 1
            FROM public.consolidated_messages
            WHERE conversation_id = c.id
        );

        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.consolidated_messages;
        
        -- Create the trigger
        CREATE TRIGGER update_conversation_last_message_trigger
        AFTER INSERT ON public.consolidated_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_last_message();

        -- Step 7: Create a view to maintain compatibility
        CREATE OR REPLACE VIEW public.messages_view AS
        SELECT 
            id,
            conversation_id,
            sender_id,
            recipient_id,
            content,
            is_read,
            created_at
        FROM 
            public.consolidated_messages;

        -- Step 8: Rename tables to preserve the original data but use the new table
        ALTER TABLE public.messages RENAME TO messages_old;
        ALTER TABLE public.user_messages RENAME TO user_messages_old;
        ALTER TABLE public.consolidated_messages RENAME TO messages;

        -- Step 9: Update the view to point to the renamed table
        CREATE OR REPLACE VIEW public.messages_view AS
        SELECT 
            id,
            conversation_id,
            sender_id,
            recipient_id,
            content,
            is_read,
            created_at
        FROM 
            public.messages;

        -- Step 11: Log the change
        RAISE NOTICE 'Successfully consolidated messaging tables';
    ELSE
        IF messages_exists THEN
            RAISE NOTICE 'Only messages table exists, no consolidation needed';
        ELSIF user_messages_exists THEN
            RAISE NOTICE 'Only user_messages table exists, renaming to messages';
            ALTER TABLE public.user_messages RENAME TO messages;
        ELSE
            RAISE NOTICE 'No messaging tables found, creating new table';
            
            -- Create the messages table from scratch
            CREATE TABLE IF NOT EXISTS public.messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES public.conversations(id),
                sender_id UUID NOT NULL REFERENCES public.users(id),
                recipient_id UUID NOT NULL REFERENCES public.users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
            CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
            
            -- Create trigger
            CREATE TRIGGER update_conversation_last_message_trigger
            AFTER INSERT ON public.messages
            FOR EACH ROW
            EXECUTE FUNCTION update_conversation_last_message();
        END IF;
    END IF;
END $$; 