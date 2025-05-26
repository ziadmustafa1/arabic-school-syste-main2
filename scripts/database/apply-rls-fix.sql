-- This script fixes the RLS policies for user rewards and points transactions
-- to ensure students can redeem rewards properly

-- First, check if the insert policy for points_transactions exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'Users can create their own points transactions'
        AND polrelid = 'public.points_transactions'::regclass
    ) THEN
        DROP POLICY "Users can create their own points transactions" ON public.points_transactions;
    END IF;
END
$$;

-- Create the policy for points_transactions inserts
CREATE POLICY "Users can create their own points transactions"
ON public.points_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Next, check if the insert policy for user_rewards exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'Users can create their own reward redemptions'
        AND polrelid = 'public.user_rewards'::regclass
    ) THEN
        DROP POLICY "Users can create their own reward redemptions" ON public.user_rewards;
    END IF;
END
$$;

-- Create the policy for user_rewards select if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'Users can view their own rewards redemptions'
        AND polrelid = 'public.user_rewards'::regclass
    ) THEN
        CREATE POLICY "Users can view their own rewards redemptions"
        ON public.user_rewards
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create the policy for user_rewards inserts
CREATE POLICY "Users can create their own reward redemptions"
ON public.user_rewards
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Notify when complete
DO $$
BEGIN
    RAISE NOTICE 'RLS policies successfully applied';
END
$$; 