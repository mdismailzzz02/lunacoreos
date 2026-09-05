DO $$ 
DECLARE 
    t_name text;
BEGIN
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Auth Only" ON %I;', t_name);
        EXCEPTION WHEN undefined_object THEN
            -- Ignore
        END;
    END LOOP;
END $$;
