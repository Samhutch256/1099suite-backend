// Test script to diagnose Plaid connection issues
const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';

async function testPlaidConnection() {
  console.log('=== PLAID CONNECTION DIAGNOSTIC ===');
  
  // Test 1: Check backend health
  console.log('\n1. Testing backend health...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthData);
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return;
  }
  
  // Test 2: Check for stored tokens with different user IDs
  console.log('\n2. Checking for stored tokens...');
  const testUserIds = ['test-user', 'user-123', 'demo-user', 'hutch'];
  
  for (const userId of testUserIds) {
    try {
      const tokenResponse = await fetch(`${BACKEND_URL}/api/plaid-tokens/${userId}`);
      const tokenData = await tokenResponse.json();
      console.log(`User ID "${userId}":`, tokenData);
    } catch (error) {
      console.log(`User ID "${userId}": Error -`, error.message);
    }
  }
  
  // Test 3: Test transactions endpoint (should fail without tokens)
  console.log('\n3. Testing transactions endpoint...');
  try {
    const transactionsResponse = await fetch(`${BACKEND_URL}/api/transactions`);
    const transactionsData = await transactionsResponse.json();
    console.log('Transactions endpoint response:', transactionsData);
  } catch (error) {
    console.log('❌ Transactions endpoint failed:', error.message);
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
  console.log('\nIf no tokens are found, you need to:');
  console.log('1. Connect your bank account through the app');
  console.log('2. Make sure the connection completes successfully');
  console.log('3. Check that the user ID matches what\'s stored');
}

// Run the test
testPlaidConnection().catch(console.error); 