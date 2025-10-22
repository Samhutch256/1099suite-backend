// Test script to verify expense amount saving
// This will help debug why amounts are showing as $0

console.log('🧪 Testing expense amount saving...');

// Test data that matches what the frontend sends
const testExpense = {
  id: 'test-expense-123',
  user_id: 'test-user-id',
  amount: 45.67, // This should be saved correctly
  category: 'Transportation',
  vendor_name: 'Shell Gas Station',
  is_business: true,
  timestamp: '2024-12-21',
  notes: 'Gas for business trip',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log('📝 Test expense data:', testExpense);
console.log('💰 Amount:', testExpense.amount);
console.log('💰 Amount type:', typeof testExpense.amount);
console.log('💰 Amount as string:', testExpense.amount.toString());
console.log('💰 Amount as number:', Number(testExpense.amount));

// Test the mapping that happens in supabaseService.createExpense
const dbExpense = {
  user_id: testExpense.user_id,
  description: testExpense.notes || testExpense.vendor_name || '',
  amount: testExpense.amount,
  category: testExpense.category,
  date: testExpense.timestamp,
  receipt: undefined,
  is_deductible: testExpense.is_business,
  mileage: undefined,
  start_location: undefined,
  end_location: undefined,
};

console.log('🗄️ Database expense data:', dbExpense);
console.log('💰 Database amount:', dbExpense.amount);
console.log('💰 Database amount type:', typeof dbExpense.amount);

// Test the mapping back to frontend format
const mappedBack = {
  id: 'test-id',
  user_id: dbExpense.user_id,
  amount: dbExpense.amount,
  category: dbExpense.category,
  vendor_name: dbExpense.description,
  is_business: dbExpense.is_deductible,
  timestamp: dbExpense.date,
  notes: dbExpense.description,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log('🔄 Mapped back to frontend:', mappedBack);
console.log('💰 Final amount:', mappedBack.amount);
console.log('💰 Final amount type:', typeof mappedBack.amount);

// Test currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

console.log('💵 Formatted amount:', formatCurrency(mappedBack.amount));

console.log('✅ Test completed!');
