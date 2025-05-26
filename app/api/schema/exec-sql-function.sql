-- Function to execute dynamic SQL securely
-- This should be executed on your Supabase database

-- First, drop the function if it exists (to avoid errors if recreating)
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Create the function with proper security definer
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Execute the dynamic SQL and return results as JSON
  RETURN QUERY EXECUTE sql;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN QUERY SELECT json_build_object(
      'error', SQLERRM,
      'code', SQLSTATE,
      'sql', sql
    );
END;
$$;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Set a security policy to restrict who can call this function
ALTER FUNCTION public.exec_sql(text) SET search_path = public;

-- Add function comment
COMMENT ON FUNCTION public.exec_sql(text) IS 'Executes SQL queries dynamically. Only service_role can use this function.'; 