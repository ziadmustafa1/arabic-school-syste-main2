-- Create card_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.card_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to card_categories table
COMMENT ON TABLE public.card_categories IS 'Categories for recharge cards';

-- Add RLS policies for card_categories
ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'card_categories' 
        AND policyname = 'admin_manage_card_categories'
    ) THEN
        -- Create policy for admins to manage card categories
        CREATE POLICY admin_manage_card_categories ON public.card_categories
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END
$$;

-- Check if recharge_cards table exists and add missing columns
DO $$
BEGIN
    -- Check if the recharge_cards table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recharge_cards'
    ) THEN
        -- Check if assigned_to column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'assigned_to'
        ) THEN
            -- Add assigned_to column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
        END IF;
        
        -- Check if category_id column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'category_id'
        ) THEN
            -- Add category_id column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN category_id INTEGER REFERENCES public.card_categories(id);
        END IF;
        
        -- Check if failed_attempts column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'failed_attempts'
        ) THEN
            -- Add failed_attempts column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN failed_attempts INTEGER DEFAULT 0;
        END IF;
        
        -- Check if max_usage_attempts column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'max_usage_attempts'
        ) THEN
            -- Add max_usage_attempts column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN max_usage_attempts INTEGER DEFAULT 1;
        END IF;
        
        -- Check if usage_cooldown_hours column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'usage_cooldown_hours'
        ) THEN
            -- Add usage_cooldown_hours column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN usage_cooldown_hours INTEGER DEFAULT 0;
        END IF;
        
        -- Check if status column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'status'
        ) THEN
            -- Add status column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        END IF;
        
        -- Check if valid_from column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'valid_from'
        ) THEN
            -- Add valid_from column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Check if valid_until column exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'valid_until'
        ) THEN
            -- Add valid_until column to recharge_cards table
            ALTER TABLE public.recharge_cards ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE;
        END IF;
    ELSE
        -- If the recharge_cards table doesn't exist, we should create it entirely
        -- This is a minimal version assuming other code will create the full table if needed
        CREATE TABLE IF NOT EXISTS public.recharge_cards (
            id SERIAL PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            points INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            category_id INTEGER REFERENCES public.card_categories(id),
            assigned_to UUID REFERENCES auth.users(id),
            valid_from TIMESTAMP WITH TIME ZONE,
            valid_until TIMESTAMP WITH TIME ZONE,
            max_usage_attempts INTEGER DEFAULT 1,
            usage_cooldown_hours INTEGER DEFAULT 0,
            failed_attempts INTEGER DEFAULT 0,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add RLS policies
        ALTER TABLE public.recharge_cards ENABLE ROW LEVEL SECURITY;
        
        -- Check if policy exists before creating it
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'recharge_cards' 
            AND policyname = 'admin_manage_recharge_cards'
        ) THEN
            -- Create policy for admins to manage cards
            CREATE POLICY admin_manage_recharge_cards ON public.recharge_cards
                FOR ALL
                USING (auth.jwt() ->> 'role' = 'admin');
        END IF;
    END IF;
END
$$; 