-- Fix circular RLS policies for the users table
DO $$
BEGIN
    -- First, make sure RLS is enabled on users table
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Remove existing policies that may be causing recursion
    DROP POLICY IF EXISTS admin_manage_users ON public.users;
    
    -- Create a non-recursive policy for admins
    -- This avoids the recursion by using a direct role check from JWT rather than querying users table
    CREATE POLICY admin_manage_users ON public.users
        FOR ALL
        USING (
            -- Use the JWT role claim directly instead of querying the users table
            (auth.jwt() ->> 'role' = 'service_role') OR 
            -- For backward compatibility if needed, also check the user's role_id directly
            (auth.uid() = id AND (SELECT role_id FROM public.users WHERE id = auth.uid()) = 4)
        );
    
    -- Make sure other policies exist and don't cause recursion
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_own') THEN
        CREATE POLICY users_select_own ON public.users
            FOR SELECT
            USING (auth.uid() = id);
    END IF;
        
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_own') THEN
        CREATE POLICY users_update_own ON public.users
            FOR UPDATE
            USING (auth.uid() = id);
    END IF;
        
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_manage_all') THEN
        CREATE POLICY service_role_manage_all ON public.users
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
    
    -- Fix other potentially recursive policies in related tables
    -- Update policies that reference the users table to avoid recursion
    
    -- Check if deduction_cards table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deduction_cards') THEN
        -- Deduction cards policies
        DROP POLICY IF EXISTS "Admins can do everything on deduction_cards" ON deduction_cards;
        DROP POLICY IF EXISTS "Teachers can view deduction_cards" ON deduction_cards;
        DROP POLICY IF EXISTS "Students and Parents can view active deduction_cards" ON deduction_cards;
        
        CREATE POLICY "Admins can do everything on deduction_cards" ON deduction_cards
          FOR ALL USING (
            (auth.jwt() ->> 'role' = 'service_role') OR 
            (auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 4))
          );
    
        CREATE POLICY "Teachers can view deduction_cards" ON deduction_cards
          FOR SELECT USING (
            auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 3)
          );
    
        CREATE POLICY "Students and Parents can view active deduction_cards" ON deduction_cards
          FOR SELECT USING (
            is_active = TRUE AND
            auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id IN (1, 2))
          );
    END IF;
      
    -- Check if user_deduction_cards table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_deduction_cards') THEN
        -- User Deduction Cards policies
        DROP POLICY IF EXISTS "Admins can do everything on user_deduction_cards" ON user_deduction_cards;
        DROP POLICY IF EXISTS "Teachers can view and manage user_deduction_cards" ON user_deduction_cards;
        DROP POLICY IF EXISTS "Students can view their own deduction cards" ON user_deduction_cards;
        DROP POLICY IF EXISTS "Parents can view their children's deduction cards" ON user_deduction_cards;
        
        CREATE POLICY "Admins can do everything on user_deduction_cards" ON user_deduction_cards
          FOR ALL USING (
            (auth.jwt() ->> 'role' = 'service_role') OR 
            (auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 4))
          );
    
        CREATE POLICY "Teachers can view and manage user_deduction_cards" ON user_deduction_cards
          FOR ALL USING (
            auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 3)
          );
    
        CREATE POLICY "Students can view their own deduction cards" ON user_deduction_cards
          FOR SELECT USING (
            auth.uid() = user_id AND
            auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 1)
          );
    
        -- Fix the parent policy which might be more complex and causing recursion
        CREATE POLICY "Parents can view their children's deduction cards" ON user_deduction_cards
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM parent_student p
              WHERE p.parent_id = auth.uid() AND p.student_id = user_deduction_cards.user_id
            ) AND
            auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 2)
          );
    END IF;
    
    -- Check if point_categories table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'point_categories') THEN
        -- Also check point_categories table since that's where the error is happening
        DROP POLICY IF EXISTS admin_manage_point_categories ON point_categories;
        
        CREATE POLICY admin_manage_point_categories ON point_categories
          FOR ALL USING (
            (auth.jwt() ->> 'role' = 'service_role') OR 
            (auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid() AND role_id = 4))
          );
    END IF;
    
    RAISE NOTICE 'Successfully fixed circular RLS policies for users table';
END $$; 