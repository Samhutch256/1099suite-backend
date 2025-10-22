-- PART D — Migration/Backfill (if you already have `daily_inputs`)
-- Migrate existing daily data into `inputs_log` with period_type='day' and period_start=the existing date.
-- Keep your old table read‑only until you confirm parity; then deprecate.

-- First, let's check what data exists in the current daily_inputs table
-- (This is a safe query that won't modify anything)
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM daily_inputs;

-- Now migrate the data to the new inputs_log table
-- This assumes the daily_inputs table has the following structure:
-- - user_id (uuid)
-- - date (text in 'YYYY-MM-DD' format)
-- - appointments (integer)
-- - appointmentHolds (integer)
-- - closedDeals (integer)
-- - accountsServiced (integer)
-- - hoursWorked (numeric)
-- - notes (text)
-- - door_knocks, tags_put, calls_made, referrals, inbound (all the sub-inputs)

INSERT INTO inputs_log (
  user_id,
  period_type,
  period_start,
  period_end,
  appointments_set,
  door_knocks,
  tags_put,
  calls_made,
  referrals,
  inbound,
  appointments_held,
  closed_deals,
  accounts_serviced,
  hours_worked,
  notes,
  source,
  created_at,
  updated_at
)
SELECT 
  di.user_id,
  'day'::period_type as period_type,
  di.date::date as period_start,
  di.date::date as period_end,
  COALESCE(di.appointments, 0) as appointments_set,
  COALESCE(di.door_knocks, 0) as door_knocks,
  COALESCE(di.tags_put, 0) as tags_put,
  COALESCE(di.calls_made, 0) as calls_made,
  COALESCE(di.referrals, 0) as referrals,
  COALESCE(di.inbound, 0) as inbound,
  COALESCE(di.appointment_holds, 0) as appointments_held,
  COALESCE(di.closed_deals, 0) as closed_deals,
  COALESCE(di.accounts_serviced, 0) as accounts_serviced,
  COALESCE(di.hours_worked, 0) as hours_worked,
  COALESCE(di.notes, '') as notes,
  'migration' as source,
  COALESCE(di.created_at, NOW()) as created_at,
  COALESCE(di.updated_at, NOW()) as updated_at
FROM daily_inputs di
WHERE NOT EXISTS (
  -- Avoid duplicates by checking if this user/date combination already exists
  SELECT 1 FROM inputs_log il 
  WHERE il.user_id = di.user_id 
    AND il.period_type = 'day' 
    AND il.period_start = di.date::date
);

-- Verify the migration was successful
SELECT 
  'Migration Summary' as summary,
  COUNT(*) as total_migrated_records,
  COUNT(DISTINCT user_id) as unique_users_migrated
FROM inputs_log 
WHERE source = 'migration';

-- Compare counts between old and new tables
SELECT 
  'Daily Inputs (Old)' as table_name,
  COUNT(*) as record_count
FROM daily_inputs
UNION ALL
SELECT 
  'Inputs Log (New)' as table_name,
  COUNT(*) as record_count
FROM inputs_log 
WHERE period_type = 'day';

-- Check for any data discrepancies
SELECT 
  'Data Quality Check' as check_type,
  COUNT(*) as records_with_issues
FROM (
  SELECT di.user_id, di.date, di.appointments as old_appointments, il.appointments_set as new_appointments
  FROM daily_inputs di
  LEFT JOIN inputs_log il ON il.user_id = di.user_id 
    AND il.period_type = 'day' 
    AND il.period_start = di.date::date
  WHERE COALESCE(di.appointments, 0) != COALESCE(il.appointments_set, 0)
) discrepancies;

-- Optional: After confirming everything looks good, you can make the old table read-only
-- ALTER TABLE daily_inputs SET READ ONLY;

-- Optional: After a grace period, you can drop the old table
-- DROP TABLE daily_inputs;
