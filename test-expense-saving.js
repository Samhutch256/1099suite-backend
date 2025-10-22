// Test script to verify expense saving functionality
// Run this after applying the database schema fix

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExpenseSaving() {
  try {
    console.log('🧪 Testing expense saving functionality...');
    
    // Test data that matches the frontend Expense interface
    const testExpense = {
      user_id: 'test-user-id', // Replace with actual user ID
      description: 'Test expense from script',
      amount: 25.50,
      category: 'Office Supplies',
      date: '2024-12-21',
      receipt: null,
      is_deductible: true,
      mileage: null,
      start_location: null,
      end_location: null,
    };
    
    console.log('📝 Inserting test expense:', testExpense);
    
    const { data, error } = await supabase
      .from('expenses')
      .insert(testExpense)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error inserting expense:', error);
      return;
    }
    
    console.log('✅ Successfully inserted expense:', data);
    
    // Test retrieving the expense
    console.log('🔍 Testing expense retrieval...');
    
    const { data: retrievedExpense, error: retrieveError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (retrieveError) {
      console.error('❌ Error retrieving expense:', retrieveError);
      return;
    }
    
    console.log('✅ Successfully retrieved expense:', retrievedExpense);
    
    // Test updating the expense
    console.log('📝 Testing expense update...');
    
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({ 
        description: 'Updated test expense',
        amount: 30.00,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating expense:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated expense:', updatedExpense);
    
    // Test deleting the expense
    console.log('🗑️ Testing expense deletion...');
    
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) {
      console.error('❌ Error deleting expense:', deleteError);
      return;
    }
    
    console.log('✅ Successfully deleted expense');
    
    console.log('🎉 All expense operations working correctly!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testExpenseSaving();
