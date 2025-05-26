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