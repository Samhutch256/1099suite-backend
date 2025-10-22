-- Migration: Comprehensive Expense Categories Fix
-- Date: 2024-12-21
-- Description: Complete fix for expense_categories table permissions and structure

-- Step 1: Drop the existing table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS public.expense_categories CASCADE;

-- Step 2: Create the expense_categories table with proper structure
CREATE TABLE public.expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_expense_categories_user_id ON public.expense_categories(user_id);
CREATE INDEX idx_expense_categories_name ON public.expense_categories(name);

-- Step 4: Enable Row Level Security
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view own expense categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Add table and column comments
COMMENT ON TABLE public.expense_categories IS 'User-defined expense categories for organizing business expenses';
COMMENT ON COLUMN public.expense_categories.id IS 'Unique identifier for the expense category';
COMMENT ON COLUMN public.expense_categories.user_id IS 'User who owns this expense category';
COMMENT ON COLUMN public.expense_categories.name IS 'Name of the expense category';
COMMENT ON COLUMN public.expense_categories.created_at IS 'Timestamp when the category was created';

-- Step 8: Create trigger for updated_at (if needed in the future)
-- CREATE TRIGGER set_updated_at_expense_categories
--   BEFORE UPDATE ON public.expense_categories
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Verification queries
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'expense_categories'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'expense_categories table was not created successfully';
  END IF;
  
  -- Check if RLS is enabled
  SELECT rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = 'expense_categories'
  INTO rls_enabled;
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on expense_categories table';
  END IF;
  
  -- Check if policies exist
  SELECT COUNT(*) 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'expense_categories'
  INTO policy_count;
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No RLS policies found on expense_categories table';
  END IF;
  
  RAISE NOTICE 'expense_categories table created successfully with % policies', policy_count;
END $$;

-- Step 10: Insert some default categories for testing (optional)
-- Uncomment the following if you want to add some default categories
/*
INSERT INTO public.expense_categories (user_id, name) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Office Supplies'),
  ('00000000-0000-0000-0000-000000000000', 'Travel'),
  ('00000000-0000-0000-0000-000000000000', 'Meals'),
  ('00000000-0000-0000-0000-000000000000', 'Equipment'),
  ('00000000-0000-0000-0000-000000000000', 'Software');
*/
