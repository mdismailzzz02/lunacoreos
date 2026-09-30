-- Add the 'type' column to differentiate between Inbox (1) and Sent (2) messages
ALTER TABLE public.phone_sms 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '1';

-- Ensure the column is properly added
COMMENT ON COLUMN public.phone_sms.type IS 'Android SMS Type (1=Inbox, 2=Sent)';
