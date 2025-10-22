-- Migration to add date_set and date_set_for fields to leads table
-- Run this in your Supabase SQL editor

-- Add the missing date fields to the leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS date_set TEXT,
ADD COLUMN IF NOT EXISTS date_set_for TEXT;

-- Update the updated_at trigger to include the new fields
-- (The existing trigger should already handle this automatically)

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND table_schema = 'public'
AND column_name IN ('date_set', 'date_set_for')
ORDER BY column_name; 