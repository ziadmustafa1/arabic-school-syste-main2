-- Fix Security Definer Views
-- These views currently use SECURITY DEFINER, which could allow privilege escalation
-- We'll replace them with SECURITY INVOKER, which uses the caller's permissions

-- First, check if views exist and create safe versions if they do
DO $$
BEGIN
    -- For user_messages view
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'user_messages' AND schemaname = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.user_messages_safe
                WITH (security_invoker=true) AS
                SELECT * FROM public.user_messages';
    END IF;

    -- For messages_view
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'messages_view' AND schemaname = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.messages_view_safe
                WITH (security_invoker=true) AS
                SELECT * FROM public.messages_view';
    END IF;

    -- For messages_old
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'messages_old' AND schemaname = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.messages_old_safe
                WITH (security_invoker=true) AS
                SELECT * FROM public.messages_old';
    END IF;

    -- For available_rewards_by_role
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'available_rewards_by_role' AND schemaname = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.available_rewards_by_role_safe
                WITH (security_invoker=true) AS
                SELECT * FROM public.available_rewards_by_role';
    END IF;

    -- For reward_redemptions_view
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'reward_redemptions_view' AND schemaname = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.reward_redemptions_view_safe
                WITH (security_invoker=true) AS
                SELECT * FROM public.reward_redemptions_view';
    END IF;

    -- Drop the old views if they exist
    DROP VIEW IF EXISTS public.user_messages CASCADE;
    DROP VIEW IF EXISTS public.messages_view CASCADE;
    DROP VIEW IF EXISTS public.messages_old CASCADE;
    DROP VIEW IF EXISTS public.available_rewards_by_role CASCADE;
    DROP VIEW IF EXISTS public.reward_redemptions_view CASCADE;

    -- Rename the new views to the original names if they exist
    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'user_messages_safe' AND schemaname = 'public') THEN
        ALTER VIEW public.user_messages_safe RENAME TO user_messages;
        EXECUTE 'COMMENT ON VIEW public.user_messages IS ''View for user messages with SECURITY INVOKER''';
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'messages_view_safe' AND schemaname = 'public') THEN
        ALTER VIEW public.messages_view_safe RENAME TO messages_view;
        EXECUTE 'COMMENT ON VIEW public.messages_view IS ''View for messages with SECURITY INVOKER''';
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'messages_old_safe' AND schemaname = 'public') THEN
        ALTER VIEW public.messages_old_safe RENAME TO messages_old;
        EXECUTE 'COMMENT ON VIEW public.messages_old IS ''View for old messages with SECURITY INVOKER''';
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'available_rewards_by_role_safe' AND schemaname = 'public') THEN
        ALTER VIEW public.available_rewards_by_role_safe RENAME TO available_rewards_by_role;
        EXECUTE 'COMMENT ON VIEW public.available_rewards_by_role IS ''View for available rewards by role with SECURITY INVOKER''';
    END IF;

    IF EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'reward_redemptions_view_safe' AND schemaname = 'public') THEN
        ALTER VIEW public.reward_redemptions_view_safe RENAME TO reward_redemptions_view;
        EXECUTE 'COMMENT ON VIEW public.reward_redemptions_view IS ''View for reward redemptions with SECURITY INVOKER''';
    END IF;
END $$; 