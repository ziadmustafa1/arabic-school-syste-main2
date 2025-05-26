-- Security Audit Script for Arabic School System
-- Run this script periodically to detect security issues

-- Show tables without RLS enabled
SELECT
    schemaname || '.' || tablename AS table_name,
    'RLS DISABLED' AS issue
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND tablename NOT IN (
        SELECT tablename::text
        FROM pg_tables t
        JOIN pg_catalog.pg_class c ON (t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text)
        WHERE c.relrowsecurity = 't'
    )
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_%;'
ORDER BY
    table_name;

-- Show tables with RLS enabled but no policies
SELECT
    schemaname || '.' || tablename AS table_name,
    'RLS ENABLED BUT NO POLICIES' AS issue
FROM
    pg_tables t
JOIN
    pg_catalog.pg_class c 
    ON (t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text)
WHERE
    c.relrowsecurity = 't'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy
        WHERE polrelid = c.oid
    )
    AND schemaname = 'public'
ORDER BY
    table_name;

-- Show views with SECURITY DEFINER
SELECT
    n.nspname || '.' || c.relname AS view_name,
    'SECURITY DEFINER VIEW' AS issue
FROM
    pg_class c
JOIN
    pg_namespace n ON n.oid = c.relnamespace
WHERE
    c.relkind = 'v'
    AND c.relname NOT LIKE 'pg_%'
    AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_views
        WHERE viewname = c.relname
        AND schemaname = n.nspname
        AND definition LIKE '%SECURITY DEFINER%'
    );

-- Show functions with mutable search paths
SELECT
    n.nspname || '.' || p.proname AS function_name,
    'FUNCTION WITH MUTABLE SEARCH PATH' AS issue
FROM
    pg_proc p
JOIN
    pg_namespace n ON n.oid = p.pronamespace
WHERE
    n.nspname NOT IN ('pg_catalog', 'information_schema')
    -- Check if the function is SECURITY DEFINER
    AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc
        WHERE oid = p.oid
        AND prosecdef = true
    )
    -- Check if the function doesn't set search_path
    AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc
        WHERE oid = p.oid
        AND proconfig IS NOT NULL
        AND array_to_string(proconfig, ',') LIKE '%search_path=%'
    );

-- Check for tables without primary keys (potential security risk)
SELECT
    schemaname || '.' || tablename AS table_name,
    'NO PRIMARY KEY' AS issue
FROM
    pg_tables t
WHERE
    schemaname = 'public'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        WHERE ns.nspname = t.schemaname
        AND cl.relname = t.tablename
        AND c.contype = 'p'
    );

-- Check user permissions and roles
SELECT
    r.rolname AS role_name,
    CASE WHEN r.rolsuper THEN 'SUPERUSER' ELSE '' END || ' ' ||
    CASE WHEN r.rolcreaterole THEN 'CREATEROLE' ELSE '' END || ' ' ||
    CASE WHEN r.rolcreatedb THEN 'CREATEDB' ELSE '' END AS permissions,
    'ELEVATED ROLE PERMISSIONS' AS issue
FROM
    pg_roles r
WHERE
    r.rolname NOT IN ('postgres', 'supabase_admin', 'authenticator')
    AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb);

-- Check for authentication configs - only run if auth schema exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.schemata WHERE schema_name = 'auth'
    ) AND EXISTS (
        SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'config'
    ) THEN
        EXECUTE '
        SELECT
            ''AUTH CONFIG'' AS setting,
            CASE WHEN check_pwned_passwords THEN ''ENABLED'' ELSE ''DISABLED'' END AS leaked_passwords_check
        FROM
            auth.config
        LIMIT 1;
        ';
    ELSE
        RAISE NOTICE 'auth.config table not found - skipping auth config check';
    END IF;
END $$;

-- Check for auth settings
SELECT 
  setting,
  CASE 
    WHEN name IN ('password_min_length', 'jwt_exp') AND setting::int < 10 THEN 'WEAK' 
    ELSE 'OK' 
  END AS status
FROM pg_settings
WHERE 
  name IN ('password_min_length', 'jwt_exp');

-- Output a summary
SELECT 'Security audit complete. Review any issues listed above.' AS message; 