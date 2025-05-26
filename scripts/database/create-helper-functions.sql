-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = $1;
  
  RETURN exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all notifications for a user as read
CREATE OR REPLACE FUNCTION update_all_notifications_read(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE user_id = user_id_param 
  AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
