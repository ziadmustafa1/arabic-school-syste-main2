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