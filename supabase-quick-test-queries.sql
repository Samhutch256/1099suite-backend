-- =====================================================
-- QUICK TEST QUERIES FOR SUPABASE
-- Replace these with actual UUIDs from your database
-- =====================================================

-- 1. CHECK IF THE TABLE EXISTS
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'follow_up_reminders' 
ORDER BY ordinal_position;

-- 2. CHECK ALL REMINDERS (no user filter - shows all)
SELECT 
  r.id,
  r.user_id,
  r.lead_id,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.completed,
  r.created_at
FROM public.follow_up_reminders r
ORDER BY r.created_at DESC
LIMIT 10;

-- 3. COUNT TOTAL REMINDERS
SELECT 
  COUNT(*) as total_reminders,
  COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_reminders,
  COUNT(CASE WHEN completed = FALSE THEN 1 END) as active_reminders
FROM public.follow_up_reminders;

-- 4. CHECK REMINDERS BY TYPE
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed,
  COUNT(CASE WHEN completed = FALSE THEN 1 END) as active
FROM public.follow_up_reminders
GROUP BY type
ORDER BY count DESC;

-- 5. CHECK UPCOMING REMINDERS (no user filter)
SELECT 
  r.id,
  r.lead_id,
  r.date,
  r.time,
  r.type,
  r.notes
FROM public.follow_up_reminders r
WHERE r.completed = FALSE
  AND (r.date || ' ' || r.time)::timestamp > NOW()
ORDER BY r.date ASC, r.time ASC
LIMIT 10;

-- 6. CHECK OVERDUE REMINDERS (no user filter)
SELECT 
  r.id,
  r.lead_id,
  r.date,
  r.time,
  r.type,
  r.notes
FROM public.follow_up_reminders r
WHERE r.completed = FALSE
  AND (r.date || ' ' || r.time)::timestamp <= NOW()
ORDER BY r.date DESC, r.time DESC
LIMIT 10;

-- 7. GET A SAMPLE USER ID (to use in other queries)
SELECT id, email FROM public.users LIMIT 5;

-- 8. GET A SAMPLE LEAD ID (to use in other queries)
SELECT id, name FROM public.leads LIMIT 5;

-- 9. TEST INSERT A SAMPLE REMINDER (replace UUIDs with actual values)
-- First, get a user ID and lead ID from queries 7 and 8 above
-- Then replace the UUIDs in this query:

/*
INSERT INTO public.follow_up_reminders (
  user_id,
  lead_id,
  date,
  time,
  type,
  notes,
  completed
) VALUES (
  'PASTE-USER-ID-HERE',
  'PASTE-LEAD-ID-HERE',
  '2024-01-15',
  '14:30:00',
  'call',
  'Test reminder from SQL',
  FALSE
);
*/

-- 10. CHECK IF VIEWS WERE CREATED SUCCESSFULLY
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('follow_up_reminders_with_leads', 'upcoming_reminders', 'overdue_reminders')
ORDER BY table_name;

-- 11. TEST THE VIEWS (if they exist)
SELECT * FROM public.upcoming_reminders LIMIT 5;
SELECT * FROM public.overdue_reminders LIMIT 5;

-- =====================================================
-- HOW TO USE THESE QUERIES:
-- =====================================================

/*
1. Run query 1 to verify the table structure
2. Run query 2 to see if any reminders exist
3. Run query 3 to get statistics
4. Run queries 7 and 8 to get actual UUIDs
5. Use those UUIDs to replace placeholders in other queries
6. Test inserting a reminder with query 9 (uncomment and replace UUIDs)
7. Check if views work with queries 10 and 11

TROUBLESHOOTING:
- If no data shows in query 2, no reminders have been created yet
- If you get permission errors, check RLS policies
- If UUIDs are invalid, make sure you're using actual UUIDs from your tables
*/ 