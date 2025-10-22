// Simple test to check users table insert permissions
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUsersInsert() {
  console.log('🔍 Testing users table insert permissions...\n');

  try {
    // Step 1: Create a test user via auth
    console.log('1. Creating test user via auth...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (authError) {
      console.log('❌ Auth signup failed:', authError.message);
      return;
    }
    
    console.log('✅ Auth signup successful');
    console.log('User ID:', authData.user?.id);

    // Step 2: Try to insert into users table with the auth user ID
    console.log('\n2. Testing insert into users table...');
    if (authData.user) {
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Use the auth user ID
          email: authData.user.email,
          name: 'Test User',
        })
        .select();
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError.message);
        console.log('Error code:', insertError.code);
        console.log('Error details:', insertError.details);
        console.log('Error hint:', insertError.hint);
        
        // Check if it's a duplicate key error
        if (insertError.message.includes('duplicate key')) {
          console.log('✅ Insert policy is working (duplicate key error is expected)');
          return;
        }
        
        // Check if it's a permission error
        if (insertError.message.includes('permission denied')) {
          console.log('❌ Permission denied - RLS policies need to be fixed');
          console.log('\n💡 Run the fix-users-table-permissions.sql script');
          return;
        }
        
        return;
      }
      
      console.log('✅ Insert successful!');
      console.log('Inserted data:', insertData);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testUsersInsert();
