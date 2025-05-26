-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_rewards table to track redemptions
CREATE TABLE IF NOT EXISTS user_rewards (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, delivered
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Add some sample rewards
INSERT INTO rewards (name, description, points_cost, available_quantity, image_url)
VALUES 
  ('قسيمة مكتبة', 'قسيمة شراء من المكتبة المدرسية بقيمة 50 ريال', 500, 10, NULL),
  ('يوم بدون واجبات', 'الحصول على يوم واحد بدون واجبات منزلية', 300, 20, NULL),
  ('شهادة تقدير', 'شهادة تقدير موقعة من مدير المدرسة', 200, 30, NULL),
  ('رحلة مدرسية', 'المشاركة في الرحلة المدرسية القادمة مجاناً', 1000, 5, NULL),
  ('كتاب هدية', 'كتاب من اختيارك من المكتبة المدرسية', 400, 15, NULL);
