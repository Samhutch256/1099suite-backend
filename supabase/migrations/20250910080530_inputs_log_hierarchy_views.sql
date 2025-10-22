-- PART B — Database (Supabase SQL) — single source-of-truth table with period granularity & unique key

-- 1) Enum
create type period_type as enum ('day','week','month','year');

-- 2) Main table
create table if not exists inputs_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type period_type not null,
  period_start date not null,              -- inclusive, UTC date of period start
  period_end   date not null,              -- inclusive, UTC date of period end
  -- metrics (add all you track; integers default 0)
  appointments_set        integer not null default 0,
  door_knocks             integer not null default 0,
  tags_put                integer not null default 0,
  calls_made              integer not null default 0,
  referrals               integer not null default 0,
  inbound                 integer not null default 0,
  appointments_held       integer not null default 0,
  closed_deals            integer not null default 0,
  accounts_serviced       integer not null default 0,
  hours_worked            numeric(5,2) not null default 0,
  notes                   text default '',
  -- provenance
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Prevent duplicates for the same user/period/granularity
create unique index if not exists ux_inputs_log_user_period
  on inputs_log(user_id, period_type, period_start);

-- 4) Keep end >= start
alter table inputs_log add constraint chk_period_bounds
  check (period_end >= period_start);

-- 5) Auto-update updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists t_inputs_log_updated_at on inputs_log;
create trigger t_inputs_log_updated_at
before update on inputs_log
for each row execute procedure set_updated_at();

-- 6) Helper functions to compute period bounds in SQL (Mon-Sun weeks)
create or replace function week_bounds(d date)
returns table (start_date date, end_date date)
language sql immutable as $$
  select date_trunc('week', d)::date as start_date,
         (date_trunc('week', d) + interval '6 days')::date as end_date;
$$;

-- 7) Secure RLS (if enabled); adjust policy names as needed
alter table inputs_log enable row level security;
drop policy if exists p_inputs_select on inputs_log;
drop policy if exists p_inputs_mod    on inputs_log;

create policy p_inputs_select on inputs_log
  for select using (auth.uid() = user_id);

create policy p_inputs_mod on inputs_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8) View helpers that PREFER exact period rows and otherwise aggregate daily
-- NOTE: we treat "prefer exact" by UNIONing exact rows and ONLY aggregating daily
-- when an exact doesn't exist for that user & period.

-- DAILY passthrough view (exact day rows only)
create or replace view v_inputs_day as
select * from inputs_log where period_type = 'day';

-- WEEK view: prefer exact week rows; else aggregate daily rows into that week.
create or replace view v_inputs_week as
with all_weeks as (
  select user_id,
         (date_trunc('week', period_start))::date as week_start
  from inputs_log
  where period_type in ('day','week')
  group by user_id, (date_trunc('week', period_start))::date
),
exact as (
  select user_id, period_start as week_start, *
  from inputs_log
  where period_type = 'week'
),
agg as (
  select
    w.user_id,
    w.week_start,
    sum(d.appointments_set) as appointments_set,
    sum(d.door_knocks)      as door_knocks,
    sum(d.tags_put)         as tags_put,
    sum(d.calls_made)       as calls_made,
    sum(d.referrals)        as referrals,
    sum(d.inbound)          as inbound,
    sum(d.appointments_held) as appointments_held,
    sum(d.closed_deals)     as closed_deals,
    sum(d.accounts_serviced) as accounts_serviced,
    sum(d.hours_worked)     as hours_worked
  from all_weeks w
  join inputs_log d
    on d.user_id = w.user_id
   and d.period_type = 'day'
   and d.period_start >= w.week_start
   and d.period_start <= (w.week_start + interval '6 days')::date
  where not exists (
    select 1 from exact e
     where e.user_id = w.user_id and e.week_start = w.week_start
  )
  group by w.user_id, w.week_start
)
select e.user_id, e.week_start as period_start, (e.week_start + interval '6 days')::date as period_end,
       e.appointments_set, e.door_knocks, e.tags_put, e.calls_made, e.referrals, e.inbound,
       e.appointments_held, e.closed_deals, e.accounts_serviced, e.hours_worked,
       'week'::period_type as period_type
from (
  select user_id, week_start,
         max(appointments_set) filter (where period_type='week') as appointments_set,
         max(door_knocks)      filter (where period_type='week') as door_knocks,
         max(tags_put)         filter (where period_type='week') as tags_put,
         max(calls_made)       filter (where period_type='week') as calls_made,
         max(referrals)        filter (where period_type='week') as referrals,
         max(inbound)          filter (where period_type='week') as inbound,
         max(appointments_held) filter (where period_type='week') as appointments_held,
         max(closed_deals)     filter (where period_type='week') as closed_deals,
         max(accounts_serviced) filter (where period_type='week') as accounts_serviced,
         max(hours_worked)     filter (where period_type='week') as hours_worked,
         'week' as period_type
  from exact
  group by user_id, week_start
) e
union all
select user_id, week_start as period_start, (week_start + interval '6 days')::date as period_end,
       appointments_set, door_knocks, tags_put, calls_made, referrals, inbound,
       appointments_held, closed_deals, accounts_serviced, hours_worked,
       'week'::period_type
from agg;

create or replace view v_inputs_month as
with months as (
  select user_id, date_trunc('month', period_start)::date as month_start
  from inputs_log
  where period_type in ('day','week','month')
  group by user_id, date_trunc('month', period_start)::date
),
exact_month as (
  select user_id, period_start as month_start, *
  from inputs_log
  where period_type = 'month'
),
week_sum as (
  select m.user_id, m.month_start,
         coalesce(sum(w.appointments_set),0) as appointments_set,
         coalesce(sum(w.door_knocks),0)      as door_knocks,
         coalesce(sum(w.tags_put),0)         as tags_put,
         coalesce(sum(w.calls_made),0)       as calls_made,
         coalesce(sum(w.referrals),0)        as referrals,
         coalesce(sum(w.inbound),0)          as inbound,
         coalesce(sum(w.appointments_held),0) as appointments_held,
         coalesce(sum(w.closed_deals),0)     as closed_deals,
         coalesce(sum(w.accounts_serviced),0) as accounts_serviced,
         coalesce(sum(w.hours_worked),0)     as hours_worked
  from months m
  left join inputs_log w
    on w.user_id = m.user_id
   and w.period_type = 'week'
   and w.period_start >= m.month_start
   and w.period_start <  (m.month_start + interval '1 month')::date
  where not exists (
    select 1 from exact_month e
     where e.user_id = m.user_id and e.month_start = m.month_start
  )
  group by m.user_id, m.month_start
),
day_remaining as (
  select m.user_id, m.month_start,
         coalesce(sum(d.appointments_set),0) as appointments_set,
         coalesce(sum(d.door_knocks),0)      as door_knocks,
         coalesce(sum(d.tags_put),0)         as tags_put,
         coalesce(sum(d.calls_made),0)       as calls_made,
         coalesce(sum(d.referrals),0)        as referrals,
         coalesce(sum(d.inbound),0)          as inbound,
         coalesce(sum(d.appointments_held),0) as appointments_held,
         coalesce(sum(d.closed_deals),0)     as closed_deals,
         coalesce(sum(d.accounts_serviced),0) as accounts_serviced,
         coalesce(sum(d.hours_worked),0)     as hours_worked
  from months m
  left join inputs_log d
    on d.user_id = m.user_id
   and d.period_type = 'day'
   and d.period_start >= m.month_start
   and d.period_start <  (m.month_start + interval '1 month')::date
   and not exists (
     select 1 from inputs_log w
     where w.user_id = d.user_id
       and w.period_type = 'week'
       and d.period_start between w.period_start and w.period_end
   )
  where not exists (
    select 1 from exact_month e
     where e.user_id = m.user_id and e.month_start = m.month_start
  )
  group by m.user_id, m.month_start
),
agg as (
  select ws.user_id, ws.month_start,
         (ws.appointments_set + dr.appointments_set) as appointments_set,
         (ws.door_knocks      + dr.door_knocks)      as door_knocks,
         (ws.tags_put         + dr.tags_put)         as tags_put,
         (ws.calls_made       + dr.calls_made)       as calls_made,
         (ws.referrals        + dr.referrals)        as referrals,
         (ws.inbound          + dr.inbound)          as inbound,
         (ws.appointments_held+ dr.appointments_held) as appointments_held,
         (ws.closed_deals     + dr.closed_deals)     as closed_deals,
         (ws.accounts_serviced+ dr.accounts_serviced) as accounts_serviced,
         (ws.hours_worked     + dr.hours_worked)     as hours_worked
  from week_sum ws
  join day_remaining dr on dr.user_id = ws.user_id and dr.month_start = ws.month_start
)
select e.user_id, e.month_start as period_start,
       (e.month_start + interval '1 month - 1 day')::date as period_end,
       e.appointments_set, e.door_knocks, e.tags_put, e.calls_made, e.referrals, e.inbound,
       e.appointments_held, e.closed_deals, e.accounts_serviced, e.hours_worked,
       'month'::period_type
from (
  select user_id, month_start,
         max(appointments_set) filter (where period_type='month') as appointments_set,
         max(door_knocks)      filter (where period_type='month') as door_knocks,
         max(tags_put)         filter (where period_type='month') as tags_put,
         max(calls_made)       filter (where period_type='month') as calls_made,
         max(referrals)        filter (where period_type='month') as referrals,
         max(inbound)          filter (where period_type='month') as inbound,
         max(appointments_held) filter (where period_type='month') as appointments_held,
         max(closed_deals)     filter (where period_type='month') as closed_deals,
         max(accounts_serviced) filter (where period_type='month') as accounts_serviced,
         max(hours_worked)     filter (where period_type='month') as hours_worked
  from exact_month
  group by user_id, month_start
) e
union all
select a.user_id, a.month_start as period_start,
       (a.month_start + interval '1 month - 1 day')::date as period_end,
       a.appointments_set, a.door_knocks, a.tags_put, a.calls_made, a.referrals, a.inbound,
       a.appointments_held, a.closed_deals, a.accounts_serviced, a.hours_worked,
       'month'::period_type
from agg a;

create or replace view v_inputs_year as
with years as (
  select user_id, date_trunc('year', period_start)::date as year_start
  from inputs_log
  where period_type in ('day','week','month','year')
  group by user_id, date_trunc('year', period_start)::date
),
exact_year as (
  select user_id, period_start as year_start, *
  from inputs_log
  where period_type = 'year'
),
months_present as (
  select user_id, date_trunc('month', period_start)::date as month_start
  from inputs_log
  where period_type = 'month'
  group by user_id, date_trunc('month', period_start)::date
),
month_sum as (
  select y.user_id, y.year_start,
         coalesce(sum(m.appointments_set),0) as appointments_set,
         coalesce(sum(m.door_knocks),0)      as door_knocks,
         coalesce(sum(m.tags_put),0)         as tags_put,
         coalesce(sum(m.calls_made),0)       as calls_made,
         coalesce(sum(m.referrals),0)        as referrals,
         coalesce(sum(m.inbound),0)          as inbound,
         coalesce(sum(m.appointments_held),0) as appointments_held,
         coalesce(sum(m.closed_deals),0)     as closed_deals,
         coalesce(sum(m.accounts_serviced),0) as accounts_serviced,
         coalesce(sum(m.hours_worked),0)     as hours_worked
  from years y
  left join inputs_log m
    on m.user_id = y.user_id
   and m.period_type = 'month'
   and m.period_start >= y.year_start
   and m.period_start <  (y.year_start + interval '1 year')::date
  where not exists (
    select 1 from exact_year e
     where e.user_id = y.user_id and e.year_start = y.year_start
  )
  group by y.user_id, y.year_start
),
week_sum as (
  select y.user_id, y.year_start,
         coalesce(sum(w.appointments_set),0) as appointments_set,
         coalesce(sum(w.door_knocks),0)      as door_knocks,
         coalesce(sum(w.tags_put),0)         as tags_put,
         coalesce(sum(w.calls_made),0)       as calls_made,
         coalesce(sum(w.referrals),0)        as referrals,
         coalesce(sum(w.inbound),0)          as inbound,
         coalesce(sum(w.appointments_held),0) as appointments_held,
         coalesce(sum(w.closed_deals),0)     as closed_deals,
         coalesce(sum(w.accounts_serviced),0) as accounts_serviced,
         coalesce(sum(w.hours_worked),0)     as hours_worked
  from years y
  left join inputs_log w
    on w.user_id = y.user_id
   and w.period_type = 'week'
   and w.period_start >= y.year_start
   and w.period_start <  (y.year_start + interval '1 year')::date
   and not exists (
     select 1 from months_present mp
     where mp.user_id = w.user_id
       and mp.month_start = date_trunc('month', w.period_start)::date
   )
  where not exists (
    select 1 from exact_year e
     where e.user_id = y.user_id and e.year_start = y.year_start
  )
  group by y.user_id, y.year_start
),
day_sum as (
  select y.user_id, y.year_start,
         coalesce(sum(d.appointments_set),0) as appointments_set,
         coalesce(sum(d.door_knocks),0)      as door_knocks,
         coalesce(sum(d.tags_put),0)         as tags_put,
         coalesce(sum(d.calls_made),0)       as calls_made,
         coalesce(sum(d.referrals),0)        as referrals,
         coalesce(sum(d.inbound),0)          as inbound,
         coalesce(sum(d.appointments_held),0) as appointments_held,
         coalesce(sum(d.closed_deals),0)     as closed_deals,
         coalesce(sum(d.accounts_serviced),0) as accounts_serviced,
         coalesce(sum(d.hours_worked),0)     as hours_worked
  from years y
  left join inputs_log d
    on d.user_id = y.user_id
   and d.period_type = 'day'
   and d.period_start >= y.year_start
   and d.period_start <  (y.year_start + interval '1 year')::date
   and not exists (
     select 1 from months_present mp
     where mp.user_id = d.user_id
       and mp.month_start = date_trunc('month', d.period_start)::date
   )
   and not exists (
     select 1 from inputs_log w
     where w.user_id = d.user_id
       and w.period_type = 'week'
       and d.period_start between w.period_start and w.period_end
   )
  where not exists (
    select 1 from exact_year e
     where e.user_id = y.user_id and e.year_start = y.year_start
  )
  group by y.user_id, y.year_start
),
agg as (
  select ms.user_id, ms.year_start,
         (ms.appointments_set + ws.appointments_set + ds.appointments_set) as appointments_set,
         (ms.door_knocks      + ws.door_knocks      + ds.door_knocks)      as door_knocks,
         (ms.tags_put         + ws.tags_put         + ds.tags_put)         as tags_put,
         (ms.calls_made       + ws.calls_made       + ds.calls_made)       as calls_made,
         (ms.referrals        + ws.referrals        + ds.referrals)        as referrals,
         (ms.inbound          + ws.inbound          + ds.inbound)          as inbound,
         (ms.appointments_held+ ws.appointments_held+ ds.appointments_held) as appointments_held,
         (ms.closed_deals     + ws.closed_deals     + ds.closed_deals)     as closed_deals,
         (ms.accounts_serviced+ ws.accounts_serviced+ ds.accounts_serviced) as accounts_serviced,
         (ms.hours_worked     + ws.hours_worked     + ds.hours_worked)     as hours_worked
  from month_sum ms
  join week_sum ws on ws.user_id = ms.user_id and ws.year_start = ms.year_start
  join day_sum  ds on ds.user_id = ms.user_id and ds.year_start = ms.year_start
)
select e.user_id, e.year_start as period_start,
       (e.year_start + interval '1 year - 1 day')::date as period_end,
       e.appointments_set, e.door_knocks, e.tags_put, e.calls_made, e.referrals, e.inbound,
       e.appointments_held, e.closed_deals, e.accounts_serviced, e.hours_worked,
       'year'::period_type
from (
  select user_id, year_start,
         max(appointments_set) filter (where period_type='year') as appointments_set,
         max(door_knocks)      filter (where period_type='year') as door_knocks,
         max(tags_put)         filter (where period_type='year') as tags_put,
         max(calls_made)       filter (where period_type='year') as calls_made,
         max(referrals)        filter (where period_type='year') as referrals,
         max(inbound)          filter (where period_type='year') as inbound,
         max(appointments_held) filter (where period_type='year') as appointments_held,
         max(closed_deals)     filter (where period_type='year') as closed_deals,
         max(accounts_serviced) filter (where period_type='year') as accounts_serviced,
         max(hours_worked)     filter (where period_type='year') as hours_worked
  from exact_year
  group by user_id, year_start
) e
union all
select a.user_id, a.year_start as period_start,
       (a.year_start + interval '1 year - 1 day')::date as period_end,
       a.appointments_set, a.door_knocks, a.tags_put, a.calls_made, a.referrals, a.inbound,
       a.appointments_held, a.closed_deals, a.accounts_serviced, a.hours_worked,
       'year'::period_type
from agg a;
