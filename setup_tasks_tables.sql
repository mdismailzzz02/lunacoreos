-- Create the tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    icon TEXT DEFAULT '📝',
    recurrence_rule JSONB DEFAULT '{"type": "daily"}'::jsonb,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_paused BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the task_completions table
CREATE TABLE task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    UNIQUE(task_id, date) -- Ensure a task can only be completed once per day
);

-- If you get a "new row violates row-level security policy" error, run these:
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create an index on task_completions date for faster daily queries
CREATE INDEX idx_task_completions_date ON task_completions(date);
CREATE INDEX idx_task_completions_task_id ON task_completions(task_id);
