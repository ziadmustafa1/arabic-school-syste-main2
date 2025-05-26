-- Create security logs table for tracking security events
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add index for faster queries
  CONSTRAINT security_logs_event_type_check CHECK (
    event_type IN (
      'login_attempt', 
      'login_success', 
      'login_failure', 
      'account_lockout', 
      'password_reset', 
      'admin_action', 
      'api_rate_limit', 
      'csrf_failure', 
      'xss_attempt', 
      'suspicious_activity'
    )
  )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS security_logs_user_id_idx ON security_logs (user_id);
CREATE INDEX IF NOT EXISTS security_logs_event_type_idx ON security_logs (event_type);
CREATE INDEX IF NOT EXISTS security_logs_created_at_idx ON security_logs (created_at);
CREATE INDEX IF NOT EXISTS security_logs_severity_idx ON security_logs (severity);
CREATE INDEX IF NOT EXISTS security_logs_ip_address_idx ON security_logs (ip_address);

-- RLS policies for security logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view all security logs" 
  ON security_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = 4 -- Admin role
    )
  );

-- Only the system can insert security logs (using service role)
CREATE POLICY "System can insert security logs" 
  ON security_logs 
  FOR INSERT 
  WITH CHECK (true);
  
-- No one can update or delete security logs
CREATE POLICY "No one can update security logs" 
  ON security_logs 
  FOR UPDATE 
  USING (false);
  
CREATE POLICY "No one can delete security logs" 
  ON security_logs 
  FOR DELETE 
  USING (false);

-- Create a function to automatically purge old logs (retention policy)
-- This keeps logs for 90 days by default
CREATE OR REPLACE FUNCTION purge_old_security_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM security_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to purge old logs daily
-- Note: This requires pg_cron extension to be enabled
-- COMMENT OUT if pg_cron is not available
-- SELECT cron.schedule('0 0 * * *', 'SELECT purge_old_security_logs()');

-- Add comment
COMMENT ON TABLE security_logs IS 'Security event logs for monitoring and auditing'; 