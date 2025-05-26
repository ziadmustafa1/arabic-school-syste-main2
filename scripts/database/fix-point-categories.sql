-- 1. Check current structure of point_categories table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'point_categories'
ORDER BY ordinal_position;

-- 2. Check data in point_categories table
SELECT * FROM point_categories ORDER BY id;

-- 3. Fix the missing default_points column if needed
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

-- 4. Insert sample point categories if table is empty
INSERT INTO point_categories (name, description, default_points, is_positive)
SELECT * FROM (
  VALUES 
    ('المشاركة الصفية', 'مشاركة فعالة في الفصل الدراسي', 5, true),
    ('تقديم واجب متميز', 'تقديم واجب منزلي متميز وعالي الجودة', 10, true),
    ('مساعدة الزملاء', 'مساعدة زملاء الصف في فهم الدروس', 7, true),
    ('حضور مبكر', 'الحضور المبكر والالتزام بالمواعيد', 3, true),
    ('التفوق في الاختبارات', 'الحصول على درجات عالية في الاختبارات', 15, true),
    ('الغياب بدون عذر', 'الغياب عن المدرسة بدون عذر مقبول', 5, false),
    ('تأخر عن الحصة', 'التأخر عن موعد بدء الحصة الدراسية', 3, false),
    ('عدم أداء الواجبات', 'عدم تسليم الواجبات المدرسية في مواعيدها', 5, false),
    ('سلوك غير لائق', 'سلوك غير مناسب داخل الفصل أو المدرسة', 10, false),
    ('مخالفة قواعد المدرسة', 'مخالفة تعليمات وقواعد المدرسة', 7, false)
) AS new_categories (name, description, default_points, is_positive)
WHERE NOT EXISTS (SELECT 1 FROM point_categories LIMIT 1);

-- 5. Verify the table structure after fixes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'point_categories'
ORDER BY ordinal_position;

-- 6. Verify the data after fixes
SELECT id, name, default_points, is_positive FROM point_categories ORDER BY is_positive DESC, id; 