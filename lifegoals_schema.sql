-- 1. Life Goals
create table if not exists life_goals (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  description text default '',
  category text default 'Personal',          -- Career, Health, Learning, Financial, Personal, Creative
  priority text default 'medium',            -- low, medium, high, critical
  status text default 'active',              -- active, paused, completed, abandoned
  start_date date not null default current_date,
  target_date date,
  completed_at timestamptz,
  progress_pct integer default 0,            -- 0-100
  milestones jsonb default '[]',             -- [{title, done, date}]
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. AI Decision Analyses (history)
create table if not exists decision_analyses (
  id text primary key,
  user_id uuid not null default auth.uid(),
  activity_name text not null,               -- "Start modding Android"
  activity_description text default '',
  analysis_result jsonb not null,            -- full structured AI response
  verdict text default 'caution',            -- proceed, caution, avoid
  created_at timestamptz default now()
);

-- RLS policies
alter table life_goals enable row level security;
alter table decision_analyses enable row level security;

create policy "Users manage own goals" on life_goals
  for all using (auth.uid() = user_id);

create policy "Users manage own analyses" on decision_analyses
  for all using (auth.uid() = user_id);
