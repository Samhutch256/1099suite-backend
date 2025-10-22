-- Migration to add sub-input fields to daily_inputs table
-- Run this in your Supabase SQL editor

-- Add all the missing sub-input fields to the daily_inputs table
ALTER TABLE public.daily_inputs 
ADD COLUMN IF NOT EXISTS outreach_door_knocks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outreach_tags_put INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outreach_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outreach_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS outreach_inbound INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_set_door_knocks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_set_tags_put INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_set_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_set_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_set_inbound INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_held_door_knocks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_held_tags_put INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_held_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_held_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_held_inbound INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deals_closed_door_knocks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deals_closed_tags_put INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deals_closed_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deals_closed_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deals_closed_inbound INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_serviced_door_knocks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_serviced_tags_put INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_serviced_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_serviced_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accounts_serviced_inbound INTEGER DEFAULT 0;

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'daily_inputs' 
AND table_schema = 'public'
AND column_name LIKE '%_door_knocks' 
   OR column_name LIKE '%_tags_put'
   OR column_name LIKE '%_calls_made'
   OR column_name LIKE '%_referrals'
   OR column_name LIKE '%_inbound'
ORDER BY column_name;

-- Create indexes for better performance on the new fields
CREATE INDEX IF NOT EXISTS idx_daily_inputs_outreach_door_knocks ON public.daily_inputs(outreach_door_knocks);
CREATE INDEX IF NOT EXISTS idx_daily_inputs_appointments_set_door_knocks ON public.daily_inputs(appointments_set_door_knocks);
CREATE INDEX IF NOT EXISTS idx_daily_inputs_deals_closed_door_knocks ON public.daily_inputs(deals_closed_door_knocks);
CREATE INDEX IF NOT EXISTS idx_daily_inputs_accounts_serviced_door_knocks ON public.daily_inputs(accounts_serviced_door_knocks);

-- Update the updated_at trigger to include the new fields
-- (The existing trigger should already handle this automatically)

-- Test the migration by checking the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'daily_inputs' 
AND table_schema = 'public'
ORDER BY ordinal_position; 