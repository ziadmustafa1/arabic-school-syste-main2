    -- Fix RLS policies for the users table
    DO $$
    BEGIN
        -- First, make sure RLS is enabled on users table
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Remove all existing policies on users table
        DROP POLICY IF EXISTS admin_manage_users ON public.users;
        DROP POLICY IF EXISTS users_select_own ON public.users;
        DROP POLICY IF EXISTS users_update_own ON public.users;
        DROP POLICY IF EXISTS service_role_manage_all ON public.users;
        
        -- Check if policies exist before creating them
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'admin_manage_users') THEN
            -- Create policy for admins to manage all users
            CREATE POLICY admin_manage_users ON public.users
                FOR ALL
                USING (auth.uid() IN (
                    SELECT u.id FROM public.users u WHERE u.role_id = 4
                ) OR auth.jwt() ->> 'role' = 'service_role');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_own') THEN
            -- Create policy for users to read their own data
            CREATE POLICY users_select_own ON public.users
                FOR SELECT
                USING (auth.uid() = id);
        END IF;
            
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_own') THEN
            -- Create policy for users to update their own data
            CREATE POLICY users_update_own ON public.users
                FOR UPDATE
                USING (auth.uid() = id);
        END IF;
            
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_manage_all') THEN
            -- Create explicit policy for service role to do everything
            CREATE POLICY service_role_manage_all ON public.users
                FOR ALL
                USING (auth.jwt() ->> 'role' = 'service_role');
        END IF;
        
        RAISE NOTICE 'Successfully updated RLS policies for users table';
    END $$; 