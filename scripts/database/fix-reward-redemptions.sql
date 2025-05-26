-- 1. Check current structure and data of both tables
SELECT 'reward_redemptions' as table_name, COUNT(*) as record_count FROM reward_redemptions;
SELECT 'user_rewards' as table_name, COUNT(*) as record_count FROM user_rewards;

-- Structure of both tables
SELECT 'reward_redemptions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reward_redemptions'
ORDER BY ordinal_position;

SELECT 'user_rewards' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_rewards'
ORDER BY ordinal_position;

-- 2. Check if points_spent column exists in user_rewards table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_rewards' 
    AND column_name = 'points_spent'
  ) THEN
    -- Add points_spent column to user_rewards
    ALTER TABLE user_rewards ADD COLUMN points_spent INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added points_spent column to user_rewards table';
  ELSE
    RAISE NOTICE 'points_spent column already exists in user_rewards table';
  END IF;
END $$;

-- 3. Create a view for backward compatibility (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' 
    AND table_name = 'reward_redemptions_view'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.reward_redemptions_view AS SELECT * FROM public.user_rewards';
    RAISE NOTICE 'Created reward_redemptions_view for backward compatibility';
  ELSE
    RAISE NOTICE 'reward_redemptions_view already exists';
  END IF;
END $$;

-- 4. Verify the tables after changes
SELECT 'user_rewards' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_rewards'
ORDER BY ordinal_position;

-- Check if the view exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('reward_redemptions', 'reward_redemptions_view');

-- Suggestion for fixing the code inconsistency
SELECT 'RECOMMENDATION: Update your code to use user_rewards table instead of reward_redemptions. Or create a view named reward_redemptions that points to user_rewards table.' as recommendation; 