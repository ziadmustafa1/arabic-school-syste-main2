-- Add is_confirmed column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_confirmed'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_confirmed BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add is_banned column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add ban_until column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'ban_until'
    ) THEN
        ALTER TABLE public.users ADD COLUMN ban_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
END $$;

-- Add admin_only column to notifications if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'admin_only'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN admin_only BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create index on is_confirmed for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_confirmed ON public.users(is_confirmed);

-- Create index on is_banned for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned);

-- Create index on user's role_id for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- Create index on admin_only column in notifications
CREATE INDEX IF NOT EXISTS idx_notifications_admin_only ON public.notifications(admin_only);

-- Modify RLS policies for admin notifications
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role_id = 4
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update or create the notifications policy for admin notifications
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications and admins can view admin notifications" ON public.notifications;
    
    CREATE POLICY "Users can view their own notifications and admins can view admin notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND (admin_only IS NULL OR admin_only = FALSE))
        OR 
        (is_admin() AND admin_only = TRUE)
    );
END $$; 