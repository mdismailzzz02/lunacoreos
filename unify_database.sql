-- Clear out old data so you can do a fresh, unified backup
-- (We are intentionally skipping phone_sms so you don't lose your messages!)
TRUNCATE TABLE public.phone_contacts;
TRUNCATE TABLE public.phone_call_logs;

-- Drop the old constraints that required a device_id
ALTER TABLE public.phone_sms DROP CONSTRAINT IF EXISTS unique_sms;
ALTER TABLE public.phone_call_logs DROP CONSTRAINT IF EXISTS unique_calls;
ALTER TABLE public.phone_contacts DROP CONSTRAINT IF EXISTS unique_contacts;

-- Add the new Ultimate constraints! 
-- These force Supabase to deduplicate globally, completely ignoring which phone uploaded them!
ALTER TABLE public.phone_sms ADD CONSTRAINT unique_sms UNIQUE (message_id);
ALTER TABLE public.phone_call_logs ADD CONSTRAINT unique_calls UNIQUE (call_id);
ALTER TABLE public.phone_contacts ADD CONSTRAINT unique_contacts UNIQUE (contact_id);

-- Physically destroy the device_id column from the database so it is truly unified!
ALTER TABLE public.phone_sms DROP COLUMN IF EXISTS device_id;
ALTER TABLE public.phone_call_logs DROP COLUMN IF EXISTS device_id;
ALTER TABLE public.phone_contacts DROP COLUMN IF EXISTS device_id;

-- ALSO unify the file sync logs!
-- Drop the old primary key that included device_id
ALTER TABLE public.phone_sync_logs DROP CONSTRAINT IF EXISTS phone_sync_logs_pkey;
-- Make file_path the ONLY primary key!
ALTER TABLE public.phone_sync_logs ADD PRIMARY KEY (file_path);
-- Delete the device_id column forever
ALTER TABLE public.phone_sync_logs DROP COLUMN IF EXISTS device_id;

-- Create a dedicated table specifically for WhatsApp to prevent bloating the main file logs!
CREATE TABLE IF NOT EXISTS public.whatsapp_sync_logs (
    file_path TEXT PRIMARY KEY,
    filename TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
