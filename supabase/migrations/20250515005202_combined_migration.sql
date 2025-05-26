-- Combined migration file

BEGIN;


-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Migration: create-database-schema.sql
-- Description: Base database schema
-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role_id INTEGER NOT NULL REFERENCES public.roles(id),
    user_code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent_student table
CREATE TABLE IF NOT EXISTS public.parent_student (
    id SERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id)
);

-- Create point_categories table
CREATE TABLE IF NOT EXISTS public.point_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_points INTEGER NOT NULL,
    is_positive BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create points_transactions table
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES public.point_categories(id),
    points INTEGER NOT NULL,
    is_positive BOOLEAN NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create point_transfers table
CREATE TABLE IF NOT EXISTS public.point_transfers (
    id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Create teacher_subject table
CREATE TABLE IF NOT EXISTS public.teacher_subject (
    id SERIAL PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    CONSTRAINT unique_teacher_subject UNIQUE (teacher_id, subject_id)
);

-- Create card_categories table
CREATE TABLE IF NOT EXISTS public.card_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    image_url TEXT,
    role_id INTEGER REFERENCES public.roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_rewards table (previously reward_redemptions)
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    redemption_code VARCHAR(12) NOT NULL,
    admin_notes TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    points_threshold INTEGER NOT NULL,
    badge_type VARCHAR(20) NOT NULL
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- Create conversations table for messaging
CREATE TABLE IF NOT EXISTS public.conversations (
    id SERIAL PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
);

-- Create user_messages table
CREATE TABLE IF NOT EXISTS public.user_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles (required for the system to function)
INSERT INTO public.roles (id, name, code, description)
VALUES 
(1, 'طالب', 'ST', 'حساب طالب في المدرسة'),
(2, 'ولي أمر', 'PA', 'حساب ولي أمر طالب'),
(3, 'معلم', 'TE', 'حساب معلم في المدرسة'),
(4, 'مدير', 'PR', 'حساب مدير أو إداري في المدرسة')
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Create policies for notifications table
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for points_transactions table
CREATE POLICY "Users can view their own points transactions"
ON public.points_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can create their own points transactions"
ON public.points_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policies for point_categories table
CREATE POLICY "Everyone can view point categories"
ON public.point_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create/update/delete point categories"
ON public.point_categories
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role_id = 4
    )
);

-- Create policies for rewards table
CREATE POLICY "Everyone can view rewards"
ON public.rewards
FOR SELECT
TO authenticated
USING (true);

-- Create policies for badges table
CREATE POLICY "Everyone can view badges"
ON public.badges
FOR SELECT
TO authenticated
USING (true);

-- Create policies for user_badges table
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for conversations and messages
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can view their own messages"
ON public.user_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can update their own received messages"
ON public.user_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

-- Create policies for card_categories
CREATE POLICY "Admins can manage card categories" ON public.card_categories
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role_id = 4
    ));
CREATE POLICY "Everyone can view card categories" ON public.card_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Drop the existing recharge_cards table
DROP TABLE IF EXISTS public.recharge_cards;

-- Create enhanced recharge_cards table
CREATE TABLE IF NOT EXISTS public.recharge_cards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    points INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES public.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.users(id),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    category_id INTEGER REFERENCES public.card_categories(id),
    max_usage_attempts INTEGER DEFAULT 1,
    usage_cooldown_hours INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for recharge_cards
ALTER TABLE public.recharge_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all cards" ON public.recharge_cards
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role_id = 4
    ));
CREATE POLICY "Users can view cards assigned to them" ON public.recharge_cards
    FOR SELECT
    TO authenticated
    USING (assigned_to = auth.uid() OR assigned_to IS NULL);
CREATE POLICY "Users can use cards assigned to them" ON public.recharge_cards
    FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid() OR assigned_to IS NULL)
    WITH CHECK (assigned_to = auth.uid() OR assigned_to IS NULL);

-- Create table for tracking unauthorized usage attempts
CREATE TABLE IF NOT EXISTS public.card_usage_violations (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES public.recharge_cards(id),
    user_id UUID REFERENCES public.users(id),
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50),
    details TEXT
);

-- Add RLS policies for card_usage_violations
ALTER TABLE public.card_usage_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view violation logs" ON public.card_usage_violations
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role_id = 4
    ));

-- Create table for weekly usage limits
CREATE TABLE IF NOT EXISTS public.card_usage_limits (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES public.roles(id), -- 1: student, 2: parent, 3: teacher, 4: admin
    weekly_limit INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for card_usage_limits
ALTER TABLE public.card_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage usage limits" ON public.card_usage_limits
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role_id = 4
    ));
CREATE POLICY "Everyone can view usage limits" ON public.card_usage_limits
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert default weekly limits
INSERT INTO public.card_usage_limits (role_id, weekly_limit)
VALUES (1, 10), (2, 10), (3, 20), (4, 50)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student(student_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_by ON public.points_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_point_categories_is_positive ON public.point_categories(is_positive);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_recharge_cards_code ON public.recharge_cards(code);
CREATE INDEX IF NOT EXISTS idx_recharge_cards_is_used ON public.recharge_cards(is_used);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_conversation_id ON public.user_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id ON public.user_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON public.user_messages(is_read);

-- Create policies for user_rewards table
CREATE POLICY "Users can view their own rewards redemptions"
ON public.user_rewards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reward redemptions"
ON public.user_rewards
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-database-schema.sql', 'Base database schema')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-helper-functions.sql
-- Description: Helper functions
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


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-helper-functions.sql', 'Helper functions')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-stored-procedures.sql
-- Description: Generic stored procedures
-- Function to get total points for each student
CREATE OR REPLACE FUNCTION get_student_total_points()
RETURNS TABLE (
  user_id UUID,
  total_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.user_id,
    SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END) AS total_points
  FROM 
    points_transactions pt
  JOIN 
    users u ON pt.user_id = u.id
  WHERE 
    u.role_id = 1 -- Students only
  GROUP BY 
    pt.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL queries
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-stored-procedures.sql', 'Generic stored procedures')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-system-configuration.sql
-- Description: Configurable settings system
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

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-system-configuration.sql', 'Configurable settings system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-class-tables.sql
-- Description: Class management tables
-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_student table for many-to-many relationship
CREATE TABLE IF NOT EXISTS class_student (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-class-tables.sql', 'Class management tables')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-attendance-tables.sql
-- Description: Attendance tracking system
-- Script to create attendance tables in the database

-- Table for attendance status codes (e.g., present, absent, late)
CREATE TABLE IF NOT EXISTS public.attendance_status (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  is_present BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing attendance records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id),
  class_id INTEGER NOT NULL,
  status_id INTEGER REFERENCES public.attendance_status(id),
  date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, class_id, date)
);

-- Table for class-teacher relationship
CREATE TABLE IF NOT EXISTS public.class_teacher (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, teacher_id)
);

-- Table for class-student relationship
CREATE TABLE IF NOT EXISTS public.class_student (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);

-- Insert default attendance statuses
INSERT INTO public.attendance_status (name, code, is_present, description) VALUES
('حاضر', 'present', true, 'الطالب حاضر في الفصل'),
('غائب', 'absent', false, 'الطالب غائب'),
('متأخر', 'late', true, 'الطالب حضر متأخراً'),
('مستأذن', 'excused', false, 'الطالب مستأذن بعذر'),
('مريض', 'sick', false, 'الطالب غائب بسبب المرض')
ON CONFLICT (code) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_student ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_status (viewable by all authenticated users)
CREATE POLICY attendance_status_select ON public.attendance_status
    FOR SELECT TO authenticated USING (true);

-- Policies for attendance_records
CREATE POLICY attendance_records_insert ON public.attendance_records 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() IN (
        SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id
    ) OR auth.role() = 'service_role');

CREATE POLICY attendance_records_select ON public.attendance_records 
    FOR SELECT TO authenticated 
    USING (
        -- Teachers can see records for their classes
        auth.uid() IN (SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id)
        -- Students can see their own records
        OR auth.uid() = student_id 
        -- Parents can see their children's records
        OR auth.uid() IN (SELECT parent_id FROM public.parent_student WHERE student_id = attendance_records.student_id)
        -- Admins can see all
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );

CREATE POLICY attendance_records_update ON public.attendance_records 
    FOR UPDATE TO authenticated 
    USING (
        auth.uid() IN (SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id)
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );

-- Policies for class_teacher
CREATE POLICY class_teacher_select ON public.class_teacher
    FOR SELECT TO authenticated USING (true);

-- Policies for class_student
CREATE POLICY class_student_select ON public.class_student
    FOR SELECT TO authenticated USING (true);


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-attendance-tables.sql', 'Attendance tracking system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-messaging-tables.sql
-- Description: Messaging system
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id SERIAL PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT different_users CHECK (user1_id <> user2_id),
    CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Add RLS policies for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations they are part of"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update conversations they are part of"
ON public.conversations
FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Add RLS policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Create function to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_message_at when a new message is inserted
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message_timestamp();


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-messaging-tables.sql', 'Messaging system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-rewards-tables.sql
-- Description: Rewards system
-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_rewards table to track redemptions
CREATE TABLE IF NOT EXISTS user_rewards (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, delivered
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to calculate user points
CREATE OR REPLACE FUNCTION calculate_user_points(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN is_positive THEN points ELSE -points END), 0) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = $1;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Add some sample rewards
INSERT INTO rewards (name, description, points_cost, available_quantity, image_url)
VALUES 
  ('قسيمة مكتبة', 'قسيمة شراء من المكتبة المدرسية بقيمة 50 ريال', 500, 10, NULL),
  ('يوم بدون واجبات', 'الحصول على يوم واحد بدون واجبات منزلية', 300, 20, NULL),
  ('شهادة تقدير', 'شهادة تقدير موقعة من مدير المدرسة', 200, 30, NULL),
  ('رحلة مدرسية', 'المشاركة في الرحلة المدرسية القادمة مجاناً', 1000, 5, NULL),
  ('كتاب هدية', 'كتاب من اختيارك من المكتبة المدرسية', 400, 15, NULL);


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-rewards-tables.sql', 'Rewards system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-points-analytics-functions.sql
-- Description: Points analytics
-- Function to get points by category for a user
CREATE OR REPLACE FUNCTION get_points_by_category(user_id_param UUID)
RETURNS TABLE (
  category_id INT,
  category_name TEXT,
  total_points BIGINT,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id AS category_id,
    pc.name AS category_name,
    SUM(pt.points) AS total_points,
    pt.is_positive
  FROM 
    points_transactions pt
  LEFT JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.user_id = user_id_param
  GROUP BY 
    pc.id, pc.name, pt.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get points by month for a user
CREATE OR REPLACE FUNCTION get_points_by_month(
  user_id_param UUID,
  months_count INT DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  year INT,
  positive_points BIGINT,
  negative_points BIGINT,
  net_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(date_trunc('month', (current_date - (n || ' month')::interval)), 'Month') AS month,
      EXTRACT(YEAR FROM (current_date - (n || ' month')::interval)) AS year,
      date_trunc('month', (current_date - (n || ' month')::interval)) AS month_start,
      date_trunc('month', (current_date - (n || ' month')::interval)) + interval '1 month' - interval '1 day' AS month_end
    FROM generate_series(0, months_count - 1) AS n
  ),
  positive_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points) AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = true
    GROUP BY 
      month_date
  ),
  negative_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points) AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = false
    GROUP BY 
      month_date
  )
  SELECT 
    m.month,
    m.year::INT,
    COALESCE(pp.points, 0)::BIGINT AS positive_points,
    COALESCE(np.points, 0)::BIGINT AS negative_points,
    (COALESCE(pp.points, 0) - COALESCE(np.points, 0))::BIGINT AS net_points
  FROM 
    months m
  LEFT JOIN 
    positive_points pp ON m.month_start = pp.month_date
  LEFT JOIN 
    negative_points np ON m.month_start = np.month_date
  ORDER BY 
    m.month_start DESC;
END;
$$ LANGUAGE plpgsql;

-- Enhanced leaderboard function with time period parameter
CREATE OR REPLACE FUNCTION get_leaderboard(
  time_period TEXT DEFAULT 'month',
  results_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  user_code TEXT,
  role_id INT,
  role_name TEXT,
  total_points BIGINT,
  rank INT
) AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Determine the start date based on the time period
  CASE time_period
    WHEN 'week' THEN
      start_date := date_trunc('week', current_date);
    WHEN 'month' THEN
      start_date := date_trunc('month', current_date);
    WHEN 'year' THEN
      start_date := date_trunc('year', current_date);
    ELSE
      start_date := '1970-01-01'::TIMESTAMP; -- 'all' time
  END CASE;

  RETURN QUERY
  WITH points_summary AS (
    SELECT 
      pt.user_id,
      SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END) AS points
    FROM 
      points_transactions pt
    WHERE 
      pt.created_at >= start_date
    GROUP BY 
      pt.user_id
  ),
  ranked_users AS (
    SELECT 
      u.id AS user_id,
      u.full_name,
      u.user_code,
      u.role_id,
      r.name AS role_name,
      COALESCE(ps.points, 0) AS total_points,
      RANK() OVER (ORDER BY COALESCE(ps.points, 0) DESC) AS rank
    FROM 
      users u
    LEFT JOIN 
      points_summary ps ON u.id = ps.user_id
    LEFT JOIN
      roles r ON u.role_id = r.id
    WHERE 
      u.role_id = 1 -- Only students
  )
  SELECT * FROM ranked_users
  WHERE total_points > 0
  ORDER BY rank
  LIMIT results_limit;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-points-analytics-functions.sql', 'Points analytics')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-user-points-function.sql
-- Description: User points calculations
-- Function to calculate user points
CREATE OR REPLACE FUNCTION calculate_user_points(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN is_positive THEN points ELSE -points END), 0) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = $1;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-user-points-function.sql', 'User points calculations')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-system-stats-function.sql
-- Description: System statistics
-- Function to get system-wide points statistics
CREATE OR REPLACE FUNCTION get_points_system_stats()
RETURNS TABLE (
  total_users INT,
  total_points BIGINT,
  positive_points BIGINT,
  negative_points BIGINT,
  active_users INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      user_id,
      SUM(CASE WHEN is_positive THEN points ELSE 0 END) AS positive,
      SUM(CASE WHEN NOT is_positive THEN points ELSE 0 END) AS negative
    FROM 
      points_transactions
    GROUP BY 
      user_id
  )
  SELECT 
    (SELECT COUNT(*) FROM users)::INT AS total_users,
    (SELECT COALESCE(SUM(positive - negative), 0) FROM user_stats)::BIGINT AS total_points,
    (SELECT COALESCE(SUM(positive), 0) FROM user_stats)::BIGINT AS positive_points,
    (SELECT COALESCE(SUM(negative), 0) FROM user_stats)::BIGINT AS negative_points,
    (SELECT COUNT(*) FROM user_stats WHERE positive > 0 OR negative > 0)::INT AS active_users;
END;
$$ LANGUAGE plpgsql;

-- Function to get a user's rank
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.id,
      COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS total_points
    FROM 
      users u
    LEFT JOIN 
      points_transactions pt ON u.id = pt.user_id
    WHERE 
      u.role_id = 1 -- Only students
    GROUP BY 
      u.id
  )
  SELECT 
    RANK() OVER (ORDER BY total_points DESC) AS rank
  FROM 
    user_points
  WHERE 
    id = user_id_param;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-system-stats-function.sql', 'System statistics')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-report-procedures.sql
-- Description: Reporting procedures
-- إجراء لحساب أعلى فئات النقاط استخداماً
CREATE OR REPLACE FUNCTION get_top_point_categories(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  is_positive BOOLEAN,
  total_points BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.name,
    pc.is_positive,
    SUM(pt.points)::BIGINT as total_points,
    COUNT(pt.id)::BIGINT as transaction_count
  FROM 
    points_transactions pt
  JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.created_at >= start_date
  GROUP BY 
    pc.id, pc.name, pc.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- إجراء لحساب عدد المستخدمين حسب الدور
CREATE OR REPLACE FUNCTION get_users_by_role()
RETURNS TABLE (
  role_id INTEGER,
  role_name TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as role_id,
    r.name as role_name,
    COUNT(u.id)::BIGINT as count
  FROM 
    roles r
  LEFT JOIN 
    users u ON r.id = u.role_id
  GROUP BY 
    r.id, r.name
  ORDER BY 
    r.id;
END;
$$ LANGUAGE plpgsql;

-- إجراء لحساب أكثر المكافآت استبدالاً
CREATE OR REPLACE FUNCTION get_top_rewards(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  points_cost INTEGER,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.points_cost,
    COUNT(ur.id)::BIGINT as count
  FROM 
    rewards r
  JOIN 
    user_rewards ur ON r.id = ur.reward_id
  WHERE 
    ur.redeemed_at >= start_date
  GROUP BY 
    r.id, r.name, r.points_cost
  ORDER BY 
    count DESC;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-report-procedures.sql', 'Reporting procedures')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: enhance-reporting-system.sql
-- Description: Enhanced academic reporting
-- Enhanced reporting system for academic reports and analytics

-- Create comprehensive student academic report function
CREATE OR REPLACE FUNCTION get_student_academic_report(
    student_id_param UUID,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    class_id INTEGER,
    class_name TEXT,
    subject_id INTEGER,
    subject_name TEXT,
    total_positive_points INTEGER,
    total_negative_points INTEGER,
    net_points INTEGER,
    positive_categories_count INTEGER,
    negative_categories_count INTEGER,
    attendance_present INTEGER,
    attendance_absent INTEGER,
    attendance_late INTEGER,
    attendance_percentage NUMERIC(5,2),
    report_period TEXT
) AS $$
DECLARE
    actual_start_date DATE;
    actual_end_date DATE;
BEGIN
    -- Set default dates if not provided (last 30 days)
    actual_start_date := COALESCE(start_date_param, CURRENT_DATE - INTERVAL '30 days');
    actual_end_date := COALESCE(end_date_param, CURRENT_DATE);
    
    RETURN QUERY
    WITH 
    -- Student details
    student_details AS (
        SELECT 
            u.id AS student_id,
            u.full_name AS student_name,
            sc.class_id
        FROM 
            users u
        LEFT JOIN
            student_classes sc ON u.id = sc.student_id
        WHERE 
            u.id = student_id_param
            AND u.role_id = 1 -- Student role
    ),
    
    -- Class details
    class_details AS (
        SELECT 
            c.id AS class_id,
            c.name AS class_name
        FROM 
            classes c
        JOIN 
            student_details sd ON c.id = sd.class_id
    ),
    
    -- Subject details and points
    subject_points AS (
        SELECT 
            s.id AS subject_id,
            s.name AS subject_name,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE 0 END), 0) AS total_positive_points,
            COALESCE(SUM(CASE WHEN NOT pt.is_positive THEN pt.points ELSE 0 END), 0) AS total_negative_points,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS net_points,
            COUNT(DISTINCT CASE WHEN pt.is_positive THEN pc.id END) AS positive_categories_count,
            COUNT(DISTINCT CASE WHEN NOT pt.is_positive THEN pc.id END) AS negative_categories_count
        FROM 
            subjects s
        LEFT JOIN 
            class_subjects cs ON s.id = cs.subject_id
        LEFT JOIN 
            student_details sd ON cs.class_id = sd.class_id
        LEFT JOIN 
            points_transactions pt ON pt.user_id = sd.student_id
                                    AND pt.category_id IN (
                                        SELECT id FROM point_categories 
                                        WHERE subject_id = s.id
                                    )
                                    AND pt.created_at >= actual_start_date
                                    AND pt.created_at <= actual_end_date
        LEFT JOIN
            point_categories pc ON pt.category_id = pc.id
        GROUP BY 
            s.id, s.name
    ),
    
    -- Attendance data
    attendance_data AS (
        SELECT 
            a.subject_id,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_count,
            COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS late_count,
            CASE 
                WHEN COUNT(a.id) > 0 THEN 
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::NUMERIC / COUNT(a.id) * 100, 2)
                ELSE 0
            END AS attendance_percentage
        FROM 
            attendance a
        WHERE 
            a.student_id = student_id_param
            AND a.date >= actual_start_date
            AND a.date <= actual_end_date
        GROUP BY 
            a.subject_id
    )
    
    -- Combine all data
    SELECT 
        sd.student_id,
        sd.student_name,
        cd.class_id,
        cd.class_name,
        sp.subject_id,
        sp.subject_name,
        sp.total_positive_points,
        sp.total_negative_points,
        sp.net_points,
        sp.positive_categories_count,
        sp.negative_categories_count,
        COALESCE(ad.present_count, 0) AS attendance_present,
        COALESCE(ad.absent_count, 0) AS attendance_absent,
        COALESCE(ad.late_count, 0) AS attendance_late,
        COALESCE(ad.attendance_percentage, 0) AS attendance_percentage,
        actual_start_date || ' to ' || actual_end_date AS report_period
    FROM 
        student_details sd
    JOIN 
        class_details cd ON sd.class_id = cd.class_id
    JOIN 
        subject_points sp ON TRUE
    LEFT JOIN
        attendance_data ad ON sp.subject_id = ad.subject_id
    ORDER BY 
        sp.net_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get class performance report
CREATE OR REPLACE FUNCTION get_class_performance_report(
    class_id_param INTEGER,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
    class_id INTEGER,
    class_name TEXT,
    subject_id INTEGER,
    subject_name TEXT,
    student_count INTEGER,
    avg_positive_points NUMERIC(10,2),
    avg_negative_points NUMERIC(10,2),
    avg_net_points NUMERIC(10,2),
    top_student_id UUID,
    top_student_name TEXT,
    top_student_points INTEGER,
    avg_attendance_percentage NUMERIC(5,2),
    report_period TEXT
) AS $$
DECLARE
    actual_start_date DATE;
    actual_end_date DATE;
BEGIN
    -- Set default dates if not provided (last 30 days)
    actual_start_date := COALESCE(start_date_param, CURRENT_DATE - INTERVAL '30 days');
    actual_end_date := COALESCE(end_date_param, CURRENT_DATE);
    
    RETURN QUERY
    WITH 
    -- Class details
    class_details AS (
        SELECT 
            c.id AS class_id,
            c.name AS class_name
        FROM 
            classes c
        WHERE 
            c.id = class_id_param
    ),
    
    -- Students in class
    class_students AS (
        SELECT 
            sc.student_id,
            u.full_name AS student_name
        FROM 
            student_classes sc
        JOIN 
            users u ON sc.student_id = u.id
        WHERE 
            sc.class_id = class_id_param
    ),
    
    -- Subject details
    class_subjects AS (
        SELECT 
            cs.subject_id,
            s.name AS subject_name
        FROM 
            class_subjects cs
        JOIN 
            subjects s ON cs.subject_id = s.id
        WHERE 
            cs.class_id = class_id_param
    ),
    
    -- Points by student and subject
    student_subject_points AS (
        SELECT 
            cs.student_id,
            cs.student_name,
            csu.subject_id,
            csu.subject_name,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE 0 END), 0) AS positive_points,
            COALESCE(SUM(CASE WHEN NOT pt.is_positive THEN pt.points ELSE 0 END), 0) AS negative_points,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS net_points
        FROM 
            class_students cs
        CROSS JOIN
            class_subjects csu
        LEFT JOIN
            points_transactions pt ON pt.user_id = cs.student_id
                                    AND pt.category_id IN (
                                        SELECT id FROM point_categories 
                                        WHERE subject_id = csu.subject_id
                                    )
                                    AND pt.created_at >= actual_start_date
                                    AND pt.created_at <= actual_end_date
        GROUP BY 
            cs.student_id, cs.student_name, csu.subject_id, csu.subject_name
    ),
    
    -- Ranked students by subject
    ranked_students AS (
        SELECT 
            ssp.subject_id,
            ssp.student_id,
            ssp.student_name,
            ssp.net_points,
            RANK() OVER (PARTITION BY ssp.subject_id ORDER BY ssp.net_points DESC) AS rank
        FROM 
            student_subject_points ssp
    ),
    
    -- Attendance by subject
    subject_attendance AS (
        SELECT 
            a.subject_id,
            AVG(CASE WHEN a.status = 'present' THEN 100 
                     WHEN a.status = 'late' THEN 50
                     ELSE 0 END) AS avg_attendance_percentage
        FROM 
            attendance a
        JOIN 
            class_students cs ON a.student_id = cs.student_id
        WHERE 
            a.date >= actual_start_date
            AND a.date <= actual_end_date
        GROUP BY 
            a.subject_id
    )
    
    -- Final results
    SELECT 
        cd.class_id,
        cd.class_name,
        csu.subject_id,
        csu.subject_name,
        COUNT(DISTINCT cs.student_id) AS student_count,
        ROUND(AVG(ssp.positive_points), 2) AS avg_positive_points,
        ROUND(AVG(ssp.negative_points), 2) AS avg_negative_points,
        ROUND(AVG(ssp.net_points), 2) AS avg_net_points,
        (SELECT student_id FROM ranked_students rs WHERE rs.subject_id = csu.subject_id AND rs.rank = 1 LIMIT 1) AS top_student_id,
        (SELECT student_name FROM ranked_students rs WHERE rs.subject_id = csu.subject_id AND rs.rank = 1 LIMIT 1) AS top_student_name,
        (SELECT net_points FROM ranked_students rs WHERE rs.subject_id = csu.subject_id AND rs.rank = 1 LIMIT 1) AS top_student_points,
        COALESCE(sa.avg_attendance_percentage, 0) AS avg_attendance_percentage,
        actual_start_date || ' to ' || actual_end_date AS report_period
    FROM 
        class_details cd
    JOIN 
        class_subjects csu ON TRUE
    JOIN 
        class_students cs ON TRUE
    JOIN 
        student_subject_points ssp ON cs.student_id = ssp.student_id AND csu.subject_id = ssp.subject_id
    LEFT JOIN 
        subject_attendance sa ON csu.subject_id = sa.subject_id
    GROUP BY 
        cd.class_id, cd.class_name, csu.subject_id, csu.subject_name, sa.avg_attendance_percentage
    ORDER BY 
        csu.subject_name;
END;
$$ LANGUAGE plpgsql;

-- Create teacher performance report
CREATE OR REPLACE FUNCTION get_teacher_performance_report(
    teacher_id_param UUID,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
    teacher_id UUID,
    teacher_name TEXT,
    subject_id INTEGER,
    subject_name TEXT,
    class_count INTEGER,
    student_count INTEGER,
    total_points_given INTEGER,
    positive_points_given INTEGER,
    negative_points_given INTEGER,
    unique_categories_used INTEGER,
    most_used_category_id INTEGER,
    most_used_category_name TEXT,
    most_used_category_count INTEGER,
    report_period TEXT
) AS $$
DECLARE
    actual_start_date DATE;
    actual_end_date DATE;
BEGIN
    -- Set default dates if not provided (last 30 days)
    actual_start_date := COALESCE(start_date_param, CURRENT_DATE - INTERVAL '30 days');
    actual_end_date := COALESCE(end_date_param, CURRENT_DATE);
    
    RETURN QUERY
    WITH 
    -- Teacher details
    teacher_details AS (
        SELECT 
            u.id AS teacher_id,
            u.full_name AS teacher_name
        FROM 
            users u
        WHERE 
            u.id = teacher_id_param
            AND u.role_id = 3 -- Teacher role
    ),
    
    -- Teacher's subjects
    teacher_subjects AS (
        SELECT 
            ts.teacher_id,
            ts.subject_id,
            s.name AS subject_name
        FROM 
            teacher_subjects ts
        JOIN 
            subjects s ON ts.subject_id = s.id
        WHERE 
            ts.teacher_id = teacher_id_param
    ),
    
    -- Classes teaching
    teacher_classes AS (
        SELECT 
            ts.subject_id,
            COUNT(DISTINCT cs.class_id) AS class_count
        FROM 
            teacher_subjects ts
        JOIN 
            class_subjects cs ON ts.subject_id = cs.subject_id
        WHERE 
            ts.teacher_id = teacher_id_param
        GROUP BY 
            ts.subject_id
    ),
    
    -- Students taught
    teacher_students AS (
        SELECT 
            ts.subject_id,
            COUNT(DISTINCT sc.student_id) AS student_count
        FROM 
            teacher_subjects ts
        JOIN 
            class_subjects cs ON ts.subject_id = cs.subject_id
        JOIN 
            student_classes sc ON cs.class_id = sc.class_id
        WHERE 
            ts.teacher_id = teacher_id_param
        GROUP BY 
            ts.subject_id
    ),
    
    -- Points given
    points_given AS (
        SELECT 
            pc.subject_id,
            SUM(pt.points) AS total_points,
            SUM(CASE WHEN pt.is_positive THEN pt.points ELSE 0 END) AS positive_points,
            SUM(CASE WHEN NOT pt.is_positive THEN pt.points ELSE 0 END) AS negative_points,
            COUNT(DISTINCT pt.category_id) AS unique_categories
        FROM 
            points_transactions pt
        JOIN 
            point_categories pc ON pt.category_id = pc.id
        WHERE 
            pt.created_by = teacher_id_param
            AND pt.created_at >= actual_start_date
            AND pt.created_at <= actual_end_date
        GROUP BY 
            pc.subject_id
    ),
    
    -- Most used categories
    category_usage AS (
        SELECT 
            pc.subject_id,
            pt.category_id,
            pc.name AS category_name,
            COUNT(*) AS usage_count,
            RANK() OVER (PARTITION BY pc.subject_id ORDER BY COUNT(*) DESC) AS rank
        FROM 
            points_transactions pt
        JOIN 
            point_categories pc ON pt.category_id = pc.id
        WHERE 
            pt.created_by = teacher_id_param
            AND pt.created_at >= actual_start_date
            AND pt.created_at <= actual_end_date
        GROUP BY 
            pc.subject_id, pt.category_id, pc.name
    )
    
    -- Final results
    SELECT 
        td.teacher_id,
        td.teacher_name,
        ts.subject_id,
        ts.subject_name,
        COALESCE(tc.class_count, 0) AS class_count,
        COALESCE(tst.student_count, 0) AS student_count,
        COALESCE(pg.total_points, 0) AS total_points_given,
        COALESCE(pg.positive_points, 0) AS positive_points_given,
        COALESCE(pg.negative_points, 0) AS negative_points_given,
        COALESCE(pg.unique_categories, 0) AS unique_categories_used,
        COALESCE((SELECT category_id FROM category_usage cu WHERE cu.subject_id = ts.subject_id AND cu.rank = 1 LIMIT 1), NULL) AS most_used_category_id,
        COALESCE((SELECT category_name FROM category_usage cu WHERE cu.subject_id = ts.subject_id AND cu.rank = 1 LIMIT 1), NULL) AS most_used_category_name,
        COALESCE((SELECT usage_count FROM category_usage cu WHERE cu.subject_id = ts.subject_id AND cu.rank = 1 LIMIT 1), 0) AS most_used_category_count,
        actual_start_date || ' to ' || actual_end_date AS report_period
    FROM 
        teacher_details td
    JOIN 
        teacher_subjects ts ON td.teacher_id = ts.teacher_id
    LEFT JOIN 
        teacher_classes tc ON ts.subject_id = tc.subject_id
    LEFT JOIN 
        teacher_students tst ON ts.subject_id = tst.subject_id
    LEFT JOIN 
        points_given pg ON ts.subject_id = pg.subject_id
    ORDER BY 
        ts.subject_name;
END;
$$ LANGUAGE plpgsql;

-- Create overall school performance dashboard function
CREATE OR REPLACE FUNCTION get_school_performance_dashboard(
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    display_type TEXT,
    comparison_value NUMERIC,
    trend_direction TEXT,
    category TEXT
) AS $$
DECLARE
    actual_start_date DATE;
    actual_end_date DATE;
    previous_start_date DATE;
    previous_end_date DATE;
BEGIN
    -- Set default dates if not provided (last 30 days)
    actual_start_date := COALESCE(start_date_param, CURRENT_DATE - INTERVAL '30 days');
    actual_end_date := COALESCE(end_date_param, CURRENT_DATE);
    
    -- Calculate previous period for comparison
    previous_start_date := actual_start_date - (actual_end_date - actual_start_date);
    previous_end_date := actual_start_date - INTERVAL '1 day';
    
    RETURN QUERY
    
    -- Total Active Students
    SELECT 
        'Total Active Students' AS metric_name,
        COUNT(*)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COUNT(*)::NUMERIC 
            FROM users 
            WHERE role_id = 1 
            AND created_at <= previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN COUNT(*) > (SELECT COUNT(*) FROM users WHERE role_id = 1 AND created_at <= previous_end_date) THEN 'up'
            WHEN COUNT(*) < (SELECT COUNT(*) FROM users WHERE role_id = 1 AND created_at <= previous_end_date) THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'users' AS category
    FROM users
    WHERE role_id = 1 -- Student role
    AND created_at <= actual_end_date
    
    UNION ALL
    
    -- Total Points Awarded
    SELECT 
        'Total Points Awarded' AS metric_name,
        COALESCE(SUM(points), 0)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COALESCE(SUM(points), 0)::NUMERIC 
            FROM points_transactions 
            WHERE is_positive = TRUE 
            AND created_at BETWEEN previous_start_date AND previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN COALESCE(SUM(points), 0) > COALESCE((SELECT SUM(points) FROM points_transactions WHERE is_positive = TRUE AND created_at BETWEEN previous_start_date AND previous_end_date), 0) THEN 'up'
            WHEN COALESCE(SUM(points), 0) < COALESCE((SELECT SUM(points) FROM points_transactions WHERE is_positive = TRUE AND created_at BETWEEN previous_start_date AND previous_end_date), 0) THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'points' AS category
    FROM points_transactions
    WHERE is_positive = TRUE
    AND created_at BETWEEN actual_start_date AND actual_end_date
    
    UNION ALL
    
    -- Average Points Per Student
    SELECT 
        'Average Points Per Student' AS metric_name,
        CASE 
            WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2)
            ELSE 0
        END AS metric_value,
        'value' AS display_type,
        (
            SELECT 
                CASE 
                    WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2)
                    ELSE 0
                END
            FROM points_transactions
            WHERE created_at BETWEEN previous_start_date AND previous_end_date
            AND user_id IN (SELECT id FROM users WHERE role_id = 1)
        ) AS comparison_value,
        CASE 
            WHEN CASE WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2) ELSE 0 END >
                 (SELECT CASE WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2) ELSE 0 END 
                  FROM points_transactions 
                  WHERE created_at BETWEEN previous_start_date AND previous_end_date
                  AND user_id IN (SELECT id FROM users WHERE role_id = 1))
                 THEN 'up'
            WHEN CASE WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2) ELSE 0 END <
                 (SELECT CASE WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(SUM(CASE WHEN is_positive THEN points ELSE -points END)::NUMERIC / COUNT(DISTINCT user_id), 2) ELSE 0 END 
                  FROM points_transactions 
                  WHERE created_at BETWEEN previous_start_date AND previous_end_date
                  AND user_id IN (SELECT id FROM users WHERE role_id = 1))
                 THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'points' AS category
    FROM points_transactions
    WHERE created_at BETWEEN actual_start_date AND actual_end_date
    AND user_id IN (SELECT id FROM users WHERE role_id = 1)
    
    UNION ALL
    
    -- Total Rewards Redeemed
    SELECT 
        'Total Rewards Redeemed' AS metric_name,
        COUNT(*)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COUNT(*)::NUMERIC 
            FROM reward_redemptions 
            WHERE created_at BETWEEN previous_start_date AND previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN COUNT(*) > (SELECT COUNT(*) FROM reward_redemptions WHERE created_at BETWEEN previous_start_date AND previous_end_date) THEN 'up'
            WHEN COUNT(*) < (SELECT COUNT(*) FROM reward_redemptions WHERE created_at BETWEEN previous_start_date AND previous_end_date) THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'rewards' AS category
    FROM reward_redemptions
    WHERE created_at BETWEEN actual_start_date AND actual_end_date
    
    UNION ALL
    
    -- Average Attendance Rate
    SELECT 
        'Average Attendance Rate' AS metric_name,
        ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS metric_value,
        'percentage' AS display_type,
        (
            SELECT ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)
            FROM attendance
            WHERE date BETWEEN previous_start_date AND previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) >
                 (SELECT ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)
                  FROM attendance
                  WHERE date BETWEEN previous_start_date AND previous_end_date)
                 THEN 'up'
            WHEN ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) <
                 (SELECT ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)
                  FROM attendance
                  WHERE date BETWEEN previous_start_date AND previous_end_date)
                 THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'attendance' AS category
    FROM attendance
    WHERE date BETWEEN actual_start_date AND actual_end_date
    
    UNION ALL
    
    -- Total Penalty Cards Issued
    SELECT 
        'Total Penalty Cards Issued' AS metric_name,
        COUNT(*)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COUNT(*)::NUMERIC 
            FROM user_penalty_cards 
            WHERE issued_at BETWEEN previous_start_date AND previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN COUNT(*) > (SELECT COUNT(*) FROM user_penalty_cards WHERE issued_at BETWEEN previous_start_date AND previous_end_date) THEN 'up'
            WHEN COUNT(*) < (SELECT COUNT(*) FROM user_penalty_cards WHERE issued_at BETWEEN previous_start_date AND previous_end_date) THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'discipline' AS category
    FROM user_penalty_cards
    WHERE issued_at BETWEEN actual_start_date AND actual_end_date
    
    UNION ALL
    
    -- New Users
    SELECT 
        'New Users' AS metric_name,
        COUNT(*)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COUNT(*)::NUMERIC 
            FROM users 
            WHERE created_at BETWEEN previous_start_date AND previous_end_date
        ) AS comparison_value,
        CASE 
            WHEN COUNT(*) > (SELECT COUNT(*) FROM users WHERE created_at BETWEEN previous_start_date AND previous_end_date) THEN 'up'
            WHEN COUNT(*) < (SELECT COUNT(*) FROM users WHERE created_at BETWEEN previous_start_date AND previous_end_date) THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'users' AS category
    FROM users
    WHERE created_at BETWEEN actual_start_date AND actual_end_date
    
    UNION ALL
    
    -- Active Teachers
    SELECT 
        'Active Teachers' AS metric_name,
        COUNT(DISTINCT created_by)::NUMERIC AS metric_value,
        'value' AS display_type,
        (
            SELECT COUNT(DISTINCT created_by)::NUMERIC 
            FROM points_transactions 
            WHERE created_at BETWEEN previous_start_date AND previous_end_date
            AND created_by IN (SELECT id FROM users WHERE role_id = 3)
        ) AS comparison_value,
        CASE 
            WHEN COUNT(DISTINCT created_by) > 
                 (SELECT COUNT(DISTINCT created_by) FROM points_transactions 
                  WHERE created_at BETWEEN previous_start_date AND previous_end_date
                  AND created_by IN (SELECT id FROM users WHERE role_id = 3))
                 THEN 'up'
            WHEN COUNT(DISTINCT created_by) < 
                 (SELECT COUNT(DISTINCT created_by) FROM points_transactions 
                  WHERE created_at BETWEEN previous_start_date AND previous_end_date
                  AND created_by IN (SELECT id FROM users WHERE role_id = 3))
                 THEN 'down'
            ELSE 'stable'
        END AS trend_direction,
        'users' AS category
    FROM points_transactions
    WHERE created_at BETWEEN actual_start_date AND actual_end_date
    AND created_by IN (SELECT id FROM users WHERE role_id = 3);
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('enhance-reporting-system.sql', 'Enhanced academic reporting')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: update-rewards-table.sql
-- Description: Role-specific rewards
-- Add role_id column to rewards table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN role_id INTEGER REFERENCES public.roles(id);
    RAISE NOTICE 'Added role_id column to rewards table';
  ELSE
    RAISE NOTICE 'role_id column already exists in rewards table';
  END IF;

  -- Add created_at and updated_at columns to rewards table if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to rewards table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to rewards table';
  END IF;
  
  -- Update existing rewards to set role_id to NULL (available to everyone)
  UPDATE public.rewards SET role_id = NULL WHERE role_id IS NULL;
  RAISE NOTICE 'Updated existing rewards to make them available to all roles';
END $$; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('update-rewards-table.sql', 'Role-specific rewards')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: complete-role-specific-rewards.sql
-- Description: Complete role-specific rewards system
-- Complete role-specific rewards implementation

-- First, ensure 'role_id' column exists in 'rewards' table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rewards' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.rewards ADD COLUMN role_id INTEGER REFERENCES public.roles(id);
    RAISE NOTICE 'Added role_id column to rewards table';
  END IF;
END $$;

-- Create a view to show available rewards for each role
CREATE OR REPLACE VIEW public.available_rewards_by_role AS
SELECT 
    r.id,
    r.name,
    r.description,
    r.points_cost,
    r.available_quantity,
    r.image_url,
    COALESCE(r.role_id, 0) AS role_id,
    ro.name AS role_name,
    r.created_at,
    r.updated_at
FROM 
    public.rewards r
LEFT JOIN 
    public.roles ro ON r.role_id = ro.id
WHERE 
    r.available_quantity > 0 OR r.available_quantity IS NULL
ORDER BY 
    r.role_id NULLS FIRST, r.points_cost;

-- Create function to get available rewards for a specific user based on their role
CREATE OR REPLACE FUNCTION get_available_rewards_for_user(user_id_param UUID)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    description TEXT,
    points_cost INTEGER,
    available_quantity INTEGER,
    image_url TEXT,
    role_id INTEGER,
    role_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_affordable BOOLEAN -- Whether user has enough points
) AS $$
DECLARE
    user_role_id INTEGER;
    user_points INTEGER;
BEGIN
    -- Get user's role and points
    SELECT u.role_id, COALESCE(get_user_points_balance(u.id), 0)
    INTO user_role_id, user_points
    FROM users u
    WHERE u.id = user_id_param;
    
    -- Return rewards available for this user
    RETURN QUERY
    SELECT 
        r.id,
        r.name::TEXT,
        r.description::TEXT,
        r.points_cost,
        r.available_quantity,
        r.image_url::TEXT,
        COALESCE(r.role_id, 0) AS role_id,
        ro.name::TEXT AS role_name,
        r.created_at,
        (user_points >= r.points_cost) AS is_affordable
    FROM 
        public.rewards r
    LEFT JOIN 
        public.roles ro ON r.role_id = ro.id
    WHERE 
        (r.available_quantity > 0 OR r.available_quantity IS NULL)
        AND (r.role_id IS NULL OR r.role_id = user_role_id)
    ORDER BY 
        r.points_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to redeem a reward, handling role restrictions
CREATE OR REPLACE FUNCTION redeem_reward(
    user_id_param UUID,
    reward_id_param INTEGER
) RETURNS INTEGER AS $$
DECLARE
    reward_record RECORD;
    user_record RECORD;
    user_points INTEGER;
    redemption_id INTEGER;
    new_quantity INTEGER;
BEGIN
    -- Get reward details
    SELECT * INTO reward_record
    FROM rewards
    WHERE id = reward_id_param;
    
    -- Check if reward exists
    IF reward_record.id IS NULL THEN
        RAISE EXCEPTION 'Reward not found';
    END IF;
    
    -- Get user details
    SELECT role_id INTO user_record
    FROM users
    WHERE id = user_id_param;
    
    -- Check role restriction
    IF reward_record.role_id IS NOT NULL AND reward_record.role_id != user_record.role_id THEN
        RAISE EXCEPTION 'This reward is not available for your role';
    END IF;
    
    -- Check if reward is available
    IF reward_record.available_quantity IS NOT NULL AND reward_record.available_quantity <= 0 THEN
        RAISE EXCEPTION 'This reward is out of stock';
    END IF;
    
    -- Get user points
    SELECT get_user_points_balance(user_id_param) INTO user_points;
    
    -- Check if user has enough points
    IF user_points < reward_record.points_cost THEN
        RAISE EXCEPTION 'Not enough points to redeem this reward. Required: %, Available: %', 
            reward_record.points_cost, user_points;
    END IF;
    
    -- Create redemption record
    INSERT INTO reward_redemptions (
        user_id,
        reward_id,
        points_spent,
        status,
        created_at
    ) VALUES (
        user_id_param,
        reward_id_param,
        reward_record.points_cost,
        'pending',
        CURRENT_TIMESTAMP
    ) RETURNING id INTO redemption_id;
    
    -- Create negative points transaction for the redemption
    INSERT INTO points_transactions (
        user_id,
        points,
        is_positive,
        description,
        created_by,
        created_at
    ) VALUES (
        user_id_param,
        reward_record.points_cost,
        FALSE,
        'Redemption of reward: ' || reward_record.name,
        user_id_param,
        CURRENT_TIMESTAMP
    );
    
    -- Update reward quantity if applicable
    IF reward_record.available_quantity IS NOT NULL THEN
        new_quantity := GREATEST(0, reward_record.available_quantity - 1);
        
        UPDATE rewards
        SET available_quantity = new_quantity
        WHERE id = reward_id_param;
    END IF;
    
    -- Create notification for user
    INSERT INTO notifications (
        user_id,
        title,
        content,
        created_at
    ) VALUES (
        user_id_param,
        'Reward Redemption',
        'You have redeemed the reward: ' || reward_record.name || ' for ' || reward_record.points_cost || ' points',
        CURRENT_TIMESTAMP
    );
    
    -- Create notification for admins
    INSERT INTO notifications (
        user_id,
        title,
        content,
        created_at
    )
    SELECT 
        u.id,
        'New Reward Redemption',
        'User ' || (SELECT full_name FROM users WHERE id = user_id_param) || 
        ' has redeemed the reward: ' || reward_record.name,
        CURRENT_TIMESTAMP
    FROM 
        users u
    WHERE 
        u.role_id = 4; -- Admin role
    
    -- Record in activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        user_id_param,
        'REWARD_REDEMPTION',
        'Redeemed reward ID: ' || reward_id_param || ' (' || reward_record.name || ') for ' || reward_record.points_cost || ' points'
    );
    
    RETURN redemption_id;
END;
$$ LANGUAGE plpgsql;

-- Function for admins to update the status of a redemption
CREATE OR REPLACE FUNCTION update_redemption_status(
    redemption_id_param INTEGER,
    status_param TEXT,
    admin_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    redemption_record RECORD;
BEGIN
    -- Validate status
    IF status_param NOT IN ('pending', 'completed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: pending, completed, rejected';
    END IF;
    
    -- Get redemption record
    SELECT * INTO redemption_record
    FROM reward_redemptions
    WHERE id = redemption_id_param;
    
    -- Check if redemption exists
    IF redemption_record.id IS NULL THEN
        RAISE EXCEPTION 'Redemption not found';
    END IF;
    
    -- Update status
    UPDATE reward_redemptions
    SET 
        status = status_param,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        id = redemption_id_param;
    
    -- If rejected, refund points
    IF status_param = 'rejected' THEN
        -- Add back points
        INSERT INTO points_transactions (
            user_id,
            points,
            is_positive,
            description,
            created_by,
            created_at
        ) VALUES (
            redemption_record.user_id,
            redemption_record.points_spent,
            TRUE,
            'Refund for rejected reward redemption: ' || redemption_id_param,
            admin_id_param,
            CURRENT_TIMESTAMP
        );
        
        -- Return item to inventory if applicable
        UPDATE rewards r
        SET available_quantity = COALESCE(r.available_quantity, 0) + 1
        FROM reward_redemptions rr
        WHERE rr.id = redemption_id_param AND r.id = rr.reward_id
        AND r.available_quantity IS NOT NULL;
        
        -- Create notification for user
        INSERT INTO notifications (
            user_id,
            title,
            content,
            created_at
        ) VALUES (
            redemption_record.user_id,
            'Redemption Rejected',
            'Your reward redemption has been rejected. ' || redemption_record.points_spent || ' points have been refunded to your account.',
            CURRENT_TIMESTAMP
        );
    ELSIF status_param = 'completed' THEN
        -- Create notification for user
        INSERT INTO notifications (
            user_id,
            title,
            content,
            created_at
        ) VALUES (
            redemption_record.user_id,
            'Redemption Completed',
            'Your reward redemption has been processed and completed.',
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Record in activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'UPDATE_REDEMPTION_STATUS',
        'Updated redemption ID: ' || redemption_id_param || ' status to ' || status_param
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to migrate existing rewards
CREATE OR REPLACE FUNCTION migrate_existing_rewards()
RETURNS INTEGER AS $$
DECLARE
    student_role_id INTEGER;
    parent_role_id INTEGER;
    teacher_role_id INTEGER;
    admin_role_id INTEGER;
    migrated_count INTEGER := 0;
    default_role_id INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO student_role_id FROM roles WHERE code = 'ST' LIMIT 1;
    SELECT id INTO parent_role_id FROM roles WHERE code = 'PA' LIMIT 1;
    SELECT id INTO teacher_role_id FROM roles WHERE code = 'TE' LIMIT 1;
    SELECT id INTO admin_role_id FROM roles WHERE code = 'PR' LIMIT 1;
    
    -- Set default role to student if found
    default_role_id := student_role_id;
    
    -- Only update rewards with NULL role_id
    UPDATE rewards
    SET role_id = default_role_id
    WHERE role_id IS NULL;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Apply migration to existing rewards (comment out if not needed)
-- SELECT migrate_existing_rewards(); 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('complete-role-specific-rewards.sql', 'Complete role-specific rewards system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-penalty-cards-system.sql
-- Description: Penalty cards system
-- Create penalty card system tables and functions

-- Penalty card types table to store the different card colors and their properties
CREATE TABLE IF NOT EXISTS public.penalty_card_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT,
    negative_categories_threshold INTEGER NOT NULL, -- Number of negative categories triggering this card
    deduction_percentage INTEGER NOT NULL, -- Percentage of points to deduct when card is issued
    duration_days INTEGER NOT NULL, -- Duration in days the card remains active
    is_reset_card BOOLEAN DEFAULT FALSE, -- Whether this card causes account reset (red card)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User penalty cards table to track cards assigned to users
CREATE TABLE IF NOT EXISTS public.user_penalty_cards (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    card_type_id INTEGER NOT NULL REFERENCES public.penalty_card_types(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    points_before INTEGER NOT NULL, -- User's points before deduction
    points_after INTEGER NOT NULL, -- User's points after deduction
    deduction_amount INTEGER NOT NULL, -- Actual points deducted
    custom_message TEXT, -- Optional custom message from admin
    created_by UUID NOT NULL REFERENCES public.users(id), -- Admin who issued or system if automatic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Negative category links to track which negative categories triggered a card
CREATE TABLE IF NOT EXISTS public.card_negative_categories (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES public.user_penalty_cards(id),
    category_id INTEGER NOT NULL REFERENCES public.point_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default card types
INSERT INTO public.penalty_card_types 
(name, color, description, negative_categories_threshold, deduction_percentage, duration_days, is_reset_card)
VALUES
('White Card', 'white', 'First level warning for accumulating negative points', 3, 15, 3, FALSE),
('Yellow Card', 'yellow', 'Second level warning with increased penalty', 6, 30, 7, FALSE),
('Orange Card', 'orange', 'Serious warning before final card', 12, 25, 15, FALSE),
('Red Card', 'red', 'Final warning resulting in account reset', 20, 30, 0, TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_penalty_cards_user_id ON public.user_penalty_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_penalty_cards_is_active ON public.user_penalty_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_user_penalty_cards_expires_at ON public.user_penalty_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_card_negative_categories_card_id ON public.card_negative_categories(card_id);
CREATE INDEX IF NOT EXISTS idx_card_negative_categories_category_id ON public.card_negative_categories(category_id);

-- Function to check if a user should receive a penalty card based on negative categories count
CREATE OR REPLACE FUNCTION check_user_penalty_card_eligibility(user_id_param UUID)
RETURNS TABLE (
    card_type_id INTEGER,
    negative_categories_count INTEGER
) AS $$
DECLARE
    negative_categories_count INTEGER;
BEGIN
    -- Count distinct negative categories for this user
    SELECT COUNT(DISTINCT pt.category_id) INTO negative_categories_count
    FROM points_transactions pt
    JOIN point_categories pc ON pt.category_id = pc.id
    WHERE pt.user_id = user_id_param 
    AND pc.is_positive = FALSE
    AND pt.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');
    
    -- Find the highest card type that applies
    RETURN QUERY
    SELECT pct.id, negative_categories_count
    FROM penalty_card_types pct
    WHERE pct.negative_categories_threshold <= negative_categories_count
    ORDER BY pct.negative_categories_threshold DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to issue a penalty card to a user
CREATE OR REPLACE FUNCTION issue_penalty_card(
    user_id_param UUID,
    card_type_id_param INTEGER,
    admin_id_param UUID,
    custom_message_param TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    card_type_record RECORD;
    user_points INTEGER;
    deduction_amount INTEGER;
    points_after INTEGER;
    new_card_id INTEGER;
    is_reset_card BOOLEAN;
BEGIN
    -- Get card type details
    SELECT * INTO card_type_record
    FROM penalty_card_types
    WHERE id = card_type_id_param;
    
    -- Calculate current user points
    SELECT get_user_points_balance(user_id_param) INTO user_points;
    
    -- Calculate deduction amount
    deduction_amount := GREATEST(0, (user_points * card_type_record.deduction_percentage / 100)::INTEGER);
    points_after := user_points - deduction_amount;
    is_reset_card := card_type_record.is_reset_card;
    
    -- For red card, reset points to zero
    IF is_reset_card THEN
        points_after := 0;
        deduction_amount := user_points;
    END IF;
    
    -- Insert the penalty card record
    INSERT INTO user_penalty_cards (
        user_id,
        card_type_id,
        issued_at,
        expires_at,
        is_active,
        points_before,
        points_after,
        deduction_amount,
        custom_message,
        created_by
    ) VALUES (
        user_id_param,
        card_type_id_param,
        CURRENT_TIMESTAMP,
        CASE WHEN is_reset_card 
            THEN CURRENT_TIMESTAMP -- For red card, no expiration
            ELSE CURRENT_TIMESTAMP + (card_type_record.duration_days || ' days')::INTERVAL 
        END,
        TRUE,
        user_points,
        points_after,
        deduction_amount,
        custom_message_param,
        admin_id_param
    ) RETURNING id INTO new_card_id;
    
    -- Record the negative points transaction
    INSERT INTO points_transactions (
        user_id,
        points,
        is_positive,
        description,
        created_by,
        created_at
    ) VALUES (
        user_id_param,
        deduction_amount,
        FALSE,
        'Penalty card deduction: ' || card_type_record.name,
        admin_id_param,
        CURRENT_TIMESTAMP
    );
    
    -- Link all user's negative categories to this card
    INSERT INTO card_negative_categories (card_id, category_id)
    SELECT new_card_id, pt.category_id
    FROM points_transactions pt
    JOIN point_categories pc ON pt.category_id = pc.id
    WHERE pt.user_id = user_id_param 
    AND pc.is_positive = FALSE
    AND pt.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');
    
    -- Add notification for the user
    INSERT INTO notifications (
        user_id,
        title,
        content,
        created_at
    ) VALUES (
        user_id_param,
        'Penalty Card Issued: ' || card_type_record.name,
        COALESCE(custom_message_param, 'You have received a ' || card_type_record.name || ' penalty card due to accumulating too many negative points.'),
        CURRENT_TIMESTAMP
    );
    
    -- Add activity log entry
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'PENALTY_CARD_ISSUED',
        'Issued ' || card_type_record.name || ' to user ID: ' || user_id_param
    );
    
    RETURN new_card_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically check and issue penalty cards for all users
CREATE OR REPLACE FUNCTION auto_check_penalty_cards(admin_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    users_checked INTEGER := 0;
    users_with_cards INTEGER := 0;
    user_record RECORD;
    card_check RECORD;
    existing_card RECORD;
BEGIN
    -- Iterate through all users
    FOR user_record IN 
        SELECT id FROM users WHERE role_id IN (1, 2, 3) -- Students, Parents, Teachers
    LOOP
        users_checked := users_checked + 1;
        
        -- Check if eligible for a card
        SELECT * INTO card_check 
        FROM check_user_penalty_card_eligibility(user_record.id);
        
        IF card_check.card_type_id IS NOT NULL THEN
            -- Check if user already has an active card of this type or higher
            SELECT * INTO existing_card
            FROM user_penalty_cards upc
            JOIN penalty_card_types pct ON upc.card_type_id = pct.id
            WHERE upc.user_id = user_record.id
            AND upc.is_active = TRUE
            AND pct.negative_categories_threshold >= (
                SELECT negative_categories_threshold 
                FROM penalty_card_types 
                WHERE id = card_check.card_type_id
            )
            LIMIT 1;
            
            -- If no existing card found, issue a new one
            IF existing_card.id IS NULL THEN
                PERFORM issue_penalty_card(
                    user_record.id,
                    card_check.card_type_id,
                    admin_id_param,
                    'Automatic penalty card issued due to accumulating ' || 
                    card_check.negative_categories_count || ' negative categories.'
                );
                users_with_cards := users_with_cards + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Create activity log for batch operation
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'AUTO_PENALTY_CARDS',
        'Automatic penalty card check: ' || users_with_cards || ' cards issued out of ' || users_checked || ' users checked.'
    );
    
    RETURN users_with_cards;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old penalty cards
CREATE OR REPLACE FUNCTION expire_penalty_cards()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE user_penalty_cards
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE is_active = TRUE
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically check for penalty cards when negative points are added
CREATE OR REPLACE FUNCTION check_penalty_card_after_negative_points()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Only proceed if this is a negative points transaction
    IF NEW.is_positive = FALSE THEN
        -- Get a system admin ID to use as the creator
        SELECT id INTO admin_id
        FROM users
        WHERE role_id = 4 -- Admin role
        LIMIT 1;
        
        -- If no admin found, use the transaction creator
        IF admin_id IS NULL THEN
            admin_id := NEW.created_by;
        END IF;
        
        -- Check if user should receive a penalty card
        PERFORM auto_check_penalty_cards(admin_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on points_transactions
CREATE TRIGGER trigger_check_penalty_card_after_negative_points
AFTER INSERT ON points_transactions
FOR EACH ROW
EXECUTE FUNCTION check_penalty_card_after_negative_points(); 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-penalty-cards-system.sql', 'Penalty cards system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: create-points-payment-system.sql
-- Description: Points payment system
-- Create points payment system

-- Add is_payable and payment_restricted flags to point_categories table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_categories'
        AND column_name = 'is_payable'
    ) THEN
        ALTER TABLE public.point_categories ADD COLUMN is_payable BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_payable column to point_categories table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_categories'
        AND column_name = 'payment_restricted'
    ) THEN
        ALTER TABLE public.point_categories ADD COLUMN payment_restricted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added payment_restricted column to point_categories table';
    END IF;
END $$;

-- Create table for negative point payments
CREATE TABLE IF NOT EXISTS public.negative_point_payments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    points_paid INTEGER NOT NULL,
    transaction_id INTEGER REFERENCES public.points_transactions(id),
    category_id INTEGER REFERENCES public.point_categories(id),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('FULL', 'PARTIAL', 'CATEGORY_SPECIFIC')),
    payment_status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    admin_approval_id UUID REFERENCES public.users(id),
    admin_approval_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for payment restrictions
CREATE TABLE IF NOT EXISTS public.payment_restrictions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES public.point_categories(id),
    restriction_reason TEXT NOT NULL,
    can_be_lifted BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_negative_point_payments_user_id ON public.negative_point_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_negative_point_payments_category_id ON public.negative_point_payments(category_id);
CREATE INDEX IF NOT EXISTS idx_negative_point_payments_payment_status ON public.negative_point_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_restrictions_category_id ON public.payment_restrictions(category_id);

-- Function to get negative points by category for a user
CREATE OR REPLACE FUNCTION get_negative_points_by_category(user_id_param UUID)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    points INTEGER,
    is_payable BOOLEAN,
    payment_restricted BOOLEAN,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id AS category_id,
        pc.name::TEXT AS category_name,
        SUM(pt.points)::INTEGER AS points,
        pc.is_payable,
        pc.payment_restricted,
        pc.description::TEXT
    FROM 
        points_transactions pt
    JOIN 
        point_categories pc ON pt.category_id = pc.id
    WHERE 
        pt.user_id = user_id_param
        AND pt.is_positive = FALSE
    GROUP BY 
        pc.id, pc.name, pc.is_payable, pc.payment_restricted, pc.description
    ORDER BY 
        points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get total negative points for a user
CREATE OR REPLACE FUNCTION get_user_negative_points_total(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    total_negative INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(points), 0) INTO total_negative
    FROM 
        points_transactions
    WHERE 
        user_id = user_id_param
        AND is_positive = FALSE;
    
    RETURN total_negative;
END;
$$ LANGUAGE plpgsql;

-- Function to pay all negative points (mandatory payment)
CREATE OR REPLACE FUNCTION pay_all_negative_points(
    user_id_param UUID,
    admin_id_param UUID,
    notes_param TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    total_negative INTEGER;
    user_balance INTEGER;
    payment_transaction_id INTEGER;
    payment_id INTEGER;
    has_restricted BOOLEAN := FALSE;
BEGIN
    -- Check if user has restricted categories
    SELECT EXISTS (
        SELECT 1 FROM points_transactions pt
        JOIN point_categories pc ON pt.category_id = pc.id
        WHERE pt.user_id = user_id_param
          AND pt.is_positive = FALSE
          AND pc.payment_restricted = TRUE
    ) INTO has_restricted;
    
    -- If restricted categories exist, admin must override
    IF has_restricted AND admin_id_param IS NULL THEN
        RAISE EXCEPTION 'User has restricted negative categories that require admin approval';
    END IF;
    
    -- Get total negative points
    SELECT get_user_negative_points_total(user_id_param) INTO total_negative;
    
    -- Get current user balance
    SELECT get_user_points_balance(user_id_param) INTO user_balance;
    
    -- Check if user has enough positive points to pay
    IF user_balance < total_negative THEN
        RAISE EXCEPTION 'User does not have enough points to pay all negative points';
    END IF;
    
    -- Create payment transaction
    INSERT INTO points_transactions (
        user_id,
        points,
        is_positive,
        description,
        created_by
    ) VALUES (
        user_id_param,
        total_negative,
        FALSE,
        'Payment of all negative points',
        COALESCE(admin_id_param, user_id_param)
    ) RETURNING id INTO payment_transaction_id;
    
    -- Record the payment
    INSERT INTO negative_point_payments (
        user_id,
        points_paid,
        transaction_id,
        payment_type,
        payment_status,
        admin_approval_id,
        admin_approval_at,
        notes
    ) VALUES (
        user_id_param,
        total_negative,
        payment_transaction_id,
        'FULL',
        CASE WHEN admin_id_param IS NOT NULL THEN 'COMPLETED' ELSE 'PENDING' END,
        admin_id_param,
        CASE WHEN admin_id_param IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
        notes_param
    ) RETURNING id INTO payment_id;
    
    -- Add notification
    INSERT INTO notifications (
        user_id,
        title,
        content
    ) VALUES (
        user_id_param,
        'Negative Points Payment',
        'You have paid ' || total_negative || ' points to clear all your negative points.'
    );
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        COALESCE(admin_id_param, user_id_param),
        'NEGATIVE_POINTS_PAYMENT',
        'Full payment of ' || total_negative || ' negative points for user ID: ' || user_id_param
    );
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to pay specific negative category
CREATE OR REPLACE FUNCTION pay_negative_category(
    user_id_param UUID,
    category_id_param INTEGER,
    admin_id_param UUID DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    category_points INTEGER;
    user_balance INTEGER;
    is_restricted BOOLEAN;
    payment_transaction_id INTEGER;
    payment_id INTEGER;
    category_name TEXT;
BEGIN
    -- Check if category exists and get details
    SELECT 
        pc.name,
        pc.payment_restricted,
        COALESCE(SUM(pt.points), 0)
    INTO 
        category_name,
        is_restricted,
        category_points
    FROM 
        point_categories pc
    LEFT JOIN 
        points_transactions pt ON pc.id = pt.category_id AND pt.user_id = user_id_param AND pt.is_positive = FALSE
    WHERE 
        pc.id = category_id_param
    GROUP BY 
        pc.id, pc.name, pc.payment_restricted;
    
    -- If category not found
    IF category_name IS NULL THEN
        RAISE EXCEPTION 'Category not found';
    END IF;
    
    -- If category is restricted and no admin provided
    IF is_restricted AND admin_id_param IS NULL THEN
        RAISE EXCEPTION 'This category requires admin approval for payment';
    END IF;
    
    -- If no points to pay
    IF category_points = 0 THEN
        RAISE EXCEPTION 'No negative points in this category to pay';
    END IF;
    
    -- Get current user balance
    SELECT get_user_points_balance(user_id_param) INTO user_balance;
    
    -- Check if user has enough points
    IF user_balance < category_points THEN
        RAISE EXCEPTION 'User does not have enough points to pay for this category';
    END IF;
    
    -- Create payment transaction
    INSERT INTO points_transactions (
        user_id,
        category_id,
        points,
        is_positive,
        description,
        created_by
    ) VALUES (
        user_id_param,
        category_id_param,
        category_points,
        FALSE,
        'Payment for negative points in category: ' || category_name,
        COALESCE(admin_id_param, user_id_param)
    ) RETURNING id INTO payment_transaction_id;
    
    -- Record the payment
    INSERT INTO negative_point_payments (
        user_id,
        points_paid,
        transaction_id,
        category_id,
        payment_type,
        payment_status,
        admin_approval_id,
        admin_approval_at,
        notes
    ) VALUES (
        user_id_param,
        category_points,
        payment_transaction_id,
        category_id_param,
        'CATEGORY_SPECIFIC',
        CASE WHEN admin_id_param IS NOT NULL OR NOT is_restricted THEN 'COMPLETED' ELSE 'PENDING' END,
        admin_id_param,
        CASE WHEN admin_id_param IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
        notes_param
    ) RETURNING id INTO payment_id;
    
    -- Add notification
    INSERT INTO notifications (
        user_id,
        title,
        content
    ) VALUES (
        user_id_param,
        'Category Payment',
        'You have paid ' || category_points || ' points to clear negative points in category: ' || category_name
    );
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        COALESCE(admin_id_param, user_id_param),
        'CATEGORY_PAYMENT',
        'Payment of ' || category_points || ' points for category ' || category_name || ' for user ID: ' || user_id_param
    );
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to pay partial negative points
CREATE OR REPLACE FUNCTION pay_partial_negative_points(
    user_id_param UUID,
    points_amount INTEGER,
    admin_id_param UUID DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    total_negative INTEGER;
    user_balance INTEGER;
    payment_amount INTEGER;
    payment_transaction_id INTEGER;
    payment_id INTEGER;
BEGIN
    -- Get total negative points
    SELECT get_user_negative_points_total(user_id_param) INTO total_negative;
    
    -- If no negative points
    IF total_negative = 0 THEN
        RAISE EXCEPTION 'User has no negative points to pay';
    END IF;
    
    -- Calculate payment amount (cannot exceed total negative)
    payment_amount := LEAST(points_amount, total_negative);
    
    -- Get current user balance
    SELECT get_user_points_balance(user_id_param) INTO user_balance;
    
    -- Check if user has enough points
    IF user_balance < payment_amount THEN
        RAISE EXCEPTION 'User does not have enough points to make this payment';
    END IF;
    
    -- Create payment transaction
    INSERT INTO points_transactions (
        user_id,
        points,
        is_positive,
        description,
        created_by
    ) VALUES (
        user_id_param,
        payment_amount,
        FALSE,
        'Partial payment of negative points',
        COALESCE(admin_id_param, user_id_param)
    ) RETURNING id INTO payment_transaction_id;
    
    -- Record the payment
    INSERT INTO negative_point_payments (
        user_id,
        points_paid,
        transaction_id,
        payment_type,
        payment_status,
        admin_approval_id,
        admin_approval_at,
        notes
    ) VALUES (
        user_id_param,
        payment_amount,
        payment_transaction_id,
        'PARTIAL',
        'COMPLETED', -- Partial payments don't need approval
        admin_id_param,
        CASE WHEN admin_id_param IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
        notes_param
    ) RETURNING id INTO payment_id;
    
    -- Add notification
    INSERT INTO notifications (
        user_id,
        title,
        content
    ) VALUES (
        user_id_param,
        'Partial Payment',
        'You have made a partial payment of ' || payment_amount || ' points toward your negative points.'
    );
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        COALESCE(admin_id_param, user_id_param),
        'PARTIAL_PAYMENT',
        'Partial payment of ' || payment_amount || ' out of ' || total_negative || ' negative points for user ID: ' || user_id_param
    );
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function for admins to approve pending payments
CREATE OR REPLACE FUNCTION approve_pending_payment(
    payment_id_param INTEGER,
    admin_id_param UUID,
    notes_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    payment_record RECORD;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM negative_point_payments
    WHERE id = payment_id_param;
    
    -- Check if payment exists
    IF payment_record.id IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Check if payment is pending
    IF payment_record.payment_status != 'PENDING' THEN
        RAISE EXCEPTION 'Payment is not in pending status';
    END IF;
    
    -- Update payment status
    UPDATE negative_point_payments
    SET payment_status = 'COMPLETED',
        admin_approval_id = admin_id_param,
        admin_approval_at = CURRENT_TIMESTAMP,
        notes = COALESCE(notes_param, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = payment_id_param;
    
    -- Add notification
    INSERT INTO notifications (
        user_id,
        title,
        content
    ) VALUES (
        payment_record.user_id,
        'Payment Approved',
        'Your payment of ' || payment_record.points_paid || ' points has been approved by an administrator.'
    );
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'PAYMENT_APPROVAL',
        'Approved payment ID: ' || payment_id_param || ' for user ID: ' || payment_record.user_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function for admins to reject pending payments
CREATE OR REPLACE FUNCTION reject_pending_payment(
    payment_id_param INTEGER,
    admin_id_param UUID,
    rejection_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    payment_record RECORD;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM negative_point_payments
    WHERE id = payment_id_param;
    
    -- Check if payment exists
    IF payment_record.id IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Check if payment is pending
    IF payment_record.payment_status != 'PENDING' THEN
        RAISE EXCEPTION 'Payment is not in pending status';
    END IF;
    
    -- Update payment status
    UPDATE negative_point_payments
    SET payment_status = 'REJECTED',
        admin_approval_id = admin_id_param,
        admin_approval_at = CURRENT_TIMESTAMP,
        notes = rejection_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = payment_id_param;
    
    -- Reverse the transaction
    UPDATE points_transactions
    SET is_positive = TRUE,
        description = description || ' (REVERSED: ' || rejection_reason || ')'
    WHERE id = payment_record.transaction_id;
    
    -- Add notification
    INSERT INTO notifications (
        user_id,
        title,
        content
    ) VALUES (
        payment_record.user_id,
        'Payment Rejected',
        'Your payment of ' || payment_record.points_paid || ' points has been rejected. Reason: ' || rejection_reason
    );
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'PAYMENT_REJECTION',
        'Rejected payment ID: ' || payment_id_param || ' for user ID: ' || payment_record.user_id || '. Reason: ' || rejection_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to set payment restrictions on categories
CREATE OR REPLACE FUNCTION set_category_payment_restriction(
    category_id_param INTEGER,
    admin_id_param UUID,
    restriction_reason TEXT,
    can_be_lifted_param BOOLEAN DEFAULT TRUE
) RETURNS INTEGER AS $$
DECLARE
    restriction_id INTEGER;
BEGIN
    -- Update the category
    UPDATE point_categories
    SET payment_restricted = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = category_id_param;
    
    -- Insert restriction record
    INSERT INTO payment_restrictions (
        category_id,
        restriction_reason,
        can_be_lifted,
        created_by
    ) VALUES (
        category_id_param,
        restriction_reason,
        can_be_lifted_param,
        admin_id_param
    ) RETURNING id INTO restriction_id;
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'PAYMENT_RESTRICTION',
        'Set payment restriction on category ID: ' || category_id_param || '. Reason: ' || restriction_reason
    );
    
    RETURN restriction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to lift payment restrictions on categories
CREATE OR REPLACE FUNCTION lift_category_payment_restriction(
    category_id_param INTEGER,
    admin_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    can_lift BOOLEAN;
BEGIN
    -- Check if restriction can be lifted
    SELECT can_be_lifted INTO can_lift
    FROM payment_restrictions
    WHERE category_id = category_id_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT can_lift THEN
        RAISE EXCEPTION 'This payment restriction cannot be lifted';
    END IF;
    
    -- Update the category
    UPDATE point_categories
    SET payment_restricted = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = category_id_param;
    
    -- Add activity log
    INSERT INTO activity_log (
        user_id,
        action_type,
        description
    ) VALUES (
        admin_id_param,
        'PAYMENT_RESTRICTION_LIFTED',
        'Lifted payment restriction on category ID: ' || category_id_param
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('create-points-payment-system.sql', 'Points payment system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: fix-ambiguous-column-references.sql
-- Description: Fix column ambiguity
-- Fix for calculate_user_points function
CREATE OR REPLACE FUNCTION calculate_user_points(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    positive_points INTEGER;
    negative_points INTEGER;
BEGIN
    -- Get positive points
    SELECT COALESCE(SUM(points), 0) INTO positive_points
    FROM points_transactions
    WHERE points_transactions.user_id = calculate_user_points.user_id AND is_positive = TRUE;
    
    -- Get negative points
    SELECT COALESCE(SUM(points), 0) INTO negative_points
    FROM points_transactions
    WHERE points_transactions.user_id = calculate_user_points.user_id AND is_positive = FALSE;
    
    -- Return net points
    RETURN positive_points - negative_points;
END;
$$ LANGUAGE plpgsql;

-- Fix for get_points_by_category function
CREATE OR REPLACE FUNCTION get_points_by_category(user_id_param UUID)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    is_positive BOOLEAN,
    total_points BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id AS category_id,
        pc.name AS category_name,
        pt.is_positive,
        COALESCE(SUM(pt.points), 0) AS total_points
    FROM 
        points_transactions pt
    LEFT JOIN 
        point_categories pc ON pt.category_id = pc.id
    WHERE 
        pt.user_id = user_id_param
    GROUP BY 
        pc.id, pc.name, pt.is_positive
    ORDER BY 
        pt.is_positive DESC, total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Fix for get_points_by_month function
CREATE OR REPLACE FUNCTION get_points_by_month(user_id_param UUID, months_count INTEGER DEFAULT 6)
RETURNS TABLE (
    month TEXT,
    positive_points BIGINT,
    negative_points BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT TO_CHAR(date_trunc('month', current_date - (n || ' month')::INTERVAL), 'YYYY-MM') AS month
        FROM generate_series(0, months_count - 1) AS n
    ),
    positive AS (
        SELECT 
            TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(points), 0) AS points
        FROM 
            points_transactions
        WHERE 
            points_transactions.user_id = user_id_param AND is_positive = TRUE
        GROUP BY 
            month
    ),
    negative AS (
        SELECT 
            TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(points), 0) AS points
        FROM 
            points_transactions
        WHERE 
            points_transactions.user_id = user_id_param AND is_positive = FALSE
        GROUP BY 
            month
    )
    SELECT 
        m.month,
        COALESCE(p.points, 0) AS positive_points,
        COALESCE(n.points, 0) AS negative_points
    FROM 
        months m
    LEFT JOIN 
        positive p ON m.month = p.month
    LEFT JOIN 
        negative n ON m.month = n.month
    ORDER BY 
        m.month;
END;
$$ LANGUAGE plpgsql;

-- Fix for get_user_rank function
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_points AS (
        SELECT 
            u.id,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS total_points
        FROM 
            users u
        LEFT JOIN 
            points_transactions pt ON u.id = pt.user_id
        WHERE 
            u.role_id = 1 -- Student role
        GROUP BY 
            u.id
    ),
    ranked_users AS (
        SELECT 
            id,
            RANK() OVER (ORDER BY total_points DESC) AS rank
        FROM 
            user_points
    )
    SELECT 
        user_id_param,
        rank
    FROM 
        ranked_users
    WHERE 
        id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Fix for get_leaderboard function
CREATE OR REPLACE FUNCTION get_leaderboard(time_period TEXT DEFAULT 'month', results_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    user_code TEXT,
    avatar_url TEXT,
    total_points BIGINT,
    rank BIGINT
) AS $$
DECLARE
    start_date TIMESTAMP;
BEGIN
    -- Determine the start date based on the time period
    IF time_period = 'week' THEN
        start_date := date_trunc('week', current_date);
    ELSIF time_period = 'month' THEN
        start_date := date_trunc('month', current_date);
    ELSIF time_period = 'year' THEN
        start_date := date_trunc('year', current_date);
    ELSE
        start_date := '1970-01-01'::TIMESTAMP; -- 'all' time
    END IF;

    RETURN QUERY
    WITH user_points AS (
        SELECT 
            u.id,
            u.full_name,
            u.user_code,
            u.avatar_url,
            COALESCE(SUM(CASE WHEN pt.is_positive THEN pt.points ELSE -pt.points END), 0) AS total_points
        FROM 
            users u
        LEFT JOIN 
            points_transactions pt ON u.id = pt.user_id AND pt.created_at >= start_date
        WHERE 
            u.role_id = 1 -- Student role
        GROUP BY 
            u.id, u.full_name, u.user_code, u.avatar_url
    )
    SELECT 
        up.id,
        up.full_name,
        up.user_code,
        up.avatar_url,
        up.total_points,
        RANK() OVER (ORDER BY up.total_points DESC) AS rank
    FROM 
        user_points up
    ORDER BY 
        rank ASC
    LIMIT 
        results_limit;
END;
$$ LANGUAGE plpgsql;


-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('fix-ambiguous-column-references.sql', 'Fix column ambiguity')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: fix-points-functions.sql
-- Description: Fix points calculation
-- Fix missing database functions for points calculations

-- Function to get points by category for a user
CREATE OR REPLACE FUNCTION get_points_by_category(user_id_param UUID)
RETURNS TABLE (
  category_id INT,
  category_name TEXT,
  total_points BIGINT,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id AS category_id,
    pc.name::TEXT AS category_name,
    SUM(pt.points)::BIGINT AS total_points,
    pt.is_positive
  FROM 
    points_transactions pt
  LEFT JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.user_id = user_id_param
  GROUP BY 
    pc.id, pc.name, pt.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(
      SUM(
        CASE 
          WHEN is_positive THEN points 
          ELSE -points 
        END
      ), 0
    ) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = user_id_param;
    
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get student total points for leaderboard
CREATE OR REPLACE FUNCTION get_student_total_points()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.full_name::TEXT,
    COALESCE(
      SUM(
        CASE 
          WHEN pt.is_positive THEN pt.points 
          ELSE -pt.points 
        END
      ), 0
    )::INTEGER AS total_points
  FROM 
    users u
  LEFT JOIN 
    points_transactions pt ON u.id = pt.user_id
  WHERE 
    u.role_id = 1 -- Only students
  GROUP BY 
    u.id, u.full_name
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate points within a period
CREATE OR REPLACE FUNCTION calculate_user_points(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  positive_points INTEGER;
  negative_points INTEGER;
  total_points INTEGER;
BEGIN
  -- Get positive points
  SELECT COALESCE(SUM(points), 0) INTO positive_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = true;
  
  -- Get negative points
  SELECT COALESCE(SUM(points), 0) INTO negative_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = false;
  
  -- Calculate total points
  total_points := positive_points - negative_points;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('fix-points-functions.sql', 'Fix points calculation')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: fix-user-rank.sql
-- Description: Fix user ranking
-- Function to calculate user rank among students
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.id,
      COALESCE(
        SUM(
          CASE 
            WHEN pt.is_positive THEN pt.points 
            ELSE -pt.points 
          END
        ), 0
      )::BIGINT AS total_points
    FROM 
      users u
    LEFT JOIN 
      points_transactions pt ON u.id = pt.user_id
    WHERE 
      u.role_id = 1 -- Student role
    GROUP BY 
      u.id
  ),
  ranked_users AS (
    SELECT 
      id,
      RANK() OVER (ORDER BY total_points DESC)::BIGINT AS rank
    FROM 
      user_points
  )
  SELECT 
    user_id_param AS user_id,
    COALESCE(ru.rank, 0)::BIGINT AS rank
  FROM 
    ranked_users ru
  WHERE 
    ru.id = user_id_param;
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('fix-user-rank.sql', 'Fix user ranking')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: fix-monthly-points.sql
-- Description: Fix monthly points report
-- Function to get points by month for a user
CREATE OR REPLACE FUNCTION get_points_by_month(
  user_id_param UUID,
  months_count INT DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  year INT,
  positive_points BIGINT,
  negative_points BIGINT,
  net_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(date_trunc('month', (current_date - (n || ' month')::interval)), 'Month') AS month,
      EXTRACT(YEAR FROM (current_date - (n || ' month')::interval))::INT AS year,
      date_trunc('month', (current_date - (n || ' month')::interval)) AS month_start,
      date_trunc('month', (current_date - (n || ' month')::interval)) + interval '1 month' - interval '1 day' AS month_end
    FROM generate_series(0, months_count - 1) AS n
  ),
  positive_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = true
    GROUP BY 
      month_date
  ),
  negative_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = false
    GROUP BY 
      month_date
  )
  SELECT 
    m.month::TEXT,
    m.year,
    COALESCE(pp.points, 0) AS positive_points,
    COALESCE(np.points, 0) AS negative_points,
    (COALESCE(pp.points, 0) - COALESCE(np.points, 0)) AS net_points
  FROM 
    months m
  LEFT JOIN 
    positive_points pp ON m.month_start = pp.month_date
  LEFT JOIN 
    negative_points np ON m.month_start = np.month_date
  ORDER BY 
    m.month_start DESC;
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('fix-monthly-points.sql', 'Fix monthly points report')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: fix-messaging-tables.sql
-- Description: Fix messaging system
-- 1. Check user_messages table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_messages'
ORDER BY ordinal_position;

-- 2. Check if the 'messages' table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'messages'
) AS messages_table_exists;

-- 3. Create a view for backward compatibility if needed
DO $$
BEGIN
  -- Check if 'messages' table doesn't exist but code might be using it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_messages'
  ) THEN
    -- Create a view for backward compatibility
    EXECUTE 'CREATE OR REPLACE VIEW public.messages AS SELECT * FROM public.user_messages';
    RAISE NOTICE 'Created messages view pointing to user_messages table for backward compatibility';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_messages'
  ) THEN
    RAISE NOTICE 'Both messages and user_messages tables exist. Manual data migration may be required.';
  ELSE
    RAISE NOTICE 'No issue detected with messaging tables.';
  END IF;
END $$;

-- 4. Check conversations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;

-- 5. Check if there's any data in the tables
SELECT 'conversations' as table_name, COUNT(*) as record_count FROM conversations;
SELECT 'user_messages' as table_name, COUNT(*) as record_count FROM user_messages;

-- Check if the messages view exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'messages';

-- Suggestion for using the messaging system
SELECT 'RECOMMENDATION: The messaging system is using user_messages table. If your code references "messages" table, update it to use "user_messages" instead or make sure the view exists.' as recommendation;

-- Fix messaging system with consolidated tables structure

-- Create the conversation last message update function first
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create send message function
CREATE OR REPLACE FUNCTION send_message(
    conversation_id_param INTEGER,
    sender_id_param UUID,
    recipient_id_param UUID,
    content_param TEXT
) RETURNS INTEGER AS $$
DECLARE
    message_id INTEGER;
BEGIN
    -- Insert the message
    INSERT INTO public.messages(
        conversation_id,
        sender_id,
        recipient_id,
        content,
        is_read,
        created_at
    ) VALUES (
        conversation_id_param,
        sender_id_param,
        recipient_id_param,
        content_param,
        FALSE,
        NOW()
    ) RETURNING id INTO message_id;
    
    -- Return the message ID
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- First, check if both tables exist
DO $$ 
DECLARE
    messages_exists BOOLEAN;
    user_messages_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'messages'
    ) INTO messages_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_messages'
    ) INTO user_messages_exists;

    -- Only proceed if both tables exist
    IF messages_exists AND user_messages_exists THEN
        -- Step 1: Create a temporary table to merge data
        CREATE TEMP TABLE merged_messages AS
        -- Get data from messages table
        SELECT 
            COALESCE(m.id, NULL) AS old_messages_id,
            COALESCE(um.id, NULL) AS old_user_messages_id,
            COALESCE(m.conversation_id, um.conversation_id) AS conversation_id,
            COALESCE(m.sender_id, um.sender_id) AS sender_id,
            COALESCE(m.recipient_id, um.recipient_id) AS recipient_id,
            COALESCE(m.content, um.content) AS content,
            COALESCE(m.is_read, um.is_read) AS is_read,
            COALESCE(m.created_at, um.created_at) AS created_at
        FROM 
            public.messages m
        FULL OUTER JOIN 
            public.user_messages um 
        ON 
            m.conversation_id = um.conversation_id 
            AND m.sender_id = um.sender_id 
            AND m.recipient_id = um.recipient_id;

        -- Step 2: Create the new consolidated messages table
        CREATE TABLE IF NOT EXISTS public.consolidated_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES public.conversations(id),
            sender_id UUID NOT NULL REFERENCES public.users(id),
            recipient_id UUID NOT NULL REFERENCES public.users(id),
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Step 3: Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_conversation_id ON public.consolidated_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_sender_id ON public.consolidated_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_recipient_id ON public.consolidated_messages(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_created_at ON public.consolidated_messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_consolidated_messages_is_read ON public.consolidated_messages(is_read);

        -- Step 4: Insert merged data into the new table
        INSERT INTO public.consolidated_messages (
            conversation_id, 
            sender_id, 
            recipient_id, 
            content, 
            is_read, 
            created_at
        )
        SELECT 
            conversation_id, 
            sender_id, 
            recipient_id, 
            content, 
            is_read, 
            created_at
        FROM 
            merged_messages
        WHERE 
            content IS NOT NULL;

        -- Step 5: Update conversations with last message timestamp
        UPDATE public.conversations c
        SET last_message_at = (
            SELECT MAX(created_at)
            FROM public.consolidated_messages
            WHERE conversation_id = c.id
        )
        WHERE EXISTS (
            SELECT 1
            FROM public.consolidated_messages
            WHERE conversation_id = c.id
        );

        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.consolidated_messages;
        
        -- Create the trigger
        CREATE TRIGGER update_conversation_last_message_trigger
        AFTER INSERT ON public.consolidated_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_last_message();

        -- Step 7: Create a view to maintain compatibility
        CREATE OR REPLACE VIEW public.messages_view AS
        SELECT 
            id,
            conversation_id,
            sender_id,
            recipient_id,
            content,
            is_read,
            created_at
        FROM 
            public.consolidated_messages;

        -- Step 8: Rename tables to preserve the original data but use the new table
        ALTER TABLE public.messages RENAME TO messages_old;
        ALTER TABLE public.user_messages RENAME TO user_messages_old;
        ALTER TABLE public.consolidated_messages RENAME TO messages;

        -- Step 9: Update the view to point to the renamed table
        CREATE OR REPLACE VIEW public.messages_view AS
        SELECT 
            id,
            conversation_id,
            sender_id,
            recipient_id,
            content,
            is_read,
            created_at
        FROM 
            public.messages;

        -- Step 11: Log the change
        RAISE NOTICE 'Successfully consolidated messaging tables';
    ELSE
        IF messages_exists THEN
            RAISE NOTICE 'Only messages table exists, no consolidation needed';
        ELSIF user_messages_exists THEN
            RAISE NOTICE 'Only user_messages table exists, renaming to messages';
            ALTER TABLE public.user_messages RENAME TO messages;
        ELSE
            RAISE NOTICE 'No messaging tables found, creating new table';
            
            -- Create the messages table from scratch
            CREATE TABLE IF NOT EXISTS public.messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES public.conversations(id),
                sender_id UUID NOT NULL REFERENCES public.users(id),
                recipient_id UUID NOT NULL REFERENCES public.users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
            CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
            
            -- Create trigger
            CREATE TRIGGER update_conversation_last_message_trigger
            AFTER INSERT ON public.messages
            FOR EACH ROW
            EXECUTE FUNCTION update_conversation_last_message();
        END IF;
    END IF;
END $$; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('fix-messaging-tables.sql', 'Fix messaging system')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: combined-fix-functions.sql
-- Description: Combined function fixes
-- Combined SQL file that adds all missing database functions
-- Run this in your Supabase SQL editor

-- Function to get points by category for a user
CREATE OR REPLACE FUNCTION get_points_by_category(user_id_param UUID)
RETURNS TABLE (
  category_id INT,
  category_name TEXT,
  total_points BIGINT,
  is_positive BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id AS category_id,
    pc.name::TEXT AS category_name,
    SUM(pt.points)::BIGINT AS total_points,
    pt.is_positive
  FROM 
    points_transactions pt
  LEFT JOIN 
    point_categories pc ON pt.category_id = pc.id
  WHERE 
    pt.user_id = user_id_param
  GROUP BY 
    pc.id, pc.name, pt.is_positive
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT 
    COALESCE(
      SUM(
        CASE 
          WHEN is_positive THEN points 
          ELSE -points 
        END
      ), 0
    ) INTO total_points
  FROM 
    points_transactions
  WHERE 
    user_id = user_id_param;
    
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get student total points for leaderboard
CREATE OR REPLACE FUNCTION get_student_total_points()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.full_name::TEXT,
    COALESCE(
      SUM(
        CASE 
          WHEN pt.is_positive THEN pt.points 
          ELSE -pt.points 
        END
      ), 0
    )::INTEGER AS total_points
  FROM 
    users u
  LEFT JOIN 
    points_transactions pt ON u.id = pt.user_id
  WHERE 
    u.role_id = 1 -- Only students
  GROUP BY 
    u.id, u.full_name
  ORDER BY 
    total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate points within a period
CREATE OR REPLACE FUNCTION calculate_user_points(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  positive_points INTEGER;
  negative_points INTEGER;
  total_points INTEGER;
BEGIN
  -- Get positive points
  SELECT COALESCE(SUM(points), 0) INTO positive_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = true;
  
  -- Get negative points
  SELECT COALESCE(SUM(points), 0) INTO negative_points
  FROM points_transactions
  WHERE user_id = user_id_param AND is_positive = false;
  
  -- Calculate total points
  total_points := positive_points - negative_points;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get points by month for a user
CREATE OR REPLACE FUNCTION get_points_by_month(
  user_id_param UUID,
  months_count INT DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  year INT,
  positive_points BIGINT,
  negative_points BIGINT,
  net_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(date_trunc('month', (current_date - (n || ' month')::interval)), 'Month')::TEXT AS month,
      EXTRACT(YEAR FROM (current_date - (n || ' month')::interval))::INT AS year,
      date_trunc('month', (current_date - (n || ' month')::interval)) AS month_start,
      date_trunc('month', (current_date - (n || ' month')::interval)) + interval '1 month' - interval '1 day' AS month_end
    FROM generate_series(0, months_count - 1) AS n
  ),
  positive_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = true
    GROUP BY 
      month_date
  ),
  negative_points AS (
    SELECT 
      date_trunc('month', created_at) AS month_date,
      SUM(points)::BIGINT AS points
    FROM 
      points_transactions
    WHERE 
      user_id = user_id_param AND is_positive = false
    GROUP BY 
      month_date
  )
  SELECT 
    m.month,
    m.year,
    COALESCE(pp.points, 0) AS positive_points,
    COALESCE(np.points, 0) AS negative_points,
    (COALESCE(pp.points, 0) - COALESCE(np.points, 0)) AS net_points
  FROM 
    months m
  LEFT JOIN 
    positive_points pp ON m.month_start = pp.month_date
  LEFT JOIN 
    negative_points np ON m.month_start = np.month_date
  ORDER BY 
    m.month_start DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user rank among students
CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.id,
      COALESCE(
        SUM(
          CASE 
            WHEN pt.is_positive THEN pt.points 
            ELSE -pt.points 
          END
        ), 0
      )::BIGINT AS total_points
    FROM 
      users u
    LEFT JOIN 
      points_transactions pt ON u.id = pt.user_id
    WHERE 
      u.role_id = 1 -- Student role
    GROUP BY 
      u.id
  ),
  ranked_users AS (
    SELECT 
      id,
      RANK() OVER (ORDER BY total_points DESC)::BIGINT AS rank
    FROM 
      user_points
  )
  SELECT 
    user_id_param AS user_id,
    COALESCE(ru.rank, 0)::BIGINT AS rank
  FROM 
    ranked_users ru
  WHERE 
    ru.id = user_id_param;
END;
$$ LANGUAGE plpgsql; 

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('combined-fix-functions.sql', 'Combined function fixes')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


-- Migration: apply-system-updates.sql
-- Description: Apply system updates
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

-- Record that this migration was applied
INSERT INTO public.schema_migrations (name, description) 
VALUES ('apply-system-updates.sql', 'Apply system updates')
ON CONFLICT (name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;


COMMIT;