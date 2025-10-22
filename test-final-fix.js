// Test script to verify the final database fix
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFinalFix() {
  console.log('🔧 Testing final fix...');
  
  try {
    // Test connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Auth check:', { user: user?.id, error: authError });
    
    if (!user) {
      console.log('❌ No authenticated user found - this is expected');
      console.log('📋 NEXT STEPS:');
      console.log('1) Run the migration: supabase/migrations/20241222000004_simple_fix_all_permissions.sql');
      console.log('2) Try creating a new account in your app');
      console.log('3) The permission errors should be gone!');
      return;
    }
    
    // Test tables that were causing errors
    const tables = [
      'users',
      'expense_categories', 
      'leads',
      'clients',
      'expenses',
      'daily_inputs',
      'team_members',
      'settings',
      'lead_filters',
      'jessica_chat_history',
      'mileage_entries',
      'outreach_activities',
      'plaid_accounts',
      'plaid_transactions',
      'plaid_tokens'
    ];
    
    console.log('🔍 Testing table access for user:', user.id);
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalFix();
