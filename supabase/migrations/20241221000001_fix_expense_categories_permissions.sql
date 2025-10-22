-- Migration: Fix Expense Categories Table Permissions
-- Date: 2024-12-21
-- Description: Ensure expense_categories table has proper permissions and RLS policies

-- First, ensure the expense_categories table exists with the correct schema
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  created_at timestamp default now()
);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT USAGE ON SEQUENCE public.expense_categories_id_seq TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense categories" ON public.expense_categories;

-- Create RLS policies
CREATE POLICY "Users can view own expense categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.expense_categories IS 'User-defined expense categories for organizing expenses';
COMMENT ON COLUMN public.expense_categories.user_id IS 'User who owns this category';
COMMENT ON COLUMN public.expense_categories.name IS 'Name of the expense category';

-- Verify the table structure and permissions
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories') THEN
    RAISE EXCEPTION 'expense_categories table does not exist';
  END IF;
  
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'expense_categories' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on expense_categories table';
  END IF;
  
  -- Check if policies exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'expense_categories'
  ) THEN
    RAISE EXCEPTION 'No RLS policies found on expense_categories table';
  END IF;
  
  RAISE NOTICE 'expense_categories table permissions and RLS policies verified successfully';
END $$;
