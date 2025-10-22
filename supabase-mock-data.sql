-- 🔐 Set this to your user id
-- select auth.uid();  -- if running via authenticated client
-- For SQL editor, paste your UUID below:
-- DO THIS FIRST:
-- \set my_user '00000000-0000-0000-0000-000000000000'

-- Create a mock trip
with t as (
  insert into public.mileage_trips (
    user_id, started_at, ended_at,
    start_lat, start_lng, end_lat, end_lng,
    miles, classification, rate_cents, deduction_cents, notes
  )
  values (
    '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1',
    now() - interval '45 minutes',
    now() - interval '30 minutes',
    39.7392, -104.9903,   -- Civic Center Park (start)
    39.7589, -104.9730,   -- Near City Park (end)
    4.20,                 -- sample miles
    'business',
    67,
    floor(4.20 * 67),
    'Mock Denver route for map preview'
  )
  returning id
)
insert into public.mileage_trip_points (trip_id, t, lat, lng, speed_mps, accuracy_m)
select
  t.id,
  (now() - interval '45 minutes') + (g.i * interval '9 seconds') as t,
  p.lat,
  p.lng,
  12.0, 8.0
from t
cross join lateral (
  -- ~100 points between start and end with some wiggle
  select
    39.7392 + (g.i::float/100.0)*(39.7589 - 39.7392) + (sin(g.i/6.0)/1000.0) as lat,
    -104.9903 + (g.i::float/100.0)*(-104.9730 + 0.0000 - (-104.9903)) + (cos(g.i/5.0)/1000.0) as lng
  from generate_series(0, 99) as g(i)
) as p
join generate_series(0,99) as g(i) on true;
