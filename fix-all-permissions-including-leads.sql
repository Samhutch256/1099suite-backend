-- Complete Fix for All Table Permissions (Including Leads)
-- Run this in your Supabase SQL Editor

-- 1. Grant permissions to authenticated users for ALL tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plaid_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_stage_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_input_tallies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_input_tallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for leads table (the one causing the current error)
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create RLS policies for clients table
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Create RLS policies for expense_categories table
DROP POLICY IF EXISTS "Users can view own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense categories" ON public.expense_categories;

CREATE POLICY "Users can view own expense categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 7. Create RLS policies for daily_inputs table
DROP POLICY IF EXISTS "Users can view own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can insert own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can update own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can delete own daily inputs" ON public.daily_inputs;

CREATE POLICY "Users can view own daily inputs" ON public.daily_inputs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily inputs" ON public.daily_inputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily inputs" ON public.daily_inputs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily inputs" ON public.daily_inputs
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for user_settings table
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS policies for plaid_accounts table
DROP POLICY IF EXISTS "Users can view own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can insert own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can update own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can delete own plaid accounts" ON public.plaid_accounts;

CREATE POLICY "Users can view own plaid accounts" ON public.plaid_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid accounts" ON public.plaid_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid accounts" ON public.plaid_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid accounts" ON public.plaid_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Create RLS policies for plaid_transactions table
DROP POLICY IF EXISTS "Users can view own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can insert own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can update own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can delete own plaid transactions" ON public.plaid_transactions;

CREATE POLICY "Users can view own plaid transactions" ON public.plaid_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid transactions" ON public.plaid_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid transactions" ON public.plaid_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid transactions" ON public.plaid_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 11. Create RLS policies for team_members table
DROP POLICY IF EXISTS "Users can view own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete own team members" ON public.team_members;

CREATE POLICY "Users can view own team members" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own team members" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own team members" ON public.team_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team members" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Create RLS policies for lead_stage_history table
DROP POLICY IF EXISTS "Users can view own lead stage history" ON public.lead_stage_history;
DROP POLICY IF EXISTS "Users can insert own lead stage history" ON public.lead_stage_history;
DROP POLICY IF EXISTS "Users can update own lead stage history" ON public.lead_stage_history;
DROP POLICY IF EXISTS "Users can delete own lead stage history" ON public.lead_stage_history;

CREATE POLICY "Users can view own lead stage history" ON public.lead_stage_history
  FOR SELECT USING (auth.uid() = changed_by);

CREATE POLICY "Users can insert own lead stage history" ON public.lead_stage_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Users can update own lead stage history" ON public.lead_stage_history
  FOR UPDATE USING (auth.uid() = changed_by);

CREATE POLICY "Users can delete own lead stage history" ON public.lead_stage_history
  FOR DELETE USING (auth.uid() = changed_by);

-- 13. Create RLS policies for lead_input_tallies table
DROP POLICY IF EXISTS "Users can view own lead input tallies" ON public.lead_input_tallies;
DROP POLICY IF EXISTS "Users can insert own lead input tallies" ON public.lead_input_tallies;
DROP POLICY IF EXISTS "Users can update own lead input tallies" ON public.lead_input_tallies;
DROP POLICY IF EXISTS "Users can delete own lead input tallies" ON public.lead_input_tallies;

CREATE POLICY "Users can view own lead input tallies" ON public.lead_input_tallies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead input tallies" ON public.lead_input_tallies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead input tallies" ON public.lead_input_tallies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead input tallies" ON public.lead_input_tallies
  FOR DELETE USING (auth.uid() = user_id);

-- 14. Create RLS policies for follow_up_reminders table
DROP POLICY IF EXISTS "Users can view own follow up reminders" ON public.follow_up_reminders;
DROP POLICY IF EXISTS "Users can insert own follow up reminders" ON public.follow_up_reminders;
DROP POLICY IF EXISTS "Users can update own follow up reminders" ON public.follow_up_reminders;
DROP POLICY IF EXISTS "Users can delete own follow up reminders" ON public.follow_up_reminders;

CREATE POLICY "Users can view own follow up reminders" ON public.follow_up_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follow up reminders" ON public.follow_up_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own follow up reminders" ON public.follow_up_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own follow up reminders" ON public.follow_up_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- 15. Create RLS policies for expenses table
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- 16. Verify the fix
SELECT 
  tablename as table_name,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'clients', 'expense_categories', 'users', 'daily_inputs', 'user_settings', 'plaid_accounts', 'plaid_transactions', 'team_members', 'lead_stage_history', 'lead_input_tallies', 'follow_up_reminders', 'expenses')
ORDER BY tablename;
