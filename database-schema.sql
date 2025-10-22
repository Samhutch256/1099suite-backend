-- 1099Suite Database Schema for Supabase
-- Run these commands in your Supabase SQL editor

-- Enable RLS (Row Level Security)
-- This will be applied to all tables to ensure users can only access their own data

-- 1. Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  current_office TEXT DEFAULT 'Main Office',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Leads table
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  highest_stage_reached TEXT,
  cancellation_status TEXT,
  selected_pipeline_stages TEXT[],
  value DECIMAL(10,2) DEFAULT 0,
  revenue JSONB DEFAULT NULL,
  notes TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'other',
  appointment_date TEXT,
  appointment_time TEXT,
  appointment_notes TEXT,
  appointment_status TEXT,
  cancelled_reason TEXT,
  lost_reason TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  appointment_created_from TEXT,
  appointment_set_on_date TEXT,
  date_set TEXT,
  date_set_for TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Follow-up reminders table
CREATE TABLE public.follow_up_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'call',
  notes TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  notification_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EXPENSES TABLE
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  amount numeric not null,
  category text,
  vendor_name text,
  card_used text,
  is_business boolean default true,
  client_id uuid references clients(id),
  timestamp timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

-- CLIENTS TABLE
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  email text
);

-- EXPENSE CATEGORIES TABLE (optional, for custom user-defined categories)
create table if not exists expense_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamp default now()
);

-- 5. Team members table
CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Daily inputs table
CREATE TABLE public.daily_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  mileage_driven DECIMAL(10,2) DEFAULT 0,
  expenses DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 7. User settings table
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  app_settings JSONB DEFAULT '{}',
  lead_filter_settings JSONB DEFAULT '{}',
  input_settings JSONB DEFAULT '{}',
  kpi_visibility JSONB DEFAULT '{}',
  visibility_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 8. Plaid accounts table
CREATE TABLE public.plaid_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  accounts JSONB DEFAULT '[]',
  last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- 9. Plaid transactions table
CREATE TABLE public.plaid_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  merchant_name TEXT,
  account_name TEXT NOT NULL,
  classification TEXT DEFAULT 'unclassified',
  client_tag TEXT,
  job_tag TEXT,
  is_business_expense BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  source TEXT DEFAULT 'plaid',
  is_reviewed BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  pending BOOLEAN DEFAULT FALSE,
  original_transaction JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, transaction_id)
);

-- Indexes for better performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_updated_at ON public.leads(updated_at);
CREATE INDEX idx_follow_up_reminders_user_id ON public.follow_up_reminders(user_id);
CREATE INDEX idx_follow_up_reminders_lead_id ON public.follow_up_reminders(lead_id);
CREATE INDEX idx_follow_up_reminders_date ON public.follow_up_reminders(date);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_daily_inputs_user_id ON public.daily_inputs(user_id);
CREATE INDEX idx_daily_inputs_date ON public.daily_inputs(date);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_plaid_accounts_user_id ON public.plaid_accounts(user_id);
CREATE INDEX idx_plaid_accounts_account_id ON public.plaid_accounts(account_id);
CREATE INDEX idx_plaid_transactions_user_id ON public.plaid_transactions(user_id);
CREATE INDEX idx_plaid_transactions_transaction_id ON public.plaid_transactions(transaction_id);
CREATE INDEX idx_plaid_transactions_date ON public.plaid_transactions(date);
CREATE INDEX idx_plaid_transactions_account_id ON public.plaid_transactions(account_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;

-- Users table policy
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Leads table policies
CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- Follow-up reminders table policies
CREATE POLICY "Users can view own reminders" ON public.follow_up_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON public.follow_up_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON public.follow_up_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON public.follow_up_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses table policies
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Clients table policies
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- Expense categories table policies
CREATE POLICY "Users can view own expense categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Team members table policies
CREATE POLICY "Users can view own team members" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own team members" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own team members" ON public.team_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team members" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);

-- Daily inputs table policies
CREATE POLICY "Users can view own daily inputs" ON public.daily_inputs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily inputs" ON public.daily_inputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily inputs" ON public.daily_inputs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily inputs" ON public.daily_inputs
  FOR DELETE USING (auth.uid() = user_id);

-- User settings table policies
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Plaid accounts table policies
CREATE POLICY "Users can view own plaid accounts" ON public.plaid_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid accounts" ON public.plaid_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid accounts" ON public.plaid_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid accounts" ON public.plaid_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Plaid transactions table policies
CREATE POLICY "Users can view own plaid transactions" ON public.plaid_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid transactions" ON public.plaid_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid transactions" ON public.plaid_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid transactions" ON public.plaid_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_follow_up_reminders BEFORE UPDATE ON public.follow_up_reminders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_team_members BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_daily_inputs BEFORE UPDATE ON public.daily_inputs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_user_settings BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_plaid_accounts BEFORE UPDATE ON public.plaid_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_plaid_transactions BEFORE UPDATE ON public.plaid_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();