-- 1. First, we need to clear out all the duplicated data
TRUNCATE TABLE phone_sms;
TRUNCATE TABLE phone_call_logs;
TRUNCATE TABLE phone_contacts;
TRUNCATE TABLE phone_sync_logs;

-- 2. Add Unique Constraints so the database physically rejects duplicates
ALTER TABLE phone_sms ADD CONSTRAINT phone_sms_unique UNIQUE (device_id, message_id);
ALTER TABLE phone_call_logs ADD CONSTRAINT phone_call_logs_unique UNIQUE (device_id, call_id);
ALTER TABLE phone_contacts ADD CONSTRAINT phone_contacts_unique UNIQUE (device_id, contact_id);
ALTER TABLE phone_sync_logs ADD CONSTRAINT phone_sync_logs_unique UNIQUE (device_id, file_path);
