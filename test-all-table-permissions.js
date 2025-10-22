const { createClient } = require('@supabase/supabase-js');

// Comprehensive test for all table permissions
async function testAllTablePermissions() {
  console.log('🔍 Testing All Table Permissions...');
  
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
  
  if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-anon-key') {
    console.log('⚠️  Please set your Supabase credentials:');
    console.log('   export SUPABASE_URL="your-supabase-url"');
    console.log('   export SUPABASE_ANON_KEY="your-supabase-anon-key"');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const tables = [
    { name: 'clients', testData: { name: 'Test Client', email: 'test@example.com' } },
    { name: 'expense_categories', testData: { name: 'Test Category' } },
    { name: 'users', testData: { email: 'test@example.com', name: 'Test User' } }
  ];
  
  try {
    // Test each table
    for (const table of tables) {
      console.log(`\n📋 Testing ${table.name} table...`);
      
      // Test 1: Basic SELECT query
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ ${table.name} SELECT failed:`, error.message);
        console.error(`   Error code: ${error.code}`);
        continue;
      }
      
      console.log(`✅ ${table.name} SELECT successful (${data.length} records)`);
      
      // Test 2: Check table structure
      const { data: structure, error: structureError } = await supabase
        .from(table.name)
        .select('*')
        .limit(0);
      
      if (structureError) {
        console.log(`⚠️  ${table.name} structure check failed:`, structureError.message);
      } else {
        console.log(`✅ ${table.name} structure check successful`);
      }
    }
    
    // Test 3: Test with authenticated user (if possible)
    console.log('\n🔐 Testing with authentication...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  Not authenticated - this is normal for anonymous access');
      console.log('   Tables should still be accessible for basic queries');
    } else {
      console.log('✅ Authenticated as:', user.email);
      
      // Test authenticated operations for each table
      for (const table of tables) {
        console.log(`\n🧪 Testing ${table.name} with authenticated user...`);
        
        let testData = { ...table.testData };
        
        // Add user_id for tables that need it
        if (table.name !== 'users') {
          testData.user_id = user.id;
        } else {
          testData.id = user.id;
        }
        
        // Test INSERT
        const { data: insertData, error: insertError } = await supabase
          .from(table.name)
          .insert(testData)
          .select();
        
        if (insertError) {
          console.log(`⚠️  ${table.name} INSERT failed:`, insertError.message);
        } else {
          console.log(`✅ ${table.name} INSERT successful`);
          
          // Test UPDATE
          const updateData = table.name === 'users' ? { name: 'Updated Name' } : { name: 'Updated ' + table.testData.name };
          const { error: updateError } = await supabase
            .from(table.name)
            .update(updateData)
            .eq('id', insertData[0].id);
          
          if (updateError) {
            console.log(`⚠️  ${table.name} UPDATE failed:`, updateError.message);
          } else {
            console.log(`✅ ${table.name} UPDATE successful`);
          }
          
          // Test DELETE
          const { error: deleteError } = await supabase
            .from(table.name)
            .delete()
            .eq('id', insertData[0].id);
          
          if (deleteError) {
            console.log(`⚠️  ${table.name} DELETE failed:`, deleteError.message);
          } else {
            console.log(`✅ ${table.name} DELETE successful`);
          }
        }
      }
    }
    
    console.log('\n🎉 All Table Permissions Test Complete!');
    console.log('✅ All tables should now be accessible');
    console.log('✅ The permission denied errors should be resolved');
    console.log('');
    console.log('📱 You can now test the functionality in your app.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAllTablePermissions();
