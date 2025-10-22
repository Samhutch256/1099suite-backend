-- Reset Plaid data to clear duplicate accounts

-- First, let's see what accounts we have
SELECT id, user_id, account_id, institution_name, created_at 
FROM public.plaid_accounts 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1'
ORDER BY created_at DESC;

-- Clear all Plaid accounts for this user (to remove duplicates)
DELETE FROM public.plaid_accounts 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- Clear all Plaid transactions for this user
DELETE FROM public.plaid_transactions 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- Clear all expenses that might have Plaid data
UPDATE public.expenses 
SET plaid_transaction_id = NULL,
    account_id = NULL,
    account_name = NULL
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- Verify the cleanup
SELECT 'Plaid accounts after cleanup:' as status;
SELECT COUNT(*) as account_count FROM public.plaid_accounts WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

SELECT 'Plaid transactions after cleanup:' as status;
SELECT COUNT(*) as transaction_count FROM public.plaid_transactions WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';
