// Check old data and help connect to new account
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOldData() {
  console.log('🔍 Checking what old data exists...\\n');

  try {
    // Check if users table exists now
    console.log('1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('   ❌ Users table error:', usersError.message);
    } else {
      console.log('   ✅ Users table exists');
      console.log('   Found', users?.length || 0, 'users');
      if (users && users.length > 0) {
        console.log('   Sample user:', users[0]);
      }
    }

    // Check leads table
    console.log('\\n2. Checking leads table...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(5);
    
    if (leadsError) {
      console.log('   ❌ Leads error:', leadsError.message);
    } else {
      console.log('   ✅ Leads table exists');
      console.log('   Found', leads?.length || 0, 'leads');
      if (leads && leads.length > 0) {
        console.log('   Sample lead:', leads[0]);
      }
    }

    // Check clients table
    console.log('\\n3. Checking clients table...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) {
      console.log('   ❌ Clients error:', clientsError.message);
    } else {
      console.log('   ✅ Clients table exists');
      console.log('   Found', clients?.length || 0, 'clients');
      if (clients && clients.length > 0) {
        console.log('   Sample client:', clients[0]);
      }
    }

    // Check expenses table
    console.log('\\n4. Checking expenses table...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);
    
    if (expensesError) {
      console.log('   ❌ Expenses error:', expensesError.message);
    } else {
      console.log('   ✅ Expenses table exists');
      console.log('   Found', expenses?.length || 0, 'expenses');
      if (expenses && expenses.length > 0) {
        console.log('   Sample expense:', expenses[0]);
      }
    }

    console.log('\\n📋 Data Status:');
    console.log('- Users table:', usersError ? '❌' : '✅');
    console.log('- Leads data:', leadsError ? '❌' : '✅');
    console.log('- Clients data:', clientsError ? '❌' : '✅');
    console.log('- Expenses data:', expensesError ? '❌' : '✅');

    if (!usersError && leads && leads.length > 0) {
      console.log('\\n🔧 Next Steps:');
      console.log('1. Sign in to create your new user profile');
      console.log('2. We can update the leads to point to your new user ID');
      console.log('3. Your business data will be connected to your new account');
    }

  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

checkOldData();
