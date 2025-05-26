-- 1. List all tables with record counts
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) AS column_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) AS table_size,
    (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = t.table_name AND constraint_type = 'PRIMARY KEY') AS has_primary_key,
    (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = t.table_name AND constraint_type = 'FOREIGN KEY') AS foreign_key_count,
    (SELECT COUNT(*) FROM (SELECT 1 FROM quote_ident(t.table_name)) AS temp) AS record_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Detailed comparison of reward_redemptions and user_rewards
-- Record counts for both tables
SELECT 'reward_redemptions' as table_name, COUNT(*) as record_count FROM reward_redemptions;
SELECT 'user_rewards' as table_name, COUNT(*) as record_count FROM user_rewards;

-- Structure of both tables
SELECT 'reward_redemptions' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reward_redemptions'
ORDER BY ordinal_position;

SELECT 'user_rewards' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_rewards'
ORDER BY ordinal_position;

-- 3. Check point_categories data and structure
SELECT * FROM point_categories ORDER BY id;

-- Show the structure of point_categories table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'point_categories'
ORDER BY ordinal_position;

-- 4. Analyze usage of point categories
SELECT 
  pc.id as category_id,
  pc.name as category_name,
  pc.is_positive,
  COUNT(pt.id) as usage_count
FROM point_categories pc
LEFT JOIN points_transactions pt ON pc.id = pt.category_id
GROUP BY pc.id, pc.name, pc.is_positive
ORDER BY pc.is_positive DESC, usage_count DESC;

-- 5. Check sample data in points_transactions
SELECT 
  pt.id,
  pt.user_id,
  u.full_name as user_name,
  pt.category_id,
  pc.name as category_name,
  pt.points,
  pt.is_positive,
  pt.description,
  pt.created_at
FROM points_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
LEFT JOIN point_categories pc ON pt.category_id = pc.id
ORDER BY pt.created_at DESC
LIMIT 20;

-- 6. Check user_messages table structure and sample data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_messages'
ORDER BY ordinal_position;

SELECT 
  um.id,
  um.conversation_id,
  um.sender_id,
  s.full_name as sender_name,
  um.recipient_id,
  r.full_name as recipient_name,
  um.content,
  um.is_read,
  um.created_at
FROM user_messages um
LEFT JOIN users s ON um.sender_id = s.id
LEFT JOIN users r ON um.recipient_id = r.id
ORDER BY um.created_at DESC
LIMIT 10;

-- 7. Check if any users exist
SELECT role_id, COUNT(*) as user_count
FROM users
GROUP BY role_id
ORDER BY role_id; 