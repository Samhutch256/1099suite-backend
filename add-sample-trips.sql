-- Add sample mileage trips directly in Supabase Dashboard
-- Run this in: Supabase Dashboard → SQL Editor

-- First, temporarily disable RLS for testing
ALTER TABLE public.mileage_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_trip_points DISABLE ROW LEVEL SECURITY;

-- Insert sample trips
INSERT INTO public.mileage_trips (
  user_id, started_at, ended_at,
  start_lat, start_lng, end_lat, end_lng,
  miles, classification, rate_cents, deduction_cents, notes
) VALUES 
  (
    '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1',
    now() - interval '2 hours',
    now() - interval '1.5 hours',
    39.7392, -104.9903,   -- Start: Civic Center Park
    39.7589, -104.9730,   -- End: Near City Park
    4.2,
    'business',
    67,
    281,  -- 4.2 * 67
    'Client meeting in downtown Denver'
  ),
  (
    '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1',
    now() - interval '4 hours',
    now() - interval '3.5 hours',
    39.7392, -104.9903,   -- Start: Civic Center Park
    39.7500, -104.9800,   -- End: Different location
    2.1,
    'medical',
    21,
    44,   -- 2.1 * 21
    'Doctor appointment'
  ),
  (
    '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1',
    now() - interval '6 hours',
    now() - interval '5.5 hours',
    39.7392, -104.9903,   -- Start: Civic Center Park
    39.7200, -105.0000,   -- End: Another location
    3.8,
    'charity',
    14,
    53,   -- 3.8 * 14
    'Volunteer work at food bank'
  );

-- Get the ID of the first trip (business trip) to add GPS points
WITH business_trip AS (
  SELECT id FROM public.mileage_trips 
  WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1' 
  AND classification = 'business' 
  ORDER BY started_at DESC 
  LIMIT 1
)
INSERT INTO public.mileage_trip_points (trip_id, t, lat, lng, speed_mps, accuracy_m)
SELECT 
  business_trip.id,
  (now() - interval '2 hours') + (g.i * interval '2 minutes') as t,
  39.7392 + (g.i::float/19.0)*(39.7589 - 39.7392) + (sin(g.i/3.0)/1000.0) as lat,
  -104.9903 + (g.i::float/19.0)*(-104.9730 - (-104.9903)) + (cos(g.i/2.0)/1000.0) as lng,
  12.0, 8.0
FROM business_trip
CROSS JOIN generate_series(0, 19) as g(i);

-- Verify the data
SELECT 
  classification,
  miles,
  deduction_cents,
  notes,
  started_at
FROM public.mileage_trips 
WHERE user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1'
ORDER BY started_at DESC;

-- Check GPS points
SELECT COUNT(*) as gps_points_count
FROM public.mileage_trip_points mtp
JOIN public.mileage_trips mt ON mtp.trip_id = mt.id
WHERE mt.user_id = '64f96c5a-d6f3-4e2b-9b17-97dce9a52bb1';

-- Re-enable RLS (optional - for production)
-- ALTER TABLE public.mileage_trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.mileage_trip_points ENABLE ROW LEVEL SECURITY;
