-- Fix the user_rewards table to add the missing delivered_at column

-- First check if the delivered_at column already exists
DO $$ 
BEGIN
  -- Check if the delivered_at column exists
  IF NOT EXISTS (SELECT 1 
                 FROM information_schema.columns 
                 WHERE table_name = 'user_rewards' 
                 AND column_name = 'delivered_at') THEN
    
    -- Add the delivered_at column
    ALTER TABLE user_rewards ADD COLUMN delivered_at TIMESTAMPTZ DEFAULT NULL;
    
    RAISE NOTICE 'Added missing delivered_at column to user_rewards table';
  ELSE
    RAISE NOTICE 'delivered_at column already exists in user_rewards table';
  END IF;
  
END $$; 