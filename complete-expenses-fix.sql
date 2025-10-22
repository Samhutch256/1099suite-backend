-- Complete fix for expenses table - add ALL missing columns

-- First, let's check what columns currently exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now add ALL the missing columns that the backend expects

-- Essential columns for Plaid integration
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT 'Unknown Account';

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_id TEXT;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;

-- Date and time columns
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS date DATE;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Plaid-specific columns
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS category_array TEXT[];

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'unreviewed';

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS original_description TEXT;

-- Add unique constraint on plaid_transaction_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'expenses_plaid_transaction_id_key'
  ) THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_plaid_transaction_id_key UNIQUE (plaid_transaction_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_plaid_transaction_id ON public.expenses(plaid_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_classification ON public.expenses(classification);

-- Update existing records with default values
UPDATE public.expenses 
SET account_name = 'Unknown Account' 
WHERE account_name IS NULL;

UPDATE public.expenses 
SET classification = 'unreviewed' 
WHERE classification IS NULL;

-- Verify all required columns exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'account_name' AND table_schema = 'public') 
    THEN '✅ account_name exists' 
    ELSE '❌ account_name missing' 
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'account_id' AND table_schema = 'public') 
    THEN '✅ account_id exists' 
    ELSE '❌ account_id missing' 
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'plaid_transaction_id' AND table_schema = 'public') 
    THEN '✅ plaid_transaction_id exists' 
    ELSE '❌ plaid_transaction_id missing' 
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'date' AND table_schema = 'public') 
    THEN '✅ date exists' 
    ELSE '❌ date missing' 
  END as status;
