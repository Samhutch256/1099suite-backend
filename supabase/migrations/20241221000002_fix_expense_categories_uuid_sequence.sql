-- Migration: Fix Expense Categories UUID Sequence
-- Date: 2024-12-21
-- Description: Ensure proper UUID generation for expense_categories table

-- Ensure the uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update the expense_categories table to use gen_random_uuid() instead of uuid_generate_v4()
-- This is more reliable in Supabase
ALTER TABLE public.expense_categories 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Alternative approach: If the above doesn't work, recreate the table with proper defaults
DO $$
BEGIN
  -- Check if the table exists and has the right structure
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'expense_categories'
  ) THEN
    -- Table exists, just ensure the default is correct
    ALTER TABLE public.expense_categories 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ELSE
    -- Table doesn't exist, create it
    CREATE TABLE public.expense_categories (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view own expense categories" ON public.expense_categories
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own expense categories" ON public.expense_categories
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own expense categories" ON public.expense_categories
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own expense categories" ON public.expense_categories
      FOR DELETE USING (auth.uid() = user_id);
    
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
    
    -- Create index
    CREATE INDEX idx_expense_categories_user_id ON public.expense_categories(user_id);
  END IF;
END $$;

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'expense_categories'
ORDER BY ordinal_position;
