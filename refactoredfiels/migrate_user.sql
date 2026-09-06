-- =========================================================================
-- LUNACORE OS - ORPHANED DATA RECOVERY SCRIPT
-- =========================================================================
-- This script will find all data in your database that belongs to a deleted
-- user (whose ID no longer exists in auth.users) and reassign it to the
-- newly created user account.
--
-- Instructions: Run this in the Supabase SQL Editor!
-- =========================================================================

DO $$ 
DECLARE 
    t_name text;
    -- The NEW user ID that you just created
    new_uuid uuid := '67539ee2-a1b0-405d-bbc1-c33dcbd198e6';
    rows_updated integer;
BEGIN
    -- Verify the new user actually exists before proceeding
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_uuid) THEN
        RAISE EXCEPTION 'User with ID % does not exist in auth.users! Please check the ID.', new_uuid;
    END IF;

    -- Iterate through all tables in the public schema, EXCLUDING vault, music, and specific edge-case tables
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'vault_%' AND tablename NOT LIKE 'music_%' AND tablename != 'saved_twitch_videos') 
    LOOP
        -- Check if the table has a user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'user_id') THEN
            
            -- Update rows where the user_id points to a deleted user, OR where user_id is completely null
            -- We cast to ::text to safely handle both UUID and TEXT column types
            EXECUTE format('
                WITH updated AS (
                    UPDATE %I 
                    SET user_id = %L 
                    WHERE user_id::text NOT IN (SELECT id::text FROM auth.users) 
                       OR user_id IS NULL
                    RETURNING 1
                )
                SELECT count(*) FROM updated;
            ', t_name, new_uuid) INTO rows_updated;
            
            IF rows_updated > 0 THEN
                RAISE NOTICE 'Transferred % orphaned rows in table "%" to the new user.', rows_updated, t_name;
            END IF;
            
        END IF;
    END LOOP;
    
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'SUCCESS: All orphaned data has been attached to the new ID!';
    RAISE NOTICE '=========================================================';
END $$;
