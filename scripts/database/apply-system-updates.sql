-- Apply final system updates and ensure consistency

-- Apply configuration updates
DO $$ 
BEGIN
    -- Only run if system_configuration table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'system_configuration'
    ) THEN
        -- Update all penalty card types from configuration if they exist
        PERFORM initialize_penalty_card_types();
        
        -- Validate and migrate existing rewards
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'rewards'
        ) THEN
            PERFORM migrate_existing_rewards();
        END IF;
    END IF;
END $$;

-- Create or update triggers for automatic penalty card checks
DO $$ 
BEGIN
    -- Only proceed if penalty_card_types table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'penalty_card_types'
    ) THEN
        -- Check if auto penalty card checks are enabled
        IF get_config_bool('penalty_cards', 'auto_check_enabled', TRUE) THEN
            -- Make sure the trigger exists
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'trigger_check_penalty_card_after_negative_points'
            ) THEN
                -- Create the trigger
                CREATE TRIGGER trigger_check_penalty_card_after_negative_points
                AFTER INSERT ON points_transactions
                FOR EACH ROW
                EXECUTE FUNCTION check_penalty_card_after_negative_points();
                
                RAISE NOTICE 'Created penalty card trigger';
            END IF;
        ELSE
            -- Disable the trigger if it exists
            IF EXISTS (
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'trigger_check_penalty_card_after_negative_points'
            ) THEN
                DROP TRIGGER trigger_check_penalty_card_after_negative_points ON points_transactions;
                RAISE NOTICE 'Removed penalty card trigger';
            END IF;
        END IF;
    END IF;
END $$;

-- Fix any missing references in the messages tables
DO $$ 
BEGIN
    -- Check if the messaging fix function exists and apply it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) AND EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'conversations'
    ) THEN
        -- Fix any NULL sender_id or recipient_id
        UPDATE messages
        SET sender_id = (
            SELECT u.id 
            FROM users u 
            WHERE u.role_id = 4 -- Admin
            LIMIT 1
        )
        WHERE sender_id IS NULL;
        
        UPDATE messages
        SET recipient_id = (
            SELECT u.id 
            FROM users u 
            WHERE u.role_id = 4 -- Admin
            LIMIT 1
        )
        WHERE recipient_id IS NULL;
        
        -- Update conversation timestamps
        UPDATE conversations c
        SET last_message_at = (
            SELECT MAX(created_at)
            FROM messages
            WHERE conversation_id = c.id
        )
        WHERE EXISTS (
            SELECT 1
            FROM messages
            WHERE conversation_id = c.id
        ) AND (c.last_message_at IS NULL OR c.last_message_at < (
            SELECT MAX(created_at)
            FROM messages
            WHERE conversation_id = c.id
        ));
    END IF;
END $$;

-- Run maintenance on the database
DO $$ 
BEGIN
    -- Analyze tables for better query performance
    ANALYZE;
    
    -- Log that the system updates were applied
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    )
    SELECT 
        id,
        'SYSTEM_UPDATE',
        'Applied system updates and maintenance'
    FROM 
        users 
    WHERE 
        role_id = 4 -- Admin
    LIMIT 1;
END $$;

-- Create a function to check and fix any data inconsistencies
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    issues_found INTEGER,
    issues_fixed INTEGER,
    details TEXT
) AS $$
DECLARE
    orphaned_transactions INTEGER := 0;
    orphaned_transactions_fixed INTEGER := 0;
    invalid_points INTEGER := 0;
    invalid_points_fixed INTEGER := 0;
    missing_defaults INTEGER := 0;
    missing_defaults_fixed INTEGER := 0;
    dangling_conversations INTEGER := 0;
    dangling_conversations_fixed INTEGER := 0;
BEGIN
    -- Check for orphaned transactions
    SELECT COUNT(*) INTO orphaned_transactions
    FROM points_transactions pt
    LEFT JOIN users u ON pt.user_id = u.id
    WHERE u.id IS NULL;
    
    IF orphaned_transactions > 0 THEN
        -- Delete orphaned transactions
        DELETE FROM points_transactions
        WHERE user_id NOT IN (SELECT id FROM users);
        
        GET DIAGNOSTICS orphaned_transactions_fixed = ROW_COUNT;
    END IF;
    
    -- Return orphaned transactions results
    check_name := 'Orphaned Transactions';
    status := CASE WHEN orphaned_transactions > 0 THEN 'FIXED' ELSE 'OK' END;
    issues_found := orphaned_transactions;
    issues_fixed := orphaned_transactions_fixed;
    details := 'Removed transactions for non-existent users';
    RETURN NEXT;
    
    -- Check for invalid points values
    SELECT COUNT(*) INTO invalid_points
    FROM points_transactions
    WHERE points <= 0;
    
    IF invalid_points > 0 THEN
        -- Fix invalid points values
        UPDATE points_transactions
        SET points = 1
        WHERE points <= 0;
        
        GET DIAGNOSTICS invalid_points_fixed = ROW_COUNT;
    END IF;
    
    -- Return invalid points results
    check_name := 'Invalid Points Values';
    status := CASE WHEN invalid_points > 0 THEN 'FIXED' ELSE 'OK' END;
    issues_found := invalid_points;
    issues_fixed := invalid_points_fixed;
    details := 'Updated points with value <= 0 to 1';
    RETURN NEXT;
    
    -- Check for missing default configuration
    SELECT COUNT(*) INTO missing_defaults
    FROM (
        SELECT 'points' AS category, 'default_positive_points' AS key
        UNION ALL
        SELECT 'points' AS category, 'default_negative_points' AS key
        UNION ALL
        SELECT 'system' AS category, 'school_name' AS key
    ) AS required_configs
    LEFT JOIN system_configuration sc ON required_configs.category = sc.category AND required_configs.key = sc.key
    WHERE sc.id IS NULL;
    
    IF missing_defaults > 0 THEN
        -- Add any missing defaults
        IF NOT EXISTS (SELECT 1 FROM system_configuration WHERE category = 'points' AND key = 'default_positive_points') THEN
            PERFORM set_config('points', 'default_positive_points', '10', 'integer', 'Default points for positive categories', FALSE);
            missing_defaults_fixed := missing_defaults_fixed + 1;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM system_configuration WHERE category = 'points' AND key = 'default_negative_points') THEN
            PERFORM set_config('points', 'default_negative_points', '5', 'integer', 'Default points for negative categories', FALSE);
            missing_defaults_fixed := missing_defaults_fixed + 1;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM system_configuration WHERE category = 'system' AND key = 'school_name') THEN
            PERFORM set_config('system', 'school_name', 'Arabic School System', 'string', 'Name of the school', FALSE);
            missing_defaults_fixed := missing_defaults_fixed + 1;
        END IF;
    END IF;
    
    -- Return missing defaults results
    check_name := 'Missing Default Configuration';
    status := CASE WHEN missing_defaults > 0 THEN 'FIXED' ELSE 'OK' END;
    issues_found := missing_defaults;
    issues_fixed := missing_defaults_fixed;
    details := 'Added missing system configuration defaults';
    RETURN NEXT;
    
    -- Check for dangling conversations
    SELECT COUNT(*) INTO dangling_conversations
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE m.id IS NULL AND c.last_message_at < NOW() - INTERVAL '30 days';
    
    IF dangling_conversations > 0 THEN
        -- Delete dangling conversations
        DELETE FROM conversations
        WHERE id IN (
            SELECT c.id
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE m.id IS NULL AND c.last_message_at < NOW() - INTERVAL '30 days'
        );
        
        GET DIAGNOSTICS dangling_conversations_fixed = ROW_COUNT;
    END IF;
    
    -- Return dangling conversations results
    check_name := 'Empty Conversations';
    status := CASE WHEN dangling_conversations > 0 THEN 'FIXED' ELSE 'OK' END;
    issues_found := dangling_conversations;
    issues_fixed := dangling_conversations_fixed;
    details := 'Removed empty conversations older than 30 days';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Run the consistency check function
SELECT * FROM check_data_consistency();

-- Remove VACUUM ANALYZE entirely as it cannot run in a transaction block
-- VACUUM ANALYZE; 