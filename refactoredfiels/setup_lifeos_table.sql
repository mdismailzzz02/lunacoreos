-- LifeOS life_logs table
-- Run this in your Supabase SQL editor for the LifeOS project
-- (rpxhmlzrcklnkxhjsucc.supabase.co)

CREATE TABLE IF NOT EXISTS life_logs (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  type        text NOT NULL,       -- 'morning', 'evening', 'weekly', 'monthly', 'okr', 'woop', 'decision', 'premortem'
  date        text NOT NULL,       -- ISO date string 'YYYY-MM-DD'
  payload     jsonb,               -- form data as JSON
  -- OKR-specific columns
  objective   text,
  category    text,
  confidence  int,
  key_results jsonb                -- [{text, progress}]
);

-- Unique constraint prevents duplicate daily logs of same type
CREATE UNIQUE INDEX IF NOT EXISTS life_logs_type_date_unique
  ON life_logs (type, date)
  WHERE type IN ('morning', 'evening', 'weekly', 'monthly');

-- Index for fast date range queries
CREATE INDEX IF NOT EXISTS life_logs_date_idx ON life_logs (date);
CREATE INDEX IF NOT EXISTS life_logs_type_idx ON life_logs (type);

-- Enable RLS (optional but recommended)
ALTER TABLE life_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations if you're using anon key without auth
-- Replace with proper auth policies if you add user accounts later
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'life_logs' AND policyname = 'allow_all_lifeos'
  ) THEN
    CREATE POLICY "allow_all_lifeos"
      ON life_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
