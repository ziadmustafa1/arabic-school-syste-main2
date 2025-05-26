-- إجراء لحساب أعلى فئات النقاط استخداماً
CREATE OR REPLACE FUNCTION get_top_point_categories(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  is_positive BOOLEAN,
  total_points BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.name,
    pc.is_positive,
    SUM(pt.points)::BIGINT as total_points,
    COUNT(pt.id)::BIGINT as transaction_count
  FROM 
    points_transactions pt
  JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.created_at >= start_date
  GROUP BY 
    pc.id, pc.name, pc.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- إجراء لحساب عدد المستخدمين حسب الدور
CREATE OR REPLACE FUNCTION get_users_by_role()
RETURNS TABLE (
  role_id INTEGER,
  role_name TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as role_id,
    r.name as role_name,
    COUNT(u.id)::BIGINT as count
  FROM 
    roles r
  LEFT JOIN 
    users u ON r.id = u.role_id
  GROUP BY 
    r.id, r.name
  ORDER BY 
    r.id;
END;
$$ LANGUAGE plpgsql;

-- إجراء لحساب أكثر المكافآت استبدالاً
CREATE OR REPLACE FUNCTION get_top_rewards(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  points_cost INTEGER,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.points_cost,
    COUNT(ur.id)::BIGINT as count
  FROM 
    rewards r
  JOIN 
    user_rewards ur ON r.id = ur.reward_id
  WHERE 
    ur.redeemed_at >= start_date
  GROUP BY 
    r.id, r.name, r.points_cost
  ORDER BY 
    count DESC;
END;
$$ LANGUAGE plpgsql;
