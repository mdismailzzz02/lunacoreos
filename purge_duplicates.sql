-- This will delete all duplicates and keep only ONE copy of each message (based on the body and timestamp)
DELETE FROM public.phone_sms
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM public.phone_sms
    GROUP BY address, body, timestamp
);

DELETE FROM public.phone_call_logs
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM public.phone_call_logs
    GROUP BY number, timestamp, duration_seconds
);

DELETE FROM public.phone_contacts
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM public.phone_contacts
    GROUP BY display_name
);

-- Force Supabase to reject all future duplicates at the database level!
ALTER TABLE public.phone_sms ADD CONSTRAINT unique_sms UNIQUE (device_id, message_id);
ALTER TABLE public.phone_call_logs ADD CONSTRAINT unique_calls UNIQUE (device_id, call_id);
ALTER TABLE public.phone_contacts ADD CONSTRAINT unique_contacts UNIQUE (device_id, contact_id);
