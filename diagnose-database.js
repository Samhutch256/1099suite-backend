// Diagnostic script to check database state
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseDatabase() {
  console.log('🔍 Diagnosing database state...\\n');

  try {
    // Test 1: Check if users table exists and has RLS
    console.log('1. Checking users table structure...');
    let tableExists = false;
    try {
      const { data: directInfo, error: directError } = await supabase
        .from('users')
        .select('*')
        .limit(0);
      
      if (directError) {
        console.log('   ❌ Users table error:', directError.message);
        console.log('   Error code:', directError.code);
      } else {
        console.log('   ✅ Users table exists');
        tableExists = true;
      }
    } catch (error) {
      console.log('   ❌ Users table error:', error.message);
    }

    // Test 2: Check current user session
    console.log('\\n2. Checking current session...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('   ❌ Session error:', sessionError.message);
    } else if (session.session) {
      console.log('   ✅ User authenticated:', session.session.user.email);
      console.log('   User ID:', session.session.user.id);
    } else {
      console.log('   ⚠️  No active session');
    }

    // Test 3: Try to create a test user profile
    console.log('\\n3. Testing user profile creation...');
    if (session.session && tableExists) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.session.user.id,
            email: session.session.user.email,
            name: 'Test User'
          })
          .select();
        
        if (insertError) {
          console.log('   ❌ Insert error:', insertError.message);
          console.log('   Error code:', insertError.code);
          console.log('   Details:', insertError.details);
        } else {
          console.log('   ✅ User profile created successfully');
          console.log('   Profile:', insertData);
        }
      } catch (error) {
        console.log('   ❌ Insert failed:', error.message);
      }
    } else {
      console.log('   ⚠️  Skipping insert test - no authenticated user or table issue');
    }

    // Test 4: Check RLS policies
    console.log('\\n4. Checking RLS policies...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (policiesError) {
        console.log('   ❌ RLS policy error:', policiesError.message);
      } else {
        console.log('   ✅ RLS policies working');
      }
    } catch (error) {
      console.log('   ❌ RLS check failed:', error.message);
    }

    console.log('\\n📋 Diagnosis Summary:');
    console.log('- Users table: ' + (tableExists ? '✅' : '❌'));
    console.log('- Authentication: ' + (sessionError ? '❌' : '✅'));
    console.log('- RLS policies: Tested above');

  } catch (error) {
    console.log('❌ Diagnosis failed:', error.message);
  }
}

diagnoseDatabase();
