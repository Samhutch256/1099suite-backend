// Check trigger status and help create user profile
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTriggerStatus() {
  console.log('🔍 Checking trigger status and user profiles...\\n');

  try {
    // Check if users table has any data
    console.log('1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('   ❌ Users table error:', usersError.message);
    } else {
      console.log('   ✅ Users table accessible');
      console.log('   Found', users?.length || 0, 'user profiles');
      if (users && users.length > 0) {
        console.log('   Users:', users.map(u => ({ id: u.id, email: u.email })));
      }
    }

    // Check current session
    console.log('\\n2. Checking current session...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('   ❌ Session error:', sessionError.message);
    } else if (session.session) {
      console.log('   ✅ User authenticated:', session.session.user.email);
      console.log('   Auth User ID:', session.session.user.id);
      
      // Try to create user profile manually
      console.log('\\n3. Creating user profile manually...');
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: session.session.user.id,
          email: session.session.user.email,
          name: session.session.user.email.split('@')[0] // Use email prefix as name
        })
        .select();
      
      if (insertError) {
        console.log('   ❌ Insert error:', insertError.message);
        console.log('   Error code:', insertError.code);
      } else {
        console.log('   ✅ User profile created successfully!');
        console.log('   Profile:', insertData);
      }
    } else {
      console.log('   ⚠️  No active session - please sign in first');
    }

  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

checkTriggerStatus();
