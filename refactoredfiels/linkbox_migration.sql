-- ─── LunaCoreOS: Linkbox Migration ───
-- Run this once in your Supabase SQL Editor.

-- 1. Create the linkbox table
DROP TABLE IF EXISTS linkbox CASCADE;

CREATE TABLE linkbox (
  "id"           TEXT PRIMARY KEY,
  "url"          TEXT NOT NULL,
  "title"        TEXT,
  "description"  TEXT,
  "tags"         TEXT,
  "created_at"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "user_id"      UUID DEFAULT auth.uid()
);

-- 2. Enable Row Level Security
ALTER TABLE linkbox ENABLE ROW LEVEL SECURITY;

-- 3. Only authenticated Supabase users can read/write
DROP POLICY IF EXISTS "Auth Only" ON linkbox;
CREATE POLICY "Auth Only" ON linkbox
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Done! The linkbox table is ready.
