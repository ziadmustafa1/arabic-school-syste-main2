-- Check and fix the point_categories table structure
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'point_categories') THEN
        -- Check if the default_points column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'point_categories' 
                      AND column_name = 'default_points') THEN
            -- Add the column if it doesn't exist
            ALTER TABLE point_categories ADD COLUMN default_points INTEGER NOT NULL DEFAULT 10;
            RAISE NOTICE 'Added missing default_points column to point_categories table';
        ELSE
            RAISE NOTICE 'default_points column already exists in point_categories table';
        END IF;
        
        -- Check if the mandatory and restricted columns exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'point_categories' 
                      AND column_name = 'is_mandatory') THEN
            -- Add the column if it doesn't exist
            ALTER TABLE point_categories ADD COLUMN is_mandatory BOOLEAN DEFAULT TRUE;
            RAISE NOTICE 'Added missing is_mandatory column to point_categories table';
        ELSE
            RAISE NOTICE 'is_mandatory column already exists in point_categories table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'point_categories' 
                      AND column_name = 'is_restricted') THEN
            -- Add the column if it doesn't exist
            ALTER TABLE point_categories ADD COLUMN is_restricted BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added missing is_restricted column to point_categories table';
        ELSE
            RAISE NOTICE 'is_restricted column already exists in point_categories table';
        END IF;
        
        -- Refresh the schema cache (this can help with schema cache issues)
        -- Alternative approaches if this doesn't work:
        -- 1. Restart the Supabase database
        -- 2. Manually refresh metadata in Supabase dashboard
        BEGIN
            NOTIFY pgrst, 'reload schema';
            RAISE NOTICE 'Schema cache refresh triggered';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not trigger schema cache refresh';
        END;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE point_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            default_points INTEGER NOT NULL DEFAULT 10,
            is_positive BOOLEAN NOT NULL DEFAULT TRUE,
            is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
            is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created point_categories table';
    END IF;
END $$; 