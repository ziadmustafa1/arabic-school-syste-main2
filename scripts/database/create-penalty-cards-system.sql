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