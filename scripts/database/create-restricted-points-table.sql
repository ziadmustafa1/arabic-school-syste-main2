-- Add new columns to point_categories table
ALTER TABLE point_categories 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE;

-- Create a comment for the columns
COMMENT ON COLUMN point_categories.is_mandatory IS 'Whether points are mandatory (automatically deducted) or optional (can be paid anytime)';
COMMENT ON COLUMN point_categories.is_restricted IS 'Whether points are restricted (need admin approval to be paid)';

-- Create restricted_points table to track restricted points
CREATE TABLE IF NOT EXISTS restricted_points (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES point_categories(id),
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restricted_points_user_id ON restricted_points(user_id);
CREATE INDEX IF NOT EXISTS idx_restricted_points_is_resolved ON restricted_points(is_resolved);
CREATE INDEX IF NOT EXISTS idx_restricted_points_category_id ON restricted_points(category_id);

-- Add comment to the table
COMMENT ON TABLE restricted_points IS 'Stores points that are restricted and require admin approval to be paid';

-- Update existing categories to set default values
UPDATE point_categories
SET is_mandatory = TRUE, is_restricted = FALSE
WHERE is_mandatory IS NULL OR is_restricted IS NULL; 