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
