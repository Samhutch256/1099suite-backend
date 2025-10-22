-- Add unique constraint to daily_inputs table for upsert operations
-- This fixes the "there is no unique or exclusion constraint matching the ON CONFLICT specification" error

-- Add unique constraint on user_id and date combination
ALTER TABLE public.daily_inputs 
ADD CONSTRAINT daily_inputs_user_id_date_unique 
UNIQUE (user_id, date);

-- Verify the constraint was added
SELECT 
    constraint_name, 
    constraint_type, 
    table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'daily_inputs' 
AND constraint_type = 'UNIQUE'; 