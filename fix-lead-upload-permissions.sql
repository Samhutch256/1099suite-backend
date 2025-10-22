-- Comprehensive fix for lead upload permissions
-- This addresses all possible issues preventing lead creation

-- Step 1: Verify the leads table exists and check its structure
SELECT 
    'Leads Table Check' as step,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'leads'
    ) as table_exists;

-- Step 2: Grant all necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate all leads RLS policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can select own leads" ON public.leads;

-- Create proper RLS policies for leads
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

-- Step 5: Verify RLS policies are correct
SELECT 
    'RLS Policies Verification' as step,
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN policyname LIKE '%select%' THEN '✅'
        WHEN policyname LIKE '%insert%' THEN '✅'
        WHEN policyname LIKE '%update%' THEN '✅'
        WHEN policyname LIKE '%delete%' THEN '✅'
        ELSE '❓'
    END as status
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;

-- Step 6: Test inserting a lead as Ciarra (using her actual UUID)
-- This will help us see if it works now
DO $$
DECLARE
    ciarra_id UUID := 'ec20423e-0faf-4925-ac76-78ed5172b243';
    test_lead_id UUID;
BEGIN
    -- Try to insert a test lead
    INSERT INTO public.leads (
        user_id,
        name,
        email,
        status,
        source,
        value,
        notes
    ) VALUES (
        ciarra_id,
        'Test Lead - Delete Me',
        'test@test.com',
        'new',
        'other',
        0,
        'This is a test lead created by the diagnostic script. You can delete this.'
    ) RETURNING id INTO test_lead_id;
    
    RAISE NOTICE '✅ SUCCESS: Test lead created with ID: %', test_lead_id;
    
    -- Delete the test lead
    DELETE FROM public.leads WHERE id = test_lead_id;
    RAISE NOTICE '✅ Test lead cleaned up successfully';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: Could not create test lead: %', SQLERRM;
END $$;

-- Step 7: Check if there are any foreign key issues
SELECT 
    'Foreign Key Check' as step,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'leads'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Step 8: Verify Ciarra's user record exists and is properly linked
SELECT 
    'Ciarra User Verification' as step,
    u.id,
    u.email,
    u.name,
    au.id as auth_user_id,
    CASE 
        WHEN u.id = au.id THEN '✅ IDs match'
        ELSE '❌ IDs DO NOT match'
    END as id_match_status
FROM public.users u
FULL OUTER JOIN auth.users au ON u.id = au.id
WHERE u.email = 'ciarra.newman@gmail.com' OR au.email = 'ciarra.newman@gmail.com';

-- Step 9: Show current permissions on leads table
SELECT 
    'Current Permissions' as step,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'leads'
  AND grantee IN ('authenticated', 'public', 'anon')
ORDER BY grantee, privilege_type;

-- Final message
SELECT '✅ Permission fix complete. Ciarra should now be able to create leads.' as status;

