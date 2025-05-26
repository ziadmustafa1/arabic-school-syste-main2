-- Add is_positive field to user_records table
ALTER TABLE user_records ADD COLUMN IF NOT EXISTS is_positive BOOLEAN DEFAULT TRUE;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_user_records_is_positive ON user_records(is_positive);

COMMENT ON COLUMN user_records.is_positive IS 'Whether the record is positive (true) or negative (false). Defaults to positive.';

-- Update the triggers that will update the user_points whenever a record is added/updated/deleted
CREATE OR REPLACE FUNCTION update_user_points_on_record_change()
RETURNS TRIGGER AS $$
DECLARE
  point_value INT;
  is_record_positive BOOLEAN;
BEGIN
  -- For INSERT operations
  IF (TG_OP = 'INSERT') THEN
    is_record_positive := COALESCE(NEW.is_positive, TRUE);
    point_value := NEW.points_value;
    
    -- Create or update the user_points record
    INSERT INTO user_points (user_id, total_points, positive_points, negative_points, last_updated)
    VALUES (
      NEW.user_id,
      CASE WHEN is_record_positive THEN point_value ELSE -point_value END,
      CASE WHEN is_record_positive THEN point_value ELSE 0 END,
      CASE WHEN is_record_positive THEN 0 ELSE point_value END,
      NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_points = user_points.total_points + (CASE WHEN is_record_positive THEN point_value ELSE -point_value END),
      positive_points = user_points.positive_points + (CASE WHEN is_record_positive THEN point_value ELSE 0 END),
      negative_points = user_points.negative_points + (CASE WHEN is_record_positive THEN 0 ELSE point_value END),
      last_updated = NOW();
    
    RETURN NEW;
  
  -- For UPDATE operations
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only proceed if points value or is_positive changed
    IF (NEW.points_value <> OLD.points_value OR NEW.is_positive IS DISTINCT FROM OLD.is_positive) THEN
      -- Remove old points
      UPDATE user_points
      SET 
        total_points = total_points - (CASE WHEN COALESCE(OLD.is_positive, TRUE) THEN OLD.points_value ELSE -OLD.points_value END),
        positive_points = positive_points - (CASE WHEN COALESCE(OLD.is_positive, TRUE) THEN OLD.points_value ELSE 0 END),
        negative_points = negative_points - (CASE WHEN COALESCE(OLD.is_positive, TRUE) THEN 0 ELSE OLD.points_value END),
        last_updated = NOW()
      WHERE user_id = OLD.user_id;
      
      -- Add new points
      UPDATE user_points
      SET 
        total_points = total_points + (CASE WHEN COALESCE(NEW.is_positive, TRUE) THEN NEW.points_value ELSE -NEW.points_value END),
        positive_points = positive_points + (CASE WHEN COALESCE(NEW.is_positive, TRUE) THEN NEW.points_value ELSE 0 END),
        negative_points = negative_points + (CASE WHEN COALESCE(NEW.is_positive, TRUE) THEN 0 ELSE NEW.points_value END),
        last_updated = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  
  -- For DELETE operations
  ELSIF (TG_OP = 'DELETE') THEN
    is_record_positive := COALESCE(OLD.is_positive, TRUE);
    point_value := OLD.points_value;
    
    -- Remove the points contribution
    UPDATE user_points
    SET 
      total_points = total_points - (CASE WHEN is_record_positive THEN point_value ELSE -point_value END),
      positive_points = positive_points - (CASE WHEN is_record_positive THEN point_value ELSE 0 END),
      negative_points = negative_points - (CASE WHEN is_record_positive THEN 0 ELSE point_value END),
      last_updated = NOW()
    WHERE user_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS user_records_points_update_trigger ON user_records;

CREATE TRIGGER user_records_points_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_records
FOR EACH ROW
EXECUTE FUNCTION update_user_points_on_record_change();

-- Create a user_points table if it doesn't exist to track points balance
CREATE TABLE IF NOT EXISTS user_points (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  positive_points INTEGER DEFAULT 0,
  negative_points INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- Make sure RLS is enabled for this table
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Create policies for the user_points table
CREATE POLICY "Users can view their own points"
  ON user_points
  FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Teachers and admins can view all user points"
  ON user_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role_id = 3 OR users.role_id = 4)
    )
  );

CREATE POLICY "Only system can update points"
  ON user_points
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Populate user_points from existing records if needed
INSERT INTO user_points (user_id, total_points, positive_points, negative_points)
SELECT 
  r.user_id,
  SUM(CASE WHEN COALESCE(r.is_positive, TRUE) THEN r.points_value ELSE -r.points_value END) as total_points,
  SUM(CASE WHEN COALESCE(r.is_positive, TRUE) THEN r.points_value ELSE 0 END) as positive_points,
  SUM(CASE WHEN COALESCE(r.is_positive, TRUE) THEN 0 ELSE r.points_value END) as negative_points
FROM user_records r
GROUP BY r.user_id
ON CONFLICT (user_id)
DO UPDATE SET
  total_points = EXCLUDED.total_points,
  positive_points = EXCLUDED.positive_points,
  negative_points = EXCLUDED.negative_points,
  last_updated = NOW(); 