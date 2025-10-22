// Test script for hardened Plaid transactions system
// Run this to verify the setup works correctly

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function testHardenedPlaid() {
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  try {
    console.log('Testing hardened Plaid system...\n');

    // 1. Check if plaid_items table exists
    console.log('1. Checking plaid_items table...');
    const { data: items, error: itemsError } = await supabase
      .from('plaid_items')
      .select('user_id, institution_name, created_at')
      .limit(5);

    if (itemsError) {
      console.error('❌ plaid_items table error:', itemsError.message);
      console.log('   Run the SQL migration first: plaid-hardened-setup.sql');
      return;
    }

    console.log(`✅ plaid_items table exists with ${items?.length || 0} items`);

    // 2. Check if expenses table has required columns
    console.log('\n2. Checking expenses table structure...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('plaid_transaction_id, account_id, date, name, merchant_name, amount, currency, category, account_name, pending, classification, logo_url, recurring, original_description')
      .limit(1);

    if (expensesError) {
      console.error('❌ expenses table error:', expensesError.message);
      console.log('   Run the SQL migration first: plaid-hardened-setup.sql');
      return;
    }

    console.log('✅ expenses table has required columns');

    // 3. Check for users with Plaid tokens
    console.log('\n3. Checking for users with Plaid tokens...');
    const { data: usersWithTokens, error: usersError } = await supabase
      .from('plaid_items')
      .select('user_id, institution_name, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    if (usersWithTokens && usersWithTokens.length > 0) {
      console.log(`✅ Found ${usersWithTokens.length} users with Plaid tokens:`);
      usersWithTokens.forEach((item, i) => {
        console.log(`   ${i + 1}. User ${item.user_id} - ${item.institution_name} (${item.created_at})`);
      });
    } else {
      console.log('⚠️  No users with Plaid tokens found');
      console.log('   Users need to link their bank accounts first');
    }

    // 4. Check for existing expenses
    console.log('\n4. Checking for existing expenses...');
    const { data: existingExpenses, error: expError } = await supabase
      .from('expenses')
      .select('plaid_transaction_id, name, amount, date, classification')
      .not('plaid_transaction_id', 'is', null)
      .order('date', { ascending: false })
      .limit(5);

    if (expError) {
      console.error('❌ Error fetching expenses:', expError.message);
      return;
    }

    if (existingExpenses && existingExpenses.length > 0) {
      console.log(`✅ Found ${existingExpenses.length} Plaid transactions:`);
      existingExpenses.forEach((exp, i) => {
        console.log(`   ${i + 1}. ${exp.name} - $${exp.amount} (${exp.date}) - ${exp.classification}`);
      });
    } else {
      console.log('⚠️  No Plaid transactions found in expenses table');
    }

    // 5. Test backend connectivity
    console.log('\n5. Testing backend connectivity...');
    try {
      const response = await fetch('https://1099suite-backend-production.up.railway.app/api/health');
      if (response.ok) {
        console.log('✅ Backend is accessible');
      } else {
        console.log('⚠️  Backend responded with status:', response.status);
      }
    } catch (error) {
      console.log('❌ Backend connectivity test failed:', error.message);
    }

    console.log('\n🎉 Hardened Plaid system test completed!');
    console.log('\nNext steps:');
    console.log('1. If no users have tokens, have them link their bank accounts');
    console.log('2. Test the /api/plaid/transactions/sync endpoint with a user ID');
    console.log('3. Check the device console for any Plaid errors');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  testHardenedPlaid();
}

module.exports = { testHardenedPlaid };
