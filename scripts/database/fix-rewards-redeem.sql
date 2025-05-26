-- This script fixes the VARCHAR(12) limitation for redemption_code

-- Alter the redemption_code column to accept longer codes
ALTER TABLE public.user_rewards ALTER COLUMN redemption_code TYPE VARCHAR(50);

-- Add the redeemed_value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_rewards' 
        AND column_name = 'redeemed_value'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_rewards ADD COLUMN redeemed_value INTEGER;
    END IF;
END
$$; 