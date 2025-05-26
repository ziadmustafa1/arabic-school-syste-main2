-- 1. Check current structure of point_categories table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'point_categories'
ORDER BY ordinal_position;

-- 2. Fix the missing default_points column if needed
DO $$
BEGIN
  -- Check if default_points column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'point_categories' 
    AND column_name = 'default_points'
  ) THEN
    -- Add default_points column
    ALTER TABLE point_categories ADD COLUMN default_points INTEGER NOT NULL DEFAULT 5;
    RAISE NOTICE 'Added default_points column to point_categories table';
  ELSE
    RAISE NOTICE 'default_points column already exists in point_categories table';
  END IF;
END $$;

-- 3. Insert sample point categories if table is empty
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get an admin user ID for the created_by field
  SELECT id INTO admin_id FROM users WHERE role_id = 4 LIMIT 1;
  
  IF admin_id IS NULL THEN
    -- If no admin, get any user
    SELECT id INTO admin_id FROM users LIMIT 1;
  END IF;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No users found in the database to set as created_by';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM point_categories LIMIT 1) THEN
    -- Check for all required columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'point_categories' 
      AND column_name = 'points'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'point_categories' 
      AND column_name = 'created_by'
    ) THEN
      -- Insert with points and created_by columns
      INSERT INTO point_categories (name, description, is_positive, points, default_points, created_by)
      VALUES 
        ('المشاركة الصفية', 'مشاركة فعالة في الفصل الدراسي', true, 5, 5, admin_id),
        ('تقديم واجب متميز', 'تقديم واجب منزلي متميز وعالي الجودة', true, 10, 10, admin_id),
        ('مساعدة الزملاء', 'مساعدة زملاء الصف في فهم الدروس', true, 7, 7, admin_id),
        ('حضور مبكر', 'الحضور المبكر والالتزام بالمواعيد', true, 3, 3, admin_id),
        ('التفوق في الاختبارات', 'الحصول على درجات عالية في الاختبارات', true, 15, 15, admin_id),
        ('الغياب بدون عذر', 'الغياب عن المدرسة بدون عذر مقبول', false, 5, 5, admin_id),
        ('تأخر عن الحصة', 'التأخر عن موعد بدء الحصة الدراسية', false, 3, 3, admin_id),
        ('عدم أداء الواجبات', 'عدم تسليم الواجبات المدرسية في مواعيدها', false, 5, 5, admin_id),
        ('سلوك غير لائق', 'سلوك غير مناسب داخل الفصل أو المدرسة', false, 10, 10, admin_id),
        ('مخالفة قواعد المدرسة', 'مخالفة تعليمات وقواعد المدرسة', false, 7, 7, admin_id);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'point_categories' 
      AND column_name = 'created_by'
    ) THEN
      -- Insert with created_by but without points
      INSERT INTO point_categories (name, description, is_positive, default_points, created_by)
      VALUES 
        ('المشاركة الصفية', 'مشاركة فعالة في الفصل الدراسي', true, 5, admin_id),
        ('تقديم واجب متميز', 'تقديم واجب منزلي متميز وعالي الجودة', true, 10, admin_id),
        ('مساعدة الزملاء', 'مساعدة زملاء الصف في فهم الدروس', true, 7, admin_id),
        ('حضور مبكر', 'الحضور المبكر والالتزام بالمواعيد', true, 3, admin_id),
        ('التفوق في الاختبارات', 'الحصول على درجات عالية في الاختبارات', true, 15, admin_id),
        ('الغياب بدون عذر', 'الغياب عن المدرسة بدون عذر مقبول', false, 5, admin_id),
        ('تأخر عن الحصة', 'التأخر عن موعد بدء الحصة الدراسية', false, 3, admin_id),
        ('عدم أداء الواجبات', 'عدم تسليم الواجبات المدرسية في مواعيدها', false, 5, admin_id),
        ('سلوك غير لائق', 'سلوك غير مناسب داخل الفصل أو المدرسة', false, 10, admin_id),
        ('مخالفة قواعد المدرسة', 'مخالفة تعليمات وقواعد المدرسة', false, 7, admin_id);
    ELSE
      RAISE NOTICE 'Table structure is different than expected. Please check manually.';
    END IF;
    
    RAISE NOTICE 'Added sample point categories';
  ELSE
    RAISE NOTICE 'Point categories already exist, not adding samples';
  END IF;
END $$;

-- 4. Create a view for compatibility between reward_redemptions and user_rewards
DO $$
DECLARE
  has_redeemed_at BOOLEAN;
  has_points_spent BOOLEAN;
BEGIN
  -- Drop existing views if they exist
  DROP VIEW IF EXISTS public.reward_redemptions_view;
  
  -- Check if reward_redemptions table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'reward_redemptions'
  ) THEN
    -- Check which columns exist in the reward_redemptions table
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'reward_redemptions' 
      AND column_name = 'redeemed_at'
    ) INTO has_redeemed_at;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'reward_redemptions' 
      AND column_name = 'points_spent'
    ) INTO has_points_spent;
    
    -- Create the view based on which columns exist
    IF has_redeemed_at THEN
      EXECUTE 'CREATE VIEW public.reward_redemptions_view AS 
        SELECT 
          id,
          user_id,
          reward_id,
          redeemed_at,
          created_at,
          updated_at
        FROM public.reward_redemptions';
    ELSIF has_points_spent THEN
      EXECUTE 'CREATE VIEW public.reward_redemptions_view AS 
        SELECT 
          id,
          user_id,
          reward_id,
          points_spent AS redeemed_at,  -- Map points_spent to redeemed_at
          created_at,
          updated_at
        FROM public.reward_redemptions';
    ELSE
      EXECUTE 'CREATE VIEW public.reward_redemptions_view AS 
        SELECT 
          id,
          user_id,
          reward_id,
          created_at AS redeemed_at,  -- Use created_at as redeemed_at
          created_at,
          updated_at
        FROM public.reward_redemptions';
    END IF;
    
    RAISE NOTICE 'Created reward_redemptions_view for compatibility';
  ELSE
    -- Check if user_rewards exists and create redemptions backward compatibility
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_rewards'
    ) THEN
      -- Drop existing view if it exists
      DROP VIEW IF EXISTS public.reward_redemptions;
      
      -- Check which columns exist in the user_rewards table
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_rewards' 
        AND column_name = 'points_spent'
      ) INTO has_points_spent;
      
      -- Create a view that maps user_rewards to reward_redemptions format
      IF has_points_spent THEN
        EXECUTE 'CREATE VIEW public.reward_redemptions AS 
          SELECT 
            id,
            user_id,
            reward_id,
            points_spent,
            created_at,
            updated_at
          FROM public.user_rewards';
      ELSE
        EXECUTE 'CREATE VIEW public.reward_redemptions AS 
          SELECT 
            id,
            user_id,
            reward_id,
            created_at AS redeemed_at,  -- Use created_at as redeemed_at
            created_at,
            updated_at
          FROM public.user_rewards';
      END IF;
      
      RAISE NOTICE 'Created reward_redemptions view pointing to user_rewards table';
    END IF;
  END IF;
  
  -- Add points_spent column to user_rewards if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_rewards'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_rewards' 
    AND column_name = 'points_spent'
  ) THEN
    -- Add points_spent column
    ALTER TABLE user_rewards ADD COLUMN points_spent INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added points_spent column to user_rewards table';
  END IF;
END $$;

-- 5. Create a view for messaging system compatibility
DO $$
BEGIN
  -- If messages table doesn't exist, create a view
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    -- Create a view that points to user_messages
    EXECUTE 'CREATE OR REPLACE VIEW public.messages AS SELECT * FROM public.user_messages';
    RAISE NOTICE 'Created messages view pointing to user_messages table';
  END IF;
END $$;

-- 6. Verify the table structure after fixes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'point_categories'
ORDER BY ordinal_position;

-- 7. Show available point categories
SELECT id, name, default_points, is_positive 
FROM point_categories 
ORDER BY is_positive DESC, id; 