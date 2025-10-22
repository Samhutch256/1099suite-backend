-- Migration: Fix Expenses Table Schema
-- Date: 2024-12-21
-- Description: Update expenses table to match frontend expectations

-- Drop the old expenses table if it exists
DROP TABLE IF EXISTS public.expenses CASCADE;

-- Create the new expenses table with the correct schema
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  receipt TEXT,
  is_deductible BOOLEAN DEFAULT TRUE,
  mileage DECIMAL(10,2),
  start_location TEXT,
  end_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.expenses IS 'Expenses table for tracking business expenses';
COMMENT ON COLUMN public.expenses.description IS 'Description of the expense';
COMMENT ON COLUMN public.expenses.amount IS 'Amount of the expense';
COMMENT ON COLUMN public.expenses.category IS 'Category of the expense';
COMMENT ON COLUMN public.expenses.date IS 'Date of the expense (YYYY-MM-DD format)';
COMMENT ON COLUMN public.expenses.receipt IS 'Receipt URL or data';
COMMENT ON COLUMN public.expenses.is_deductible IS 'Whether the expense is tax deductible';
COMMENT ON COLUMN public.expenses.mileage IS 'Mileage amount if applicable';
COMMENT ON COLUMN public.expenses.start_location IS 'Start location for mileage tracking';
COMMENT ON COLUMN public.expenses.end_location IS 'End location for mileage tracking';
