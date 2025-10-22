-- Secure Plaid storage tables with encrypted tokens and RLS

-- 1. Plaid items table (encrypted access tokens)
create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  institution_name text,
  access_token_enc text not null,
  transactions_cursor text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, item_id)
);

create index if not exists plaid_items_user_item_idx on public.plaid_items(user_id, item_id);

-- 2. Accounts table (per-item account metadata)
create table if not exists public.accounts (
  account_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  institution_name text,
  name text not null,
  type text not null,
  subtype text,
  mask text,
  current_balance numeric,
  available_balance numeric,
  iso_currency_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists accounts_user_idx on public.accounts(user_id);
create index if not exists accounts_item_idx on public.accounts(plaid_item_id);

-- 3. Transactions table (normalized Plaid transactions)
create table if not exists public.transactions (
  transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null references public.accounts(account_id) on delete cascade,
  amount numeric not null,
  name text not null,
  merchant_name text,
  date date not null,
  category text[],
  pending boolean not null default false,
  payment_channel text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists transactions_user_idx on public.transactions(user_id);
create index if not exists transactions_account_idx on public.transactions(account_id);
create index if not exists transactions_date_idx on public.transactions(date);

-- 4. Updated-at triggers
create trigger set_updated_at_plaid_items
before update on public.plaid_items
for each row execute function public.handle_updated_at();

create trigger set_updated_at_accounts
before update on public.accounts
for each row execute function public.handle_updated_at();

create trigger set_updated_at_transactions
before update on public.transactions
for each row execute function public.handle_updated_at();

-- 5. Row level security
alter table public.plaid_items enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;

-- Only service_role may manage plaid_items directly
create policy if not exists plaid_items_service_role_read on public.plaid_items
  for select using (auth.role() = 'service_role');

create policy if not exists plaid_items_service_role_insert on public.plaid_items
  for insert with check (auth.role() = 'service_role');

create policy if not exists plaid_items_service_role_update on public.plaid_items
  for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists plaid_items_service_role_delete on public.plaid_items
  for delete using (auth.role() = 'service_role');

-- Accounts: users can read their own, service role manages writes
create policy if not exists accounts_select_own on public.accounts
  for select using (auth.uid() = user_id);

create policy if not exists accounts_service_role_insert on public.accounts
  for insert with check (auth.role() = 'service_role');

create policy if not exists accounts_service_role_update on public.accounts
  for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists accounts_service_role_delete on public.accounts
  for delete using (auth.role() = 'service_role');

-- Transactions: users can read their own, service role manages writes
create policy if not exists transactions_select_own on public.transactions
  for select using (auth.uid() = user_id);

create policy if not exists transactions_service_role_insert on public.transactions
  for insert with check (auth.role() = 'service_role');

create policy if not exists transactions_service_role_update on public.transactions
  for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists transactions_service_role_delete on public.transactions
  for delete using (auth.role() = 'service_role');
