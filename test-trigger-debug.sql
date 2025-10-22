-- Debug script to test user account creation trigger
-- Run this in your Supabase SQL Editor to diagnose the issue

-- 1) First, let's check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trg_on_auth_user_created';

-- 2) Check if the function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_auth_user';

-- 3) Check the current users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 4) Check if RLS is enabled and what policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 5) Check if there are any existing users in both tables
SELECT 'auth.users count:' as info, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users count:' as info, COUNT(*) as count FROM public.users;

-- 6) Let's temporarily disable RLS to test if that's the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 7) Test the trigger function manually (this will help us see if it works)
-- First, let's see what happens when we try to insert manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing with user ID: %', test_user_id;
  
  -- Try to insert manually to see if the table structure is correct
  INSERT INTO public.users (id, email, name) 
  VALUES (test_user_id, 'test@example.com', 'Test User')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Manual insert completed';
  
  -- Check if the record was created
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Manual insert successful - record exists';
  ELSE
    RAISE NOTICE '❌ Manual insert failed - record not found';
  END IF;
  
  -- Clean up test data
  DELETE FROM public.users WHERE id = test_user_id;
  
END $$;

-- 8) Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
