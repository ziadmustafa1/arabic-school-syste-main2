-- Fix remaining functions with mutable search paths
-- This migration addresses all the function_search_path_mutable warnings

-- Helper function to apply search_path fixes to all functions
-- This approach is more maintainable than updating each function individually
DO $$
DECLARE
    func_record RECORD;
    func_code TEXT;
    new_func_code TEXT;
    search_path_snippet TEXT := 'SET search_path = public';
    security_invoker_snippet TEXT := 'SECURITY INVOKER';
    security_definer_snippet TEXT := 'SECURITY DEFINER';
    has_security BOOLEAN;
BEGIN
    -- Loop through all functions that don't have search_path set
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_functiondef(p.oid) AS function_def,
            p.prosecdef AS is_security_definer,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE 
            -- Only in public and secure_storage schemas
            n.nspname IN ('public', 'secure_storage')
            -- Only for functions that don't already have search_path set
            AND NOT EXISTS (
                SELECT 1
                FROM pg_options_to_table(p.proconfig)
                WHERE option_name = 'search_path'
            )
    LOOP
        -- Get the function definition
        func_code := func_record.function_def;
        
        -- Check if the function has SECURITY DEFINER or SECURITY INVOKER
        has_security := position(security_invoker_snippet IN func_code) > 0 OR 
                       position(security_definer_snippet IN func_code) > 0;
        
        -- Skip pg_* functions and other system functions
        IF func_record.function_name LIKE 'pg_%' OR 
           func_record.function_name IN ('_pg_truetypid', '_pg_truetypmod') THEN
            CONTINUE;
        END IF;
        
        RAISE NOTICE 'Fixing search_path for function %.%', 
                    func_record.schema_name, 
                    func_record.function_name;
        
        -- Different approach based on whether the function already has SECURITY DEFINER/INVOKER
        IF has_security THEN
            -- If it already has SECURITY clause, insert SET search_path after it
            IF position(security_definer_snippet IN func_code) > 0 THEN
                new_func_code := regexp_replace(
                    func_code,
                    'SECURITY DEFINER(\s*)',
                    format('SECURITY DEFINER\n%sSET search_path = %s\n', '\1', func_record.schema_name),
                    'i'
                );
            ELSE
                new_func_code := regexp_replace(
                    func_code,
                    'SECURITY INVOKER(\s*)',
                    format('SECURITY INVOKER\n%sSET search_path = %s\n', '\1', func_record.schema_name),
                    'i'
                );
            END IF;
        ELSE
            -- If it doesn't have SECURITY clause, add proper SECURITY INVOKER and SET search_path
            -- Find where to insert - after LANGUAGE declaration
            new_func_code := regexp_replace(
                func_code,
                'LANGUAGE\s+([a-z_]+)(\s*)',
                format('LANGUAGE \1%s\nSECURITY INVOKER\nSET search_path = %s', '\2', func_record.schema_name),
                'i'
            );
        END IF;
        
        -- Apply the change using CREATE OR REPLACE
        IF new_func_code IS NOT NULL AND new_func_code <> func_code THEN
            BEGIN
                EXECUTE new_func_code;
                RAISE NOTICE 'Successfully updated %.%', 
                            func_record.schema_name, 
                            func_record.function_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error updating %.%: %', 
                            func_record.schema_name, 
                            func_record.function_name,
                            SQLERRM;
                
                -- Try individually fixing the functions that failed
                -- This is a fallback for functions with complex definitions
                BEGIN
                    EXECUTE format(
                        'ALTER FUNCTION %I.%I(%s) SET search_path TO %I',
                        func_record.schema_name,
                        func_record.function_name,
                        pg_get_function_identity_arguments(func_record.oid),
                        func_record.schema_name
                    );
                    RAISE NOTICE 'Used ALTER FUNCTION to fix %.%', 
                                func_record.schema_name, 
                                func_record.function_name;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to fix %.% with ALTER FUNCTION: %', 
                                func_record.schema_name, 
                                func_record.function_name,
                                SQLERRM;
                END;
            END;
        END IF;
    END LOOP;
    
    -- Now fix the specific functions mentioned in the warnings
    -- For each function, we'll use ALTER FUNCTION as a simpler approach
    
    -- Generate_record_code
    ALTER FUNCTION IF EXISTS public.generate_record_code() SET search_path TO public;
    
    -- Set_record_code
    ALTER FUNCTION IF EXISTS public.set_record_code() SET search_path TO public;
    
    -- Get_config functions
    ALTER FUNCTION IF EXISTS public.get_config(text) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_config_bool(text) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_config_json(text) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_config_int(text) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.set_config(text, text) SET search_path TO public;
    
    -- Points system functions
    ALTER FUNCTION IF EXISTS public.get_points_system_stats() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_leaderboard(integer) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_negative_points_by_category(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.create_negative_points_entry() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_points_by_category(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_student_total_points(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_user_points_balance(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_points_by_month(uuid, integer, integer) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_user_negative_points_total(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_user_rank(uuid) SET search_path TO public;
    
    -- Card system functions
    ALTER FUNCTION IF EXISTS public.check_user_penalty_card_eligibility(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.issue_penalty_card() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.initialize_penalty_card_types() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.auto_check_penalty_cards() SET search_path TO public;
    
    -- Payment functions
    ALTER FUNCTION IF EXISTS public.pay_all_negative_points(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.pay_negative_category(uuid, integer) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.pay_partial_negative_points(uuid, integer) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.approve_pending_payment(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.reject_pending_payment(uuid) SET search_path TO public;
    
    -- Restriction functions
    ALTER FUNCTION IF EXISTS public.set_category_payment_restriction(integer) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.lift_category_payment_restriction(integer) SET search_path TO public;
    
    -- Reward functions
    ALTER FUNCTION IF EXISTS public.check_user_badges(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.check_user_tiers_and_levels(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_available_rewards_for_user(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.redeem_reward(uuid, uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.update_redemption_status(uuid, text) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.migrate_existing_rewards() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.award_emblem_to_user(uuid, uuid) SET search_path TO public;
    
    -- Notification functions
    ALTER FUNCTION IF EXISTS public.update_notification_timestamp() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.update_all_notifications_read(uuid) SET search_path TO public;
    
    -- Messaging functions
    ALTER FUNCTION IF EXISTS public.update_conversation_last_message() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.send_message(uuid, uuid, text) SET search_path TO public;
    
    -- Academic functions
    ALTER FUNCTION IF EXISTS public.get_student_academic_report(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_class_performance_report(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_teacher_performance_report(uuid) SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.get_school_performance_dashboard() SET search_path TO public;
    
    -- Transaction functions
    ALTER FUNCTION IF EXISTS public.begin_transaction() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.commit_transaction() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.rollback_transaction() SET search_path TO public;
    ALTER FUNCTION IF EXISTS public.calculate_and_update_user_points() SET search_path TO public;
    
    -- Consistency functions
    ALTER FUNCTION IF EXISTS public.check_data_consistency() SET search_path TO public;
    
    -- Fix secure_storage schema functions
    ALTER FUNCTION IF EXISTS secure_storage.update_timestamp() SET search_path TO secure_storage;
    
    -- Also fix purge_old_security_logs
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
    
    RAISE NOTICE 'Fixed search paths for all functions';
END $$;

-- Enable leaked password protection for auth
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'config'
  ) THEN
    UPDATE auth.config
    SET 
      -- Enable HaveIBeenPwned password check
      check_pwned_passwords = TRUE
    WHERE
      id = 1; -- There's typically only one row in this table
      
    RAISE NOTICE 'Enabled leaked password protection';
  ELSE
    RAISE NOTICE 'auth.config table not found - skipping password security settings';
  END IF;
END $$;

-- Add comments to document changes
COMMENT ON DATABASE postgres IS 'Database with enhanced security settings and fixed function search paths'; 