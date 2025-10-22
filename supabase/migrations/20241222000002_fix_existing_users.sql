-- Fix existing users that were created before the trigger was set up
-- This migration ensures all existing auth users have corresponding public.users rows

-- First, let's check what columns actually exist in the users table
DO $$
DECLARE
  column_exists BOOLEAN;
  fixed_count INTEGER;
BEGIN
  -- Check if full_name column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'full_name'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- Check if onboarding_completed column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'onboarding_completed'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Insert with both full_name and onboarding_completed
      INSERT INTO public.users (id, email, full_name, onboarding_completed, created_at, updated_at)
      SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email),
        false,
        au.created_at,
        au.created_at
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
        AND au.email IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Insert with full_name but no onboarding_completed
      INSERT INTO public.users (id, email, full_name, created_at, updated_at)
      SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email),
        au.created_at,
        au.created_at
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
        AND au.email IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    END IF;
  ELSE
    -- Check if onboarding_completed column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'onboarding_completed'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Insert with onboarding_completed but no full_name
      INSERT INTO public.users (id, email, onboarding_completed, created_at, updated_at)
      SELECT 
        au.id,
        au.email,
        false,
        au.created_at,
        au.created_at
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
        AND au.email IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Insert with just basic columns
      INSERT INTO public.users (id, email, created_at, updated_at)
      SELECT 
        au.id,
        au.email,
        au.created_at,
        au.created_at
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
        AND au.email IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
  
  -- Log how many users were fixed
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % existing users that were missing from public.users', fixed_count;
END $$;
