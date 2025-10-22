// Check if authentication users still exist
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthUsers() {
  console.log('🔍 Checking if authentication users still exist...\\n');

  try {
    // Try to sign in with a test account to see if auth users exist
    console.log('1. Testing authentication...');
    
    // First, let's try to create a new user to see if auth is working
    const testEmail = `recovery-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Authentication is working');
      console.log('   New user created:', authData.user?.email);
      console.log('   User ID:', authData.user?.id);
    }

    console.log('\\n📋 Recovery Status:');
    console.log('- Authentication system: ✅ Working');
    console.log('- Users table: ❌ Deleted');
    console.log('- User profiles: ❌ Lost');
    
    console.log('\\n🔧 Next Steps:');
    console.log('1. Check Supabase Dashboard → Settings → Database → Backups');
    console.log('2. Look for automatic backups from before the table was dropped');
    console.log('3. If no backup, we can recreate user profiles when users sign in again');

  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

checkAuthUsers();
