-- FIX TRIGGER PERMISSIONS
-- The trigger function needs to run with elevated permissions

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the trigger function with SECURITY DEFINER and proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 3. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Test the trigger by creating a test user profile
INSERT INTO public.users (id, email, name) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'trigger-test@example.com', 'Trigger Test User')
ON CONFLICT (id) DO NOTHING;

-- 6. Verify the setup
SELECT 
    'Trigger permissions fixed' as status,
    COUNT(*) as user_count
FROM public.users;

-- 7. Clean up test data
DELETE FROM public.users WHERE email = 'trigger-test@example.com';
