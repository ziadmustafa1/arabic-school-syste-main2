-- Deploy SQL functions for the points system

-- Function to calculate user points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(
      SUM(
        CASE 
          WHEN is_positive THEN points 
          ELSE -points 
        END
      ), 0
    ) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = user_id_param;
    
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
    u.full_name,
    COALESCE(
      SUM(
        CASE 
          WHEN pt.is_positive THEN pt.points 
          ELSE -pt.points 
        END
      ), 0
    ) AS total_points
  FROM 
    users u
  LEFT JOIN 
    points_transactions pt ON u.id = pt.user_id
  WHERE 
    u.role_id = 1 -- Only students
  GROUP BY 
    u.id, u.full_name
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

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
    pc.name AS category_name,
    SUM(pt.points) AS total_points,
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