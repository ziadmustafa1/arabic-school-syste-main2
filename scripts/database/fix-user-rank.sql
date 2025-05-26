-- Function to calculate user rank among students
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.id,
      COALESCE(
        SUM(
          CASE 
            WHEN pt.is_positive THEN pt.points 
            ELSE -pt.points 
          END
        ), 0
      )::BIGINT AS total_points
    FROM 
      users u
    LEFT JOIN 
      points_transactions pt ON u.id = pt.user_id
    WHERE 
      u.role_id = 1 -- Student role
    GROUP BY 
      u.id
  ),
  ranked_users AS (
    SELECT 
      id,
      RANK() OVER (ORDER BY total_points DESC)::BIGINT AS rank
    FROM 
      user_points
  )
  SELECT 
    user_id_param AS user_id,
    COALESCE(ru.rank, 0)::BIGINT AS rank
  FROM 
    ranked_users ru
  WHERE 
    ru.id = user_id_param;
END;
$$ LANGUAGE plpgsql; 