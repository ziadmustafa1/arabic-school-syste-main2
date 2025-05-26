-- Create a function to execute SQL with parameters safely
CREATE OR REPLACE FUNCTION public.execute_sql_with_params(
  sql_query TEXT,
  params TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the SQL query with parameters and capture the result
  EXECUTE sql_query USING params[1], params[2], params[3], params[4], params[5]
  INTO result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql_with_params TO authenticated; 