-- Fix the user_rewards table to add any missing required columns

-- Add redeemed_value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'redeemed_value'
    ) THEN
        ALTER TABLE public.user_rewards 
        ADD COLUMN redeemed_value INTEGER;
    END IF;
END
$$;

-- Make sure the redemption_code column allows for longer codes
DO $$
BEGIN
    ALTER TABLE public.user_rewards 
    ALTER COLUMN redemption_code TYPE VARCHAR(20);
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not alter redemption_code column type: %', SQLERRM;
END
$$;

-- Add automatic created_by field if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.user_rewards 
        ADD COLUMN created_by UUID REFERENCES public.users(id);
    END IF;
END
$$; 