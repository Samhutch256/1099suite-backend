-- Hardened Plaid Transactions Setup
-- Run this against Supabase/Postgres (e.g., psql, Supabase SQL editor)

-- 1. Create plaid_items table for storing access tokens securely
create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  item_id text,
  institution_name text,
  created_at timestamptz default now()
);
create index if not exists plaid_items_user_idx on public.plaid_items(user_id);

-- 2. Create plaid_sync_cursors table for storing sync cursors
create table if not exists public.plaid_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  cursor text,
  last_sync_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, item_id)
);
create index if not exists plaid_sync_cursors_user_idx on public.plaid_sync_cursors(user_id);
create index if not exists plaid_sync_cursors_item_idx on public.plaid_sync_cursors(item_id);

-- 3. Ensure expenses table has all required columns
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plaid_transaction_id text unique,
  account_id text,
  date date not null,
  name text,
  merchant_name text,
  amount numeric(12,2) not null,
  currency text default 'USD',
  category text[],
  account_name text,
  pending boolean default false,
  classification text check (classification in ('business','personal','unreviewed')) default 'unreviewed',
  client_id uuid null,
  notes text,
  logo_url text,
  recurring boolean default false,
  original_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Create indexes for performance
create index if not exists idx_expenses_plaid_transaction_id on public.expenses(plaid_transaction_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_classification on public.expenses(classification);

-- 5. Optional sanity check query
-- select user_id, left(access_token,6)||'…' token from public.plaid_items order by created_at desc limit 5;
