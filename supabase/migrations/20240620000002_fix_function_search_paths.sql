-- Fix function search path issues
-- This addresses warnings about function_search_path_mutable
-- We'll fix the most critical functions that handle sensitive data

-- Fix purge_old_security_logs function
CREATE OR REPLACE FUNCTION public.purge_old_security_logs()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM security_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Fix execute_raw_sql function (this is a high-risk function)
-- Use a more aggressive approach to handle function duplication
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
    
    -- Now create the function with a clear signature
    CREATE FUNCTION public.execute_raw_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER 
    SET search_path = public
    AS $inner$
    BEGIN
      EXECUTE sql_query;
    END;
    $inner$;
END
$$;

-- Fix is_admin function (used for security checks)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role_id = 4 -- Admin role
  );
$$;

-- Fix authentication and authorization related functions
CREATE OR REPLACE FUNCTION public.update_redemption_status(redemption_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reward_redemptions
  SET status = new_status,
      updated_at = NOW()
  WHERE id = redemption_id;
END;
$$;

-- Fix user points calculations
CREATE OR REPLACE FUNCTION public.calculate_user_points(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_points integer;
BEGIN
  SELECT COALESCE(SUM(points_value), 0)
  INTO total_points
  FROM user_records
  WHERE user_id = user_id_param
    AND (valid_until IS NULL OR valid_until > NOW());
    
  RETURN total_points;
END;
$$;

-- Fix get_user_points_balance function by dropping and recreating it
-- First, check if the function exists and drop it
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop ALL get_user_points_balance functions with ANY parameters
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_points_balance'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.get_user_points_balance(%s)', func_record.args);
    END LOOP;
END $$;

-- Now create the function with user_id_param and appropriate column references
DO $$
DECLARE
    has_user_id BOOLEAN;
    has_student_id BOOLEAN;
BEGIN
    -- Check which columns exist in negative_points table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_points' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'negative_points' AND column_name = 'student_id'
    ) INTO has_student_id;

    -- Create function with appropriate column reference
    IF has_user_id THEN
        EXECUTE $func$
            CREATE FUNCTION public.get_user_points_balance(user_id_param uuid)
            RETURNS integer
            LANGUAGE plpgsql
            SECURITY INVOKER
            SET search_path = public
            AS $inner$
            DECLARE
              total_points integer;
              negative_points integer;
            BEGIN
              -- Get positive points
              SELECT COALESCE(SUM(points_value), 0)
              INTO total_points
              FROM user_records
              WHERE user_records.user_id = user_id_param
                AND (valid_until IS NULL OR valid_until > NOW());
            
              -- Get negative points that are unpaid
              SELECT COALESCE(SUM(points_value), 0)
              INTO negative_points
              FROM negative_points
              WHERE negative_points.user_id = user_id_param
                AND is_paid = false;
                
              RETURN total_points - negative_points;
            END;
            $inner$
        $func$;
    ELSIF has_student_id THEN
        EXECUTE $func$
            CREATE FUNCTION public.get_user_points_balance(user_id_param uuid)
            RETURNS integer
            LANGUAGE plpgsql
            SECURITY INVOKER
            SET search_path = public
            AS $inner$
            DECLARE
              total_points integer;
              negative_points integer;
            BEGIN
              -- Get positive points
              SELECT COALESCE(SUM(points_value), 0)
              INTO total_points
              FROM user_records
              WHERE user_records.user_id = user_id_param
                AND (valid_until IS NULL OR valid_until > NOW());
            
              -- Get negative points that are unpaid
              SELECT COALESCE(SUM(points_value), 0)
              INTO negative_points
              FROM negative_points
              WHERE negative_points.student_id = user_id_param
                AND is_paid = false;
                
              RETURN total_points - negative_points;
            END;
            $inner$
        $func$;
    ELSE
        -- Fallback if neither column exists - just count positive points
        EXECUTE $func$
            CREATE FUNCTION public.get_user_points_balance(user_id_param uuid)
            RETURNS integer
            LANGUAGE plpgsql
            SECURITY INVOKER
            SET search_path = public
            AS $inner$
            DECLARE
              total_points integer;
            BEGIN
              -- Get positive points only
              SELECT COALESCE(SUM(points_value), 0)
              INTO total_points
              FROM user_records
              WHERE user_records.user_id = user_id_param
                AND (valid_until IS NULL OR valid_until > NOW());
                
              RETURN total_points;
            END;
            $inner$
        $func$;
        
        RAISE NOTICE 'Neither user_id nor student_id column found in negative_points table. Function will only count positive points.';
    END IF;
END $$;

-- Fix check_user_tiers_and_levels (important for reward system)
CREATE OR REPLACE FUNCTION public.check_user_tiers_and_levels(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_points integer;
  tier_record record;
BEGIN
  -- Get current points
  user_points := get_user_points_balance(user_id);
  
  -- Check if user qualifies for new tiers
  FOR tier_record IN 
    SELECT * FROM reward_tiers 
    WHERE tier_required_points <= user_points
    AND NOT EXISTS (
      SELECT 1 FROM user_tiers 
      WHERE user_tiers.user_id = check_user_tiers_and_levels.user_id
      AND user_tiers.tier_id = reward_tiers.id
    )
  LOOP
    -- Add new tier to user
    INSERT INTO user_tiers (user_id, tier_id, achieved_at)
    VALUES (user_id, tier_record.id, NOW());
    
    -- Create notification
    INSERT INTO notifications (user_id, title, content, type)
    VALUES (
      user_id,
      'تم تحقيق مستوى جديد',
      'مبارك! لقد حققت المستوى "' || tier_record.name || '"',
      'achievement'
    );
  END LOOP;
END;
$$;

-- Fix check_user_badges (rewards security)
CREATE OR REPLACE FUNCTION public.check_user_badges(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_points integer;
  badge_record record;
BEGIN
  -- Get current points
  user_points := get_user_points_balance(user_id);
  
  -- Check if user qualifies for new badges
  FOR badge_record IN 
    SELECT * FROM rewards 
    WHERE reward_type = 'badge'
    AND min_points <= user_points
    AND max_points >= user_points
    AND auto_award = true
    AND NOT EXISTS (
      SELECT 1 FROM user_rewards 
      WHERE user_rewards.user_id = check_user_badges.user_id
      AND user_rewards.reward_id = rewards.id
    )
  LOOP
    -- Award the badge to user
    INSERT INTO user_rewards (user_id, reward_id, awarded_at)
    VALUES (user_id, badge_record.id, NOW());
    
    -- Create notification
    INSERT INTO notifications (user_id, title, content, type, reference_id)
    VALUES (
      user_id,
      'حصلت على وسام جديد',
      'مبارك! لقد حصلت على وسام "' || badge_record.name || '"',
      'reward',
      badge_record.id
    );
  END LOOP;
END;
$$;

-- Add comment to document changes
COMMENT ON FUNCTION public.purge_old_security_logs IS 'Purges old security logs with fixed search_path';
COMMENT ON FUNCTION public.execute_raw_sql IS 'Executes raw SQL with fixed search_path - USE WITH CAUTION';
COMMENT ON FUNCTION public.is_admin IS 'Checks if current user is admin with fixed search_path';
COMMENT ON FUNCTION public.update_redemption_status IS 'Updates redemption status with fixed search_path';
COMMENT ON FUNCTION public.calculate_user_points IS 'Calculates user points with fixed search_path';
COMMENT ON FUNCTION public.get_user_points_balance IS 'Gets user points balance with fixed search_path';
COMMENT ON FUNCTION public.check_user_tiers_and_levels IS 'Checks user tiers and levels with fixed search_path';
COMMENT ON FUNCTION public.check_user_badges IS 'Checks user badges with fixed search_path'; 