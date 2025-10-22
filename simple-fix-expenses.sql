-- Simple fix for expenses table - add only the essential missing columns

-- Add account_name column (this is the main issue)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT 'Unknown Account';

-- Add plaid_transaction_id for linking
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;

-- Add account_id for Plaid reference
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Add date column if missing
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS date DATE;

-- Add merchant_name for Plaid data
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

-- Add classification column
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'unreviewed';

-- Add pending column
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE;

-- Add currency column
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add updated_at if missing
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique constraint on plaid_transaction_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'expenses_plaid_transaction_id_key'
  ) THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_plaid_transaction_id_key UNIQUE (plaid_transaction_id);
  END IF;
END $$;

-- Verify the account_name column was added
SELECT 'account_name column exists' as status 
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'expenses' 
    AND column_name = 'account_name' 
    AND table_schema = 'public'
);
