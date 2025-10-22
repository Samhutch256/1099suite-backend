const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = 'REMOVED_SENSITIVE_DATA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPermissions() {
  console.log('🔍 Testing current permissions state...');
  
  try {
    // Test connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Auth check:', { user: user?.id, error: authError });
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }
    
    // Test tables that are causing errors
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
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        console.log(`🔍 ${table}:`, { 
          success: !error, 
          error: error?.message || null,
          data: data ? 'accessible' : null
        });
      } catch (err) {
        console.log(`🔍 ${table}:`, { 
          success: false, 
          error: err.message,
          data: null
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPermissions();
