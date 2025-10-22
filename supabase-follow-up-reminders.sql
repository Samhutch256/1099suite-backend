-- =====================================================
-- FOLLOW-UP REMINDERS DATABASE SETUP FOR SUPABASE
-- =====================================================

-- 1. CREATE THE FOLLOW_UP_REMINDERS TABLE
-- Run this first to ensure the table exists with proper structure
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'call',
  notes TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  notification_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_user_id ON public.follow_up_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_lead_id ON public.follow_up_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_completed ON public.follow_up_reminders(completed);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_date_time ON public.follow_up_reminders(date, time);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- Policy to allow users to see only their own reminders
CREATE POLICY "Users can view their own follow-up reminders" ON public.follow_up_reminders
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own reminders
CREATE POLICY "Users can insert their own follow-up reminders" ON public.follow_up_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reminders
CREATE POLICY "Users can update their own follow-up reminders" ON public.follow_up_reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own reminders
CREATE POLICY "Users can delete their own follow-up reminders" ON public.follow_up_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- 5. CREATE TRIGGER TO UPDATE UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_follow_up_reminders_updated_at 
  BEFORE UPDATE ON public.follow_up_reminders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUERIES TO CHECK AND MANAGE FOLLOW-UP REMINDERS
-- =====================================================

-- 6. CHECK IF TABLE EXISTS AND HAS CORRECT STRUCTURE
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'follow_up_reminders' 
ORDER BY ordinal_position;

-- 7. CHECK EXISTING REMINDERS FOR A USER
-- Replace 'your-user-id-here' with actual user ID
SELECT 
  r.id,
  r.lead_id,
  l.name as lead_name,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.completed,
  r.completed_at,
  r.created_at,
  r.updated_at
FROM public.follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id
WHERE r.user_id = 'your-user-id-here'
ORDER BY r.date DESC, r.time DESC;

-- 8. CHECK UPCOMING REMINDERS (NOT COMPLETED, FUTURE DATES)
SELECT 
  r.id,
  r.lead_id,
  l.name as lead_name,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.created_at
FROM public.follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id
WHERE r.user_id = 'your-user-id-here'
  AND r.completed = FALSE
  AND (r.date || ' ' || r.time)::timestamp > NOW()
ORDER BY r.date ASC, r.time ASC;

-- 9. CHECK PAST/OVERDUE REMINDERS
SELECT 
  r.id,
  r.lead_id,
  l.name as lead_name,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.created_at
FROM public.follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id
WHERE r.user_id = 'your-user-id-here'
  AND r.completed = FALSE
  AND (r.date || ' ' || r.time)::timestamp <= NOW()
ORDER BY r.date DESC, r.time DESC;

-- 10. CHECK COMPLETED REMINDERS
SELECT 
  r.id,
  r.lead_id,
  l.name as lead_name,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.completed_at
FROM public.follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id
WHERE r.user_id = 'your-user-id-here'
  AND r.completed = TRUE
ORDER BY r.completed_at DESC;

-- 11. COUNT REMINDERS BY STATUS
SELECT 
  COUNT(*) as total_reminders,
  COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_reminders,
  COUNT(CASE WHEN completed = FALSE THEN 1 END) as active_reminders,
  COUNT(CASE WHEN completed = FALSE AND (date || ' ' || time)::timestamp <= NOW() THEN 1 END) as overdue_reminders
FROM public.follow_up_reminders
WHERE user_id = 'your-user-id-here';

-- 12. CHECK REMINDERS BY TYPE
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed,
  COUNT(CASE WHEN completed = FALSE THEN 1 END) as active
FROM public.follow_up_reminders
WHERE user_id = 'your-user-id-here'
GROUP BY type
ORDER BY count DESC;

-- 13. CHECK REMINDERS FOR A SPECIFIC LEAD
-- Replace 'your-lead-id-here' with actual lead ID
SELECT 
  r.id,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.completed,
  r.completed_at,
  r.created_at
FROM public.follow_up_reminders r
WHERE r.user_id = 'your-user-id-here'
  AND r.lead_id = 'your-lead-id-here'
ORDER BY r.date ASC, r.time ASC;

-- 14. SAMPLE INSERT QUERY (for testing)
-- Replace the UUIDs with actual values
INSERT INTO public.follow_up_reminders (
  user_id,
  lead_id,
  date,
  time,
  type,
  notes,
  completed
) VALUES (
  'your-user-id-here',
  'your-lead-id-here',
  '2024-01-15',
  '14:30:00',
  'call',
  'Follow up on proposal',
  FALSE
);

-- 15. SAMPLE UPDATE QUERY (mark as completed)
UPDATE public.follow_up_reminders
SET 
  completed = TRUE,
  completed_at = NOW(),
  notes = notes || E'\n\nCompleted: ' || 'Call made successfully'
WHERE id = 'your-reminder-id-here'
  AND user_id = 'your-user-id-here';

-- 16. SAMPLE DELETE QUERY
DELETE FROM public.follow_up_reminders
WHERE id = 'your-reminder-id-here'
  AND user_id = 'your-user-id-here';

-- 17. CLEANUP OLD COMPLETED REMINDERS (optional)
-- Delete reminders completed more than 30 days ago
DELETE FROM public.follow_up_reminders
WHERE completed = TRUE
  AND completed_at < NOW() - INTERVAL '30 days'
  AND user_id = 'your-user-id-here';

-- 18. CHECK FOR ORPHANED REMINDERS (reminders for deleted leads)
SELECT 
  r.id,
  r.lead_id,
  r.date,
  r.time,
  r.type
FROM public.follow_up_reminders r
LEFT JOIN public.leads l ON r.lead_id = l.id
WHERE l.id IS NULL
  AND r.user_id = 'your-user-id-here';

-- 19. FIX ORPHANED REMINDERS (if any found)
-- This will delete reminders for leads that no longer exist
DELETE FROM public.follow_up_reminders
WHERE lead_id NOT IN (SELECT id FROM public.leads)
  AND user_id = 'your-user-id-here';

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- 20. CREATE A VIEW FOR REMINDERS WITH LEAD INFO
CREATE OR REPLACE VIEW public.follow_up_reminders_with_leads AS
SELECT 
  r.id,
  r.user_id,
  r.lead_id,
  l.name as lead_name,
  l.phone as lead_phone,
  l.email as lead_email,
  r.date,
  r.time,
  r.type,
  r.notes,
  r.completed,
  r.completed_at,
  r.notification_id,
  r.created_at,
  r.updated_at,
  (r.date || ' ' || r.time)::timestamp as reminder_datetime
FROM public.follow_up_reminders r
JOIN public.leads l ON r.lead_id = l.id;

-- 21. CREATE A VIEW FOR UPCOMING REMINDERS
CREATE OR REPLACE VIEW public.upcoming_reminders AS
SELECT *
FROM public.follow_up_reminders_with_leads
WHERE completed = FALSE
  AND reminder_datetime > NOW()
ORDER BY reminder_datetime ASC;

-- 22. CREATE A VIEW FOR OVERDUE REMINDERS
CREATE OR REPLACE VIEW public.overdue_reminders AS
SELECT *
FROM public.follow_up_reminders_with_leads
WHERE completed = FALSE
  AND reminder_datetime <= NOW()
ORDER BY reminder_datetime ASC;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
HOW TO USE THESE QUERIES:

1. First, run queries 1-5 to create the table and set up security
2. Replace 'your-user-id-here' with actual user UUIDs in queries 7-16
3. Replace 'your-lead-id-here' with actual lead UUIDs when testing
4. Use queries 6-13 to check your data
5. Use queries 14-16 for CRUD operations
6. Use queries 17-19 for maintenance
7. Use the views (20-22) for easier querying

TROUBLESHOOTING:
- If you get permission errors, make sure RLS policies are set up correctly
- If reminders aren't showing, check that user_id matches the authenticated user
- If leads aren't found, verify the lead_id exists in the leads table
- Use query 6 to verify table structure is correct
*/ 