-- Migration: Update Pipeline to 12-Stage System
-- Idempotent migration for 1099Suite lead pipeline stages

-- Create lead_stages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lead_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value TEXT UNIQUE NOT NULL,
    label TEXT UNIQUE NOT NULL,
    sort_order INTEGER UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policy
DROP POLICY IF EXISTS "Allow select on lead_stages" ON public.lead_stages;
CREATE POLICY "Allow select on lead_stages" ON public.lead_stages
    FOR SELECT USING (true);

-- Upsert all 12 stages
INSERT INTO public.lead_stages (value, label, sort_order, active) VALUES
    ('NEW_LEAD', 'New Lead', 1, true),
    ('CONTACTED', 'Contacted', 2, true),
    ('APPOINTMENT_SET', 'Appointment Set', 3, true),
    ('APPOINTMENT_HELD', 'Appointment Held', 4, true),
    ('SIGNED_DEAL', 'Signed Deal', 5, true),
    ('SITE_SURVEY_SCHEDULED', 'Site Survey Scheduled', 6, true),
    ('SITE_SURVEY_COMPLETED', 'Site Survey Completed', 7, true),
    ('CHANGE_ORDER_REQUIRED', 'Change Order Required', 8, true),
    ('SUBMITTED_FOR_PERMITS', 'Submitted for Permits', 9, true),
    ('PERMITS_APPROVED', 'Permits Approved', 10, true),
    ('INSTALL_SCHEDULED', 'Install Scheduled', 11, true),
    ('INSTALL_COMPLETED', 'Install Completed', 12, true)
ON CONFLICT (value) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Add stage_id column to leads table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'stage_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN stage_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_stage_id_fkey' 
        AND table_name = 'leads' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_stage_id_fkey 
        FOREIGN KEY (stage_id) REFERENCES public.lead_stages(id);
    END IF;
END $$;

-- Backfill stage_id from existing stage column
DO $$
DECLARE
    stage_column_exists BOOLEAN;
    stage_column_type TEXT;
BEGIN
    -- Check if leads.stage column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'stage' 
        AND table_schema = 'public'
    ) INTO stage_column_exists;
    
    IF stage_column_exists THEN
        -- Get column type
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'stage' 
        AND table_schema = 'public'
        INTO stage_column_type;
        
        -- Backfill based on column type
        IF stage_column_type LIKE '%enum%' THEN
            -- Handle enum-based stage column
            UPDATE public.leads 
            SET stage_id = ls.id
            FROM public.lead_stages ls
            WHERE leads.stage_id IS NULL 
            AND ls.value = UPPER(REPLACE(leads.stage, ' ', '_'));
        ELSE
            -- Handle text-based stage column
            UPDATE public.leads 
            SET stage_id = ls.id
            FROM public.lead_stages ls
            WHERE leads.stage_id IS NULL 
            AND (
                ls.label = leads.stage 
                OR ls.value = UPPER(REPLACE(leads.stage, ' ', '_'))
            );
        END IF;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_stages_sort_order ON public.lead_stages(sort_order);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_updated_at_lead_stages'
    ) THEN
        CREATE TRIGGER set_updated_at_lead_stages
            BEFORE UPDATE ON public.lead_stages
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Create history table
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id),
    from_stage_id UUID REFERENCES public.lead_stages(id),
    to_stage_id UUID REFERENCES public.lead_stages(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on history table
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policy for history
DROP POLICY IF EXISTS "Allow insert on lead_stage_history" ON public.lead_stage_history;
CREATE POLICY "Allow insert on lead_stage_history" ON public.lead_stage_history
    FOR INSERT WITH CHECK (true);

-- Create history trigger function
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
        INSERT INTO public.lead_stage_history (lead_id, from_stage_id, to_stage_id, changed_by)
        VALUES (NEW.id, OLD.stage_id, NEW.stage_id, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create history trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_stage_changes'
    ) THEN
        CREATE TRIGGER log_stage_changes
            AFTER UPDATE ON public.leads
            FOR EACH ROW
            EXECUTE FUNCTION public.log_stage_change();
    END IF;
END $$;

-- Create or replace the ordered view
DROP VIEW IF EXISTS public.v_lead_stages_ordered;
CREATE VIEW public.v_lead_stages_ordered AS
SELECT id, value, label, sort_order, active, created_at, updated_at
FROM public.lead_stages
WHERE active = true
ORDER BY sort_order;

-- Grant permissions
GRANT SELECT ON public.v_lead_stages_ordered TO authenticated;
GRANT SELECT ON public.lead_stages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_stage_history TO authenticated;

-- Acceptance checks
DO $$
DECLARE
    stage_count INTEGER;
    fk_exists BOOLEAN;
    trigger_exists BOOLEAN;
    view_count INTEGER;
BEGIN
    -- Check lead_stages has 12 rows with correct sort_order
    SELECT COUNT(*) INTO stage_count FROM public.lead_stages WHERE active = true;
    IF stage_count != 12 THEN
        RAISE EXCEPTION 'lead_stages should have 12 active rows, found %', stage_count;
    END IF;
    
    -- Check leads.stage_id exists and is FK to lead_stages(id)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_stage_id_fkey' 
        AND table_name = 'leads' 
        AND table_schema = 'public'
    ) INTO fk_exists;
    
    IF NOT fk_exists THEN
        RAISE EXCEPTION 'Foreign key constraint leads_stage_id_fkey not found';
    END IF;
    
    -- Check history trigger present
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_stage_changes'
    ) INTO trigger_exists;
    
    IF NOT trigger_exists THEN
        RAISE EXCEPTION 'Stage change history trigger not found';
    END IF;
    
    -- Check v_lead_stages_ordered returns 12 rows in canonical order
    SELECT COUNT(*) INTO view_count FROM public.v_lead_stages_ordered;
    IF view_count != 12 THEN
        RAISE EXCEPTION 'v_lead_stages_ordered should return 12 rows, found %', view_count;
    END IF;
    
    RAISE NOTICE 'All acceptance checks passed successfully.';
END $$;
