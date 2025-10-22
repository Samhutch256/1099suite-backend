-- SQL script to check the authentication system
-- Run this in your Supabase SQL editor

-- Check if there are any users in the auth.users table
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Check if there are any users in the public.users table
SELECT id, email, name, created_at 
FROM public.users 
ORDER BY created_at DESC;

-- Check what leads exist and their user IDs
SELECT user_id, COUNT(*) as lead_count,
       STRING_AGG(name, ', ') as lead_names
FROM public.leads 
GROUP BY user_id;

-- Check if any of the lead user_ids exist in auth.users
SELECT l.user_id, 
       COUNT(*) as lead_count,
       CASE WHEN a.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as auth_status
FROM public.leads l
LEFT JOIN auth.users a ON l.user_id = a.id
GROUP BY l.user_id, a.id; 