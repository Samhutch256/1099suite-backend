-- FINAL ACCOUNT CREATION FIX
-- This will completely fix the "Failed to create account" error

-- 1. Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Create the users table with proper structure
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    current_office TEXT DEFAULT 'Main Office',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Grant ALL permissions to authenticated users
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Create a simple trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Test the setup by creating a test user profile
INSERT INTO public.users (id, email, name) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- 7. Verify the setup
SELECT 
    'Users table created successfully' as status,
    COUNT(*) as user_count
FROM public.users;

-- 8. Clean up test data
DELETE FROM public.users WHERE email = 'test@example.com';
