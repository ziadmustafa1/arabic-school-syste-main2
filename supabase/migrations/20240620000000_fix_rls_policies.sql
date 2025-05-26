-- Fix tables that have policies but RLS is not enabled
-- 1. Enable RLS on tables with existing policies

-- Enable RLS on deduction_cards
ALTER TABLE public.deduction_cards ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.deduction_cards IS 'Deduction cards with RLS enabled';

-- Enable RLS on user_deduction_cards
ALTER TABLE public.user_deduction_cards ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.user_deduction_cards IS 'User deduction cards with RLS enabled';

-- 2. Enable RLS on tables in the public schema that don't have it enabled

-- Enable RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
-- Add policy for roles table - typically read-only for all, write for admins
CREATE POLICY "Everyone can read roles" ON public.roles
  FOR SELECT USING (true);
CREATE POLICY "Only admins can modify roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );

-- Enable RLS on negative_point_payments with column check
ALTER TABLE public.negative_point_payments ENABLE ROW LEVEL SECURITY;

-- Basic admin policies for negative_point_payments (always applicable)
CREATE POLICY "Admins can do everything on negative_point_payments" ON public.negative_point_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view and manage negative_point_payments" ON public.negative_point_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Dynamic creation of student and parent policies based on existing columns
DO $$
DECLARE
    has_user_id BOOLEAN;
    has_student_id BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_point_payments' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_point_payments' AND column_name = 'student_id'
    ) INTO has_student_id;
    
    -- Create appropriate policies based on column existence
    IF has_user_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own negative_point_payments" ON public.negative_point_payments
                FOR SELECT USING (auth.uid() = user_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s negative_point_payments" ON public.negative_point_payments
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = negative_point_payments.user_id
                    )
                )';
    ELSIF has_student_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own negative_point_payments" ON public.negative_point_payments
                FOR SELECT USING (auth.uid() = student_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s negative_point_payments" ON public.negative_point_payments
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = negative_point_payments.student_id
                    )
                )';
    ELSE
        RAISE NOTICE 'Neither user_id nor student_id column found in negative_point_payments table. Student-specific policies not created.';
    END IF;
END $$;

-- Enable RLS on student_class
ALTER TABLE public.student_class ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on student_class" ON public.student_class
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view student_class" ON public.student_class
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );
CREATE POLICY "Students can view their own classes" ON public.student_class
  FOR SELECT USING (
    auth.uid() = student_id
  );
CREATE POLICY "Parents can view their children's classes" ON public.student_class
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student
      WHERE parent_student.parent_id = auth.uid()
      AND parent_student.student_id = student_class.student_id
    )
  );

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Everyone can view classes" ON public.classes
  FOR SELECT USING (true);
CREATE POLICY "Admins can modify classes" ON public.classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );

-- Enable RLS on restricted_points
ALTER TABLE public.restricted_points ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on restricted_points" ON public.restricted_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view restricted_points" ON public.restricted_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Enable RLS on payment_restrictions with column check
ALTER TABLE public.payment_restrictions ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on payment_restrictions" ON public.payment_restrictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view payment_restrictions" ON public.payment_restrictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Dynamic creation of student policy based on existing columns
DO $$
DECLARE
    has_user_id BOOLEAN;
    has_student_id BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payment_restrictions' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payment_restrictions' AND column_name = 'student_id'
    ) INTO has_student_id;
    
    -- Create appropriate policy based on column existence
    IF has_user_id THEN
        EXECUTE 'CREATE POLICY "Students can view payment_restrictions that apply to them" ON public.payment_restrictions
                FOR SELECT USING (auth.uid() = user_id)';
    ELSIF has_student_id THEN
        EXECUTE 'CREATE POLICY "Students can view payment_restrictions that apply to them" ON public.payment_restrictions
                FOR SELECT USING (auth.uid() = student_id)';
    ELSE
        RAISE NOTICE 'Neither user_id nor student_id column found in payment_restrictions table. Student-specific policy not created.';
    END IF;
END $$;

-- Enable RLS on reward_redemptions with column check
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on reward_redemptions" ON public.reward_redemptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view and update reward_redemptions" ON public.reward_redemptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Dynamic creation of student and parent policies based on existing columns
DO $$
DECLARE
    has_user_id BOOLEAN;
    has_student_id BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reward_redemptions' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reward_redemptions' AND column_name = 'student_id'
    ) INTO has_student_id;
    
    -- Create appropriate policies based on column existence
    IF has_user_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own reward_redemptions" ON public.reward_redemptions
                FOR SELECT USING (auth.uid() = user_id)';
                
        EXECUTE 'CREATE POLICY "Students can insert their own reward_redemptions" ON public.reward_redemptions
                FOR INSERT WITH CHECK (auth.uid() = user_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s reward_redemptions" ON public.reward_redemptions
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = reward_redemptions.user_id
                    )
                )';
    ELSIF has_student_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own reward_redemptions" ON public.reward_redemptions
                FOR SELECT USING (auth.uid() = student_id)';
                
        EXECUTE 'CREATE POLICY "Students can insert their own reward_redemptions" ON public.reward_redemptions
                FOR INSERT WITH CHECK (auth.uid() = student_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s reward_redemptions" ON public.reward_redemptions
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = reward_redemptions.student_id
                    )
                )';
    ELSE
        RAISE NOTICE 'Neither user_id nor student_id column found in reward_redemptions table. Student-specific policies not created.';
    END IF;
END $$;

-- Enable RLS on negative_points with column check
ALTER TABLE public.negative_points ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on negative_points" ON public.negative_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can manage negative_points" ON public.negative_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Dynamic creation of student and parent policies based on existing columns
DO $$
DECLARE
    has_user_id BOOLEAN;
    has_student_id BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_points' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_points' AND column_name = 'student_id'
    ) INTO has_student_id;
    
    -- Create appropriate policies based on column existence
    IF has_user_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own negative_points" ON public.negative_points
                FOR SELECT USING (auth.uid() = user_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s negative_points" ON public.negative_points
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = negative_points.user_id
                    )
                )';
    ELSIF has_student_id THEN
        EXECUTE 'CREATE POLICY "Students can view their own negative_points" ON public.negative_points
                FOR SELECT USING (auth.uid() = student_id)';
                
        EXECUTE 'CREATE POLICY "Parents can view their children''s negative_points" ON public.negative_points
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM parent_student
                        WHERE parent_student.parent_id = auth.uid()
                        AND parent_student.student_id = negative_points.student_id
                    )
                )';
    ELSE
        RAISE NOTICE 'Neither user_id nor student_id column found in negative_points table. Student-specific policies not created.';
    END IF;
END $$;

-- Enable RLS on system_configuration
ALTER TABLE public.system_configuration ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on system_configuration" ON public.system_configuration
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Everyone can view system_configuration" ON public.system_configuration
  FOR SELECT USING (true);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Users can view messages they sent or received" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );
CREATE POLICY "Users can send their own messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (
    auth.uid() = sender_id
  );

-- Enable RLS on student_points
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
-- Add policies
CREATE POLICY "Admins can do everything on student_points" ON public.student_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view and update student_points" ON public.student_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );
CREATE POLICY "Students can view their own points" ON public.student_points
  FOR SELECT USING (
    auth.uid() = student_id
  );
CREATE POLICY "Parents can view their children's points" ON public.student_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student
      WHERE parent_student.parent_id = auth.uid()
      AND parent_student.student_id = student_points.student_id
    )
  );

-- Add policies for tables that have RLS enabled but no policies
-- Add policies for recharge_cards table with column checks
ALTER TABLE public.recharge_cards ENABLE ROW LEVEL SECURITY;

-- Create admin and teacher policies (always applicable)
CREATE POLICY "Admins can do everything on recharge_cards" ON public.recharge_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );
CREATE POLICY "Teachers can view recharge_cards" ON public.recharge_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 3 -- Teacher role
    )
  );

-- Dynamic creation of student policy based on existing columns
DO $$
DECLARE
    has_is_active BOOLEAN;
BEGIN
    -- Check if is_active column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'recharge_cards' AND column_name = 'is_active'
    ) INTO has_is_active;
    
    -- Create appropriate policy based on column existence
    IF has_is_active THEN
        EXECUTE 'CREATE POLICY "Students can view active recharge_cards" ON public.recharge_cards
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id = auth.uid()
                        AND users.role_id = 1 -- Student role
                    ) 
                    AND is_active = true
                )';
    ELSE
        -- Alternative policy without is_active column
        EXECUTE 'CREATE POLICY "Students can view recharge_cards" ON public.recharge_cards
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id = auth.uid()
                        AND users.role_id = 1 -- Student role
                    )
                )';
        RAISE NOTICE 'is_active column not found in recharge_cards table. Created alternative policy.';
    END IF;
END $$;

-- Add policies for subjects table
CREATE POLICY "Everyone can view subjects" ON public.subjects
  FOR SELECT USING (true);
CREATE POLICY "Admins can modify subjects" ON public.subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  ); 