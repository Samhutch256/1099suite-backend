-- Fix user account creation to ensure new users are properly added to public.users table
-- This migration ensures the trigger function works correctly with existing table structure

-- 1) First, check if the users table exists and has the right structure
-- If it doesn't exist, create it. If it exists, ensure it has the right columns
DO $$
BEGIN
  -- Check if users table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Create the users table if it doesn't exist
    CREATE TABLE public.users (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      current_office TEXT DEFAULT 'Main Office',
      settings JSONB DEFAULT '{}',
      onboarding_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created new users table';
  ELSE
    -- Table exists, check if it has the right structure and add missing columns
    BEGIN
      -- Add name column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name') THEN
        ALTER TABLE public.users ADD COLUMN name TEXT;
        RAISE NOTICE '✅ Added name column to users table';
      END IF;
      
      -- Add avatar_url column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE '✅ Added avatar_url column to users table';
      END IF;
      
      -- Add current_office column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'current_office') THEN
        ALTER TABLE public.users ADD COLUMN current_office TEXT DEFAULT 'Main Office';
        RAISE NOTICE '✅ Added current_office column to users table';
      END IF;
      
      -- Add settings column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'settings') THEN
        ALTER TABLE public.users ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added settings column to users table';
      END IF;
      
      -- Add onboarding_completed column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added onboarding_completed column to users table';
      END IF;
      
      -- Add created_at column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added created_at column to users table';
      END IF;
      
      -- Add updated_at column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to users table';
      END IF;
      
      RAISE NOTICE '✅ Users table structure is now complete';
    END;
  END IF;
END $$;

-- 2) Create the updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$;

-- 3) Create the trigger for updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Create the main trigger function to auto-provision user profiles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END; $$;

-- 5) Create the trigger on auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6) Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7) Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can select self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- 8) Create new policies
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- 9) Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- 10) Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- 11) Test the trigger function and provide status
DO $$
BEGIN
  -- Check if the trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE '✅ Trigger trg_on_auth_user_created is properly installed';
  ELSE
    RAISE WARNING '❌ Trigger trg_on_auth_user_created is missing';
  END IF;
  
  -- Check if the function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_auth_user' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Function handle_new_auth_user is properly installed';
  ELSE
    RAISE WARNING '❌ Function handle_new_auth_user is missing';
  END IF;
  
  -- Check if users table has the right structure
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name IN ('id', 'email', 'name', 'created_at', 'updated_at')
  ) THEN
    RAISE NOTICE '✅ Users table has the correct structure';
  ELSE
    RAISE WARNING '❌ Users table may be missing required columns';
  END IF;
END $$;
