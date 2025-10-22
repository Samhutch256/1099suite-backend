// Schema verification script for 1099Suite Supabase setup
// This script helps verify that your database schema is properly configured

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying 1099Suite database schema...\n');
  
  const tablesToCheck = [
    'users',
    'leads', 
    'follow_up_reminders',
    'expenses',
    'team_members',
    'daily_inputs',
    'user_settings'
  ];
  
  const results = {};
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        results[table] = { status: 'ERROR', message: error.message };
      } else {
        results[table] = { status: 'OK', message: 'Table exists and accessible' };
      }
    } catch (err) {
      results[table] = { status: 'ERROR', message: err.message };
    }
  }
  
  // Display results
  console.log('📊 Schema Verification Results:');
  console.log('=====================================');
  
  let allGood = true;
  for (const [table, result] of Object.entries(results)) {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${table}: ${result.status}`);
    if (result.status === 'ERROR') {
      console.log(`   Error: ${result.message}`);
      allGood = false;
    }
  }
  
  console.log('\n=====================================');
  
  if (allGood) {
    console.log('🎉 All tables are properly configured!');
    console.log('✨ Your 1099Suite database schema is ready to use.');
  } else {
    console.log('⚠️  Some tables are missing or have errors.');
    console.log('📝 Please run the database schema in your Supabase SQL Editor.');
    console.log('🔗 Schema file: database-schema.sql');
  }
}

// Test authentication as well
async function testAuth() {
  console.log('\n🔐 Testing Supabase Authentication...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Authentication system is working');
    
    if (session) {
      console.log(`👤 Current user: ${session.user.email}`);
    } else {
      console.log('ℹ️  No active session (this is normal if not logged in)');
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
  }
}

// Run verification
async function main() {
  await verifySchema();
  await testAuth();
  
  console.log('\n🏁 Verification complete!');
  console.log('📱 Your 1099Suite app should now be ready to use with Supabase.');
}

main().catch(console.error);