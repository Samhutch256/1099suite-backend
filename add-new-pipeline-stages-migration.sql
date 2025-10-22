-- Migration: Add new pipeline stages "Site Survey Scheduled" and "Install Scheduled"
-- This migration adds two new stages to the lead pipeline while preserving existing data

-- Since the leads.status field is TEXT (not an enum), we don't need to modify the column type
-- We just need to ensure the application can handle these new status values

-- Create a lead_stages lookup table for better stage management (optional enhancement)
CREATE TABLE IF NOT EXISTS public.lead_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_key TEXT NOT NULL UNIQUE,
  stage_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all stages in the correct order
INSERT INTO public.lead_stages (stage_key, stage_label, sort_order) VALUES
  ('new', 'New Lead', 1),
  ('contacted', 'Contacted', 2),
  ('appointment_set', 'Appointment Set', 3),
  ('appointment_held', 'Appointment Held', 4),
  ('negotiation', 'Negotiation', 5),
  ('signed_deal', 'Signed Deal', 6),
  ('site_survey_scheduled', 'Site Survey Scheduled', 7),
  ('site_survey_completed', 'Site Survey Completed', 8),
  ('change_order_required', 'Change Order Required', 9),
  ('install_scheduled', 'Install Scheduled', 10),
  ('installed', 'Install Completed', 11),
  ('cancelled_appointment', 'Cancelled Appointment', 12),
  ('held_not_interested', 'Held Not Interested', 13),
  ('unqualified', 'Unqualified', 14),
  ('cancelled_contract', 'Cancelled Contract', 15)
ON CONFLICT (stage_key) DO UPDATE SET
  stage_label = EXCLUDED.stage_label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Enable RLS on the new table
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_stages (read-only for all users)
CREATE POLICY "Anyone can view lead stages" ON public.lead_stages
  FOR SELECT USING (true);

-- Create index for better performance
CREATE INDEX idx_lead_stages_sort_order ON public.lead_stages(sort_order);
CREATE INDEX idx_lead_stages_active ON public.lead_stages(is_active);

-- Add updated_at trigger for lead_stages
CREATE TRIGGER set_updated_at_lead_stages BEFORE UPDATE ON public.lead_stages 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Verify the migration
SELECT stage_key, stage_label, sort_order 
FROM public.lead_stages 
WHERE is_active = true 
ORDER BY sort_order;
