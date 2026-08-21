-- ═══════════════════════════════════════════════════════
-- LunaCore Music Player — Cloudflare R2 Migration
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ═══════════════════════════════════════════════════════

-- 1. Add R2 columns to music_folders
ALTER TABLE music_folders
  ADD COLUMN IF NOT EXISTS r2_prefix    text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Add R2 key + duration to music_library
ALTER TABLE music_library
  ADD COLUMN IF NOT EXISTS r2_key   text,
  ADD COLUMN IF NOT EXISTS duration real;

-- 3. Seed your folders (run once, adjust names as needed)
-- Add more rows here for each folder you create in R2
INSERT INTO music_folders (name, r2_prefix, display_name, added_at)
VALUES
  ('english_songs', 'music_player/english_songs', 'English Songs', now()),
  ('hindi_songs',   'music_player/hindi_songs',   'Hindi Songs',   now()),
  ('lofi',          'music_player/lofi',           'Lo-Fi',         now())
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- HOW TO ADD TRACKS MANUALLY (Option A):
-- After uploading music_player/english_songs/song.mp3 to R2, run:
--
-- INSERT INTO music_library (title, artist, album, r2_key, file_size_mb, folder_id, last_played_time, updated_at)
-- SELECT
--   'Song Title',
--   'Artist Name',
--   'Album Name',
--   'music_player/english_songs/song.mp3',
--   5.2,
--   id,
--   0,
--   now()
-- FROM music_folders WHERE name = 'english_songs';
-- ═══════════════════════════════════════════════════════
