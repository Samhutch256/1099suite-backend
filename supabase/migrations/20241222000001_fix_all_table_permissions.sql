-- Fix permissions for all tables that are causing errors
-- This migration ensures all tables have proper RLS policies

-- First, create any missing tables that the app expects

-- Create settings table if it doesn't exist
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  settings_data jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on settings table
alter table public.settings enable row level security;

-- Create lead_filters table if it doesn't exist
create table if not exists public.lead_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filter_name text not null,
  filter_data jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on lead_filters table
alter table public.lead_filters enable row level security;

-- Create jessica_chat_history table if it doesn't exist
create table if not exists public.jessica_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  is_user_message boolean default false,
  created_at timestamptz not null default now()
);

-- Enable RLS on jessica_chat_history table
alter table public.jessica_chat_history enable row level security;

-- Create mileage_entries table if it doesn't exist
create table if not exists public.mileage_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  miles numeric(10,2) not null,
  purpose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on mileage_entries table
alter table public.mileage_entries enable row level security;

-- Create outreach_activities table if it doesn't exist
create table if not exists public.outreach_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  activity_type text not null,
  count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on outreach_activities table
alter table public.outreach_activities enable row level security;

-- Create plaid_accounts table if it doesn't exist
create table if not exists public.plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  account_id text not null,
  account_name text,
  account_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on plaid_accounts table
alter table public.plaid_accounts enable row level security;

-- Create plaid_transactions table if it doesn't exist
create table if not exists public.plaid_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  transaction_id text not null,
  account_id text not null,
  amount numeric(10,2) not null,
  date text not null,
  description text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on plaid_transactions table
alter table public.plaid_transactions enable row level security;

-- Create plaid_tokens table if it doesn't exist
create table if not exists public.plaid_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  access_token text not null,
  item_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on plaid_tokens table
alter table public.plaid_tokens enable row level security;

-- Now create policies for all tables (only if they don't already exist)

-- 1. Fix expense_categories table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expense_categories' and policyname='Users can select own expense categories'
  ) then
    create policy "Users can select own expense categories"
      on public.expense_categories for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expense_categories' and policyname='Users can insert own expense categories'
  ) then
    create policy "Users can insert own expense categories"
      on public.expense_categories for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expense_categories' and policyname='Users can update own expense categories'
  ) then
    create policy "Users can update own expense categories"
      on public.expense_categories for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expense_categories' and policyname='Users can delete own expense categories'
  ) then
    create policy "Users can delete own expense categories"
      on public.expense_categories for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 2. Fix leads table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='leads' and policyname='Users can select own leads'
  ) then
    create policy "Users can select own leads"
      on public.leads for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='leads' and policyname='Users can insert own leads'
  ) then
    create policy "Users can insert own leads"
      on public.leads for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='leads' and policyname='Users can update own leads'
  ) then
    create policy "Users can update own leads"
      on public.leads for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='leads' and policyname='Users can delete own leads'
  ) then
    create policy "Users can delete own leads"
      on public.leads for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 3. Create clients table if it doesn't exist
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on clients table
alter table public.clients enable row level security;

-- Add policies for clients table
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clients' and policyname='Users can select own clients'
  ) then
    create policy "Users can select own clients"
      on public.clients for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clients' and policyname='Users can insert own clients'
  ) then
    create policy "Users can insert own clients"
      on public.clients for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clients' and policyname='Users can update own clients'
  ) then
    create policy "Users can update own clients"
      on public.clients for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clients' and policyname='Users can delete own clients'
  ) then
    create policy "Users can delete own clients"
      on public.clients for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 4. Fix expenses table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expenses' and policyname='Users can select own expenses'
  ) then
    create policy "Users can select own expenses"
      on public.expenses for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expenses' and policyname='Users can insert own expenses'
  ) then
    create policy "Users can insert own expenses"
      on public.expenses for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expenses' and policyname='Users can update own expenses'
  ) then
    create policy "Users can update own expenses"
      on public.expenses for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='expenses' and policyname='Users can delete own expenses'
  ) then
    create policy "Users can delete own expenses"
      on public.expenses for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 5. Fix follow_up_reminders table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='follow_up_reminders' and policyname='Users can select own reminders'
  ) then
    create policy "Users can select own reminders"
      on public.follow_up_reminders for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='follow_up_reminders' and policyname='Users can insert own reminders'
  ) then
    create policy "Users can insert own reminders"
      on public.follow_up_reminders for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='follow_up_reminders' and policyname='Users can update own reminders'
  ) then
    create policy "Users can update own reminders"
      on public.follow_up_reminders for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='follow_up_reminders' and policyname='Users can delete own reminders'
  ) then
    create policy "Users can delete own reminders"
      on public.follow_up_reminders for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 6. Fix daily_inputs table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='daily_inputs' and policyname='Users can select own daily inputs'
  ) then
    create policy "Users can select own daily inputs"
      on public.daily_inputs for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='daily_inputs' and policyname='Users can insert own daily inputs'
  ) then
    create policy "Users can insert own daily inputs"
      on public.daily_inputs for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='daily_inputs' and policyname='Users can update own daily inputs'
  ) then
    create policy "Users can update own daily inputs"
      on public.daily_inputs for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='daily_inputs' and policyname='Users can delete own daily inputs'
  ) then
    create policy "Users can delete own daily inputs"
      on public.daily_inputs for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 7. Fix team_members table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='team_members' and policyname='Users can select own team members'
  ) then
    create policy "Users can select own team members"
      on public.team_members for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='team_members' and policyname='Users can insert own team members'
  ) then
    create policy "Users can insert own team members"
      on public.team_members for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='team_members' and policyname='Users can update own team members'
  ) then
    create policy "Users can update own team members"
      on public.team_members for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='team_members' and policyname='Users can delete own team members'
  ) then
    create policy "Users can delete own team members"
      on public.team_members for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 8. Fix settings table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='settings' and policyname='Users can select own settings'
  ) then
    create policy "Users can select own settings"
      on public.settings for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='settings' and policyname='Users can insert own settings'
  ) then
    create policy "Users can insert own settings"
      on public.settings for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='settings' and policyname='Users can update own settings'
  ) then
    create policy "Users can update own settings"
      on public.settings for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='settings' and policyname='Users can delete own settings'
  ) then
    create policy "Users can delete own settings"
      on public.settings for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 9. Fix lead_filters table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='lead_filters' and policyname='Users can select own lead filters'
  ) then
    create policy "Users can select own lead filters"
      on public.lead_filters for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='lead_filters' and policyname='Users can insert own lead filters'
  ) then
    create policy "Users can insert own lead filters"
      on public.lead_filters for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='lead_filters' and policyname='Users can update own lead filters'
  ) then
    create policy "Users can update own lead filters"
      on public.lead_filters for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='lead_filters' and policyname='Users can delete own lead filters'
  ) then
    create policy "Users can delete own lead filters"
      on public.lead_filters for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 10. Fix jessica_chat_history table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='jessica_chat_history' and policyname='Users can select own chat history'
  ) then
    create policy "Users can select own chat history"
      on public.jessica_chat_history for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='jessica_chat_history' and policyname='Users can insert own chat history'
  ) then
    create policy "Users can insert own chat history"
      on public.jessica_chat_history for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='jessica_chat_history' and policyname='Users can update own chat history'
  ) then
    create policy "Users can update own chat history"
      on public.jessica_chat_history for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='jessica_chat_history' and policyname='Users can delete own chat history'
  ) then
    create policy "Users can delete own chat history"
      on public.jessica_chat_history for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 11. Fix mileage_entries table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='mileage_entries' and policyname='Users can select own mileage entries'
  ) then
    create policy "Users can select own mileage entries"
      on public.mileage_entries for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='mileage_entries' and policyname='Users can insert own mileage entries'
  ) then
    create policy "Users can insert own mileage entries"
      on public.mileage_entries for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='mileage_entries' and policyname='Users can update own mileage entries'
  ) then
    create policy "Users can update own mileage entries"
      on public.mileage_entries for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='mileage_entries' and policyname='Users can delete own mileage entries'
  ) then
    create policy "Users can delete own mileage entries"
      on public.mileage_entries for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 12. Fix outreach_activities table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='outreach_activities' and policyname='Users can select own outreach activities'
  ) then
    create policy "Users can select own outreach activities"
      on public.outreach_activities for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='outreach_activities' and policyname='Users can insert own outreach activities'
  ) then
    create policy "Users can insert own outreach activities"
      on public.outreach_activities for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='outreach_activities' and policyname='Users can update own outreach activities'
  ) then
    create policy "Users can update own outreach activities"
      on public.outreach_activities for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='outreach_activities' and policyname='Users can delete own outreach activities'
  ) then
    create policy "Users can delete own outreach activities"
      on public.outreach_activities for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 13. Fix plaid_accounts table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_accounts' and policyname='Users can select own plaid accounts'
  ) then
    create policy "Users can select own plaid accounts"
      on public.plaid_accounts for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_accounts' and policyname='Users can insert own plaid accounts'
  ) then
    create policy "Users can insert own plaid accounts"
      on public.plaid_accounts for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_accounts' and policyname='Users can update own plaid accounts'
  ) then
    create policy "Users can update own plaid accounts"
      on public.plaid_accounts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_accounts' and policyname='Users can delete own plaid accounts'
  ) then
    create policy "Users can delete own plaid accounts"
      on public.plaid_accounts for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 14. Fix plaid_transactions table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_transactions' and policyname='Users can select own plaid transactions'
  ) then
    create policy "Users can select own plaid transactions"
      on public.plaid_transactions for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_transactions' and policyname='Users can insert own plaid transactions'
  ) then
    create policy "Users can insert own plaid transactions"
      on public.plaid_transactions for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_transactions' and policyname='Users can update own plaid transactions'
  ) then
    create policy "Users can update own plaid transactions"
      on public.plaid_transactions for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_transactions' and policyname='Users can delete own plaid transactions'
  ) then
    create policy "Users can delete own plaid transactions"
      on public.plaid_transactions for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 15. Fix plaid_tokens table permissions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_tokens' and policyname='Users can select own plaid tokens'
  ) then
    create policy "Users can select own plaid tokens"
      on public.plaid_tokens for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_tokens' and policyname='Users can insert own plaid tokens'
  ) then
    create policy "Users can insert own plaid tokens"
      on public.plaid_tokens for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_tokens' and policyname='Users can update own plaid tokens'
  ) then
    create policy "Users can update own plaid tokens"
      on public.plaid_tokens for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='plaid_tokens' and policyname='Users can delete own plaid tokens'
  ) then
    create policy "Users can delete own plaid tokens"
      on public.plaid_tokens for delete
      using (auth.uid() = user_id);
  end if;
end$$;
