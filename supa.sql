-- ─── LUNASDIARY COMPLETE SUPABASE SCHEMA ───
-- This script strictly maps every single Google Sheet and its exact headers.
-- Run this entire script in your Supabase SQL Editor.

-- 1. DROP ALL EXISTING TABLES
DROP TABLE IF EXISTS journal CASCADE;
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

DROP TABLE IF EXISTS life_map CASCADE;
DROP TABLE IF EXISTS time_capsules CASCADE;
DROP TABLE IF EXISTS who_am_i CASCADE;
DROP TABLE IF EXISTS thought_dump CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS streak_logs CASCADE;
DROP TABLE IF EXISTS reading_list CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS finance CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS writing CASCADE;
DROP TABLE IF EXISTS yearly_reviews CASCADE;

DROP TABLE IF EXISTS twitch_channels CASCADE;
DROP TABLE IF EXISTS twitch_dismissed CASCADE;
DROP TABLE IF EXISTS twitch_config CASCADE;
DROP TABLE IF EXISTS saved_twitch_videos CASCADE;
DROP TABLE IF EXISTS delegation CASCADE;
DROP TABLE IF EXISTS lunasroom CASCADE;

DROP TABLE IF EXISTS vault_folders CASCADE;
DROP TABLE IF EXISTS vault_faces CASCADE;
DROP TABLE IF EXISTS vault_liked CASCADE;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS rss_feeds CASCADE;

DROP TABLE IF EXISTS study_folders CASCADE;
DROP TABLE IF EXISTS study_notes CASCADE;

DROP TABLE IF EXISTS music_library CASCADE;
DROP TABLE IF EXISTS music_folders CASCADE;

DROP TABLE IF EXISTS yt_liked CASCADE;
DROP TABLE IF EXISTS twitch_liked CASCADE;

-- 2. CREATE ALL TABLES WITH STRICT CASING

CREATE TABLE journal (
  "entry_id" TEXT PRIMARY KEY, "date" TEXT, "day_of_week" TEXT, "time_created" TEXT, "time_modified" TEXT, "title" TEXT, "text_content" TEXT, "mood" TEXT, "energy_level" TEXT, "weather" TEXT, "word_count" TEXT, "media_refs" TEXT, "is_starred" TEXT, "status" TEXT
);

CREATE TABLE todos (
  "todo_id" TEXT PRIMARY KEY, "title" TEXT, "description" TEXT, "priority" TEXT, "category" TEXT, "date_created" TEXT, "time_created" TEXT, "due_date" TEXT, "original_due_date" TEXT, "completion_date" TEXT, "completion_time" TEXT, "status" TEXT, "subtasks" TEXT, "notes" TEXT, "linked_journal_id" TEXT, "linked_insight_id" TEXT, "is_recurring" TEXT, "recurring_parent_id" TEXT, "tags" TEXT
);

CREATE TABLE insights (
  "insight_id" TEXT PRIMARY KEY, "date_created" TEXT, "time_created" TEXT, "date_modified" TEXT, "time_modified" TEXT, "title" TEXT, "text_content" TEXT, "audio_refs" TEXT, "image_refs" TEXT, "file_refs" TEXT, "source_type" TEXT, "source_id" TEXT, "source_title" TEXT, "category" TEXT, "tags" TEXT, "impact_level" TEXT, "is_actioned" TEXT, "action_date" TEXT, "review_date" TEXT, "linked_todo_id" TEXT, "starred" TEXT, "status" TEXT
);

CREATE TABLE habits (
  "habit_id" TEXT PRIMARY KEY, "name" TEXT, "description" TEXT, "category" TEXT, "frequency" TEXT, "custom_days" TEXT, "is_measurable" TEXT, "target_per_day" TEXT, "unit" TEXT, "color" TEXT, "icon" TEXT, "date_created" TEXT, "start_date" TEXT, "is_active" TEXT, "current_streak" TEXT, "longest_streak" TEXT, "total_completions" TEXT, "last_completed_date" TEXT, "reminder_time" TEXT, "notes" TEXT, "archived_date" TEXT
);

CREATE TABLE habit_logs (
  "log_id" TEXT PRIMARY KEY, "habit_id" TEXT, "habit_name" TEXT, "date" TEXT, "day_of_week" TEXT, "status" TEXT, "value_logged" TEXT, "completion_time" TEXT, "note" TEXT, "mood_at_completion" TEXT, "streak_at_time" TEXT
);

CREATE TABLE media (
  "media_id" TEXT PRIMARY KEY, "media_type" TEXT, "mime_type" TEXT, "filename" TEXT, "display_name" TEXT, "drive_file_id" TEXT, "drive_link" TEXT, "thumbnail_link" TEXT, "file_extension" TEXT, "file_size_kb" TEXT, "duration_seconds" TEXT, "date_uploaded" TEXT, "time_uploaded" TEXT, "uploaded_from" TEXT, "source_id" TEXT, "referenced_in" TEXT, "tags" TEXT, "notes" TEXT, "is_orphan" TEXT, "drive_folder" TEXT, "status" TEXT,
  -- R2 storage columns (added for Media Library → R2 migration)
  "storage_path" TEXT,       -- legacy: Supabase Storage bucket path
  "r2_key" TEXT,             -- new: R2 object key (e.g. media-library/general/1720600000-photo.jpg)
  "r2_public_url" TEXT       -- new: full public R2 URL (set when bucket has public access enabled)
);

-- Run this once in Supabase SQL Editor if the table already exists:
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_path TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS r2_key TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS r2_public_url TEXT;

DROP TABLE IF EXISTS config CASCADE;
CREATE TABLE config (
  "config_id" TEXT PRIMARY KEY, "content" JSONB, "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tags (
  "tag_id" TEXT PRIMARY KEY, "tag_name" TEXT, "tag_color" TEXT, "used_in" TEXT, "usage_count" TEXT, "date_created" TEXT, "last_used" TEXT
);

CREATE TABLE life_map (
  "id" TEXT PRIMARY KEY, "title" TEXT, "description" TEXT, "lat" TEXT, "lng" TEXT, "date" TEXT, "emoji" TEXT, "color" TEXT, "updatedAt" TEXT
);

CREATE TABLE time_capsules (
  "id" TEXT PRIMARY KEY, "title" TEXT, "message" TEXT, "created_at" TEXT, "unlock_date" TEXT, "is_unlocked" TEXT, "updatedAt" TEXT
);

CREATE TABLE who_am_i (
  "section" TEXT PRIMARY KEY, "content" TEXT, "updated_at" TEXT
);

CREATE TABLE thought_dump (
  "id" TEXT PRIMARY KEY, "content" TEXT, "tags" TEXT, "mood" TEXT, "created_at" TEXT, "updatedAt" TEXT
);

CREATE TABLE streaks (
  "id" TEXT PRIMARY KEY, "name" TEXT, "emoji" TEXT, "description" TEXT, "created_at" TEXT, "updatedAt" TEXT
);

CREATE TABLE streak_logs (
  "streak_id" TEXT, "date" TEXT, PRIMARY KEY ("streak_id", "date")
);

CREATE TABLE reading_list (
  "id" TEXT PRIMARY KEY, "title" TEXT, "author" TEXT, "status" TEXT, "rating" TEXT, "notes" TEXT, "started" TEXT, "finished" TEXT, "cover_url" TEXT, "updatedAt" TEXT
);

CREATE TABLE watchlist (
  "id" TEXT PRIMARY KEY, "title" TEXT, "type" TEXT, "status" TEXT, "rating" TEXT, "notes" TEXT, "year" TEXT, "poster_url" TEXT, "tmdb_id" TEXT, "updatedAt" TEXT
);

CREATE TABLE finance (
  "id" TEXT PRIMARY KEY, "date" TEXT, "type" TEXT, "category" TEXT, "amount" TEXT, "description" TEXT, "updatedAt" TEXT
);

CREATE TABLE bookmarks (
  "id" TEXT PRIMARY KEY, "url" TEXT, "title" TEXT, "description" TEXT, "notes" TEXT, "tags" TEXT, "favicon" TEXT, "created_at" TEXT, "is_read" TEXT, "updatedAt" TEXT
);

CREATE TABLE writing (
  "id" TEXT PRIMARY KEY, "title" TEXT, "content" TEXT, "tags" TEXT, "word_count" TEXT, "created_at" TEXT, "updatedAt" TEXT
);

CREATE TABLE yearly_reviews (
  "year" TEXT PRIMARY KEY, "wins" TEXT, "challenges" TEXT, "lessons" TEXT, "gratitude" TEXT, "theme" TEXT, "updatedAt" TEXT
);

CREATE TABLE twitch_channels (
  "id" TEXT PRIMARY KEY, "login" TEXT, "display_name" TEXT, "profile_image_url" TEXT, "added_at" TEXT
);

CREATE TABLE twitch_dismissed (
  "item_id" TEXT PRIMARY KEY, "dismissed_at" TEXT
);

CREATE TABLE twitch_config (
  "client_id" TEXT PRIMARY KEY, "client_secret" TEXT
);

CREATE TABLE saved_twitch_videos (
  "video_id" TEXT PRIMARY KEY, "title" TEXT, "user_name" TEXT, "user_id" TEXT, "thumbnail_url" TEXT, "created_at" TEXT, "type" TEXT, "url" TEXT, "duration" TEXT, "saved_at" TEXT
);

CREATE TABLE delegation (
  "id" TEXT PRIMARY KEY, "title" TEXT, "source" TEXT, "link" TEXT, "category" TEXT, "importance" TEXT, "note" TEXT, "added_at" TEXT, "rank" TEXT, "due_date" TEXT
);

CREATE TABLE lunasroom (
  "id" TEXT PRIMARY KEY, "title" TEXT, "url" TEXT, "thumbnail" TEXT, "added_at" TEXT, "last_viewed" TEXT, "category" TEXT, "tags" TEXT
);

CREATE TABLE vault_folders (
  "ID" TEXT PRIMARY KEY, "Name" TEXT, "FolderID" TEXT, "FaceGroupsJSON" TEXT, "CreatedAt" TEXT
);

CREATE TABLE vault_faces (
  "FaceUUID" UUID DEFAULT gen_random_uuid() PRIMARY KEY, "FolderID" TEXT, "GroupID" TEXT, "Label" TEXT, "CoverImageID" TEXT, "MemberImageIDs" TEXT, "CreatedAt" TEXT
);

CREATE TABLE vault_liked (
  "ID" TEXT PRIMARY KEY, "Title" TEXT, "ThumbnailLink" TEXT, "LargeSrc" TEXT, "Type" TEXT, "LikedAt" TEXT
);

CREATE TABLE notifications (
  "id" TEXT PRIMARY KEY, "label" TEXT, "time" TEXT, "days" TEXT, "message" TEXT, "enabled" TEXT, "type" TEXT, "last_triggered" TEXT, "updatedAt" TEXT
);

CREATE TABLE rss_feeds (
  "id" TEXT PRIMARY KEY, "url" TEXT, "name" TEXT, "category" TEXT, "icon" TEXT, "added_at" TEXT, "updatedAt" TEXT
);

CREATE TABLE study_folders (
  "folder_id" TEXT PRIMARY KEY, "folder_name" TEXT, "parent_folder_id" TEXT, "color" TEXT, "icon" TEXT, "created_at" TEXT, "delete_status" TEXT
);

CREATE TABLE study_notes (
  "note_id" TEXT PRIMARY KEY, "title" TEXT, "folder_id" TEXT, "content" TEXT, "tags" TEXT, "linked_notes" TEXT, "audio_urls" TEXT, "image_urls" TEXT, "file_urls" TEXT, "created_at" TEXT, "updated_at" TEXT, "delete_status" TEXT
);

CREATE TABLE music_library (
  "id" TEXT PRIMARY KEY, "title" TEXT, "artist" TEXT, "album" TEXT, "drive_file_id" TEXT, "drive_link" TEXT, "file_size_mb" TEXT, "last_played_time" TEXT, "updated_at" TEXT, "folder_id" TEXT
);

CREATE TABLE music_folders (
  "id" TEXT PRIMARY KEY, "name" TEXT, "folder_id" TEXT, "added_at" TEXT
);

CREATE TABLE yt_liked (
  "video_id" TEXT PRIMARY KEY, 
  "title" TEXT, 
  "channel_title" TEXT, 
  "channel_id" TEXT,
  "thumbnail" TEXT, 
  "published_at" TEXT,
  "liked_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE twitch_liked (
  "video_id" TEXT PRIMARY KEY, "title" TEXT, "user_name" TEXT, "thumbnail_url" TEXT, "liked_at" TEXT
);

DROP TABLE IF EXISTS yt_channels CASCADE;
CREATE TABLE yt_channels (
  "id" TEXT PRIMARY KEY, 
  "title" TEXT, 
  "thumbnail" TEXT, 
  "uploadsId" TEXT, 
  "subs" TEXT,
  "added_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS vault_likes CASCADE;
DROP TABLE IF EXISTS yt_dismissed CASCADE;
DROP TABLE IF EXISTS app_passwords CASCADE;

-- (Update vault_liked drop to vault_likes if needed, but I'll just add new ones)

CREATE TABLE vault_likes (
  "file_id" TEXT PRIMARY KEY, "title" TEXT, "thumbnail_link" TEXT, "large_src" TEXT, "type" TEXT, "liked_at" TEXT
);

CREATE TABLE yt_dismissed (
  "video_id" TEXT PRIMARY KEY, "dismissed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE app_passwords (
  "id" TEXT PRIMARY KEY, "label" TEXT, "hash" TEXT, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. APPLY ROW LEVEL SECURITY — Authenticated users only
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow All" ON ' || quote_ident(r.tablename);
    EXECUTE 'DROP POLICY IF EXISTS "Auth Only" ON ' || quote_ident(r.tablename);
    -- Only authenticated Supabase users can access data
    EXECUTE 'CREATE POLICY "Auth Only" ON ' || quote_ident(r.tablename) || 
            ' FOR ALL USING (auth.role() = ''authenticated'')';
  END LOOP;
END $$;

-- 4. SEED INITIAL DATA
INSERT INTO config (config_id, content) 
VALUES ('MAIN_CONFIG', '{"app_name": "LunaOs", "version": "1.0.0"}'::jsonb)
ON CONFLICT (config_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- VAULT R2 OVERHAUL — New Tables (2024)
-- Old tables (vault_folders, vault_index, vault_liked, vault_faces,
-- app_passwords) are preserved below as a migration safety net.
-- Drop them manually after confirming the new system works.
-- ═══════════════════════════════════════════════════════════════════

-- Collections: replaces vault_folders' Drive-folder-linking role
CREATE TABLE IF NOT EXISTS vault_collections (
  id          TEXT PRIMARY KEY DEFAULT 'COL-' || substr(md5(random()::text), 1, 8),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'gallery',  -- gallery | documents | code
  key_prefix  TEXT NOT NULL,                    -- R2 prefix, e.g. "gallery-personal/"
  file_count  INT DEFAULT 0,
  size_bytes  BIGINT DEFAULT 0,
  is_hidden   BOOLEAN DEFAULT FALSE,
  is_secret   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Files: replaces vault_index (one row per R2 object)
CREATE TABLE IF NOT EXISTS vault_files (
  id             TEXT PRIMARY KEY DEFAULT 'FILE-' || substr(md5(random()::text), 1, 12),
  collection_id  TEXT NOT NULL REFERENCES vault_collections(id) ON DELETE CASCADE,
  r2_key         TEXT NOT NULL UNIQUE,
  filename       TEXT NOT NULL,
  size_bytes     BIGINT DEFAULT 0,
  mime_type      TEXT,
  thumbnail_key  TEXT,       -- optional: separate lower-res version in R2
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Liked Files: replaces vault_liked (heart icon toggles this)
CREATE TABLE IF NOT EXISTS vault_liked_files (
  id        TEXT PRIMARY KEY DEFAULT 'LIKE-' || substr(md5(random()::text), 1, 10),
  file_id   TEXT NOT NULL REFERENCES vault_files(id) ON DELETE CASCADE,
  liked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id)
);

-- Face Groups: replaces FaceGroupsJSON blob column in vault_folders
CREATE TABLE IF NOT EXISTS vault_face_groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id       TEXT NOT NULL REFERENCES vault_collections(id) ON DELETE CASCADE,
  person_name         TEXT,
  cover_file_id       TEXT REFERENCES vault_files(id) ON DELETE SET NULL,
  member_file_ids     TEXT[],     -- array of vault_files.id
  descriptor_centroid FLOAT8[],  -- 128-dim centroid for future matching
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Salted App Passwords v2: replaces app_passwords (adds per-record salt)
CREATE TABLE IF NOT EXISTS app_passwords_v2 (
  id          TEXT PRIMARY KEY,
  label       TEXT,
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL,  -- SHA256(salt + password)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vault index (for R2 sync delta tracking)
CREATE TABLE IF NOT EXISTS vault_sync_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id  TEXT NOT NULL REFERENCES vault_collections(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  files_added    INT DEFAULT 0,
  UNIQUE(collection_id)
);

-- Apply RLS to all new tables
ALTER TABLE vault_collections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_liked_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_face_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_passwords_v2     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_sync_log       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth Only" ON vault_collections;
DROP POLICY IF EXISTS "Auth Only" ON vault_files;
DROP POLICY IF EXISTS "Auth Only" ON vault_liked_files;
DROP POLICY IF EXISTS "Auth Only" ON vault_face_groups;
DROP POLICY IF EXISTS "Auth Only" ON app_passwords_v2;
DROP POLICY IF EXISTS "Auth Only" ON vault_sync_log;

CREATE POLICY "Auth Only" ON vault_collections    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Only" ON vault_files          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Only" ON vault_liked_files    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Only" ON vault_face_groups    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Only" ON app_passwords_v2     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth Only" ON vault_sync_log       FOR ALL USING (auth.role() = 'authenticated');


-- 5. Helper Functions (RPC)
CREATE OR REPLACE FUNCTION increment_collection_stats(p_collection_id TEXT, p_file_delta INT, p_size_delta BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE vault_collections
  SET file_count = COALESCE(file_count, 0) + p_file_delta,
      size_bytes = COALESCE(size_bytes, 0) + p_size_delta
  WHERE id = p_collection_id;
END;
$$ LANGUAGE plpgsql;
