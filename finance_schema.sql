-- 1. Accounts (bank, cash, card, investment)
create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text check (type in ('bank','cash','credit_card','investment','loan')),
  currency varchar(3) default 'INR',
  opening_balance numeric default 0,
  current_balance numeric default 0,
  is_archived boolean default false,
  created_at timestamptz default now()
);

-- 2. Recurring transactions / subscriptions
create table if not exists finance_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  amount numeric not null,
  category text,
  frequency text check (frequency in ('weekly','monthly','yearly')),
  next_due_date date not null,
  account_id uuid references finance_accounts(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Extend existing finance table
-- Warning: If wiping old data is desired, you can uncomment `truncate table finance;`
-- truncate table finance;

alter table finance
  add column if not exists note text,
  add column if not exists receipt_r2_key text,
  add column if not exists currency varchar(3) default 'INR',
  add column if not exists tags text[],
  add column if not exists is_recurring boolean default false,
  add column if not exists recurring_id uuid references finance_recurring(id),
  add column if not exists account_id uuid references finance_accounts(id);

-- 4. Budgets
create table if not exists finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  monthly_limit numeric not null,
  alert_threshold_pct int default 80,
  created_at timestamptz default now()
);

-- 5. Financial goals
create table if not exists finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date,
  linked_account_id uuid references finance_accounts(id),
  created_at timestamptz default now()
);

-- 6. Net worth snapshots
create table if not exists finance_networth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_date date not null,
  total_assets numeric,
  total_liabilities numeric,
  net_worth numeric,
  created_at timestamptz default now()
);
