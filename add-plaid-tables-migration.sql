-- Migration to add Plaid tables to existing database
-- Run this in your Supabase SQL editor

-- 8. Plaid accounts table
CREATE TABLE IF NOT EXISTS public.plaid_accounts (
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
CREATE TABLE IF NOT EXISTS public.plaid_transactions (
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
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON public.plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_account_id ON public.plaid_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_id ON public.plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON public.plaid_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON public.plaid_transactions(date);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id ON public.plaid_transactions(account_id);

-- Enable RLS on Plaid tables
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;

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

-- Updated timestamp triggers for Plaid tables
CREATE TRIGGER set_updated_at_plaid_accounts BEFORE UPDATE ON public.plaid_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_plaid_transactions BEFORE UPDATE ON public.plaid_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 