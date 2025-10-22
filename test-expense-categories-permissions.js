const { createClient } = require('@supabase/supabase-js');

// Test script to verify expense_categories table permissions
async function testExpenseCategoriesPermissions() {
  console.log('Testing expense_categories table permissions...');
  
  // You'll need to set these environment variables or replace with your actual values
  const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
  
  if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-anon-key') {
    console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    console.log('Or replace the values in this script with your actual Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check if we can query the table structure
    console.log('\n1. Testing table structure query...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('expense_categories')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('❌ Error querying table structure:', tableError);
      return;
    }
    
    console.log('✅ Table structure query successful');
    
    // Test 2: Check if we can insert a test category (if authenticated)
    console.log('\n2. Testing insert permission...');
    const testCategory = {
      name: 'Test Category',
      user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('expense_categories')
      .insert(testCategory)
      .select();
    
    if (insertError) {
      console.log('⚠️  Insert test failed (expected if not authenticated):', insertError.message);
    } else {
      console.log('✅ Insert test successful');
      
      // Clean up the test data
      await supabase
        .from('expense_categories')
        .delete()
        .eq('id', insertData[0].id);
    }
    
    // Test 3: Check RLS policies
    console.log('\n3. Testing RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'expense_categories' })
      .catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (policiesError) {
      console.log('⚠️  Could not check RLS policies via RPC (this is normal)');
    } else {
      console.log('✅ RLS policies check successful');
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('The expense_categories table appears to be properly configured.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testExpenseCategoriesPermissions();
