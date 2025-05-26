-- Enable leaked password protection
-- Create extension if it doesn't exist (might be needed for some Supabase installations)
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- Update auth settings to enable HaveIBeenPwned password protection if auth.config exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'config'
  ) THEN
    UPDATE auth.config
    SET 
      -- Enable HaveIBeenPwned password check
      check_pwned_passwords = TRUE,
      -- Add new configuration options for increased security
      max_attempts_per_ip_hour = 10,  -- Limit login attempts per IP to prevent brute force
      max_attempts_per_user_hour = 5, -- Limit login attempts per user
      -- Enable more secure JWT algorithm
      jwt_exp = 3600,  -- 1 hour token expiration
      refresh_token_rotation_enabled = TRUE -- Rotate refresh tokens
    WHERE
      id = 1; -- There's typically only one row in this table
      
    -- If your database supports it, add a comment about the change
    COMMENT ON TABLE auth.config IS 'Auth configuration with enhanced security features';
  ELSE
    RAISE NOTICE 'auth.config table not found - skipping password security settings';
  END IF;
END $$;

-- Add additional security measures

-- Create a secure storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS secure_storage;

-- Add a function to securely store sensitive data with encryption
-- This should use pgsodium/pgcrypto for encryption
CREATE OR REPLACE FUNCTION secure_storage.store_encrypted(
  data_key text,
  data_value text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure_storage
AS $$
BEGIN
  -- Use pgcrypto to encrypt the value with the database encryption key
  INSERT INTO secure_storage.encrypted_data (key_name, encrypted_value)
  VALUES (
    data_key,
    pgsodium.crypto_secretbox(
      data_value::bytea,
      pgsodium.crypto_secretbox_noncegen(),
      pgsodium.crypto_secretbox_keygen()
    )
  )
  ON CONFLICT (key_name) 
  DO UPDATE SET 
    encrypted_value = pgsodium.crypto_secretbox(
      data_value::bytea, 
      pgsodium.crypto_secretbox_noncegen(),
      pgsodium.crypto_secretbox_keygen()
    ),
    updated_at = NOW();
END;
$$;

-- Create a table to store encrypted values if it doesn't exist
CREATE TABLE IF NOT EXISTS secure_storage.encrypted_data (
  key_name text PRIMARY KEY,
  encrypted_value bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Add RLS to the encrypted_data table
ALTER TABLE secure_storage.encrypted_data ENABLE ROW LEVEL SECURITY;

-- Only allow admins to access the encrypted data
CREATE POLICY "Admins can manage encrypted data" ON secure_storage.encrypted_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION secure_storage.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER encrypted_data_updated
  BEFORE UPDATE ON secure_storage.encrypted_data
  FOR EACH ROW
  EXECUTE FUNCTION secure_storage.update_timestamp();

-- Add comments to document changes
COMMENT ON SCHEMA secure_storage IS 'Secure schema for storing sensitive encrypted data';
COMMENT ON TABLE secure_storage.encrypted_data IS 'Encrypted sensitive data with RLS protection';
COMMENT ON FUNCTION secure_storage.store_encrypted IS 'Function to securely store encrypted values'; 