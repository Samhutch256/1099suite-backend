// Test to debug account creation issue
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccountCreationDebug() {
  console.log('🔍 Debugging account creation issue...\\n');

  try {
    // Step 1: Test authentication signup
    console.log('1. Testing authentication signup...');
    const testEmail = `debug-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Debug Test User',
        }
      }
    });
    
    if (authError) {
      console.log('❌ Auth signup error:', authError.message);
      console.log('Error code:', authError.status);
      return;
    }
    
    console.log('✅ Auth signup successful');
    console.log('User ID:', authData.user?.id);
    console.log('User email:', authData.user?.email);

    // Step 2: Test user profile creation (this is where the app fails)
    console.log('\\n2. Testing user profile creation...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: authData.user.email,
        name: 'Debug Test User',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User profile creation error:', userError.message);
      console.log('Error code:', userError.code);
      console.log('Error details:', userError.details);
      console.log('Error hint:', userError.hint);
    } else {
      console.log('✅ User profile created successfully');
      console.log('Profile:', userData);
    }

    console.log('\\n📋 Summary:');
    console.log('- Authentication: ' + (authError ? '❌' : '✅'));
    console.log('- User profile creation: ' + (userError ? '❌' : '✅'));
    
    if (userError) {
      console.log('\\n🔧 The issue is in user profile creation, not authentication');
      console.log('This confirms the database permissions are the problem');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAccountCreationDebug();
