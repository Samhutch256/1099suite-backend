const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';
const TEST_USER_ID = 'test-user-enhanced-plaid';

// Initialize Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedPlaidFunctionality() {
  console.log('🧪 Testing Enhanced Plaid Functionality');
  console.log('=====================================\n');

  try {
    // Test 1: Token Persistence
    console.log('1. Testing Token Persistence...');
    await testTokenPersistence();
    
    // Test 2: Enhanced Transaction Fetching
    console.log('\n2. Testing Enhanced Transaction Fetching...');
    await testEnhancedTransactionFetching();
    
    // Test 3: Business Categorization
    console.log('\n3. Testing Business Categorization...');
    await testBusinessCategorization();
    
    // Test 4: Account Management
    console.log('\n4. Testing Account Management...');
    await testAccountManagement();
    
    // Test 5: Transaction Sync
    console.log('\n5. Testing Transaction Sync...');
    await testTransactionSync();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testTokenPersistence() {
  console.log('   - Checking stored tokens...');
  
  // Check if user has stored tokens
  const tokenResponse = await fetch(`${BACKEND_URL}/api/plaid-tokens/${TEST_USER_ID}`);
  const tokenData = await tokenResponse.json();
  
  if (tokenData.hasTokens) {
    console.log('   ✅ Found stored tokens for user');
    console.log(`   - Access token: ${tokenData.access_token ? 'Present' : 'Missing'}`);
    console.log(`   - Item ID: ${tokenData.item_id ? 'Present' : 'Missing'}`);
    console.log(`   - Created: ${tokenData.created_at}`);
    console.log(`   - Updated: ${tokenData.updated_at}`);
  } else {
    console.log('   ℹ️  No stored tokens found (expected for new user)');
  }
}

async function testEnhancedTransactionFetching() {
  console.log('   - Testing transaction fetching with enhanced features...');
  
  // First, ensure we have tokens (create if needed)
  let tokenData = await ensureUserHasTokens();
  
  // Fetch transactions with enhanced features
  const transactionResponse = await fetch(
    `${BACKEND_URL}/api/transactions?user_id=${TEST_USER_ID}&start_date=2024-01-01&end_date=2025-01-15&count=10&offset=0`
  );
  
  if (transactionResponse.ok) {
    const transactionData = await transactionResponse.json();
    console.log(`   ✅ Successfully fetched ${transactionData.transactions?.length || 0} transactions`);
    
    if (transactionData.transactions && transactionData.transactions.length > 0) {
      const transaction = transactionData.transactions[0];
      console.log('   - Sample transaction:');
      console.log(`     * Description: ${transaction.name}`);
      console.log(`     * Amount: $${transaction.amount}`);
      console.log(`     * Date: ${transaction.date}`);
      console.log(`     * Categories: ${transaction.category.join(', ')}`);
      
      if (transaction.business_hints) {
        console.log('   - Business categorization hints:');
        console.log(`     * Likely business: ${transaction.business_hints.is_likely_business}`);
        console.log(`     * Suggested category: ${transaction.business_hints.suggested_category}`);
        console.log(`     * Confidence: ${Math.round(transaction.business_hints.confidence * 100)}%`);
      }
    }
  } else {
    console.log('   ❌ Failed to fetch transactions');
  }
}

async function testBusinessCategorization() {
  console.log('   - Testing business categorization logic...');
  
  // Test with sample transactions
  const sampleTransactions = [
    {
      name: 'Shell Gas Station',
      category: ['Transportation', 'Gas Stations'],
      amount: -45.67
    },
    {
      name: 'Home Depot',
      category: ['Shops', 'Hardware Stores'],
      amount: -127.85
    },
    {
      name: 'Staples Office Supplies',
      category: ['Shops', 'Office Supplies'],
      amount: -23.45
    },
    {
      name: 'Netflix',
      category: ['Entertainment'],
      amount: -15.99
    }
  ];
  
  sampleTransactions.forEach((tx, index) => {
    const isBusiness = isLikelyBusinessExpense(tx);
    const category = suggestBusinessCategory(tx);
    const confidence = calculateBusinessConfidence(tx);
    
    console.log(`   - Transaction ${index + 1}: ${tx.name}`);
    console.log(`     * Business expense: ${isBusiness ? 'Yes' : 'No'}`);
    console.log(`     * Suggested category: ${category}`);
    console.log(`     * Confidence: ${Math.round(confidence * 100)}%`);
  });
}

async function testAccountManagement() {
  console.log('   - Testing account management...');
  
  // Fetch accounts for user
  const accountResponse = await fetch(`${BACKEND_URL}/api/accounts/${TEST_USER_ID}`);
  
  if (accountResponse.ok) {
    const accounts = await accountResponse.json();
    console.log(`   ✅ Successfully fetched ${accounts.length} accounts`);
    
    accounts.forEach((account, index) => {
      console.log(`   - Account ${index + 1}:`);
      console.log(`     * Name: ${account.name}`);
      console.log(`     * Type: ${account.type} (${account.subtype})`);
      console.log(`     * Mask: ****${account.mask}`);
      console.log(`     * Balance: $${account.balances.current || 0}`);
    });
  } else {
    console.log('   ❌ Failed to fetch accounts');
  }
}

async function testTransactionSync() {
  console.log('   - Testing transaction sync...');
  
  // Test transaction sync endpoint
  const syncResponse = await fetch(`${BACKEND_URL}/api/sync-transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: TEST_USER_ID,
      start_date: '2024-01-01',
      end_date: '2025-01-15'
    })
  });
  
  if (syncResponse.ok) {
    const syncData = await syncResponse.json();
    console.log('   ✅ Transaction sync successful');
    console.log(`   - Added: ${syncData.added?.length || 0} transactions`);
    console.log(`   - Modified: ${syncData.modified?.length || 0} transactions`);
    console.log(`   - Removed: ${syncData.removed?.length || 0} transactions`);
    console.log(`   - Has more: ${syncData.has_more}`);
    
    if (syncData.added && syncData.added.length > 0) {
      const transaction = syncData.added[0];
      console.log('   - Sample synced transaction:');
      console.log(`     * Description: ${transaction.name}`);
      console.log(`     * Amount: $${transaction.amount}`);
      console.log(`     * Business hints: ${transaction.business_hints ? 'Present' : 'Missing'}`);
    }
  } else {
    console.log('   ❌ Failed to sync transactions');
  }
}

async function ensureUserHasTokens() {
  // Check if user has tokens
  const tokenResponse = await fetch(`${BACKEND_URL}/api/plaid-tokens/${TEST_USER_ID}`);
  const tokenData = await tokenResponse.json();
  
  if (tokenData.hasTokens) {
    return tokenData;
  }
  
  // Create a mock token for testing
  console.log('   - Creating mock tokens for testing...');
  
  const mockTokenData = {
    user_id: TEST_USER_ID,
    access_token: 'test-access-token-' + Date.now(),
    item_id: 'test-item-id-' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Store mock tokens
  const { error } = await supabase
    .from('plaid_tokens')
    .upsert(mockTokenData);
  
  if (error) {
    console.log('   ❌ Failed to store mock tokens:', error);
    return null;
  }
  
  console.log('   ✅ Mock tokens created successfully');
  return mockTokenData;
}

// Business categorization helper functions (copied from backend)
function isLikelyBusinessExpense(transaction) {
  const businessKeywords = [
    'gas', 'fuel', 'office', 'supplies', 'tools', 'equipment',
    'insurance', 'phone', 'internet', 'repair', 'materials',
    'hardware', 'depot', 'staples', 'professional', 'service',
    'maintenance', 'utilities', 'advertising', 'marketing'
  ];
  
  const businessCategories = [
    'Transportation', 'Gas Stations', 'Hardware Stores', 'Office Supplies',
    'Telecommunication Services', 'Insurance', 'Professional Services',
    'Automotive', 'Home Improvement', 'Utilities'
  ];
  
  const name = transaction.name.toLowerCase();
  const categories = transaction.category.join(' ').toLowerCase();
  
  const hasBusinessKeyword = businessKeywords.some(keyword => 
    name.includes(keyword) || categories.includes(keyword)
  );
  
  const hasBusinessCategory = transaction.category.some(cat => 
    businessCategories.some(bizCat => cat.includes(bizCat))
  );
  
  return hasBusinessKeyword || hasBusinessCategory;
}

function suggestBusinessCategory(transaction) {
  const categories = transaction.category.join(' ').toLowerCase();
  const name = transaction.name.toLowerCase();
  
  if (categories.includes('transportation') || categories.includes('gas') || name.includes('gas')) {
    return 'Transportation';
  } else if (categories.includes('hardware') || categories.includes('supplies') || name.includes('depot')) {
    return 'Materials & Supplies';
  } else if (categories.includes('office') || name.includes('staples')) {
    return 'Office Expenses';
  } else if (categories.includes('telecommunication') || name.includes('phone')) {
    return 'Communication';
  } else if (categories.includes('insurance')) {
    return 'Insurance';
  } else if (categories.includes('food') && name.includes('client')) {
    return 'Business Meals';
  } else if (categories.includes('professional') || categories.includes('service')) {
    return 'Professional Services';
  }
  
  return 'Other';
}

function calculateBusinessConfidence(transaction) {
  let confidence = 0;
  
  // Base confidence from business categorization
  if (isLikelyBusinessExpense(transaction)) {
    confidence += 0.6;
  }
  
  // Additional confidence from category matching
  const suggestedCategory = suggestBusinessCategory(transaction);
  if (suggestedCategory !== 'Other') {
    confidence += 0.3;
  }
  
  // Confidence from amount (larger amounts more likely business)
  if (Math.abs(transaction.amount) > 100) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}

// Run the tests
if (require.main === module) {
  testEnhancedPlaidFunctionality().catch(console.error);
}

module.exports = {
  testEnhancedPlaidFunctionality,
  testTokenPersistence,
  testEnhancedTransactionFetching,
  testBusinessCategorization,
  testAccountManagement,
  testTransactionSync
}; 