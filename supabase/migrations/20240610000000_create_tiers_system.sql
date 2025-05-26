-- Script to create tiers and levels system

-- 1. Create tiers table
CREATE TABLE IF NOT EXISTS public.tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL,
  color VARCHAR(50),
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create levels table
CREATE TABLE IF NOT EXISTS public.levels (
  id SERIAL PRIMARY KEY,
  tier_id INTEGER REFERENCES public.tiers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level_number INTEGER NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL,
  icon_url TEXT,
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_tier_level UNIQUE (tier_id, level_number)
);

-- 3. Create user_tiers table to track user progression
CREATE TABLE IF NOT EXISTS public.user_tiers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id INTEGER NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  current_level_id INTEGER REFERENCES public.levels(id) ON DELETE SET NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_tier UNIQUE (user_id, tier_id)
);

-- 4. Create tier_rewards table for special rewards
CREATE TABLE IF NOT EXISTS public.tier_rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tier_id INTEGER REFERENCES public.tiers(id) ON DELETE CASCADE,
  level_id INTEGER REFERENCES public.levels(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL, -- 'points', 'badge', 'coupon', 'special'
  points_value INTEGER DEFAULT 0,
  badge_id INTEGER REFERENCES public.badges(id) ON DELETE SET NULL,
  coupon_code VARCHAR(50),
  special_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create user_tier_rewards table to track awarded rewards
CREATE TABLE IF NOT EXISTS public.user_tier_rewards (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_reward_id INTEGER NOT NULL REFERENCES public.tier_rewards(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_tier_reward UNIQUE (user_id, tier_reward_id)
);

-- 6. Add RLS policies
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tier_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for tiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view tiers' AND tablename = 'tiers'
  ) THEN
    CREATE POLICY "Anyone can view tiers"
    ON public.tiers
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage tiers' AND tablename = 'tiers'
  ) THEN
    CREATE POLICY "Only admins can manage tiers"
    ON public.tiers
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
END$$;

-- Create policies for levels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view levels' AND tablename = 'levels'
  ) THEN
    CREATE POLICY "Anyone can view levels"
    ON public.levels
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage levels' AND tablename = 'levels'
  ) THEN
    CREATE POLICY "Only admins can manage levels"
    ON public.levels
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
END$$;

-- Create policies for user_tiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own tiers and admins can view all' AND tablename = 'user_tiers'
  ) THEN
    CREATE POLICY "Users can view their own tiers and admins can view all"
    ON public.user_tiers
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only system can insert or update user_tiers' AND tablename = 'user_tiers'
  ) THEN
    CREATE POLICY "Only system can insert or update user_tiers"
    ON public.user_tiers
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
END$$;

-- Create policies for tier_rewards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view tier rewards' AND tablename = 'tier_rewards'
  ) THEN
    CREATE POLICY "Anyone can view tier rewards"
    ON public.tier_rewards
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage tier rewards' AND tablename = 'tier_rewards'
  ) THEN
    CREATE POLICY "Only admins can manage tier rewards"
    ON public.tier_rewards
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
END$$;

-- Create policies for user_tier_rewards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own rewards and admins can view all' AND tablename = 'user_tier_rewards'
  ) THEN
    CREATE POLICY "Users can view their own rewards and admins can view all"
    ON public.user_tier_rewards
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only system can insert user tier rewards' AND tablename = 'user_tier_rewards'
  ) THEN
    CREATE POLICY "Only system can insert user tier rewards"
    ON public.user_tier_rewards
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT u.id FROM public.users u WHERE u.role_id = 4
      )
    );
  END IF;
END$$;

-- 7. Create function to check and update user tiers and levels
CREATE OR REPLACE FUNCTION check_user_tiers_and_levels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_points INTEGER;
  current_tier RECORD;
  current_level RECORD;
  next_tier RECORD;
  next_level RECORD;
  tier_change BOOLEAN := false;
  level_change BOOLEAN := false;
  tier_reward RECORD;
  points_reward INTEGER := 0;
BEGIN
  -- Only proceed if it's a positive points transaction
  IF NEW.is_positive = false THEN
    RETURN NEW;
  END IF;
  
  -- Get user's current points balance
  SELECT get_user_points_balance(NEW.user_id) INTO user_points;
  
  -- Get the user's current tier and level
  SELECT t.*, ut.id as user_tier_id, ut.current_level_id
  INTO current_tier
  FROM tiers t
  LEFT JOIN user_tiers ut ON t.id = ut.tier_id AND ut.user_id = NEW.user_id
  WHERE user_points BETWEEN t.min_points AND t.max_points
  ORDER BY t.max_points DESC
  LIMIT 1;
  
  -- If no tier record exists but user qualifies for a tier, insert it
  IF current_tier.id IS NULL AND user_points > 0 THEN
    SELECT *
    INTO current_tier
    FROM tiers t
    WHERE user_points BETWEEN t.min_points AND t.max_points
    ORDER BY t.min_points ASC
    LIMIT 1;
    
    IF current_tier.id IS NOT NULL THEN
      tier_change := true;
      
      -- Get the lowest level in this tier
      SELECT *
      INTO current_level
      FROM levels
      WHERE tier_id = current_tier.id AND user_points BETWEEN min_points AND max_points
      ORDER BY min_points ASC
      LIMIT 1;
      
      -- Insert user tier record
      INSERT INTO user_tiers (user_id, tier_id, current_level_id, achieved_at)
      VALUES (NEW.user_id, current_tier.id, current_level.id, NOW());
      
      -- Increment level and tier reward points
      points_reward := points_reward + current_level.reward_points;
      
      -- Check for tier rewards
      FOR tier_reward IN
        SELECT * FROM tier_rewards
        WHERE tier_id = current_tier.id AND level_id IS NULL
      LOOP
        -- Award the tier reward
        INSERT INTO user_tier_rewards (user_id, tier_reward_id, awarded_at)
        VALUES (NEW.user_id, tier_reward.id, NOW())
        ON CONFLICT (user_id, tier_reward_id) DO NOTHING;
        
        -- Add reward points if applicable
        IF tier_reward.reward_type = 'points' AND tier_reward.points_value > 0 THEN
          points_reward := points_reward + tier_reward.points_value;
        END IF;
        
        -- If reward is a badge, award it
        IF tier_reward.reward_type = 'badge' AND tier_reward.badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES (NEW.user_id, tier_reward.badge_id, NOW())
          ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END LOOP;
      
      -- Create a notification for the new tier
      INSERT INTO notifications (user_id, title, content, type, reference_id, created_at)
      VALUES (
        NEW.user_id,
        'ترقية إلى طبقة جديدة',
        'مبروك! تمت ترقيتك إلى طبقة ' || current_tier.name,
        'tier',
        current_tier.id,
        NOW()
      );
    END IF;
  -- Check if user qualifies for a higher tier
  ELSIF current_tier.id IS NOT NULL THEN
    -- Get current user level
    SELECT *
    INTO current_level
    FROM levels
    WHERE id = current_tier.current_level_id;
    
    -- Check for level change within current tier
    SELECT *
    INTO next_level
    FROM levels
    WHERE tier_id = current_tier.id 
      AND level_number > COALESCE(current_level.level_number, 0)
      AND user_points BETWEEN min_points AND max_points
    ORDER BY level_number ASC
    LIMIT 1;
    
    -- If found a new level in current tier
    IF next_level.id IS NOT NULL AND (current_level.id IS NULL OR next_level.id != current_level.id) THEN
      level_change := true;
      
      -- Update user_tier record with new level
      UPDATE user_tiers
      SET current_level_id = next_level.id
      WHERE user_id = NEW.user_id AND tier_id = current_tier.id;
      
      -- Increment level reward points
      points_reward := points_reward + next_level.reward_points;
      
      -- Check for level-specific rewards
      FOR tier_reward IN
        SELECT * FROM tier_rewards
        WHERE tier_id = current_tier.id AND level_id = next_level.id
      LOOP
        -- Award the level reward
        INSERT INTO user_tier_rewards (user_id, tier_reward_id, awarded_at)
        VALUES (NEW.user_id, tier_reward.id, NOW())
        ON CONFLICT (user_id, tier_reward_id) DO NOTHING;
        
        -- Add reward points if applicable
        IF tier_reward.reward_type = 'points' AND tier_reward.points_value > 0 THEN
          points_reward := points_reward + tier_reward.points_value;
        END IF;
        
        -- If reward is a badge, award it
        IF tier_reward.reward_type = 'badge' AND tier_reward.badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES (NEW.user_id, tier_reward.badge_id, NOW())
          ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END LOOP;
      
      -- Create a notification for the new level
      INSERT INTO notifications (user_id, title, content, type, reference_id, created_at)
      VALUES (
        NEW.user_id,
        'ترقية إلى مستوى جديد',
        'مبروك! تمت ترقيتك إلى المستوى ' || next_level.level_number || ' في طبقة ' || current_tier.name,
        'level',
        next_level.id,
        NOW()
      );
    END IF;
    
    -- Check for tier upgrade
    SELECT t.*
    INTO next_tier
    FROM tiers t
    WHERE t.min_points > current_tier.max_points
      AND user_points BETWEEN t.min_points AND t.max_points
    ORDER BY t.min_points ASC
    LIMIT 1;
    
    -- If found a new tier
    IF next_tier.id IS NOT NULL THEN
      tier_change := true;
      
      -- Get the lowest level in the new tier
      SELECT *
      INTO next_level
      FROM levels
      WHERE tier_id = next_tier.id AND user_points BETWEEN min_points AND max_points
      ORDER BY min_points ASC
      LIMIT 1;
      
      -- Insert new user tier record
      INSERT INTO user_tiers (user_id, tier_id, current_level_id, achieved_at)
      VALUES (NEW.user_id, next_tier.id, next_level.id, NOW());
      
      -- Increment tier and level reward points
      points_reward := points_reward + next_level.reward_points;
      
      -- Check for tier rewards
      FOR tier_reward IN
        SELECT * FROM tier_rewards
        WHERE tier_id = next_tier.id AND level_id IS NULL
      LOOP
        -- Award the tier reward
        INSERT INTO user_tier_rewards (user_id, tier_reward_id, awarded_at)
        VALUES (NEW.user_id, tier_reward.id, NOW())
        ON CONFLICT (user_id, tier_reward_id) DO NOTHING;
        
        -- Add reward points if applicable
        IF tier_reward.reward_type = 'points' AND tier_reward.points_value > 0 THEN
          points_reward := points_reward + tier_reward.points_value;
        END IF;
        
        -- If reward is a badge, award it
        IF tier_reward.reward_type = 'badge' AND tier_reward.badge_id IS NOT NULL THEN
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES (NEW.user_id, tier_reward.badge_id, NOW())
          ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
      END LOOP;
      
      -- Create a notification for the new tier
      INSERT INTO notifications (user_id, title, content, type, reference_id, created_at)
      VALUES (
        NEW.user_id,
        'ترقية إلى طبقة جديدة',
        'مبروك! تمت ترقيتك إلى طبقة ' || next_tier.name,
        'tier',
        next_tier.id,
        NOW()
      );
    END IF;
  END IF;
  
  -- If there are incentive points to add, do it now
  IF points_reward > 0 THEN
    -- Create a points transaction for the reward
    INSERT INTO points_transactions (
      user_id,
      points,
      is_positive,
      category_id,
      notes,
      created_by
    ) VALUES (
      NEW.user_id,
      points_reward,
      TRUE,
      1, -- Use default category ID
      'نقاط تحفيزية للترقية في المستوى',
      NEW.created_by
    );
    
    -- Create a notification for the points reward
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      created_at
    ) VALUES (
      NEW.user_id,
      'نقاط تحفيزية',
      'مبروك! حصلت على ' || points_reward || ' نقطة تحفيزية للترقية',
      'points',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create or replace the trigger for checking tiers and levels
DO $$
BEGIN
  -- Check if the trigger exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_tiers_and_levels_trigger' 
    AND tgrelid = 'points_transactions'::regclass
  ) THEN
    DROP TRIGGER check_tiers_and_levels_trigger ON points_transactions;
  END IF;
  
  -- Create the trigger
  CREATE TRIGGER check_tiers_and_levels_trigger
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_user_tiers_and_levels();
END$$;

-- 9. Insert default tiers and levels
INSERT INTO tiers (name, description, min_points, max_points, color)
VALUES 
  ('برونزية', 'المستوى البرونزي', 0, 999, '#CD7F32'),
  ('فضية', 'المستوى الفضي', 1000, 2999, '#C0C0C0'),
  ('ذهبية', 'المستوى الذهبي', 3000, 5999, '#FFD700'),
  ('بلاتينية', 'المستوى البلاتيني', 6000, 99999, '#E5E4E2')
ON CONFLICT DO NOTHING;

-- Bronze tier levels
INSERT INTO levels (tier_id, name, level_number, description, min_points, max_points, reward_points)
VALUES 
  ((SELECT id FROM tiers WHERE name = 'برونزية'), 'برونزي 1', 1, 'المستوى الأول البرونزي', 0, 249, 50),
  ((SELECT id FROM tiers WHERE name = 'برونزية'), 'برونزي 2', 2, 'المستوى الثاني البرونزي', 250, 499, 50),
  ((SELECT id FROM tiers WHERE name = 'برونزية'), 'برونزي 3', 3, 'المستوى الثالث البرونزي', 500, 749, 50),
  ((SELECT id FROM tiers WHERE name = 'برونزية'), 'برونزي 4', 4, 'المستوى الرابع البرونزي', 750, 999, 100)
ON CONFLICT DO NOTHING;

-- Silver tier levels
INSERT INTO levels (tier_id, name, level_number, description, min_points, max_points, reward_points)
VALUES 
  ((SELECT id FROM tiers WHERE name = 'فضية'), 'فضي 1', 1, 'المستوى الأول الفضي', 1000, 1499, 100),
  ((SELECT id FROM tiers WHERE name = 'فضية'), 'فضي 2', 2, 'المستوى الثاني الفضي', 1500, 1999, 100),
  ((SELECT id FROM tiers WHERE name = 'فضية'), 'فضي 3', 3, 'المستوى الثالث الفضي', 2000, 2499, 100),
  ((SELECT id FROM tiers WHERE name = 'فضية'), 'فضي 4', 4, 'المستوى الرابع الفضي', 2500, 2999, 150)
ON CONFLICT DO NOTHING;

-- Gold tier levels
INSERT INTO levels (tier_id, name, level_number, description, min_points, max_points, reward_points)
VALUES 
  ((SELECT id FROM tiers WHERE name = 'ذهبية'), 'ذهبي 1', 1, 'المستوى الأول الذهبي', 3000, 3999, 150),
  ((SELECT id FROM tiers WHERE name = 'ذهبية'), 'ذهبي 2', 2, 'المستوى الثاني الذهبي', 4000, 4999, 150),
  ((SELECT id FROM tiers WHERE name = 'ذهبية'), 'ذهبي 3', 3, 'المستوى الثالث الذهبي', 5000, 5999, 200)
ON CONFLICT DO NOTHING;

-- Platinum tier levels
INSERT INTO levels (tier_id, name, level_number, description, min_points, max_points, reward_points)
VALUES 
  ((SELECT id FROM tiers WHERE name = 'بلاتينية'), 'بلاتيني 1', 1, 'المستوى الأول البلاتيني', 6000, 7999, 200),
  ((SELECT id FROM tiers WHERE name = 'بلاتينية'), 'بلاتيني 2', 2, 'المستوى الثاني البلاتيني', 8000, 9999, 200),
  ((SELECT id FROM tiers WHERE name = 'بلاتينية'), 'بلاتيني 3', 3, 'المستوى الثالث البلاتيني', 10000, 99999, 500)
ON CONFLICT DO NOTHING;

-- Insert tier rewards (basic example)
INSERT INTO tier_rewards (name, description, tier_id, reward_type, points_value)
VALUES
  ('مكافأة الطبقة الفضية', 'مكافأة الترقية إلى الطبقة الفضية', (SELECT id FROM tiers WHERE name = 'فضية'), 'points', 500),
  ('مكافأة الطبقة الذهبية', 'مكافأة الترقية إلى الطبقة الذهبية', (SELECT id FROM tiers WHERE name = 'ذهبية'), 'points', 1000),
  ('مكافأة الطبقة البلاتينية', 'مكافأة الترقية إلى الطبقة البلاتينية', (SELECT id FROM tiers WHERE name = 'بلاتينية'), 'points', 1500)
ON CONFLICT DO NOTHING; 