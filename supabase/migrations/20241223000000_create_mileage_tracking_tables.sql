-- Create mileage tracking tables for Everlance-style automatic trip detection
-- This migration creates the necessary tables and RLS policies for mileage tracking

-- Create mileage_trips table
CREATE TABLE IF NOT EXISTS mileage_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    start_lat DECIMAL(10, 8) NOT NULL,
    start_lng DECIMAL(11, 8) NOT NULL,
    end_lat DECIMAL(10, 8),
    end_lng DECIMAL(11, 8),
    miles DECIMAL(8, 3) NOT NULL DEFAULT 0,
    classification VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (classification IN ('business', 'medical', 'charity', 'personal')),
    rate_cents INTEGER NOT NULL DEFAULT 0,
    deduction_cents INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mileage_trip_points table for detailed route tracking
CREATE TABLE IF NOT EXISTS mileage_trip_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES mileage_trips(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(8, 3),
    accuracy DECIMAL(8, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user_id ON mileage_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_started_at ON mileage_trips(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_classification ON mileage_trips(classification);
CREATE INDEX IF NOT EXISTS idx_mileage_trip_points_trip_id ON mileage_trip_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trip_points_timestamp ON mileage_trip_points(timestamp);

-- Create updated_at trigger for mileage_trips
CREATE OR REPLACE FUNCTION update_mileage_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mileage_trips_updated_at
    BEFORE UPDATE ON mileage_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_mileage_trips_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_trip_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mileage_trips
CREATE POLICY "Users can view their own mileage trips" ON mileage_trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mileage trips" ON mileage_trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mileage trips" ON mileage_trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mileage trips" ON mileage_trips
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for mileage_trip_points
CREATE POLICY "Users can view trip points for their own trips" ON mileage_trip_points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mileage_trips 
            WHERE mileage_trips.id = mileage_trip_points.trip_id 
            AND mileage_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert trip points for their own trips" ON mileage_trip_points
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mileage_trips 
            WHERE mileage_trips.id = mileage_trip_points.trip_id 
            AND mileage_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update trip points for their own trips" ON mileage_trip_points
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM mileage_trips 
            WHERE mileage_trips.id = mileage_trip_points.trip_id 
            AND mileage_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete trip points for their own trips" ON mileage_trip_points
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM mileage_trips 
            WHERE mileage_trips.id = mileage_trip_points.trip_id 
            AND mileage_trips.user_id = auth.uid()
        )
    );

-- Create a function to calculate deduction amount
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

-- Create a function to get IRS rate for classification
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

-- Create a trigger to automatically calculate deduction when miles or classification changes
CREATE OR REPLACE FUNCTION update_mileage_deduction()
RETURNS TRIGGER AS $$
BEGIN
    NEW.rate_cents := get_irs_rate_cents(NEW.classification);
    NEW.deduction_cents := calculate_mileage_deduction(NEW.miles, NEW.classification);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mileage_deduction
    BEFORE INSERT OR UPDATE ON mileage_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_mileage_deduction();

-- Create a view for trip summaries with calculated fields
CREATE OR REPLACE VIEW mileage_trip_summaries AS
SELECT 
    mt.id,
    mt.user_id,
    mt.started_at,
    mt.ended_at,
    mt.start_lat,
    mt.start_lng,
    mt.end_lat,
    mt.end_lng,
    mt.miles,
    mt.classification,
    mt.rate_cents,
    mt.deduction_cents,
    mt.notes,
    mt.created_at,
    mt.updated_at,
    -- Calculate duration in minutes
    CASE 
        WHEN mt.ended_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (mt.ended_at - mt.started_at)) / 60
        ELSE NULL
    END as duration_minutes,
    -- Calculate rate in dollars
    mt.rate_cents / 100.0 as rate_dollars,
    -- Calculate deduction in dollars
    mt.deduction_cents / 100.0 as deduction_dollars
FROM mileage_trips mt;

-- Grant access to the view
GRANT SELECT ON mileage_trip_summaries TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can view their own trip summaries" ON mileage_trip_summaries
    FOR SELECT USING (auth.uid() = user_id);

-- Create a function to get user's mileage statistics
CREATE OR REPLACE FUNCTION get_user_mileage_stats(user_uuid UUID)
RETURNS TABLE (
    total_miles DECIMAL,
    total_deduction_cents BIGINT,
    total_trips BIGINT,
    business_miles DECIMAL,
    business_deduction_cents BIGINT,
    medical_miles DECIMAL,
    medical_deduction_cents BIGINT,
    charity_miles DECIMAL,
    charity_deduction_cents BIGINT,
    personal_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(mt.miles), 0) as total_miles,
        COALESCE(SUM(mt.deduction_cents), 0) as total_deduction_cents,
        COUNT(*) as total_trips,
        COALESCE(SUM(CASE WHEN mt.classification = 'business' THEN mt.miles ELSE 0 END), 0) as business_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'business' THEN mt.deduction_cents ELSE 0 END), 0) as business_deduction_cents,
        COALESCE(SUM(CASE WHEN mt.classification = 'medical' THEN mt.miles ELSE 0 END), 0) as medical_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'medical' THEN mt.deduction_cents ELSE 0 END), 0) as medical_deduction_cents,
        COALESCE(SUM(CASE WHEN mt.classification = 'charity' THEN mt.miles ELSE 0 END), 0) as charity_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'charity' THEN mt.deduction_cents ELSE 0 END), 0) as charity_deduction_cents,
        COALESCE(SUM(CASE WHEN mt.classification = 'personal' THEN mt.miles ELSE 0 END), 0) as personal_miles
    FROM mileage_trips mt
    WHERE mt.user_id = user_uuid
    AND mt.ended_at IS NOT NULL; -- Only count completed trips
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_mileage_stats(UUID) TO authenticated;

-- Create a function to get monthly mileage breakdown
CREATE OR REPLACE FUNCTION get_user_monthly_mileage(user_uuid UUID, year_param INTEGER)
RETURNS TABLE (
    month_number INTEGER,
    month_name TEXT,
    total_miles DECIMAL,
    total_deduction_cents BIGINT,
    total_trips BIGINT,
    business_miles DECIMAL,
    medical_miles DECIMAL,
    charity_miles DECIMAL,
    personal_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(MONTH FROM mt.started_at)::INTEGER as month_number,
        TO_CHAR(mt.started_at, 'Month') as month_name,
        COALESCE(SUM(mt.miles), 0) as total_miles,
        COALESCE(SUM(mt.deduction_cents), 0) as total_deduction_cents,
        COUNT(*) as total_trips,
        COALESCE(SUM(CASE WHEN mt.classification = 'business' THEN mt.miles ELSE 0 END), 0) as business_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'medical' THEN mt.miles ELSE 0 END), 0) as medical_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'charity' THEN mt.miles ELSE 0 END), 0) as charity_miles,
        COALESCE(SUM(CASE WHEN mt.classification = 'personal' THEN mt.miles ELSE 0 END), 0) as personal_miles
    FROM mileage_trips mt
    WHERE mt.user_id = user_uuid
    AND EXTRACT(YEAR FROM mt.started_at) = year_param
    AND mt.ended_at IS NOT NULL -- Only count completed trips
    GROUP BY EXTRACT(MONTH FROM mt.started_at), TO_CHAR(mt.started_at, 'Month')
    ORDER BY EXTRACT(MONTH FROM mt.started_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_monthly_mileage(UUID, INTEGER) TO authenticated;
