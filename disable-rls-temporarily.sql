-- Temporarily disable RLS for testing
-- This will allow the app to access the mileage data

-- Disable RLS on mileage_trips
ALTER TABLE public.mileage_trips DISABLE ROW LEVEL SECURITY;

-- Disable RLS on mileage_trip_points  
ALTER TABLE public.mileage_trip_points DISABLE ROW LEVEL SECURITY;

-- This is for testing only - we'll re-enable RLS later
