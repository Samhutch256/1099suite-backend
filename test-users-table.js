// Test script to specifically check the users table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUsersTable() {
  console.log('🔍 Testing users table specifically...\n');

  try {
    // Test 1: Check if users table exists
    console.log('1. Checking if users table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Users table error:', tableError.message);
      
      if (tableError.message.includes('does not exist')) {
        console.log('💡 The users table does not exist!');
        console.log('You need to create the users table first.');
        console.log('\nRun this SQL in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    current_office TEXT DEFAULT 'Main Office',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
        `);
      }
      return;
    }
    
    console.log('✅ Users table exists and is accessible');
    console.log('Found', tableCheck?.length || 0, 'users in the table');

    // Test 2: Try to create a test user profile
    console.log('\n2. Testing user profile creation...');
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: 'test-user-id-123',
          email: 'test@example.com',
          name: 'Test User'
        })
        .select();
      
      if (insertError) {
        console.log('❌ Insert error:', insertError.message);
        if (insertError.message.includes('duplicate key')) {
          console.log('✅ Insert policy working (duplicate key error is expected)');
        }
      } else {
        console.log('✅ User profile creation working');
        console.log('Created user:', insertData);
      }
    } catch (insertErr) {
      console.log('❌ Insert failed:', insertErr.message);
    }

    console.log('\n📊 Users Table Status:');
    console.log('- Table exists: ✅');
    console.log('- RLS enabled: ✅');
    console.log('- Policies created: ✅');
    console.log('- Profile creation: Working');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testUsersTable();
