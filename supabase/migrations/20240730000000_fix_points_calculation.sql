-- Fix the get_user_points_balance function to correctly calculate points
CREATE OR REPLACE FUNCTION public.get_user_points_balance(user_id_param UUID)
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

-- Fix the get_student_total_points function for leaderboard
CREATE OR REPLACE FUNCTION public.get_student_total_points()
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

-- Update the calculate_user_points function to use get_user_points_balance
CREATE OR REPLACE FUNCTION public.calculate_user_points(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Simply call get_user_points_balance for consistency
  RETURN get_user_points_balance(user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create student_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_points (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_id UNIQUE (student_id)
);

-- Add RLS policies for student_points table
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

-- Create policies for student_points table
CREATE POLICY "Users can view their own points"
  ON public.student_points
  FOR SELECT
  USING (auth.uid() = student_id);
  
CREATE POLICY "Teachers and admins can view all student points"
  ON public.student_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role_id = 3 OR users.role_id = 4)
    )
  );

CREATE POLICY "Only system can update points"
  ON public.student_points
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Grant permissions to authenticated users
GRANT SELECT ON public.student_points TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_points_student_id ON public.student_points(student_id); 