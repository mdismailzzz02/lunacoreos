-- Run this in your Supabase SQL Editor to add the category column to the wishlist
alter table finance_wishlist add column if not exists category text default 'General';
