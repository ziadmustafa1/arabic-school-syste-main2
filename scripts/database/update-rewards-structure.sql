-- Script to update reward structure for badges, medals, and add emblems

-- 1. Update badges table to add max_points
ALTER TABLE public.badges 
RENAME COLUMN points_threshold TO min_points;

ALTER TABLE public.badges 
ADD COLUMN max_points INTEGER;

-- Set max_points to a default high value
UPDATE public.badges
SET max_points = 99999
WHERE max_points IS NULL;

-- Make max_points NOT NULL after setting defaults
ALTER TABLE public.badges
ALTER COLUMN max_points SET NOT NULL;

-- 2. Update medals table to add min/max points
ALTER TABLE public.medals 
RENAME COLUMN points_required TO min_points;

ALTER TABLE public.medals 
ADD COLUMN max_points INTEGER;

-- Set max_points to a default high value
UPDATE public.medals
SET max_points = 99999
WHERE max_points IS NULL;

-- Make max_points NOT NULL after setting defaults
ALTER TABLE public.medals
ALTER COLUMN max_points SET NOT NULL;

-- 3. Create emblems table
CREATE TABLE IF NOT EXISTS public.emblems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  points_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create user_emblems table
CREATE TABLE IF NOT EXISTS public.user_emblems (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emblem_id INTEGER NOT NULL REFERENCES public.emblems(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  awarded_by UUID REFERENCES public.users(id),
  CONSTRAINT unique_user_emblem UNIQUE (user_id, emblem_id)
);

-- Add RLS policies
ALTER TABLE public.emblems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emblems ENABLE ROW LEVEL SECURITY;

-- Create policies for emblems table
CREATE POLICY "Anyone can view emblems"
ON public.emblems
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage emblems"
ON public.emblems
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

-- Create policies for user_emblems table
CREATE POLICY "Users can view their emblems and admins can view all"
ON public.user_emblems
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

CREATE POLICY "Only admins can award emblems"
ON public.user_emblems
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_emblems_user_id ON public.user_emblems(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emblems_emblem_id ON public.user_emblems(emblem_id);
CREATE INDEX IF NOT EXISTS idx_emblems_points_value ON public.emblems(points_value);

-- 5. Update check_user_badges function to use min/max points range
CREATE OR REPLACE FUNCTION check_user_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_points INTEGER;
    badge_record RECORD;
BEGIN
    -- Only proceed if it's a positive points transaction
    IF NEW.is_positive = false THEN
        RETURN NEW;
    END IF;
    
    -- Get user's current points balance
    SELECT get_user_points_balance(NEW.user_id) INTO user_points;
    
    -- Check for any badges that the user qualifies for but doesn't have yet
    FOR badge_record IN
        SELECT b.id, b.name
        FROM badges b
        WHERE user_points BETWEEN b.min_points AND b.max_points
        AND NOT EXISTS (
            SELECT 1 FROM user_badges ub
            WHERE ub.badge_id = b.id AND ub.user_id = NEW.user_id
        )
    LOOP
        -- Award the badge to the user
        INSERT INTO user_badges (user_id, badge_id, awarded_at)
        VALUES (NEW.user_id, badge_record.id, NOW());
        
        -- Create a notification for the user
        INSERT INTO notifications (user_id, title, content, type, reference_id, created_at)
        VALUES (
            NEW.user_id,
            'تم الحصول على شارة جديدة',
            'مبروك! لقد حصلت على شارة جديدة: ' || badge_record.name,
            'badge',
            badge_record.id,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- 6. Create function for awarding emblems
CREATE OR REPLACE FUNCTION award_emblem_to_user(
  emblem_id_param INTEGER,
  user_id_param UUID,
  awarded_by_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  emblem_points INTEGER;
  emblem_name TEXT;
BEGIN
  -- Get the emblem points value
  SELECT points_value, name INTO emblem_points, emblem_name
  FROM emblems
  WHERE id = emblem_id_param;
  
  -- Check if emblem and user exist
  IF emblem_points IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Try to insert the user_emblem record
  BEGIN
    INSERT INTO user_emblems (user_id, emblem_id, awarded_at, awarded_by)
    VALUES (user_id_param, emblem_id_param, NOW(), awarded_by_param);
  EXCEPTION WHEN unique_violation THEN
    -- User already has this emblem, so just return true
    RETURN TRUE;
  END;
  
  -- Add points to user's balance
  INSERT INTO points_transactions (
    user_id,
    points,
    is_positive,
    category_id,
    notes,
    created_by
  ) VALUES (
    user_id_param,
    emblem_points,
    TRUE,
    1, -- Use default category ID
    'تم إضافة نقاط لحصولك على شارة: ' || emblem_name,
    awarded_by_param
  );
  
  -- Create a notification
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    reference_id,
    created_at
  ) VALUES (
    user_id_param,
    'تم الحصول على شارة جديدة',
    'مبروك! لقد حصلت على شارة: ' || emblem_name || ' وتم إضافة ' || emblem_points || ' نقطة إلى رصيدك',
    'emblem',
    emblem_id_param,
    NOW()
  );
  
  RETURN TRUE;
END;
$$; 