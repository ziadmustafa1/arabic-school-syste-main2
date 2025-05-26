-- Create a configurable settings system to replace hardcoded values

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_configuration (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL, -- 'string', 'integer', 'boolean', 'json'
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE, -- Indicates if this setting should be hidden from client
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.users(id),
    UNIQUE(category, key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_configuration_category_key ON public.system_configuration(category, key);

-- Function to get a configuration value with correct data type
CREATE OR REPLACE FUNCTION get_config(category_param TEXT, key_param TEXT, default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT value INTO config_value
    FROM public.system_configuration
    WHERE category = category_param AND key = key_param;
    
    RETURN COALESCE(config_value, default_value);
END;
$$ LANGUAGE plpgsql;

-- Function to get integer configuration
CREATE OR REPLACE FUNCTION get_config_int(category_param TEXT, key_param TEXT, default_value INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    config_value TEXT;
    int_value INTEGER;
BEGIN
    SELECT value INTO config_value
    FROM public.system_configuration
    WHERE category = category_param AND key = key_param;
    
    IF config_value IS NULL THEN
        RETURN default_value;
    END IF;
    
    BEGIN
        int_value := config_value::INTEGER;
        RETURN int_value;
    EXCEPTION WHEN OTHERS THEN
        RETURN default_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get boolean configuration
CREATE OR REPLACE FUNCTION get_config_bool(category_param TEXT, key_param TEXT, default_value BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE
    config_value TEXT;
    bool_value BOOLEAN;
BEGIN
    SELECT value INTO config_value
    FROM public.system_configuration
    WHERE category = category_param AND key = key_param;
    
    IF config_value IS NULL THEN
        RETURN default_value;
    END IF;
    
    BEGIN
        bool_value := config_value::BOOLEAN;
        RETURN bool_value;
    EXCEPTION WHEN OTHERS THEN
        RETURN default_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get JSON configuration
CREATE OR REPLACE FUNCTION get_config_json(category_param TEXT, key_param TEXT, default_value JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    config_value TEXT;
    json_value JSONB;
BEGIN
    SELECT value INTO config_value
    FROM public.system_configuration
    WHERE category = category_param AND key = key_param;
    
    IF config_value IS NULL THEN
        RETURN default_value;
    END IF;
    
    BEGIN
        json_value := config_value::JSONB;
        RETURN json_value;
    EXCEPTION WHEN OTHERS THEN
        RETURN default_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to set a configuration value
CREATE OR REPLACE FUNCTION set_config(
    category_param TEXT,
    key_param TEXT,
    value_param TEXT,
    data_type_param TEXT,
    description_param TEXT DEFAULT NULL,
    is_private_param BOOLEAN DEFAULT FALSE,
    user_id_param UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.system_configuration (
        category,
        key,
        value,
        data_type,
        description,
        is_private,
        created_by,
        updated_at
    ) VALUES (
        category_param,
        key_param,
        value_param,
        data_type_param,
        description_param,
        is_private_param,
        user_id_param,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (category, key) DO UPDATE
    SET 
        value = value_param,
        data_type = data_type_param,
        description = COALESCE(description_param, public.system_configuration.description),
        is_private = is_private_param,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert default configuration values for previously hardcoded values

-- Penalty Cards Configuration
SELECT set_config('penalty_cards', 'white_card_threshold', '3', 'integer', 'Number of negative categories to trigger white card', FALSE);
SELECT set_config('penalty_cards', 'yellow_card_threshold', '6', 'integer', 'Number of negative categories to trigger yellow card', FALSE);
SELECT set_config('penalty_cards', 'orange_card_threshold', '12', 'integer', 'Number of negative categories to trigger orange card', FALSE);
SELECT set_config('penalty_cards', 'red_card_threshold', '20', 'integer', 'Number of negative categories to trigger red card', FALSE);

SELECT set_config('penalty_cards', 'white_card_deduction', '15', 'integer', 'Percentage deduction for white card', FALSE);
SELECT set_config('penalty_cards', 'yellow_card_deduction', '30', 'integer', 'Percentage deduction for yellow card', FALSE);
SELECT set_config('penalty_cards', 'orange_card_deduction', '25', 'integer', 'Percentage deduction for orange card', FALSE);
SELECT set_config('penalty_cards', 'red_card_deduction', '30', 'integer', 'Percentage deduction for red card', FALSE);

SELECT set_config('penalty_cards', 'white_card_duration', '3', 'integer', 'Duration in days for white card', FALSE);
SELECT set_config('penalty_cards', 'yellow_card_duration', '7', 'integer', 'Duration in days for yellow card', FALSE);
SELECT set_config('penalty_cards', 'orange_card_duration', '15', 'integer', 'Duration in days for orange card', FALSE);
SELECT set_config('penalty_cards', 'red_card_duration', '0', 'integer', 'Duration in days for red card (0 means permanent)', FALSE);

SELECT set_config('penalty_cards', 'check_period_days', '30', 'integer', 'Number of days to look back when checking for penalties', FALSE);
SELECT set_config('penalty_cards', 'auto_check_enabled', 'true', 'boolean', 'Whether to automatically check for penalties', FALSE);

-- Points System Configuration
SELECT set_config('points', 'default_positive_points', '10', 'integer', 'Default points for positive categories', FALSE);
SELECT set_config('points', 'default_negative_points', '5', 'integer', 'Default points for negative categories', FALSE);
SELECT set_config('points', 'transfer_enabled', 'true', 'boolean', 'Whether point transfers between users are enabled', FALSE);
SELECT set_config('points', 'transfer_fee_percentage', '0', 'integer', 'Percentage fee for transferring points', FALSE);
SELECT set_config('points', 'min_transfer_amount', '1', 'integer', 'Minimum amount of points that can be transferred', FALSE);
SELECT set_config('points', 'max_transfer_amount', '1000', 'integer', 'Maximum amount of points that can be transferred', FALSE);

-- Badges System Configuration
SELECT set_config('badges', 'bronze_threshold', '100', 'integer', 'Points threshold for bronze badge', FALSE);
SELECT set_config('badges', 'silver_threshold', '500', 'integer', 'Points threshold for silver badge', FALSE);
SELECT set_config('badges', 'gold_threshold', '1000', 'integer', 'Points threshold for gold badge', FALSE);
SELECT set_config('badges', 'auto_award_enabled', 'true', 'boolean', 'Whether to automatically award badges', FALSE);

-- Recharge Cards Configuration
SELECT set_config('recharge_cards', 'default_points', '100', 'integer', 'Default points for recharge cards', FALSE);
SELECT set_config('recharge_cards', 'code_length', '10', 'integer', 'Length of generated recharge codes', FALSE);
SELECT set_config('recharge_cards', 'max_failed_attempts', '3', 'integer', 'Maximum failed attempts before locking a card', FALSE);
SELECT set_config('recharge_cards', 'batch_size', '10', 'integer', 'Default batch size when generating cards', FALSE);

-- User Code Configuration
SELECT set_config('user_codes', 'student_prefix', 'ST', 'string', 'Prefix for student user codes', FALSE);
SELECT set_config('user_codes', 'parent_prefix', 'PA', 'string', 'Prefix for parent user codes', FALSE);
SELECT set_config('user_codes', 'teacher_prefix', 'TE', 'string', 'Prefix for teacher user codes', FALSE);
SELECT set_config('user_codes', 'admin_prefix', 'PR', 'string', 'Prefix for admin user codes', FALSE);
SELECT set_config('user_codes', 'code_digits', '5', 'integer', 'Number of digits in user codes', FALSE);

-- System Settings
SELECT set_config('system', 'school_name', 'Arabic School System', 'string', 'Name of the school', FALSE);
SELECT set_config('system', 'school_logo_url', '', 'string', 'URL to the school logo', FALSE);
SELECT set_config('system', 'enable_emails', 'false', 'boolean', 'Whether to send email notifications', FALSE);
SELECT set_config('system', 'enable_activity_log', 'true', 'boolean', 'Whether to log system activities', FALSE);
SELECT set_config('system', 'maintenance_mode', 'false', 'boolean', 'Whether the system is in maintenance mode', FALSE);

-- Update the penalty card functions to use the configuration values
CREATE OR REPLACE FUNCTION check_user_penalty_card_eligibility(user_id_param UUID)
RETURNS TABLE (
    card_type_id INTEGER,
    negative_categories_count INTEGER
) AS $$
DECLARE
    negative_categories_count INTEGER;
    check_period INTEGER;
    white_threshold INTEGER;
    yellow_threshold INTEGER;
    orange_threshold INTEGER;
    red_threshold INTEGER;
BEGIN
    -- Get configuration values
    check_period := get_config_int('penalty_cards', 'check_period_days', 30);
    white_threshold := get_config_int('penalty_cards', 'white_card_threshold', 3);
    yellow_threshold := get_config_int('penalty_cards', 'yellow_card_threshold', 6);
    orange_threshold := get_config_int('penalty_cards', 'orange_card_threshold', 12);
    red_threshold := get_config_int('penalty_cards', 'red_card_threshold', 20);
    
    -- Count distinct negative categories for this user
    SELECT COUNT(DISTINCT pt.category_id) INTO negative_categories_count
    FROM points_transactions pt
    JOIN point_categories pc ON pt.category_id = pc.id
    WHERE pt.user_id = user_id_param 
    AND pc.is_positive = FALSE
    AND pt.created_at > (CURRENT_TIMESTAMP - (check_period || ' days')::INTERVAL);
    
    -- Determine which card applies based on thresholds
    IF negative_categories_count >= red_threshold THEN
        RETURN QUERY
        SELECT id, negative_categories_count
        FROM penalty_card_types
        WHERE color = 'red'
        LIMIT 1;
    ELSIF negative_categories_count >= orange_threshold THEN
        RETURN QUERY
        SELECT id, negative_categories_count
        FROM penalty_card_types
        WHERE color = 'orange'
        LIMIT 1;
    ELSIF negative_categories_count >= yellow_threshold THEN
        RETURN QUERY
        SELECT id, negative_categories_count
        FROM penalty_card_types
        WHERE color = 'yellow'
        LIMIT 1;
    ELSIF negative_categories_count >= white_threshold THEN
        RETURN QUERY
        SELECT id, negative_categories_count
        FROM penalty_card_types
        WHERE color = 'white'
        LIMIT 1;
    ELSE
        -- No card applies
        RETURN QUERY
        SELECT NULL::INTEGER, negative_categories_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to initialize or update penalty card types from configuration
CREATE OR REPLACE FUNCTION initialize_penalty_card_types()
RETURNS VOID AS $$
DECLARE
    white_threshold INTEGER;
    yellow_threshold INTEGER;
    orange_threshold INTEGER;
    red_threshold INTEGER;
    white_deduction INTEGER;
    yellow_deduction INTEGER;
    orange_deduction INTEGER;
    red_deduction INTEGER;
    white_duration INTEGER;
    yellow_duration INTEGER;
    orange_duration INTEGER;
    red_duration INTEGER;
BEGIN
    -- Get configuration values
    white_threshold := get_config_int('penalty_cards', 'white_card_threshold', 3);
    yellow_threshold := get_config_int('penalty_cards', 'yellow_card_threshold', 6);
    orange_threshold := get_config_int('penalty_cards', 'orange_card_threshold', 12);
    red_threshold := get_config_int('penalty_cards', 'red_card_threshold', 20);
    
    white_deduction := get_config_int('penalty_cards', 'white_card_deduction', 15);
    yellow_deduction := get_config_int('penalty_cards', 'yellow_card_deduction', 30);
    orange_deduction := get_config_int('penalty_cards', 'orange_card_deduction', 25);
    red_deduction := get_config_int('penalty_cards', 'red_card_deduction', 30);
    
    white_duration := get_config_int('penalty_cards', 'white_card_duration', 3);
    yellow_duration := get_config_int('penalty_cards', 'yellow_card_duration', 7);
    orange_duration := get_config_int('penalty_cards', 'orange_card_duration', 15);
    red_duration := get_config_int('penalty_cards', 'red_card_duration', 0);
    
    -- Check if the penalty_card_types table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'penalty_card_types'
    ) THEN
        -- Update existing cards with new configuration
        UPDATE penalty_card_types
        SET negative_categories_threshold = white_threshold,
            deduction_percentage = white_deduction,
            duration_days = white_duration
        WHERE color = 'white';
        
        UPDATE penalty_card_types
        SET negative_categories_threshold = yellow_threshold,
            deduction_percentage = yellow_deduction,
            duration_days = yellow_duration
        WHERE color = 'yellow';
        
        UPDATE penalty_card_types
        SET negative_categories_threshold = orange_threshold,
            deduction_percentage = orange_deduction,
            duration_days = orange_duration
        WHERE color = 'orange';
        
        UPDATE penalty_card_types
        SET negative_categories_threshold = red_threshold,
            deduction_percentage = red_deduction,
            duration_days = red_duration,
            is_reset_card = TRUE
        WHERE color = 'red';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize penalty card types with current configuration
SELECT initialize_penalty_card_types(); 