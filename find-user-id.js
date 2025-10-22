// Script to help find the correct user ID
const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';

async function findUserTokens() {
  console.log('=== FINDING USER TOKENS ===');
  
  // Common user ID patterns to test
  const testUserIds = [
    'test-user',
    'user-123', 
    'demo-user',
    'hutch',
    'hutch56',
    'vibecode',
    'anonymous',
    'default-user',
    'user',
    '1',
    '2',
    '3'
  ];
  
  console.log('Testing common user IDs...\n');
  
  for (const userId of testUserIds) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/plaid-tokens/${userId}`);
      const data = await response.json();
      
      if (data.hasTokens) {
        console.log(`✅ FOUND TOKENS for user ID: "${userId}"`);
        console.log('Token data:', data);
        console.log('');
      } else {
        console.log(`❌ No tokens for user ID: "${userId}"`);
      }
    } catch (error) {
      console.log(`❌ Error checking user ID "${userId}":`, error.message);
    }
  }
  
  console.log('=== TOKEN SEARCH COMPLETE ===');
  console.log('\nIf no tokens were found, the issue is:');
  console.log('1. The user ID used during connection doesn\'t match what\'s stored');
  console.log('2. The token exchange failed silently');
  console.log('3. The tokens were saved to a different database');
  console.log('\nSolution: Reconnect your bank account to ensure tokens are saved properly');
}

findUserTokens().catch(console.error); 