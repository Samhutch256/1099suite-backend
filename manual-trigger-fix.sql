-- Manual fix for user account creation trigger
-- Run this in your Supabase SQL Editor to fix the issue

-- 1) First, let's disable RLS temporarily to make sure it's not blocking the trigger
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2) Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Add some debugging
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
  -- Log any errors
  RAISE WARNING 'Error in handle_new_auth_user: %', SQLERRM;
  RETURN NEW;
END; $$;

-- 3) Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4) Test the trigger manually by creating a test user in auth.users
-- (This simulates what happens when someone signs up)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Creating test user with ID: %', test_user_id;
  
  -- Insert a test user into auth.users (this should trigger our function)
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

-- 5) Re-enable RLS with proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6) Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can select self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- 7) Create new policies
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- 8) Final verification
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
SELECT 'RLS status:' as info,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_tables 
         WHERE tablename = 'users' 
         AND schemaname = 'public' 
         AND rowsecurity = true
       ) THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status;
