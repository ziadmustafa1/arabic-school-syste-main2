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
      TO_CHAR(date_trunc('month', (current_date - (n || ' month')::interval)), 'Month') AS month,
      EXTRACT(YEAR FROM (current_date - (n || ' month')::interval)) AS year,
      date_trunc('month', (current_date - (n || ' month')::interval)) AS month_start,
      date_trunc('month', (current_date - (n || ' month')::interval)) + interval '1 month' - interval '1 day' AS month_end
    FROM generate_series(0, months_count - 1) AS n
  ),
  positive_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points) AS points
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
      SUM(points) AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = false
    GROUP BY 
      month_date
  )
  SELECT 
    m.month,
    m.year::INT,
    COALESCE(pp.points, 0)::BIGINT AS positive_points,
    COALESCE(np.points, 0)::BIGINT AS negative_points,
    (COALESCE(pp.points, 0) - COALESCE(np.points, 0))::BIGINT AS net_points
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

-- Enhanced leaderboard function with time period parameter
CREATE OR REPLACE FUNCTION get_leaderboard(
  time_period TEXT DEFAULT 'month',
  results_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  user_code TEXT,
  role_id INT,
  role_name TEXT,
  total_points BIGINT,
  rank INT
) AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Determine the start date based on the time period
  CASE time_period
    WHEN 'week' THEN
      start_date := date_trunc('week', current_date);
    WHEN 'month' THEN
      start_date := date_trunc('month', current_date);
    WHEN 'year' THEN
      start_date := date_trunc('year', current_date);
    ELSE
      start_date := '1970-01-01'::TIMESTAMP; -- 'all' time
  END CASE;

  RETURN QUERY
  WITH points_summary AS (
    SELECT 
      pt.user_id,
      SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END) AS points
    FROM 
      points_transactions pt
    WHERE 
      pt.created_at >= start_date
    GROUP BY 
      pt.user_id
  ),
  ranked_users AS (
    SELECT 
      u.id AS user_id,
      u.full_name,
      u.user_code,
      u.role_id,
      r.name AS role_name,
      COALESCE(ps.points, 0) AS total_points,
      RANK() OVER (ORDER BY COALESCE(ps.points, 0) DESC) AS rank
    FROM 
      users u
    LEFT JOIN 
      points_summary ps ON u.id = ps.user_id
    LEFT JOIN
      roles r ON u.role_id = r.id
    WHERE 
      u.role_id = 1 -- Only students
  )
  SELECT * FROM ranked_users
  WHERE total_points > 0
  ORDER BY rank
  LIMIT results_limit;
END;
$$ LANGUAGE plpgsql;
