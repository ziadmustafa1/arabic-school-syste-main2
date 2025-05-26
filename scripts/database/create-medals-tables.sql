-- Create medals table (differs from badges)
CREATE TABLE IF NOT EXISTS public.medals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  points_required INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_medals table to track user medals
CREATE TABLE IF NOT EXISTS public.user_medals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  medal_id INTEGER NOT NULL REFERENCES public.medals(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_medal UNIQUE (user_id, medal_id)
);

-- Add RLS policies
ALTER TABLE public.medals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medals ENABLE ROW LEVEL SECURITY;

-- Create policies for medals table
CREATE POLICY "Anyone can view medals"
ON public.medals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create medals"
ON public.medals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

CREATE POLICY "Only admins can update medals"
ON public.medals
FOR UPDATE
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

CREATE POLICY "Only admins can delete medals"
ON public.medals
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

-- Create policies for user_medals table
CREATE POLICY "Users can view their medals and admins can view all"
ON public.user_medals
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

CREATE POLICY "Only admins can award medals"
ON public.user_medals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

CREATE POLICY "Only admins can delete user medals"
ON public.user_medals
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT u.id FROM public.users u WHERE u.role_id = 4
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_medals_user_id ON public.user_medals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_medals_medal_id ON public.user_medals(medal_id);
CREATE INDEX IF NOT EXISTS idx_medals_points_required ON public.medals(points_required);

-- Add notification type column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN reference_id INTEGER;
    END IF;
END $$; 