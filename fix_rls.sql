-- 1. Main File Logs (phone_sync_logs)
ALTER TABLE public.phone_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow app to read sync logs" ON public.phone_sync_logs;
DROP POLICY IF EXISTS "Allow app to insert sync logs" ON public.phone_sync_logs;
DROP POLICY IF EXISTS "Allow app to update sync logs" ON public.phone_sync_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.phone_sync_logs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.phone_sync_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.phone_sync_logs;

CREATE POLICY "Enable all for anon" ON public.phone_sync_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. WhatsApp Logs (whatsapp_sync_logs)
ALTER TABLE public.whatsapp_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow app to read wa logs" ON public.whatsapp_sync_logs;
DROP POLICY IF EXISTS "Allow app to insert wa logs" ON public.whatsapp_sync_logs;
DROP POLICY IF EXISTS "Allow app to update wa logs" ON public.whatsapp_sync_logs;

CREATE POLICY "Enable all for anon wa" ON public.whatsapp_sync_logs FOR ALL TO anon USING (true) WITH CHECK (true);
