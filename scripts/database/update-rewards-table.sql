-- Add role_id column to rewards table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN role_id INTEGER REFERENCES public.roles(id);
    RAISE NOTICE 'Added role_id column to rewards table';
  ELSE
    RAISE NOTICE 'role_id column already exists in rewards table';
  END IF;

  -- Add created_at and updated_at columns to rewards table if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to rewards table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to rewards table';
  END IF;
  
  -- Update existing rewards to set role_id to NULL (available to everyone)
  UPDATE public.rewards SET role_id = NULL WHERE role_id IS NULL;
  RAISE NOTICE 'Updated existing rewards to make them available to all roles';
END $$; 