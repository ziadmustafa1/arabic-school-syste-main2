DO $$
BEGIN
  -- Check if the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_points_system_stats'
  ) THEN
    -- Create the function
    EXECUTE $EXECUTE$
      CREATE OR REPLACE FUNCTION get_points_system_stats()
      RETURNS TABLE (
        total_users INT,
        total_points BIGINT,
        positive_points BIGINT,
        negative_points BIGINT,
        active_users INT
      ) AS $FUNCTION$
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
      $FUNCTION$ LANGUAGE plpgsql;
    $EXECUTE$;
    
    RAISE NOTICE 'Created get_points_system_stats function';
  ELSE
    RAISE NOTICE 'get_points_system_stats function already exists';
  END IF;
END $$;

-- Test the function
SELECT * FROM get_points_system_stats(); 