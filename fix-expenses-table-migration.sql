-- Migration to fix expenses table for Plaid integration
-- Add missing columns that the backend expects

-- Add account_name column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Add plaid_transaction_id column for linking to Plaid transactions
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT UNIQUE;

-- Add account_id column for Plaid account reference
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Add date column (if not exists) for proper date handling
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS date DATE;

-- Add merchant_name column for Plaid merchant data
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

-- Add currency column with default USD
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add category array column for Plaid categories
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS category_array TEXT[];

-- Add pending column for transaction status
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE;

-- Add classification column for business/personal classification
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('business','personal','unreviewed')) DEFAULT 'unreviewed';

-- Add logo_url column for merchant logos
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add recurring column for recurring transaction detection
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT FALSE;

-- Add original_description column for Plaid original transaction data
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS original_description TEXT;

-- Add updated_at column if not exists
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on plaid_transaction_id for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_plaid_transaction_id ON public.expenses(plaid_transaction_id);

-- Create index on account_id for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(account_id);

-- Create index on date for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Create index on classification for filtering
CREATE INDEX IF NOT EXISTS idx_expenses_classification ON public.expenses(classification);

-- Update existing records to set date from timestamp if date is null
-- Only run this if the timestamp column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'expenses' 
             AND column_name = 'timestamp' 
             AND table_schema = 'public') THEN
    UPDATE public.expenses 
    SET date = timestamp::date 
    WHERE date IS NULL AND timestamp IS NOT NULL;
  END IF;
END $$;

-- Update existing records to set account_name to a default if null
UPDATE public.expenses 
SET account_name = 'Unknown Account' 
WHERE account_name IS NULL;

-- Update existing records to set classification based on is_business
-- Only run this if the is_business column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'expenses' 
             AND column_name = 'is_business' 
             AND table_schema = 'public') THEN
    UPDATE public.expenses 
    SET classification = CASE 
      WHEN is_business = true THEN 'business' 
      ELSE 'personal' 
    END 
    WHERE classification IS NULL;
  ELSE
    -- If is_business doesn't exist, set all to unreviewed
    UPDATE public.expenses 
    SET classification = 'unreviewed' 
    WHERE classification IS NULL;
  END IF;
END $$;

-- Sum a range
create or replace function public.daily_inputs_sum_range(p_user uuid, p_start date, p_end date)
returns table (
  appointments_set int,
  appointments_held int,
  closed_deals int,
  accounts_serviced int,
  hours_worked numeric
) language sql stable as $$
  select
    coalesce(sum(appointments),0),
    coalesce(sum(appointment_holds),0),
    coalesce(sum(closed_deals),0),
    coalesce(sum(accounts_serviced),0),
    coalesce(sum(hours_worked),0)
  from public.daily_inputs
  where user_id = p_user
    and date between p_start and p_end;
$$;

-- Sum a range with sub-input breakdowns
create or replace function public.daily_inputs_sum_range_with_subinputs(p_user uuid, p_start date, p_end date)
returns table (
  doors_knocked int,
  appointments_set int,
  appointments_held int,
  closed_deals int,
  accounts_serviced int,
  hours_worked numeric,
  outreach_door_knocks int,
  outreach_tags_put int,
  outreach_calls_made int,
  outreach_referrals int,
  outreach_inbound int,
  appointments_set_door_knocks int,
  appointments_set_tags_put int,
  appointments_set_calls_made int,
  appointments_set_referrals int,
  appointments_set_inbound int,
  appointments_held_door_knocks int,
  appointments_held_tags_put int,
  appointments_held_calls_made int,
  appointments_held_referrals int,
  appointments_held_inbound int,
  deals_closed_door_knocks int,
  deals_closed_tags_put int,
  deals_closed_calls_made int,
  deals_closed_referrals int,
  deals_closed_inbound int,
  accounts_serviced_door_knocks int,
  accounts_serviced_tags_put int,
  accounts_serviced_calls_made int,
  accounts_serviced_referrals int,
  accounts_serviced_inbound int
) language sql stable as $$
  select
    coalesce(sum(doors_knocked),0)::int,
    coalesce(sum(appointments),0)::int,
    coalesce(sum(appointment_holds),0)::int,
    coalesce(sum(closed_deals),0)::int,
    coalesce(sum(accounts_serviced),0)::int,
    coalesce(sum(hours_worked),0),
    coalesce(sum(outreach_door_knocks),0)::int,
    coalesce(sum(outreach_tags_put),0)::int,
    coalesce(sum(outreach_calls_made),0)::int,
    coalesce(sum(outreach_referrals),0)::int,
    coalesce(sum(outreach_inbound),0)::int,
    coalesce(sum(appointments_set_door_knocks),0)::int,
    coalesce(sum(appointments_set_tags_put),0)::int,
    coalesce(sum(appointments_set_calls_made),0)::int,
    coalesce(sum(appointments_set_referrals),0)::int,
    coalesce(sum(appointments_set_inbound),0)::int,
    coalesce(sum(appointments_held_door_knocks),0)::int,
    coalesce(sum(appointments_held_tags_put),0)::int,
    coalesce(sum(appointments_held_calls_made),0)::int,
    coalesce(sum(appointments_held_referrals),0)::int,
    coalesce(sum(appointments_held_inbound),0)::int,
    coalesce(sum(deals_closed_door_knocks),0)::int,
    coalesce(sum(deals_closed_tags_put),0)::int,
    coalesce(sum(deals_closed_calls_made),0)::int,
    coalesce(sum(deals_closed_referrals),0)::int,
    coalesce(sum(deals_closed_inbound),0)::int,
    coalesce(sum(accounts_serviced_door_knocks),0)::int,
    coalesce(sum(accounts_serviced_tags_put),0)::int,
    coalesce(sum(accounts_serviced_calls_made),0)::int,
    coalesce(sum(accounts_serviced_referrals),0)::int,
    coalesce(sum(accounts_serviced_inbound),0)::int
  from public.daily_inputs
  where user_id = p_user
    and date::date between p_start and p_end;
$$;

-- Overwrite a range by distributing totals evenly (with double-counting prevention)
create or replace function public.daily_inputs_overwrite_range(
  p_user uuid,
  p_start date,
  p_end date,
  p_appt_set int,
  p_appt_held int,
  p_closed int,
  p_serviced int,
  p_hours numeric
) returns void
language plpgsql security definer as $$
declare
  d date;
  days int := greatest(1, (p_end - p_start) + 1);
  v_appt_set numeric := coalesce(p_appt_set,0)::numeric / days;
  v_appt_held numeric := coalesce(p_appt_held,0)::numeric / days;
  v_closed    numeric := coalesce(p_closed,0)::numeric / days;
  v_serviced  numeric := coalesce(p_serviced,0)::numeric / days;
  v_hours     numeric := coalesce(p_hours,0)::numeric / days;
  existing_record record;
  existing_data_found boolean := false;
  existing_dates text := '';
begin
  -- Check for existing data that would be overwritten
  for existing_record in 
    select date, appointments, appointment_holds, closed_deals, accounts_serviced, hours_worked
    from public.daily_inputs 
    where user_id = p_user 
      and date between p_start and p_end
      and (
        coalesce(appointments,0) > 0 or 
        coalesce(appointment_holds,0) > 0 or 
        coalesce(closed_deals,0) > 0 or 
        coalesce(accounts_serviced,0) > 0 or 
        coalesce(hours_worked,0) > 0
      )
  loop
    existing_data_found := true;
    existing_dates := existing_dates || existing_record.date::text || ', ';
  end loop;

  -- If existing data found, raise exception with details
  if existing_data_found then
    existing_dates := rtrim(existing_dates, ', ');
    raise exception 'Cannot overwrite existing daily data. The following dates already have data: %', existing_dates;
  end if;

  -- Safe to proceed - delete any existing records (should be none or only zero/null values)
  delete from public.daily_inputs 
  where user_id = p_user 
    and date between p_start and p_end;

  -- Insert new records for each day in the range
  d := p_start;
  while d <= p_end loop
    insert into public.daily_inputs(
      user_id, 
      date, 
      appointments, 
      appointment_holds, 
      closed_deals, 
      accounts_serviced, 
      hours_worked,
      updated_at
    ) values (
      p_user, 
      d, 
      v_appt_set, 
      v_appt_held, 
      v_closed, 
      v_serviced, 
      v_hours,
      now()
    );
    d := d + interval '1 day';
  end loop;
end;
$$;
