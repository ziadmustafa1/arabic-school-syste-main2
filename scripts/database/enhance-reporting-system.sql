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