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
    m.month::TEXT,
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