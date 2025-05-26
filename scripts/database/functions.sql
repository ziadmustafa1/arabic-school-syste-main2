-- Function to calculate a user's points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_points INTEGER;
BEGIN
    -- Calculate total positive points
    WITH positive_points AS (
        SELECT COALESCE(SUM(points), 0) AS total
        FROM points_transactions
        WHERE user_id = user_id_param AND is_positive = true
    ),
    -- Calculate total negative points
    negative_points AS (
        SELECT COALESCE(SUM(points), 0) AS total
        FROM points_transactions
        WHERE user_id = user_id_param AND is_positive = false
    )
    -- Calculate balance
    SELECT (p.total - n.total) INTO total_points
    FROM positive_points p, negative_points n;
    
    RETURN total_points;
END;
$$;

-- Function to check if a user has earned any new badges
CREATE OR REPLACE FUNCTION check_user_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_points INTEGER;
    badge_record RECORD;
BEGIN
    -- Only proceed if it's a positive points transaction
    IF NEW.is_positive = false THEN
        RETURN NEW;
    END IF;
    
    -- Get user's current points balance
    SELECT get_user_points_balance(NEW.user_id) INTO user_points;
    
    -- Check for any badges that the user qualifies for but doesn't have yet
    FOR badge_record IN
        SELECT b.id, b.name
        FROM badges b
        WHERE user_points BETWEEN b.min_points AND b.max_points
        AND NOT EXISTS (
            SELECT 1 FROM user_badges ub
            WHERE ub.badge_id = b.id AND ub.user_id = NEW.user_id
        )
    LOOP
        -- Award the badge to the user
        INSERT INTO user_badges (user_id, badge_id, awarded_at)
        VALUES (NEW.user_id, badge_record.id, NOW());
        
        -- Create a notification for the user
        INSERT INTO notifications (user_id, title, content, created_at)
        VALUES (
            NEW.user_id,
            'تم الحصول على شارة جديدة',
            'مبروك! لقد حصلت على شارة جديدة: ' || badge_record.name,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create a trigger to automatically check for badges when points are added
DROP TRIGGER IF EXISTS check_badges_trigger ON points_transactions;
CREATE TRIGGER check_badges_trigger
AFTER INSERT ON points_transactions
FOR EACH ROW
EXECUTE FUNCTION check_user_badges(); 