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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM point_categories LIMIT 1) THEN
    -- Check if points column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'point_categories' 
      AND column_name = 'points'
    ) THEN
      -- Insert with points column
      INSERT INTO point_categories (name, description, is_positive, points, default_points)
      VALUES 
        ('المشاركة الصفية', 'مشاركة فعالة في الفصل الدراسي', true, 5, 5),
        ('تقديم واجب متميز', 'تقديم واجب منزلي متميز وعالي الجودة', true, 10, 10),
        ('مساعدة الزملاء', 'مساعدة زملاء الصف في فهم الدروس', true, 7, 7),
        ('حضور مبكر', 'الحضور المبكر والالتزام بالمواعيد', true, 3, 3),
        ('التفوق في الاختبارات', 'الحصول على درجات عالية في الاختبارات', true, 15, 15),
        ('الغياب بدون عذر', 'الغياب عن المدرسة بدون عذر مقبول', false, 5, 5),
        ('تأخر عن الحصة', 'التأخر عن موعد بدء الحصة الدراسية', false, 3, 3),
        ('عدم أداء الواجبات', 'عدم تسليم الواجبات المدرسية في مواعيدها', false, 5, 5),
        ('سلوك غير لائق', 'سلوك غير مناسب داخل الفصل أو المدرسة', false, 10, 10),
        ('مخالفة قواعد المدرسة', 'مخالفة تعليمات وقواعد المدرسة', false, 7, 7);
    ELSE
      -- Insert without points column
      INSERT INTO point_categories (name, description, is_positive, default_points)
      VALUES 
        ('المشاركة الصفية', 'مشاركة فعالة في الفصل الدراسي', true, 5),
        ('تقديم واجب متميز', 'تقديم واجب منزلي متميز وعالي الجودة', true, 10),
        ('مساعدة الزملاء', 'مساعدة زملاء الصف في فهم الدروس', true, 7),
        ('حضور مبكر', 'الحضور المبكر والالتزام بالمواعيد', true, 3),
        ('التفوق في الاختبارات', 'الحصول على درجات عالية في الاختبارات', true, 15),
        ('الغياب بدون عذر', 'الغياب عن المدرسة بدون عذر مقبول', false, 5),
        ('تأخر عن الحصة', 'التأخر عن موعد بدء الحصة الدراسية', false, 3),
        ('عدم أداء الواجبات', 'عدم تسليم الواجبات المدرسية في مواعيدها', false, 5),
        ('سلوك غير لائق', 'سلوك غير مناسب داخل الفصل أو المدرسة', false, 10),
        ('مخالفة قواعد المدرسة', 'مخالفة تعليمات وقواعد المدرسة', false, 7);
    END IF;
    
    RAISE NOTICE 'Added sample point categories';
  ELSE
    RAISE NOTICE 'Point categories already exist, not adding samples';
  END IF;
END $$;

-- 4. Create a view for compatibility between reward_redemptions and user_rewards
DO $$
BEGIN
  -- If both tables exist, create a view from one to the other
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'reward_redemptions'
  ) THEN
    -- Create a view for compatibility
    EXECUTE 'CREATE OR REPLACE VIEW public.reward_redemptions_view AS SELECT * FROM public.reward_redemptions';
    RAISE NOTICE 'Created reward_redemptions_view for compatibility';
  ELSE
    -- Create a view that points to user_rewards
    EXECUTE 'CREATE OR REPLACE VIEW public.reward_redemptions AS SELECT * FROM public.user_rewards';
    RAISE NOTICE 'Created reward_redemptions view pointing to user_rewards table';
  END IF;
  
  -- Add points_spent column to user_rewards if needed
  IF NOT EXISTS (
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