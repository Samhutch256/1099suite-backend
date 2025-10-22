-- Check if the account_name column exists in the expenses table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
  AND column_name = 'account_name';

-- Also check all columns in the expenses table to see the current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
