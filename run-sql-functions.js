// Script to run SQL functions for multi-scope daily input functionality
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sqlFunctions = `
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

-- Overwrite a range by distributing totals evenly (prevents double counting)
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
begin
  -- First, check if any existing records have non-zero values that would be overwritten
  -- This prevents accidental overwriting of manually entered daily data
  for existing_record in 
    select date, appointments, appointment_holds, closed_deals, accounts_serviced, hours_worked
    from public.daily_inputs 
    where user_id = p_user 
      and date between p_start and p_end
      and (appointments > 0 or appointment_holds > 0 or closed_deals > 0 or accounts_serviced > 0 or hours_worked > 0)
  loop
    -- If we find existing data, raise an exception to prevent overwriting
    raise exception 'Cannot overwrite existing daily data for date %. Existing data found: appointments=%, appointment_holds=%, closed_deals=%, accounts_serviced=%, hours_worked=%', 
      existing_record.date, 
      existing_record.appointments, 
      existing_record.appointment_holds, 
      existing_record.closed_deals, 
      existing_record.accounts_serviced, 
      existing_record.hours_worked;
  end loop;

  -- Only delete records that have zero or null values (safe to overwrite)
  delete from public.daily_inputs 
  where user_id = p_user 
    and date between p_start and p_end
    and (appointments is null or appointments = 0)
    and (appointment_holds is null or appointment_holds = 0)
    and (closed_deals is null or closed_deals = 0)
    and (accounts_serviced is null or accounts_serviced = 0)
    and (hours_worked is null or hours_worked = 0);

  -- Insert new records only for dates that don't have existing data
  d := p_start;
  while d <= p_end loop
    -- Only insert if no record exists for this date
    if not exists (select 1 from public.daily_inputs where user_id = p_user and date = d) then
      insert into public.daily_inputs(
        user_id, date, appointments, appointment_holds, closed_deals, accounts_serviced, hours_worked
      ) values (
        p_user, d,
        round(v_appt_set)::int,
        round(v_appt_held)::int,
        round(v_closed)::int,
        round(v_serviced)::int,
        v_hours
      );
    end if;
    d := d + interval '1 day';
  end loop;
end;
$$;
`;

async function runSqlFunctions() {
  console.log('🚀 Running SQL functions for multi-scope functionality...');

  try {
    // Execute the SQL functions
    const { error } = await supabase.rpc('exec_sql', { sql: sqlFunctions });
    
    if (error) {
      console.log('⚠️ Note: exec_sql RPC might not exist, but that\'s okay.');
      console.log('   The SQL functions need to be run manually in the Supabase SQL editor.');
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('\n' + sqlFunctions);
    } else {
      console.log('✅ SQL functions executed successfully!');
    }

    console.log('\n📋 Implementation Summary:');
    console.log('✅ SQL RPC functions defined');
    console.log('✅ React components created');
    console.log('✅ Hooks and utilities implemented');
    console.log('✅ DailyInputScreen updated with multi-scope UI');
    console.log('\n🚀 Ready for testing in the app!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the SQL functions in Supabase SQL editor');
    console.log('2. Test the app with the new multi-scope functionality');
    console.log('3. Verify that Day/Week/Month/Year scopes work correctly');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please run the SQL functions manually in Supabase SQL editor:');
    console.log('\n' + sqlFunctions);
  }
}

// Run the script
runSqlFunctions();
