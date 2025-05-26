-- Check data in point_categories table
SELECT * FROM point_categories ORDER BY id;

-- Get count of points transactions by category
SELECT 
  pc.id as category_id,
  pc.name as category_name,
  pc.is_positive,
  COUNT(pt.id) as usage_count
FROM point_categories pc
LEFT JOIN points_transactions pt ON pc.id = pt.category_id
GROUP BY pc.id, pc.name, pc.is_positive
ORDER BY pc.is_positive DESC, usage_count DESC; 