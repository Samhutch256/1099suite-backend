#!/usr/bin/env node

// Complete Plaid Transactions + Mileage Tracking Implementation Test
// This script tests all the key components of the implementation

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';
const TEST_USER_ID = 'test-user-123'; // Replace with actual test user ID

console.log('🧪 Testing Complete Plaid Transactions + Mileage Tracking Implementation\n');

async function testBackendHealth() {
  console.log('1. Testing Backend Health...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    console.log('✅ Backend health check:', data);
    return true;
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n2. Testing Database Connection...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/plaid/test-db`);
    const data = await response.json();
    console.log('✅ Database connection:', data);
    return data.success;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testPlaidLinkToken() {
  console.log('\n3. Testing Plaid Link Token Creation...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/create-link-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: TEST_USER_ID })
    });
    const data = await response.json();
    
    if (data.link_token) {
      console.log('✅ Link token created successfully');
      console.log('   Token preview:', data.link_token.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Link token creation failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Link token creation failed:', error.message);
    return false;
  }
}

async function testTransactionsSync() {
  console.log('\n4. Testing Transactions Sync Endpoint...');
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/plaid/transactions/sync?start=2024-01-01&end=2024-12-31`,
      {
        headers: { 'x-user-id': TEST_USER_ID }
      }
    );
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Transactions sync endpoint working');
      console.log('   Items returned:', data.items?.length || 0);
      console.log('   Has more:', data.has_more);
      console.log('   Next cursor:', data.next_cursor ? 'Present' : 'None');
      return true;
    } else {
      console.log('❌ Transactions sync failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Transactions sync failed:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n5. Testing Webhook Endpoint...');
  try {
    const testWebhookData = {
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: 'test-item-id',
      new_transactions: 5
    };
    
    const response = await fetch(`${BACKEND_URL}/api/plaid/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'plaid-verification': 'test-verification-header'
      },
      body: JSON.stringify(testWebhookData)
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint responding');
      return true;
    } else {
      const data = await response.json();
      console.log('❌ Webhook endpoint failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook endpoint failed:', error.message);
    return false;
  }
}

async function testExpenseClassification() {
  console.log('\n6. Testing Expense Classification...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/plaid/expenses/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-transaction-id',
        classification: 'business'
      })
    });
    
    if (response.ok) {
      console.log('✅ Expense classification endpoint working');
      return true;
    } else {
      const data = await response.json();
      console.log('❌ Expense classification failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Expense classification failed:', error.message);
    return false;
  }
}

async function testFrontendDependencies() {
  console.log('\n7. Testing Frontend Dependencies...');
  
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json.frontend', 'utf8'));
  
  const requiredDeps = [
    'react-native-plaid-link-sdk',
    'expo-location',
    'expo-task-manager',
    '@react-native-async-storage/async-storage',
    'react-native-gesture-handler',
    'react-native-maps'
  ];
  
  let allDepsPresent = true;
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
      allDepsPresent = false;
    }
  }
  
  return allDepsPresent;
}

async function testDatabaseSchema() {
  console.log('\n8. Testing Database Schema...');
  
  const fs = require('fs');
  
  const requiredFiles = [
    'plaid-hardened-setup.sql',
    'fix-expenses-table-migration.sql'
  ];
  
  let allFilesPresent = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: Present`);
    } else {
      console.log(`❌ ${file}: Missing`);
      allFilesPresent = false;
    }
  }
  
  return allFilesPresent;
}

async function runAllTests() {
  const tests = [
    { name: 'Backend Health', fn: testBackendHealth },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Plaid Link Token', fn: testPlaidLinkToken },
    { name: 'Transactions Sync', fn: testTransactionsSync },
    { name: 'Webhook Endpoint', fn: testWebhookEndpoint },
    { name: 'Expense Classification', fn: testExpenseClassification },
    { name: 'Frontend Dependencies', fn: testFrontendDependencies },
    { name: 'Database Schema', fn: testDatabaseSchema }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your implementation is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return passed === total;
}

// Run the tests
runAllTests().catch(console.error);
