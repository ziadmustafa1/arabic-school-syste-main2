-- Check data in both tables
SELECT 'reward_redemptions' as table_name, COUNT(*) as record_count FROM reward_redemptions;
SELECT 'user_rewards' as table_name, COUNT(*) as record_count FROM user_rewards;

-- Show structure of both tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reward_redemptions'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_rewards'
ORDER BY ordinal_position; 