-- Function to calculate user points
CREATE OR REPLACE FUNCTION calculate_user_points(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN is_positive THEN points ELSE -points END), 0) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = $1;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;
