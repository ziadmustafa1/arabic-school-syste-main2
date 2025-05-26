-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = table_name
    AND column_name = column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- Function to create the fix_badges_schema function
CREATE OR REPLACE FUNCTION create_fix_badges_schema_function()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create the function to fix the badges schema
  CREATE OR REPLACE FUNCTION fix_badges_schema()
  RETURNS boolean
  LANGUAGE plpgsql
  AS $func$
  BEGIN
    -- Check if points_threshold exists and min_points doesn't
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'badges' 
      AND column_name = 'points_threshold'
    ) AND NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'badges' 
      AND column_name = 'min_points'
    ) THEN
      -- Rename points_threshold to min_points
      ALTER TABLE public.badges RENAME COLUMN points_threshold TO min_points;
      
      -- Add max_points column if it doesn't exist
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'badges' 
        AND column_name = 'max_points'
      ) THEN
        ALTER TABLE public.badges ADD COLUMN max_points INTEGER;
        
        -- Set default max_points value
        UPDATE public.badges SET max_points = 99999 WHERE max_points IS NULL;
        
        -- Make max_points NOT NULL
        ALTER TABLE public.badges ALTER COLUMN max_points SET NOT NULL;
      END IF;
      
      RETURN TRUE;
    ELSE
      -- Already fixed or needs manual intervention
      RETURN FALSE;
    END IF;
  END;
  $func$;
  
  RETURN TRUE;
END;
$$;

-- Create the function to fix the badges schema
CREATE OR REPLACE FUNCTION fix_badges_schema()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if points_threshold exists and min_points doesn't
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'badges' 
    AND column_name = 'points_threshold'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'badges' 
    AND column_name = 'min_points'
  ) THEN
    -- Rename points_threshold to min_points
    ALTER TABLE public.badges RENAME COLUMN points_threshold TO min_points;
    
    -- Add max_points column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'badges' 
      AND column_name = 'max_points'
    ) THEN
      ALTER TABLE public.badges ADD COLUMN max_points INTEGER;
      
      -- Set default max_points value
      UPDATE public.badges SET max_points = 99999 WHERE max_points IS NULL;
      
      -- Make max_points NOT NULL
      ALTER TABLE public.badges ALTER COLUMN max_points SET NOT NULL;
    END IF;
    
    RETURN TRUE;
  ELSE
    -- Already fixed or needs manual intervention
    RETURN FALSE;
  END IF;
END;
$$; 