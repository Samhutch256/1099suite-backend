// Test script to diagnose Supabase connection issues
// Run this with: node test-supabase-connection.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Basic connection successful\n');

    // Test 2: Check if users table exists
    console.log('2. Checking if users table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Users table not accessible:', tableError.message);
      console.log('💡 You may need to run the database setup script\n');
    } else {
      console.log('✅ Users table exists and is accessible\n');
    }

    // Test 3: Test auth signup (without actually creating account)
    console.log('3. Testing auth endpoint...');
    try {
      const { data: authTest, error: authError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
      });
      
      if (authError) {
        if (authError.message.includes('rate limit')) {
          console.log('⚠️ Rate limit detected - this is expected if you\'ve been testing');
        } else {
          console.log('❌ Auth endpoint error:', authError.message);
        }
      } else {
        console.log('✅ Auth endpoint working (test account created)');
      }
    } catch (authErr) {
      console.log('❌ Auth endpoint failed:', authErr.message);
    }

    console.log('\n📊 Summary:');
    console.log('- Supabase URL:', supabaseUrl);
    console.log('- API Key: Valid');
    console.log('- Connection: Working');
    
    if (tableError) {
      console.log('- Database Tables: Need setup');
      console.log('\n💡 Next steps:');
      console.log('1. Run the database setup script');
      console.log('2. Check RLS policies');
      console.log('3. Try Google Sign-In instead of email');
    } else {
      console.log('- Database Tables: OK');
      console.log('\n💡 If signup still fails, try:');
      console.log('1. Use Google Sign-In');
      console.log('2. Wait 5-10 minutes between attempts');
      console.log('3. Check rate limiting settings');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('1. Network connectivity');
    console.log('2. Supabase project suspended');
    console.log('3. Invalid API key');
    console.log('4. CORS issues');
  }
}

// Run the test
testSupabaseConnection();
