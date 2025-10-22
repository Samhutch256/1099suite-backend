-- Fix RLS policies for mileage tracking tables
-- Run this in Supabase SQL Editor

-- First, let's check if the policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('mileage_trips', 'mileage_trip_points');

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "owner can crud trips" ON public.mileage_trips;
DROP POLICY IF EXISTS "owner can crud trip points" ON public.mileage_trip_points;

-- Recreate the policies with proper authentication
CREATE POLICY "owner can crud trips"
  ON public.mileage_trips FOR ALL
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can crud trip points"
  ON public.mileage_trip_points FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.mileage_trips mt 
    WHERE mt.id = trip_id AND mt.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mileage_trips mt 
    WHERE mt.id = trip_id AND mt.user_id = auth.uid()
  ));

-- Test the policies
SELECT 'RLS policies recreated successfully' as status;
