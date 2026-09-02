-- Add trash system columns to vault_files table
ALTER TABLE vault_files 
ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_collection_id TEXT,
ADD COLUMN IF NOT EXISTS original_r2_key TEXT;
