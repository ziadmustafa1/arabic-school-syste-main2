-- Fix missing database functions for points calculations

-- Function to get points by category for a user
CREATE OR REPLACE FUNCTION get_points_by_category(user_id_param UUID)
RETURNS TABLE (
  category_id INT,
  category_name TEXT,
  total_points BIGINT,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id AS category_id,
    pc.name::TEXT AS category_name,
    SUM(pt.points)::BIGINT AS total_points,
    pt.is_positive
  FROM 
    points_transactions pt
  LEFT JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.user_id = user_id_param
  GROUP BY 
    pc.id, pc.name, pt.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  positive_points INTEGER;
  negative_points INTEGER;
  total_points INTEGER;
BEGIN
  -- Get positive points
  SELECT COALESCE(SUM(points), 0) INTO positive_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = true;
  
  -- Get negative points
  SELECT COALESCE(SUM(points), 0) INTO negative_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = false;
  
  -- Calculate total points: positives minus negatives
  total_points := positive_points - negative_points;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get student total points for leaderboard
CREATE OR REPLACE FUNCTION get_student_total_points()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.full_name::TEXT,
    COALESCE(
      (
        SELECT SUM(points) FROM points_transactions 
        WHERE user_id = u.id AND is_positive = true
      ) - 
      (
        SELECT COALESCE(SUM(points), 0) FROM points_transactions 
        WHERE user_id = u.id AND is_positive = false
      )
    , 0)::INTEGER AS total_points
  FROM 
    users u
  WHERE 
    u.role_id = 1 -- Only students
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate points within a period
CREATE OR REPLACE FUNCTION calculate_user_points(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Simply call get_user_points_balance for consistency
  RETURN get_user_points_balance(user_id_param);
END;
$$ LANGUAGE plpgsql; 