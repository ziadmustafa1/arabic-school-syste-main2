-- Fix missing columns in the user_rewards table

-- Check if redemption_code column exists and add it if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'redemption_code'
        AND table_schema = 'public'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.user_rewards ADD COLUMN redemption_code VARCHAR(50);
        RAISE NOTICE 'Added redemption_code column';
    ELSE
        -- If it exists, alter its type to support longer codes
        ALTER TABLE public.user_rewards ALTER COLUMN redemption_code TYPE VARCHAR(50);
        RAISE NOTICE 'Updated redemption_code column type to VARCHAR(50)';
    END IF;
END
$$;

-- Add redeemed_value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'redeemed_value'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_rewards ADD COLUMN redeemed_value INTEGER;
        RAISE NOTICE 'Added redeemed_value column';
    END IF;
END
$$;

-- Add created_by field if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_rewards ADD COLUMN created_by UUID REFERENCES public.users(id);
        RAISE NOTICE 'Added created_by column';
    END IF;
END
$$; 