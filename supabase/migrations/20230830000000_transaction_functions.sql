-- Functions to manage database transactions
-- These functions provide a way to manage transactions across multiple operations

-- Function to start a transaction and return a transaction ID
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS TABLE(transaction_id TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  txid TEXT;
BEGIN
  -- Generate a unique transaction ID
  txid := 'tx_' || gen_random_uuid()::TEXT;
  
  -- Start a transaction
  EXECUTE 'BEGIN';
  
  -- Return the transaction ID
  RETURN QUERY SELECT txid;
END;
$$;

-- Function to commit a transaction
CREATE OR REPLACE FUNCTION commit_transaction(tid TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Commit the transaction
  EXECUTE 'COMMIT';
END;
$$;

-- Function to rollback a transaction
CREATE OR REPLACE FUNCTION rollback_transaction(tid TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rollback the transaction
  EXECUTE 'ROLLBACK';
END;
$$;

-- Function to calculate and update user points balance
-- This ensures consistency between the transactions and the stored balance
CREATE OR REPLACE FUNCTION calculate_and_update_user_points(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calculated_points INTEGER;
BEGIN
  -- Calculate the user's current points balance from transactions
  SELECT COALESCE(SUM(points), 0) INTO calculated_points
  FROM point_transactions
  WHERE user_id = p_user_id;
  
  -- Update or insert into the student_points table
  INSERT INTO student_points (student_id, points)
  VALUES (p_user_id, calculated_points)
  ON CONFLICT (student_id)
  DO UPDATE SET points = calculated_points;
  
  -- Return the calculated balance
  RETURN calculated_points;
END;
$$; 