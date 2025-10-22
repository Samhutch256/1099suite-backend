-- Comprehensive fix for all permission issues
-- This will fix the "permission denied" errors for users, clients, expense_categories, team_members, etc.

-- 1) First, let's temporarily disable RLS on all tables to fix the trigger
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_filters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_tokens DISABLE ROW LEVEL SECURITY;

-- 2) Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can select self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- 3) Create a robust trigger function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Add debugging
  RAISE NOTICE 'Trigger fired for user: % with email: %', NEW.id, NEW.email;
  
  -- Try to insert the user record
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
    
  RAISE NOTICE 'Successfully inserted/updated user record for: %', NEW.email;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors but don't fail the auth process
  RAISE WARNING 'Error in handle_new_auth_user: %', SQLERRM;
  RETURN NEW;
END; $$;

-- 4) Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5) Test the trigger with a manual insert
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing trigger with user ID: %', test_user_id;
  
  -- Insert a test user into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
  ) VALUES (
    test_user_id,
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Test User"}'::jsonb
  );
  
  -- Check if the trigger worked
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ SUCCESS: Trigger worked! User record created in public.users';
  ELSE
    RAISE NOTICE '❌ FAILED: Trigger did not work. No user record in public.users';
  END IF;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  DELETE FROM public.users WHERE id = test_user_id;
  
END $$;

-- 6) Re-enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_tokens ENABLE ROW LEVEL SECURITY;

-- 7) Create comprehensive RLS policies for all tables

-- Users table policies
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- Clients table policies
CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- Expense categories table policies
CREATE POLICY "expense_categories_select_policy" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_categories_update_policy" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Team members table policies
CREATE POLICY "team_members_select_policy" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "team_members_insert_policy" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "team_members_update_policy" ON public.team_members
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "team_members_delete_policy" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);

-- Leads table policies
CREATE POLICY "leads_select_policy" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "leads_insert_policy" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_update_policy" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_delete_policy" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses table policies
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Daily inputs table policies
CREATE POLICY "daily_inputs_select_policy" ON public.daily_inputs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_inputs_insert_policy" ON public.daily_inputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_inputs_update_policy" ON public.daily_inputs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_inputs_delete_policy" ON public.daily_inputs
  FOR DELETE USING (auth.uid() = user_id);

-- Settings table policies
CREATE POLICY "settings_select_policy" ON public.settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_policy" ON public.settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_policy" ON public.settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_delete_policy" ON public.settings
  FOR DELETE USING (auth.uid() = user_id);

-- Lead filters table policies
CREATE POLICY "lead_filters_select_policy" ON public.lead_filters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lead_filters_insert_policy" ON public.lead_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lead_filters_update_policy" ON public.lead_filters
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lead_filters_delete_policy" ON public.lead_filters
  FOR DELETE USING (auth.uid() = user_id);

-- Jessica chat history table policies
CREATE POLICY "jessica_chat_history_select_policy" ON public.jessica_chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jessica_chat_history_insert_policy" ON public.jessica_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jessica_chat_history_update_policy" ON public.jessica_chat_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jessica_chat_history_delete_policy" ON public.jessica_chat_history
  FOR DELETE USING (auth.uid() = user_id);

-- Mileage entries table policies
CREATE POLICY "mileage_entries_select_policy" ON public.mileage_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "mileage_entries_insert_policy" ON public.mileage_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mileage_entries_update_policy" ON public.mileage_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mileage_entries_delete_policy" ON public.mileage_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Outreach activities table policies
CREATE POLICY "outreach_activities_select_policy" ON public.outreach_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "outreach_activities_insert_policy" ON public.outreach_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outreach_activities_update_policy" ON public.outreach_activities
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outreach_activities_delete_policy" ON public.outreach_activities
  FOR DELETE USING (auth.uid() = user_id);

-- Plaid accounts table policies
CREATE POLICY "plaid_accounts_select_policy" ON public.plaid_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plaid_accounts_insert_policy" ON public.plaid_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_accounts_update_policy" ON public.plaid_accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_accounts_delete_policy" ON public.plaid_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Plaid transactions table policies
CREATE POLICY "plaid_transactions_select_policy" ON public.plaid_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plaid_transactions_insert_policy" ON public.plaid_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_transactions_update_policy" ON public.plaid_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_transactions_delete_policy" ON public.plaid_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Plaid tokens table policies
CREATE POLICY "plaid_tokens_select_policy" ON public.plaid_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plaid_tokens_insert_policy" ON public.plaid_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_tokens_update_policy" ON public.plaid_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plaid_tokens_delete_policy" ON public.plaid_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- 8) Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.expense_categories TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.daily_inputs TO authenticated;
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.lead_filters TO authenticated;
GRANT ALL ON public.jessica_chat_history TO authenticated;
GRANT ALL ON public.mileage_entries TO authenticated;
GRANT ALL ON public.outreach_activities TO authenticated;
GRANT ALL ON public.plaid_accounts TO authenticated;
GRANT ALL ON public.plaid_transactions TO authenticated;
GRANT ALL ON public.plaid_tokens TO authenticated;

-- 9) Final verification
SELECT 'Trigger status:' as info, 
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger 
         WHERE tgname = 'trg_on_auth_user_created' 
         AND tgrelid = 'auth.users'::regclass
       ) THEN '✅ INSTALLED' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'Function status:' as info,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc 
         WHERE proname = 'handle_new_auth_user' 
         AND pronamespace = 'public'::regnamespace
       ) THEN '✅ INSTALLED' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'RLS enabled tables:' as info,
       (SELECT COUNT(*)::text FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true) as status;
