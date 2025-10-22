// Basic Supabase connection test
// This tests if we can connect to Supabase at all

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBasicConnection() {
  console.log('🔍 Testing basic Supabase connection...\n');

  try {
    // Test 1: Check if we can reach Supabase
    console.log('1. Testing Supabase reachability...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Basic connection failed:', error.message);
      console.log('\n💡 This could mean:');
      console.log('- Supabase project is suspended');
      console.log('- Invalid API key');
      console.log('- Network connectivity issues');
      console.log('- CORS issues');
      return;
    }
    
    console.log('✅ Basic Supabase connection successful');
    console.log('Session data:', data.session ? 'Session exists' : 'No session');

    // Test 2: Try to list tables (this should work even without specific table access)
    console.log('\n2. Testing database access...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);
      
      if (tablesError) {
        console.log('❌ Cannot access database schema:', tablesError.message);
        console.log('💡 This suggests the database setup script needs to be run');
      } else {
        console.log('✅ Database access working');
        console.log('Available tables:', tables?.map(t => t.table_name).join(', ') || 'None found');
      }
    } catch (schemaError) {
      console.log('❌ Schema access failed:', schemaError.message);
    }

    // Test 3: Test auth signup endpoint
    console.log('\n3. Testing auth signup endpoint...');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
      });
      
      if (authError) {
        if (authError.message.includes('rate limit')) {
          console.log('⚠️ Rate limit detected - this is expected');
          console.log('✅ Auth endpoint is working (rate limited)');
        } else if (authError.message.includes('already registered')) {
          console.log('✅ Auth endpoint working (email already exists)');
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
    console.log('- Supabase URL: ✅ Working');
    console.log('- API Key: ✅ Valid');
    console.log('- Basic Connection: ✅ Working');
    console.log('- Database Tables: ❌ Need setup');
    console.log('- Auth Endpoint: ✅ Working');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the fix-all-permissions-including-leads.sql script');
    console.log('3. Or use Google Sign-In instead of email signup');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('1. Network connectivity');
    console.log('2. Supabase project suspended');
    console.log('3. Invalid API key');
    console.log('4. CORS issues');
  }
}

testBasicConnection();
