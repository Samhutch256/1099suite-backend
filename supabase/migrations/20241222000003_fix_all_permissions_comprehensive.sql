-- Comprehensive fix for all table permissions
-- This migration ensures all tables exist and have proper RLS policies

-- 1) First, create any missing tables
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text DEFAULT 'new',
  value numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  date date NOT NULL,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_inputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours_worked numeric(4,2),
  miles_driven integer,
  expenses numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS public.lead_filters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  criteria jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jessica_chat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text,
  timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mileage_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  miles numeric(6,2) NOT NULL,
  purpose text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  notes text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plaid_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  name text,
  type text,
  subtype text,
  mask text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plaid_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  account_id text,
  amount numeric(10,2),
  date date,
  name text,
  category text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plaid_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  item_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_tokens ENABLE ROW LEVEL SECURITY;

-- 3) Create comprehensive RLS policies for all tables
-- expense_categories policies
DROP POLICY IF EXISTS "Users can view own expense categories" ON public.expense_categories;
CREATE POLICY "Users can view own expense categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expense categories" ON public.expense_categories;
CREATE POLICY "Users can insert own expense categories"
  ON public.expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expense categories" ON public.expense_categories;
CREATE POLICY "Users can update own expense categories"
  ON public.expense_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expense categories" ON public.expense_categories;
CREATE POLICY "Users can delete own expense categories"
  ON public.expense_categories FOR DELETE
  USING (auth.uid() = user_id);

-- leads policies
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
CREATE POLICY "Users can insert own leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = user_id);

-- clients policies
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = user_id);

-- expenses policies
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- daily_inputs policies
DROP POLICY IF EXISTS "Users can view own daily inputs" ON public.daily_inputs;
CREATE POLICY "Users can view own daily inputs"
  ON public.daily_inputs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily inputs" ON public.daily_inputs;
CREATE POLICY "Users can insert own daily inputs"
  ON public.daily_inputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily inputs" ON public.daily_inputs;
CREATE POLICY "Users can update own daily inputs"
  ON public.daily_inputs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily inputs" ON public.daily_inputs;
CREATE POLICY "Users can delete own daily inputs"
  ON public.daily_inputs FOR DELETE
  USING (auth.uid() = user_id);

-- team_members policies
DROP POLICY IF EXISTS "Users can view own team members" ON public.team_members;
CREATE POLICY "Users can view own team members"
  ON public.team_members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own team members" ON public.team_members;
CREATE POLICY "Users can insert own team members"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own team members" ON public.team_members;
CREATE POLICY "Users can update own team members"
  ON public.team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own team members" ON public.team_members;
CREATE POLICY "Users can delete own team members"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON public.settings;
CREATE POLICY "Users can delete own settings"
  ON public.settings FOR DELETE
  USING (auth.uid() = user_id);

-- lead_filters policies
DROP POLICY IF EXISTS "Users can view own lead filters" ON public.lead_filters;
CREATE POLICY "Users can view own lead filters"
  ON public.lead_filters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lead filters" ON public.lead_filters;
CREATE POLICY "Users can insert own lead filters"
  ON public.lead_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lead filters" ON public.lead_filters;
CREATE POLICY "Users can update own lead filters"
  ON public.lead_filters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lead filters" ON public.lead_filters;
CREATE POLICY "Users can delete own lead filters"
  ON public.lead_filters FOR DELETE
  USING (auth.uid() = user_id);

-- jessica_chat_history policies
DROP POLICY IF EXISTS "Users can view own chat history" ON public.jessica_chat_history;
CREATE POLICY "Users can view own chat history"
  ON public.jessica_chat_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat history" ON public.jessica_chat_history;
CREATE POLICY "Users can insert own chat history"
  ON public.jessica_chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat history" ON public.jessica_chat_history;
CREATE POLICY "Users can update own chat history"
  ON public.jessica_chat_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat history" ON public.jessica_chat_history;
CREATE POLICY "Users can delete own chat history"
  ON public.jessica_chat_history FOR DELETE
  USING (auth.uid() = user_id);

-- mileage_entries policies
DROP POLICY IF EXISTS "Users can view own mileage entries" ON public.mileage_entries;
CREATE POLICY "Users can view own mileage entries"
  ON public.mileage_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mileage entries" ON public.mileage_entries;
CREATE POLICY "Users can insert own mileage entries"
  ON public.mileage_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mileage entries" ON public.mileage_entries;
CREATE POLICY "Users can update own mileage entries"
  ON public.mileage_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mileage entries" ON public.mileage_entries;
CREATE POLICY "Users can delete own mileage entries"
  ON public.mileage_entries FOR DELETE
  USING (auth.uid() = user_id);

-- outreach_activities policies
DROP POLICY IF EXISTS "Users can view own outreach activities" ON public.outreach_activities;
CREATE POLICY "Users can view own outreach activities"
  ON public.outreach_activities FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outreach activities" ON public.outreach_activities;
CREATE POLICY "Users can insert own outreach activities"
  ON public.outreach_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own outreach activities" ON public.outreach_activities;
CREATE POLICY "Users can update own outreach activities"
  ON public.outreach_activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outreach activities" ON public.outreach_activities;
CREATE POLICY "Users can delete own outreach activities"
  ON public.outreach_activities FOR DELETE
  USING (auth.uid() = user_id);

-- plaid_accounts policies
DROP POLICY IF EXISTS "Users can view own plaid accounts" ON public.plaid_accounts;
CREATE POLICY "Users can view own plaid accounts"
  ON public.plaid_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plaid accounts" ON public.plaid_accounts;
CREATE POLICY "Users can insert own plaid accounts"
  ON public.plaid_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plaid accounts" ON public.plaid_accounts;
CREATE POLICY "Users can update own plaid accounts"
  ON public.plaid_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plaid accounts" ON public.plaid_accounts;
CREATE POLICY "Users can delete own plaid accounts"
  ON public.plaid_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- plaid_transactions policies
DROP POLICY IF EXISTS "Users can view own plaid transactions" ON public.plaid_transactions;
CREATE POLICY "Users can view own plaid transactions"
  ON public.plaid_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plaid transactions" ON public.plaid_transactions;
CREATE POLICY "Users can insert own plaid transactions"
  ON public.plaid_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plaid transactions" ON public.plaid_transactions;
CREATE POLICY "Users can update own plaid transactions"
  ON public.plaid_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plaid transactions" ON public.plaid_transactions;
CREATE POLICY "Users can delete own plaid transactions"
  ON public.plaid_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- plaid_tokens policies
DROP POLICY IF EXISTS "Users can view own plaid tokens" ON public.plaid_tokens;
CREATE POLICY "Users can view own plaid tokens"
  ON public.plaid_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plaid tokens" ON public.plaid_tokens;
CREATE POLICY "Users can insert own plaid tokens"
  ON public.plaid_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plaid tokens" ON public.plaid_tokens;
CREATE POLICY "Users can update own plaid tokens"
  ON public.plaid_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plaid tokens" ON public.plaid_tokens;
CREATE POLICY "Users can delete own plaid tokens"
  ON public.plaid_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Add updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- Add triggers to all tables that have updated_at
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'expense_categories', 'leads', 'clients', 'expenses', 'daily_inputs',
      'team_members', 'settings', 'lead_filters', 'mileage_entries',
      'plaid_accounts', 'plaid_transactions', 'plaid_tokens'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
      CREATE TRIGGER trg_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;
