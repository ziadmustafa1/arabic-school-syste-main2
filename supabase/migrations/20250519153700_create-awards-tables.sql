-- Create awards table
CREATE TABLE IF NOT EXISTS public.awards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  points_required INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

-- Policy for viewing awards - Everyone can view
CREATE POLICY "Awards are viewable by everyone" 
ON public.awards FOR SELECT 
USING (true);

-- Policy for inserting awards - Only admins can insert
CREATE POLICY "Only admins can insert awards" 
ON public.awards FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1 -- Admin role
  )
);

-- Policy for updating awards - Only admins can update
CREATE POLICY "Only admins can update awards" 
ON public.awards FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1 -- Admin role
  )
);

-- Policy for deleting awards - Only admins can delete
CREATE POLICY "Only admins can delete awards" 
ON public.awards FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1 -- Admin role
  )
);

-- Create user_awards table for tracking which users have which awards
CREATE TABLE IF NOT EXISTS public.user_awards (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  award_id INTEGER REFERENCES public.awards(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  awarded_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, award_id)
);

-- Add RLS policies to user_awards
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

-- Policy for viewing user awards - Authenticated users can view their own awards and admins can view all
CREATE POLICY "Users can view their own awards and admins can view all" 
ON public.user_awards FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1
  )
);

-- Policy for inserting user awards - Only admins can award badges
CREATE POLICY "Only admins can award badges" 
ON public.user_awards FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1
  )
);

-- Policy for deleting user awards - Only admins can remove awards
CREATE POLICY "Only admins can remove user awards" 
ON public.user_awards FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = 1
  )
);
