-- =========================================================================
-- LUNACORE OS - MULTI-USER UPGRADE & RLS MIGRATION SCRIPT
-- =========================================================================
-- This script dynamically iterates through EVERY table in your database.
-- It ensures that absolutely NO data is left behind or left unprotected.
-- 
-- WHAT IT DOES:
-- 1. Adds a `user_id` column to every table (defaulting to the logged-in user).
-- 2. Backfills all of your existing data with your specific User ID.
-- 3. Locks down every table with Row Level Security (RLS).
-- 4. Enforces a universal policy: Users can only see and edit their own rows.

DO $$ 
DECLARE 
    t_name text;
    -- Your specific UUID that you provided
    target_uuid uuid := 'b5789be6-755e-44ad-bb0f-33dcee1efc67';
BEGIN
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        -- 1. Add user_id column if it doesn't exist
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();', t_name);
        
        -- 2. Backfill existing data to belong to you!
        EXECUTE format('UPDATE %I SET user_id = %L WHERE user_id IS NULL;', t_name, target_uuid);

        -- 3. Enable Row Level Security (Locks down the table)
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);

        -- 4. Drop any existing policy with the same name to avoid duplicates
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "User isolation" ON %I;', t_name);
        EXCEPTION WHEN undefined_object THEN
            -- Ignore if it doesn't exist yet
        END;

        -- 5. Create the universal multi-user isolation policy (cast to text to prevent type mismatch on existing TEXT columns)
        EXECUTE format('CREATE POLICY "User isolation" ON %I FOR ALL USING (auth.uid()::text = user_id::text);', t_name);
        
        -- Log progress (visible in Supabase SQL editor output)
        RAISE NOTICE 'Secured and migrated table: %', t_name;
    END LOOP;
END $$;
