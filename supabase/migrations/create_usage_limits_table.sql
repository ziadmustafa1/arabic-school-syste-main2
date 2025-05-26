-- Create card_usage_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.card_usage_limits (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL UNIQUE,
    weekly_limit INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to card_usage_limits table
COMMENT ON TABLE public.card_usage_limits IS 'Weekly usage limits for recharge cards by role';

-- Add RLS policies for card_usage_limits
ALTER TABLE public.card_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage usage limits
CREATE POLICY admin_manage_usage_limits ON public.card_usage_limits
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Check if roles table exists and update column types if needed
DO $$
BEGIN
    -- Check if the roles table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'roles'
    ) THEN
        -- Check if the code column is VARCHAR(2)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'roles' 
            AND column_name = 'code' AND data_type = 'character varying' 
            AND character_maximum_length = 2
        ) THEN
            -- Alter the column to TEXT
            ALTER TABLE public.roles ALTER COLUMN code TYPE TEXT;
        END IF;
        
        -- Check if the name column is VARCHAR(2)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'roles' 
            AND column_name = 'name' AND data_type = 'character varying' 
            AND character_maximum_length = 2
        ) THEN
            -- Alter the column to TEXT
            ALTER TABLE public.roles ALTER COLUMN name TYPE TEXT;
        END IF;
        
        -- Ensure code has a unique constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'UNIQUE' 
            AND tc.table_schema = 'public' 
            AND tc.table_name = 'roles'
            AND ccu.column_name = 'code'
        ) THEN
            -- Add unique constraint if it doesn't exist
            ALTER TABLE public.roles ADD CONSTRAINT roles_code_key UNIQUE (code);
        END IF;
    ELSE
        -- Create the roles table if it doesn't exist
        CREATE TABLE public.roles (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END
$$;

-- Insert default roles if they don't exist (with safer approach)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Insert or update each role separately
    -- Student
    IF EXISTS (SELECT 1 FROM public.roles WHERE code = 'student') THEN
        UPDATE public.roles SET name = 'طالب' WHERE code = 'student';
    ELSE
        INSERT INTO public.roles (name, code) VALUES ('طالب', 'student');
    END IF;
    
    -- Parent
    IF EXISTS (SELECT 1 FROM public.roles WHERE code = 'parent') THEN
        UPDATE public.roles SET name = 'ولي أمر' WHERE code = 'parent';
    ELSE
        INSERT INTO public.roles (name, code) VALUES ('ولي أمر', 'parent');
    END IF;
    
    -- Teacher
    IF EXISTS (SELECT 1 FROM public.roles WHERE code = 'teacher') THEN
        UPDATE public.roles SET name = 'معلم' WHERE code = 'teacher';
    ELSE
        INSERT INTO public.roles (name, code) VALUES ('معلم', 'teacher');
    END IF;
    
    -- Admin
    IF EXISTS (SELECT 1 FROM public.roles WHERE code = 'admin') THEN
        UPDATE public.roles SET name = 'مدير' WHERE code = 'admin';
    ELSE
        INSERT INTO public.roles (name, code) VALUES ('مدير', 'admin');
    END IF;
    
    -- Insert or update limits for each role
    FOR r IN SELECT id, code FROM public.roles LOOP
        IF EXISTS (SELECT 1 FROM public.card_usage_limits WHERE role_id = r.id) THEN
            UPDATE public.card_usage_limits 
            SET weekly_limit = CASE 
                WHEN r.code = 'admin' THEN 50
                WHEN r.code = 'teacher' THEN 20
                ELSE 10
            END
            WHERE role_id = r.id;
        ELSE
            INSERT INTO public.card_usage_limits (role_id, weekly_limit)
            VALUES (r.id, CASE 
                WHEN r.code = 'admin' THEN 50
                WHEN r.code = 'teacher' THEN 20
                ELSE 10
            END);
        END IF;
    END LOOP;
END
$$; 