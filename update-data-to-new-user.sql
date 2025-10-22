-- Update Data to New User ID
-- This will connect all your old data to your new account

-- Your old user ID that has all the data:
-- 64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1

-- Replace 'YOUR_NEW_USER_ID' with your actual new user ID after you sign in

-- 1. Update leads to point to your new user ID
UPDATE leads 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 2. Update expenses to point to your new user ID  
UPDATE expenses 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 3. Update clients to point to your new user ID
UPDATE clients 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 4. Update daily_inputs to point to your new user ID
UPDATE daily_inputs 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 5. Update follow_up_reminders to point to your new user ID
UPDATE follow_up_reminders 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 6. Update lead_input_tallies to point to your new user ID
UPDATE lead_input_tallies 
SET user_id = 'YOUR_NEW_USER_ID' 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- 7. Check how many records were updated
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
WHERE user_id = 'YOUR_NEW_USER_ID'
UNION ALL
SELECT 
    'follow_up_reminders' as table_name,
    COUNT(*) as updated_count
FROM follow_up_reminders 
WHERE user_id = 'YOUR_NEW_USER_ID'
UNION ALL
SELECT 
    'lead_input_tallies' as table_name,
    COUNT(*) as updated_count
FROM lead_input_tallies 
WHERE user_id = 'YOUR_NEW_USER_ID';
