-- Mileage Maps Schema Migration
-- Creates proper UUID-based tables for GPS tracking with map functionality

-- Drop existing tables if they exist (to ensure clean schema)
DROP TABLE IF EXISTS public.mileage_trip_points CASCADE;
DROP TABLE IF EXISTS public.mileage_trips CASCADE;

-- Create mileage_trips table with UUID primary key
CREATE TABLE IF NOT EXISTS public.mileage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  miles NUMERIC(10,2) NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'personal',
  rate_cents INT NOT NULL DEFAULT 0,
  deduction_cents INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mileage_trip_points table for GPS tracking
CREATE TABLE IF NOT EXISTS public.mileage_trip_points (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.mileage_trips(id) ON DELETE CASCADE,
  t TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_mps DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS mileage_trips_user_started_idx ON public.mileage_trips (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS mileage_trip_points_trip_t_idx ON public.mileage_trip_points (trip_id, t);

-- Enable Row Level Security
ALTER TABLE public.mileage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_trip_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "owner can crud trips" ON public.mileage_trips;
CREATE POLICY "owner can crud trips"
  ON public.mileage_trips FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner can crud trip points" ON public.mileage_trip_points;
CREATE POLICY "owner can crud trip points"
  ON public.mileage_trip_points FOR ALL
  USING (EXISTS (SELECT 1 FROM public.mileage_trips mt WHERE mt.id = trip_id AND mt.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mileage_trips mt WHERE mt.id = trip_id AND mt.user_id = auth.uid()));

-- Create helper functions for IRS calculations
CREATE OR REPLACE FUNCTION calculate_mileage_deduction(
    trip_miles DECIMAL,
    trip_classification VARCHAR
) RETURNS INTEGER AS $$
DECLARE
    rate_cents INTEGER;
BEGIN
    -- IRS rates for 2024 (in cents per mile)
    CASE trip_classification
        WHEN 'business' THEN rate_cents := 67;
        WHEN 'medical' THEN rate_cents := 21;
        WHEN 'charity' THEN rate_cents := 14;
        WHEN 'personal' THEN rate_cents := 0;
        ELSE rate_cents := 0;
    END CASE;
    
    RETURN ROUND(trip_miles * rate_cents);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_irs_rate_cents(
    trip_classification VARCHAR
) RETURNS INTEGER AS $$
BEGIN
    -- IRS rates for 2024 (in cents per mile)
    CASE trip_classification
        WHEN 'business' THEN RETURN 67;
        WHEN 'medical' THEN RETURN 21;
        WHEN 'charity' THEN RETURN 14;
        WHEN 'personal' THEN RETURN 0;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_mileage_deduction(DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_irs_rate_cents(VARCHAR) TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mileage_trips_updated_at
    BEFORE UPDATE ON public.mileage_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
