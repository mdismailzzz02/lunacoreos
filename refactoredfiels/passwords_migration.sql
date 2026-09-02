-- ─── LunaCoreOS: Password Manager Migration ───
-- Run this once in your Supabase SQL Editor.

-- 1. Create the passwords table
DROP TABLE IF EXISTS passwords CASCADE;

CREATE TABLE passwords (
  "id"           TEXT PRIMARY KEY,
  "site_name"    TEXT NOT NULL,
  "site_url"     TEXT,
  "username"     TEXT,
  "enc_password" TEXT NOT NULL,  -- AES-256-GCM ciphertext (base64-encoded)
  "enc_iv"       TEXT NOT NULL,  -- Initialisation Vector for decryption (base64-encoded)
  "notes"        TEXT,
  "category"     TEXT DEFAULT 'General',
  "strength"     TEXT DEFAULT 'fair',   -- 'weak' | 'fair' | 'strong'
  "created_at"   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;

-- 3. Only authenticated Supabase users can read/write
DROP POLICY IF EXISTS "Auth Only" ON passwords;
CREATE POLICY "Auth Only" ON passwords
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Done! The passwords table is ready.
-- Encryption/decryption is handled entirely on the client side (AES-256-GCM via Web Crypto API).
-- The database only ever stores ciphertext — never plaintext passwords.
