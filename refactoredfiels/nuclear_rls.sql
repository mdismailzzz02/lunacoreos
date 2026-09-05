DO $$ 
DECLARE 
    t_name text;
    pol RECORD;
BEGIN
    -- 1. Nuke ALL existing permissive policies created by Supabase UI or old scripts
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND policyname != 'User isolation'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;

    -- 2. Re-apply strict RLS to every single table
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        -- Ensure user_id column exists just in case
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();', t_name);

        -- Lock the table
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Recreate our strict isolation rule
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "User isolation" ON %I;', t_name);
        EXCEPTION WHEN undefined_object THEN END;

        EXECUTE format('CREATE POLICY "User isolation" ON %I FOR ALL USING (auth.uid()::text = user_id::text);', t_name);
    END LOOP;
END $$;
