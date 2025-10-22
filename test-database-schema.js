const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testDatabaseSchema() {
  console.log('Testing database schema...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Test if expenses table exists and has account_id column
    const { data, error } = await supabase
      .from('expenses')
      .select('id, account_id, user_id, plaid_transaction_id')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      if (error.message.includes('account_id')) {
        console.log('❌ account_id column is missing from expenses table');
        console.log('Please run this SQL in Supabase dashboard:');
        console.log('ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS account_id text;');
      }
    } else {
      console.log('✅ Database schema looks good');
      console.log('Sample data:', data);
    }

    // Test plaid_tokens table
    const { data: tokens, error: tokensError } = await supabase
      .from('plaid_tokens')
      .select('*')
      .limit(1);

    if (tokensError) {
      console.error('Plaid tokens table error:', tokensError);
    } else {
      console.log('✅ Plaid tokens table exists');
      console.log('Tokens count:', tokens.length);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDatabaseSchema();
