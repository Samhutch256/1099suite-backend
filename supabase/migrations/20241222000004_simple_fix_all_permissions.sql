-- SIMPLE FIX: Drop all existing policies and recreate them properly
-- This will definitely fix the permission issues

-- 1) First, disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_filters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_tokens DISABLE ROW LEVEL SECURITY;

-- 2) Drop ALL existing policies
DROP POLICY IF EXISTS "Users can select self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;

DROP POLICY IF EXISTS "Users can view own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense categories" ON public.expense_categories;

DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

DROP POLICY IF EXISTS "Users can view own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can insert own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can update own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can delete own daily inputs" ON public.daily_inputs;

DROP POLICY IF EXISTS "Users can view own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete own team members" ON public.team_members;

DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.settings;

DROP POLICY IF EXISTS "Users can view own lead filters" ON public.lead_filters;
DROP POLICY IF EXISTS "Users can insert own lead filters" ON public.lead_filters;
DROP POLICY IF EXISTS "Users can update own lead filters" ON public.lead_filters;
DROP POLICY IF EXISTS "Users can delete own lead filters" ON public.lead_filters;

DROP POLICY IF EXISTS "Users can view own chat history" ON public.jessica_chat_history;
DROP POLICY IF EXISTS "Users can insert own chat history" ON public.jessica_chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON public.jessica_chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON public.jessica_chat_history;

DROP POLICY IF EXISTS "Users can view own mileage entries" ON public.mileage_entries;
DROP POLICY IF EXISTS "Users can insert own mileage entries" ON public.mileage_entries;
DROP POLICY IF EXISTS "Users can update own mileage entries" ON public.mileage_entries;
DROP POLICY IF EXISTS "Users can delete own mileage entries" ON public.mileage_entries;

DROP POLICY IF EXISTS "Users can view own outreach activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Users can insert own outreach activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Users can update own outreach activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Users can delete own outreach activities" ON public.outreach_activities;

DROP POLICY IF EXISTS "Users can view own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can insert own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can update own plaid accounts" ON public.plaid_accounts;
DROP POLICY IF EXISTS "Users can delete own plaid accounts" ON public.plaid_accounts;

DROP POLICY IF EXISTS "Users can view own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can insert own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can update own plaid transactions" ON public.plaid_transactions;
DROP POLICY IF EXISTS "Users can delete own plaid transactions" ON public.plaid_transactions;

DROP POLICY IF EXISTS "Users can view own plaid tokens" ON public.plaid_tokens;
DROP POLICY IF EXISTS "Users can insert own plaid tokens" ON public.plaid_tokens;
DROP POLICY IF EXISTS "Users can update own plaid tokens" ON public.plaid_tokens;
DROP POLICY IF EXISTS "Users can delete own plaid tokens" ON public.plaid_tokens;

-- 3) Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
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

-- 4) Create SIMPLE policies that work
-- Users table
CREATE POLICY "users_select_policy" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_policy" ON public.users FOR DELETE USING (auth.uid() = id);

-- expense_categories table
CREATE POLICY "expense_categories_select_policy" ON public.expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expense_categories_update_policy" ON public.expense_categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories FOR DELETE USING (auth.uid() = user_id);

-- leads table
CREATE POLICY "leads_select_policy" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "leads_insert_policy" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_update_policy" ON public.leads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_delete_policy" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- clients table
CREATE POLICY "clients_select_policy" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_policy" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_policy" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_delete_policy" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- expenses table
CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert_policy" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update_policy" ON public.expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete_policy" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- daily_inputs table
CREATE POLICY "daily_inputs_select_policy" ON public.daily_inputs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_inputs_insert_policy" ON public.daily_inputs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_inputs_update_policy" ON public.daily_inputs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_inputs_delete_policy" ON public.daily_inputs FOR DELETE USING (auth.uid() = user_id);

-- team_members table
CREATE POLICY "team_members_select_policy" ON public.team_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "team_members_insert_policy" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_update_policy" ON public.team_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_delete_policy" ON public.team_members FOR DELETE USING (auth.uid() = user_id);

-- settings table
CREATE POLICY "settings_select_policy" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert_policy" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update_policy" ON public.settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_delete_policy" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- lead_filters table
CREATE POLICY "lead_filters_select_policy" ON public.lead_filters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lead_filters_insert_policy" ON public.lead_filters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lead_filters_update_policy" ON public.lead_filters FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lead_filters_delete_policy" ON public.lead_filters FOR DELETE USING (auth.uid() = user_id);

-- jessica_chat_history table
CREATE POLICY "jessica_chat_history_select_policy" ON public.jessica_chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "jessica_chat_history_insert_policy" ON public.jessica_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jessica_chat_history_update_policy" ON public.jessica_chat_history FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jessica_chat_history_delete_policy" ON public.jessica_chat_history FOR DELETE USING (auth.uid() = user_id);

-- mileage_entries table
CREATE POLICY "mileage_entries_select_policy" ON public.mileage_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mileage_entries_insert_policy" ON public.mileage_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mileage_entries_update_policy" ON public.mileage_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mileage_entries_delete_policy" ON public.mileage_entries FOR DELETE USING (auth.uid() = user_id);

-- outreach_activities table
CREATE POLICY "outreach_activities_select_policy" ON public.outreach_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outreach_activities_insert_policy" ON public.outreach_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outreach_activities_update_policy" ON public.outreach_activities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outreach_activities_delete_policy" ON public.outreach_activities FOR DELETE USING (auth.uid() = user_id);

-- plaid_accounts table
CREATE POLICY "plaid_accounts_select_policy" ON public.plaid_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plaid_accounts_insert_policy" ON public.plaid_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_accounts_update_policy" ON public.plaid_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_accounts_delete_policy" ON public.plaid_accounts FOR DELETE USING (auth.uid() = user_id);

-- plaid_transactions table
CREATE POLICY "plaid_transactions_select_policy" ON public.plaid_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plaid_transactions_insert_policy" ON public.plaid_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_transactions_update_policy" ON public.plaid_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_transactions_delete_policy" ON public.plaid_transactions FOR DELETE USING (auth.uid() = user_id);

-- plaid_tokens table
CREATE POLICY "plaid_tokens_select_policy" ON public.plaid_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plaid_tokens_insert_policy" ON public.plaid_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_tokens_update_policy" ON public.plaid_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plaid_tokens_delete_policy" ON public.plaid_tokens FOR DELETE USING (auth.uid() = user_id);
