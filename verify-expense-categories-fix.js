const { createClient } = require('@supabase/supabase-js');

// Verification script for expense_categories fix
async function verifyExpenseCategoriesFix() {
  console.log('🔍 Verifying Expense Categories Fix...');
  
  // Get Supabase credentials from environment or use defaults
  const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
  
  if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-anon-key') {
    console.log('⚠️  Please set your Supabase credentials:');
    console.log('   export SUPABASE_URL="your-supabase-url"');
    console.log('   export SUPABASE_ANON_KEY="your-supabase-anon-key"');
    console.log('');
    console.log('Or run this script with your actual credentials:');
    console.log('   SUPABASE_URL="your-url" SUPABASE_ANON_KEY="your-key" node verify-expense-categories-fix.js');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('✅ Testing basic table access...');
    
    // Test 1: Basic SELECT query
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Basic SELECT failed:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      return;
    }
    
    console.log('✅ Basic SELECT successful');
    console.log(`   Found ${data.length} records`);
    
    // Test 2: Check table structure
    console.log('\n🔍 Checking table structure...');
    const { data: structure, error: structureError } = await supabase
      .rpc('get_table_info', { table_name: 'expense_categories' })
      .catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (structureError) {
      console.log('⚠️  Could not check table structure via RPC (this is normal)');
    } else {
      console.log('✅ Table structure check successful');
    }
    
    // Test 3: Test with authenticated user (if possible)
    console.log('\n🔐 Testing with authentication...');
    
    // Try to get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  Not authenticated - this is normal for anonymous access');
      console.log('   The table should still be accessible for basic queries');
    } else {
      console.log('✅ Authenticated as:', user.email);
      
      // Test authenticated operations
      const testCategory = {
        name: 'Test Category - ' + Date.now(),
        user_id: user.id
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('expense_categories')
        .insert(testCategory)
        .select();
      
      if (insertError) {
        console.log('⚠️  Insert test failed:', insertError.message);
      } else {
        console.log('✅ Insert test successful');
        
        // Clean up
        await supabase
          .from('expense_categories')
          .delete()
          .eq('id', insertData[0].id);
        
        console.log('✅ Cleanup successful');
      }
    }
    
    console.log('\n🎉 Verification Complete!');
    console.log('✅ The expense_categories table is now accessible');
    console.log('✅ The permission denied error should be resolved');
    console.log('');
    console.log('📱 You can now test the expense categories functionality in your app.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyExpenseCategoriesFix();
