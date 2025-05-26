-- Update medals table structure to add min_points and max_points
-- This migration fixes the 'column medals.points_required does not exist' error

-- Add min_points column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'medals' 
        AND column_name = 'min_points'
    ) THEN
        ALTER TABLE public.medals ADD COLUMN min_points INTEGER NOT NULL DEFAULT 0;
        
        -- If points_required column exists, migrate data
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'medals' 
            AND column_name = 'points_required'
        ) THEN
            -- Copy data from points_required to min_points
            UPDATE public.medals SET min_points = points_required;
        END IF;
    END IF;
END $$;

-- Add max_points column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'medals' 
        AND column_name = 'max_points'
    ) THEN
        ALTER TABLE public.medals ADD COLUMN max_points INTEGER NOT NULL DEFAULT 99999;
    END IF;
END $$;

-- Update server-admin.ts getMedalsServerAction to use min_points instead of points_required
-- This needs to be done manually in the code 