-- Check database users - run this in Supabase SQL Editor

-- 1. Check if users table exists and has data
SELECT 
  'public.users table' as table_name,
  COUNT(*) as row_count
FROM public.users;

-- 2. Check auth.users (this will show all auth users)
SELECT 
  'auth.users table' as table_name,
  COUNT(*) as row_count
FROM auth.users;

-- 3. Show all users in public.users
SELECT 
  id,
  email,
  full_name,
  onboarding_completed,
  created_at,
  updated_at
FROM public.users
ORDER BY created_at DESC;

-- 4. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trg_on_auth_user_created';

-- 5. Check if function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_auth_user';

-- 6. Find auth users without corresponding public.users rows
SELECT 
  au.id,
  au.email,
  au.created_at,
  'Missing from public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL
ORDER BY au.created_at DESC;
