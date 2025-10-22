// Test email signup after database fix
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailSignup() {
  console.log('🔍 Testing email signup after database fix...\\n');

  try {
    // Test email signup (this is what the app does)
    console.log('1. Testing email signup...');
    const testEmail = `test-signup-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName,
        }
      }
    });
    
    if (error) {
      console.log('❌ Email signup error:', error.message);
      console.log('Error code:', error.status);
      return;
    }
    
    console.log('✅ Email signup successful');
    console.log('User ID:', data.user?.id);
    console.log('User email:', data.user?.email);

    // Check if user profile was created automatically
    console.log('\\n2. Checking if user profile was created...');
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.log('❌ User profile check error:', profileError.message);
    } else {
      console.log('✅ User profile created automatically');
      console.log('Profile:', userProfile);
    }

    console.log('\\n📋 Summary:');
    console.log('- Email signup: ' + (error ? '❌' : '✅'));
    console.log('- User profile creation: ' + (profileError ? '❌' : '✅'));
    
    if (!error && !profileError) {
      console.log('\\n🎉 Email signup is working correctly!');
      console.log('The "Failed to create account" error should be resolved.');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testEmailSignup();
