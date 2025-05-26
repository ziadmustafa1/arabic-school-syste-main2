-- Function to get total points for each student
CREATE OR REPLACE FUNCTION get_student_total_points()
RETURNS TABLE (
  user_id UUID,
  total_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.user_id,
    SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END) AS total_points
  FROM 
    points_transactions pt
  JOIN 
    users u ON pt.user_id = u.id
  WHERE 
    u.role_id = 1 -- Students only
  GROUP BY 
    pt.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL queries
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;
