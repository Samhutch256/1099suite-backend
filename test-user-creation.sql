-- Test user creation functionality
-- Run this to verify everything is working

-- 1) Check current user counts
SELECT 'Current user counts:' as info, '' as status
UNION ALL
SELECT 'auth.users:', COUNT(*)::text FROM auth.users
UNION ALL
SELECT 'public.users:', COUNT(*)::text FROM public.users;

-- 2) Test the trigger function manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || extract(epoch from now())::text || '@example.com';
BEGIN
  RAISE NOTICE 'Testing user creation with ID: % and email: %', test_user_id, test_email;
  
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
    test_email,
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Test User"}'::jsonb
  );
  
  -- Check if the trigger worked
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ SUCCESS: User record created in public.users!';
    
    -- Show the created user
    SELECT 'Created user:' as info, 
           id::text || ' - ' || email || ' - ' || name as status 
    FROM public.users WHERE id = test_user_id;
  ELSE
    RAISE NOTICE '❌ FAILED: No user record in public.users';
  END IF;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  DELETE FROM public.users WHERE id = test_user_id;
  
END $$;

-- 3) Check RLS policies
SELECT 'RLS Policies for users table:' as info, '' as status
UNION ALL
SELECT 
  'Policy: ' || policyname,
  'Command: ' || cmd || ' - Roles: ' || array_to_string(roles, ',')
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 4) Test if authenticated users can insert into users table
-- (This simulates what happens when the app tries to create a user profile)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Set the current user context (simulate being logged in)
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  
  RAISE NOTICE 'Testing authenticated insert with user ID: %', test_user_id;
  
  -- Try to insert a user record (this is what the app does)
  BEGIN
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    VALUES (test_user_id, 'test@example.com', 'Test User', NOW(), NOW());
    
    RAISE NOTICE '✅ SUCCESS: Authenticated user can insert into users table';
    
    -- Clean up
    DELETE FROM public.users WHERE id = test_user_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ FAILED: Authenticated user cannot insert into users table: %', SQLERRM;
  END;
  
END $$;
