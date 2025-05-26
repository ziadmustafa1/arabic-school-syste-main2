-- Function to get system-wide points statistics
CREATE OR REPLACE FUNCTION get_points_system_stats()
RETURNS TABLE (
  total_users INT,
  total_points BIGINT,
  positive_points BIGINT,
  negative_points BIGINT,
  active_users INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      user_id,
      SUM(CASE WHEN is_positive THEN points ELSE 0 END) AS positive,
      SUM(CASE WHEN NOT is_positive THEN points ELSE 0 END) AS negative
    FROM 
      points_transactions
    GROUP BY 
      user_id
  )
  SELECT 
    (SELECT COUNT(*) FROM users)::INT AS total_users,
    (SELECT COALESCE(SUM(positive - negative), 0) FROM user_stats)::BIGINT AS total_points,
    (SELECT COALESCE(SUM(positive), 0) FROM user_stats)::BIGINT AS positive_points,
    (SELECT COALESCE(SUM(negative), 0) FROM user_stats)::BIGINT AS negative_points,
    (SELECT COUNT(*) FROM user_stats WHERE positive > 0 OR negative > 0)::INT AS active_users;
END;
$$ LANGUAGE plpgsql;

-- Function to get a user's rank
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.id,
      COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS total_points
    FROM 
      users u
    LEFT JOIN 
      points_transactions pt ON u.id = pt.user_id
    WHERE 
      u.role_id = 1 -- Only students
    GROUP BY 
      u.id
  )
  SELECT 
    RANK() OVER (ORDER BY total_points DESC) AS rank
  FROM 
    user_points
  WHERE 
    id = user_id_param;
END;
$$ LANGUAGE plpgsql;
