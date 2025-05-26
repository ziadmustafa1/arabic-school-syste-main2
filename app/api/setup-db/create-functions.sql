-- Execute raw SQL function that doesn't trigger updated_at issues
CREATE OR REPLACE FUNCTION execute_raw_sql(query text, params text[])
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  EXECUTE query USING params;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe function to insert points transactions
CREATE OR REPLACE FUNCTION add_points_transaction(
  p_user_id uuid,
  p_points integer,
  p_is_positive boolean,
  p_description text,
  p_created_by uuid,
  p_category_id integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  INSERT INTO points_transactions (
    user_id, points, is_positive, description, created_by, category_id
  ) VALUES (
    p_user_id, p_points, p_is_positive, p_description, p_created_by, p_category_id
  );
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 