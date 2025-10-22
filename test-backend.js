const fetch = require('node-fetch');

async function testBackend() {
  try {
    console.log('Testing backend...');
    
    const response = await fetch('https://1099suite-backend-production.up.railway.app/api/plaid/transactions/sync', {
      method: 'GET',
      headers: {
        'x-user-id': 'test',
        'x-plaid-access-token': 'test'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBackend();
