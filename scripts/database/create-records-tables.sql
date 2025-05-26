-- Create user_records table
CREATE TABLE IF NOT EXISTS public.user_records (
    id SERIAL PRIMARY KEY,
    record_code VARCHAR(10) NOT NULL,  -- Format ReXXXX
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Educational, Community, Professional, etc.
    description TEXT,
    points_value INTEGER NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    CONSTRAINT unique_record_code UNIQUE (record_code)
);

-- Create function to generate a unique record code
CREATE OR REPLACE FUNCTION generate_record_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a code with format ReXXXX (where XXXX is a random 4-digit number)
        new_code := 'Re' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if this code already exists
        SELECT EXISTS(
            SELECT 1 FROM public.user_records WHERE record_code = new_code
        ) INTO code_exists;
        
        -- Exit loop if we found a unique code
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate record code on insert
CREATE OR REPLACE FUNCTION set_record_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.record_code IS NULL OR NEW.record_code = '' THEN
        NEW.record_code := generate_record_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_records_before_insert
BEFORE INSERT ON public.user_records
FOR EACH ROW
EXECUTE FUNCTION set_record_code();

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_records_user_id ON public.user_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_records_record_code ON public.user_records(record_code);
CREATE INDEX IF NOT EXISTS idx_user_records_category ON public.user_records(category);

-- Create RLS policies for user_records
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own records
CREATE POLICY "Users can view their own records"
ON public.user_records
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only authenticated users can insert records and only for themselves
CREATE POLICY "Users can create their own records"
ON public.user_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only record owners can update their records
CREATE POLICY "Users can update their own records"
ON public.user_records
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add user_records table to the constants
-- Note: This needs to be added to the TABLES constant in lib/constants.ts 