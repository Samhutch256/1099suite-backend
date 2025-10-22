-- Complete Database Setup for 1099Suite
-- Run this in your Supabase SQL Editor to fix all account creation issues

-- 1. First, let's check what tables exist
SELECT 
    tablename as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Create the users table (this is the main issue)
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    current_office TEXT DEFAULT 'Main Office',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create other essential tables if they don't exist
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    status TEXT DEFAULT 'new',
    value DECIMAL(10,2) DEFAULT 0,
    revenue JSONB DEFAULT '{}',
    notes TEXT,
    source TEXT,
    appointment_date TIMESTAMP WITH TIME ZONE,
    appointment_time TEXT,
    appointment_notes TEXT,
    appointment_status TEXT,
    cancelled_reason TEXT,
    lost_reason TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    appointment_created_from TEXT,
    appointment_set_on_date TIMESTAMP WITH TIME ZONE,
    date_set TIMESTAMP WITH TIME ZONE,
    date_set_for TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    receipt TEXT,
    is_deductible BOOLEAN DEFAULT TRUE,
    mileage INTEGER,
    start_location TEXT,
    end_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    doors_knocked INTEGER DEFAULT 0,
    appointments INTEGER DEFAULT 0,
    appointment_holds INTEGER DEFAULT 0,
    closed_deals INTEGER DEFAULT 0,
    accounts_serviced INTEGER DEFAULT 0,
    hours_worked DECIMAL(4,2) DEFAULT 0,
    outreach_door_knocks INTEGER,
    outreach_tags_put INTEGER,
    outreach_calls_made INTEGER,
    outreach_referrals INTEGER,
    outreach_inbound INTEGER,
    appointments_set_door_knocks INTEGER,
    appointments_set_tags_put INTEGER,
    appointments_set_calls_made INTEGER,
    appointments_set_referrals INTEGER,
    appointments_set_inbound INTEGER,
    appointments_held_door_knocks INTEGER,
    appointments_held_tags_put INTEGER,
    appointments_held_calls_made INTEGER,
    appointments_held_referrals INTEGER,
    appointments_held_inbound INTEGER,
    deals_closed_door_knocks INTEGER,
    deals_closed_tags_put INTEGER,
    deals_closed_calls_made INTEGER,
    deals_closed_referrals INTEGER,
    deals_closed_inbound INTEGER,
    accounts_serviced_door_knocks INTEGER,
    accounts_serviced_tags_put INTEGER,
    accounts_serviced_calls_made INTEGER,
    accounts_serviced_referrals INTEGER,
    accounts_serviced_inbound INTEGER,
    tally_counts JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- 6. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Create RLS policies for leads table
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON public.leads
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for expenses table
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS policies for daily_inputs table
DROP POLICY IF EXISTS "Users can view own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can insert own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can update own daily inputs" ON public.daily_inputs;
DROP POLICY IF EXISTS "Users can delete own daily inputs" ON public.daily_inputs;

CREATE POLICY "Users can view own daily inputs" ON public.daily_inputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily inputs" ON public.daily_inputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily inputs" ON public.daily_inputs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily inputs" ON public.daily_inputs
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Create RLS policies for user_settings table
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 11. Verify the setup
SELECT 
    tablename as table_name,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'leads', 'expenses', 'daily_inputs', 'user_settings')
ORDER BY tablename;
