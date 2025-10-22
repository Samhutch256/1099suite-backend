const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteSetup() {
  console.log('🔍 Testing complete setup after migrations...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('🔧 Testing Supabase connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('✅ Connection successful');
    console.log('🔍 Current user:', user ? user.id : 'None');
    
    if (user) {
      // Test 2: Check if user exists in public.users
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
      
      // Test 3: Check if clients table exists
      console.log('🔧 Checking clients table...');
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('count')
        .limit(1);
      
      if (clientsError) {
        console.log('❌ Clients table error:', clientsError.message);
      } else {
        console.log('✅ Clients table accessible');
      }
      
      // Test 4: Check if team_members table is accessible
      console.log('🔧 Checking team_members table...');
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('count')
        .limit(1);
      
      if (teamMembersError) {
        console.log('❌ Team members table error:', teamMembersError.message);
      } else {
        console.log('✅ Team members table accessible');
      }
      
      // Test 5: Check if leads table is accessible
      console.log('🔧 Checking leads table...');
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('count')
        .limit(1);
      
      if (leadsError) {
        console.log('❌ Leads table error:', leadsError.message);
      } else {
        console.log('✅ Leads table accessible');
      }
      
      // Test 6: Check if expense_categories table is accessible
      console.log('🔧 Checking expense_categories table...');
      const { data: expenseCategories, error: expenseCategoriesError } = await supabase
        .from('expense_categories')
        .select('count')
        .limit(1);
      
      if (expenseCategoriesError) {
        console.log('❌ Expense categories table error:', expenseCategoriesError.message);
      } else {
        console.log('✅ Expense categories table accessible');
      }
      
    } else {
      console.log('🔍 No authenticated user found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCompleteSetup().then(() => {
  console.log('\n📋 NEXT STEPS:');
  console.log('1) Run all three migrations in Supabase SQL Editor');
  console.log('2) Try creating a new account again');
  console.log('3) Check if the user appears in public.users table');
  console.log('4) Verify no more permission errors');
});
