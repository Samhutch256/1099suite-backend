-- SQL script to update leads to use the current user's ID
-- Run this in your Supabase SQL editor

-- Update all leads to use the current user ID (generated from samhutch256@gmail.com)
UPDATE public.leads 
SET user_id = '41a61d89-41a6-41a6-81a6-41a61d8941a6'
WHERE user_id = '1efa846a-b408-4196-84bd-e93e2c7d9e9b';

-- Verify the update worked
SELECT 
  COUNT(*) as total_leads,
  COUNT(CASE WHEN user_id = '41a61d89-41a6-41a6-81a6-41a61d8941a6' THEN 1 END) as current_user_leads,
  COUNT(CASE WHEN user_id = '1efa846a-b408-4196-84bd-e93e2c7d9e9b' THEN 1 END) as old_user_leads
FROM public.leads;

-- Show all leads with their user IDs
SELECT id, name, user_id, created_at 
FROM public.leads 
ORDER BY created_at DESC; 