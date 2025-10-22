-- Connect Old Data to New User Account
-- Run this AFTER you sign in and get your new user ID

-- Replace 'YOUR_NEW_USER_ID' with your actual new user ID
-- You can find this by signing in to the app and checking your profile

-- 1. Update leads to point to your new user ID
UPDATE leads 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id IS NULL OR user_id = 'OLD_USER_ID';

-- 2. Update expenses to point to your new user ID  
UPDATE expenses 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id IS NULL OR user_id = 'OLD_USER_ID';

-- 3. Update clients to point to your new user ID
UPDATE clients 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id IS NULL OR user_id = 'OLD_USER_ID';

-- 4. Update daily_inputs to point to your new user ID
UPDATE daily_inputs 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id IS NULL OR user_id = 'OLD_USER_ID';

-- 5. Check how many records were updated
SELECT 
    'leads' as table_name,
    COUNT(*) as updated_count
FROM leads 
WHERE user_id = 'YOUR_NEW_USER_ID'
UNION ALL
SELECT 
    'expenses' as table_name,
    COUNT(*) as updated_count
FROM expenses 
WHERE user_id = 'YOUR_NEW_USER_ID'
UNION ALL
SELECT 
    'clients' as table_name,
    COUNT(*) as updated_count
FROM clients 
WHERE user_id = 'YOUR_NEW_USER_ID'
UNION ALL
SELECT 
    'daily_inputs' as table_name,
    COUNT(*) as updated_count
FROM daily_inputs 
WHERE user_id = 'YOUR_NEW_USER_ID';
