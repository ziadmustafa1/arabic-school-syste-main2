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