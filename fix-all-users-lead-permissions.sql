-- COMPREHENSIVE FIX: Grant lead upload permissions to ALL users (existing and future)
-- This ensures everyone can create leads automatically

-- ========================================
-- PART 1: Grant permissions to ALL authenticated users
-- ========================================

-- Grant schema access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant full permissions on all essential tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Grant sequence permissions (needed for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- PART 2: Set up RLS policies correctly
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can select self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;

DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can select own leads" ON public.leads;

-- Create comprehensive RLS policies for USERS table
CREATE POLICY "Users can select self"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update self"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert self"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create comprehensive RLS policies for LEADS table
-- These policies allow ANY authenticated user to work with their own leads
CREATE POLICY "Users can select own leads"
  ON public.leads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON public.leads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON public.leads
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- PART 3: Ensure user records are auto-created for new signups
-- ========================================

-- Create or replace the trigger function that auto-creates user records
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END; $$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ========================================
-- PART 4: Fix any existing users missing from public.users
-- ========================================

-- Add any auth users that don't have a public.users record
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    ) as name,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- ========================================
-- PART 5: Test that everything works
-- ========================================

-- Test 1: Verify all auth users now have public.users records
SELECT 
    'Step 1: User Record Verification' as test,
    COUNT(DISTINCT au.id) as total_auth_users,
    COUNT(DISTINCT pu.id) as users_in_public_table,
    CASE 
        WHEN COUNT(DISTINCT au.id) = COUNT(DISTINCT pu.id) THEN '✅ ALL USERS HAVE RECORDS'
        ELSE '❌ SOME USERS MISSING'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

-- Test 2: Verify permissions are granted
SELECT 
    'Step 2: Permission Verification' as test,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as permissions,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ HAS FULL PERMISSIONS'
        ELSE '⚠️ LIMITED PERMISSIONS'
    END as status
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'leads'
  AND grantee = 'authenticated'
GROUP BY grantee;

-- Test 3: Verify RLS policies exist
SELECT 
    'Step 3: RLS Policy Verification' as test,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ ALL POLICIES PRESENT'
        ELSE '⚠️ MISSING POLICIES'
    END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'leads';

-- Test 4: Verify trigger exists
SELECT 
    'Step 4: Auto-Creation Trigger Verification' as test,
    trigger_name,
    event_manipulation,
    '✅ TRIGGER ACTIVE' as status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'trg_on_auth_user_created';

-- ========================================
-- FINAL SUMMARY
-- ========================================
SELECT 
    '🎉 SETUP COMPLETE' as status,
    'All users (existing and new) can now create leads!' as message;

-- Show all users to verify
SELECT 
    'All Users:' as info,
    id,
    email,
    name,
    created_at
FROM public.users
ORDER BY created_at DESC;

