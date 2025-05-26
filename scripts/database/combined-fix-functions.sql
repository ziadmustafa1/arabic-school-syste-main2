-- Combined SQL file that adds all missing database functions
-- Run this in your Supabase SQL editor

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
    u.full_name::TEXT,
    COALESCE(
      SUM(
        CASE 
          WHEN pt.is_positive THEN pt.points 
          ELSE -pt.points 
        END
      ), 0
    )::INTEGER AS total_points
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

-- Function to calculate points within a period
CREATE OR REPLACE FUNCTION calculate_user_points(user_id_param UUID)
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
  
  -- Calculate total points
  total_points := positive_points - negative_points;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get points by month for a user
CREATE OR REPLACE FUNCTION get_points_by_month(
  user_id_param UUID,
  months_count INT DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  year INT,
  positive_points BIGINT,
  negative_points BIGINT,
  net_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(date_trunc('month', (current_date - (n || ' month')::interval)), 'Month')::TEXT AS month,
      EXTRACT(YEAR FROM (current_date - (n || ' month')::interval))::INT AS year,
      date_trunc('month', (current_date - (n || ' month')::interval)) AS month_start,
      date_trunc('month', (current_date - (n || ' month')::interval)) + interval '1 month' - interval '1 day' AS month_end
    FROM generate_series(0, months_count - 1) AS n
  ),
  positive_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = true
    GROUP BY 
      month_date
  ),
  negative_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = false
    GROUP BY 
      month_date
  )
  SELECT 
    m.month,
    m.year,
    COALESCE(pp.points, 0) AS positive_points,
    COALESCE(np.points, 0) AS negative_points,
    (COALESCE(pp.points, 0) - COALESCE(np.points, 0)) AS net_points
  FROM 
    months m
  LEFT JOIN 
    positive_points pp ON m.month_start = pp.month_date
  LEFT JOIN 
    negative_points np ON m.month_start = np.month_date
  ORDER BY 
    m.month_start DESC;
END;
$$ LANGUAGE plpgsql;

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