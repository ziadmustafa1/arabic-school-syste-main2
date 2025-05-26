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
