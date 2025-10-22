// Test script to check current backend state
const fetch = require('node-fetch');

const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';

async function testCurrentState() {
  console.log('Testing current backend state...\n');

  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('Health response:', healthData);
    console.log('');

    // 2. Test database connection
    console.log('2. Testing database connection...');
    const dbRes = await fetch(`${BACKEND_URL}/api/plaid/test-db`);
    const dbData = await dbRes.json();
    console.log('Database test response:', JSON.stringify(dbData, null, 2));
    console.log('');

    // 3. Test transactions endpoint with a dummy user ID
    console.log('3. Testing transactions endpoint...');
    const txRes = await fetch(`${BACKEND_URL}/api/plaid/transactions/sync?start=2024-08-21&end=2025-08-21`, {
      headers: {
        'x-user-id': 'test-user-id'
      }
    });
    const txData = await txRes.json();
    console.log('Transactions response:', JSON.stringify(txData, null, 2));
    console.log('');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testCurrentState();
}

module.exports = { testCurrentState };
