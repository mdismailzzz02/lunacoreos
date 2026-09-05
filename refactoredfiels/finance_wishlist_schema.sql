-- 7. Wishlist / Upcoming Purchases
create table if not exists finance_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_name text not null,
  description text,
  approx_cost numeric default 0,
  target_date date,
  image_url text,
  priority text default 'medium' check (priority in ('high','medium','low')),
  status text default 'active' check (status in ('active','purchased','abandoned')),
  created_at timestamptz default now()
);

-- Note: Since we are using Cloudflare R2 via presigned URLs for image uploads, 
-- we do not need to create a Supabase Storage bucket here. The `image_url` column 
-- will simply store the public URL of the uploaded image on Cloudflare R2.

-- Enable Row Level Security (RLS)
alter table finance_wishlist enable row level security;

-- Create RLS Policies
create policy "Users can view their own wishlist items."
  on finance_wishlist for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own wishlist items."
  on finance_wishlist for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own wishlist items."
  on finance_wishlist for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own wishlist items."
  on finance_wishlist for delete
  using ( auth.uid() = user_id );
