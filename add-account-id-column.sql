-- Add missing account_id column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_id text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(account_id);
