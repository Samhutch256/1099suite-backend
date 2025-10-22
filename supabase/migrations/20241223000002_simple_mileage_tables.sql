-- Simple mileage tracking tables migration
-- This works with existing tables and creates only what's needed

-- Drop the view first if it exists (this was causing the error)
DROP VIEW IF EXISTS mileage_trip_summaries CASCADE;

-- Create mileage_trip_points table if it doesn't exist
CREATE TABLE IF NOT EXISTS mileage_trip_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(8, 3),
    accuracy DECIMAL(8, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint only if mileage_trips table exists and has UUID id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trips') THEN
        -- Check if mileage_trips has UUID id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'mileage_trips' 
            AND column_name = 'id' 
            AND data_type = 'uuid'
        ) THEN
            -- Add foreign key constraint
            ALTER TABLE mileage_trip_points 
            ADD CONSTRAINT mileage_trip_points_trip_id_fkey 
            FOREIGN KEY (trip_id) REFERENCES mileage_trips(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mileage_trip_points_trip_id ON mileage_trip_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trip_points_timestamp ON mileage_trip_points(timestamp);

-- Enable Row Level Security (RLS) if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trips') THEN
        ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trip_points') THEN
        ALTER TABLE mileage_trip_points ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for mileage_trips (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trips') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own mileage trips" ON mileage_trips;
        DROP POLICY IF EXISTS "Users can insert their own mileage trips" ON mileage_trips;
        DROP POLICY IF EXISTS "Users can update their own mileage trips" ON mileage_trips;
        DROP POLICY IF EXISTS "Users can delete their own mileage trips" ON mileage_trips;
        
        -- Create new policies
        CREATE POLICY "Users can view their own mileage trips" ON mileage_trips
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own mileage trips" ON mileage_trips
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own mileage trips" ON mileage_trips
            FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete their own mileage trips" ON mileage_trips
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create RLS policies for mileage_trip_points (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_trip_points') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view trip points for their own trips" ON mileage_trip_points;
        DROP POLICY IF EXISTS "Users can insert trip points for their own trips" ON mileage_trip_points;
        DROP POLICY IF EXISTS "Users can update trip points for their own trips" ON mileage_trip_points;
        DROP POLICY IF EXISTS "Users can delete trip points for their own trips" ON mileage_trip_points;
        
        -- Create new policies
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
    END IF;
END $$;

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
