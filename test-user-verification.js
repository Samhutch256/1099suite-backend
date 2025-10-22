const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUserVerification() {
  console.log('🔍 Testing user verification...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('🔧 Testing Supabase connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('✅ Connection successful');
    console.log('🔍 Current user:', user ? user.id : 'None');
    
    if (user) {
      // Test 2: Check if user exists in auth.users
      console.log('🔧 Checking auth.users table...');
      const { data: authUsers, error: authUsersError } = await supabase
        .from('auth.users')
        .select('*')
        .eq('id', user.id);
      
      if (authUsersError) {
        console.log('❌ Cannot query auth.users directly (expected):', authUsersError.message);
      } else {
        console.log('✅ User found in auth.users:', authUsers);
      }
      
      // Test 3: Check if user exists in public.users
      console.log('🔧 Checking public.users table...');
      const { data: publicUsers, error: publicUsersError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id);
      
      if (publicUsersError) {
        console.log('❌ Error querying public.users:', publicUsersError.message);
      } else {
        console.log('✅ User found in public.users:', publicUsers);
      }
      
      // Test 4: Check if trigger exists
      console.log('🔧 Checking if trigger exists...');
      const { data: triggers, error: triggersError } = await supabase
        .rpc('check_trigger_exists', { trigger_name: 'trg_on_auth_user_created' });
      
      if (triggersError) {
        console.log('❌ Cannot check trigger directly (expected):', triggersError.message);
      } else {
        console.log('✅ Trigger check result:', triggers);
      }
      
      // Test 5: Check all users in public.users table
      console.log('🔧 Checking all users in public.users...');
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*');
      
      if (allUsersError) {
        console.log('❌ Error querying all users:', allUsersError.message);
      } else {
        console.log('✅ All users in public.users:', allUsers);
        console.log('📊 Total users found:', allUsers?.length || 0);
      }
      
    } else {
      console.log('🔍 No authenticated user found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUserVerification().then(() => {
  console.log('\n📋 DIAGNOSIS:');
  console.log('If no user appears in public.users but exists in auth.users, the trigger may not have fired.');
  console.log('This could happen if:');
  console.log('1) The trigger was created after the user was created');
  console.log('2) The trigger has an error');
  console.log('3) The user was created before the migration was run');
  console.log('\n💡 SOLUTION:');
  console.log('If the user exists in auth.users but not in public.users, we can manually insert them.');
});
