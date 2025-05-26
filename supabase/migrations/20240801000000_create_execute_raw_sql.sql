-- Create a compatible execute_raw_sql function that forwards to execute_sql_with_params
-- This is for backward compatibility with existing code that might still use execute_raw_sql

-- First drop any existing function if it exists
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop ALL execute_raw_sql functions with ANY parameters
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'execute_raw_sql'
    LOOP
        -- Construct and execute dynamic DROP statement with the exact signature
        EXECUTE format('DROP FUNCTION IF EXISTS public.execute_raw_sql(%s)', func_record.args);
    END LOOP;
END
$$;

-- Create the forward function with a single sql_query parameter
CREATE OR REPLACE FUNCTION public.execute_raw_sql(sql_query TEXT)
RETURNS JSONB AS $$
BEGIN
    -- Forward to the execute_sql_with_params function with empty params array
    RETURN public.execute_sql_with_params(sql_query, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_raw_sql TO authenticated;

-- Add backward compatibility for the query/params style 
CREATE OR REPLACE FUNCTION public.execute_raw_sql(query TEXT, params TEXT[])
RETURNS JSONB AS $$
BEGIN
    -- Forward to the execute_sql_with_params function 
    RETURN public.execute_sql_with_params(query, params);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_raw_sql(TEXT, TEXT[]) TO authenticated; 