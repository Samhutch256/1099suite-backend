// Test backend status
const fetch = require('node-fetch');

async function testBackendStatus() {
  console.log('🔍 Testing backend status...\\n');
  
  const backendUrl = 'https://1099suite-backend-production.up.railway.app';
  
  try {
    // Test basic connectivity
    console.log('1. Testing basic connectivity...');
    const response = await fetch(`${backendUrl}/health`, { 
      method: 'GET',
      timeout: 10000 
    });
    
    if (response.ok) {
      console.log('✅ Backend is running and accessible');
      const data = await response.text();
      console.log('Response:', data);
    } else {
      console.log('❌ Backend responded with status:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Backend connectivity failed:', error.message);
    console.log('\\n🔧 This could be causing account creation issues if the app depends on the backend');
  }
  
  try {
    // Test Google OAuth endpoint
    console.log('\\n2. Testing Google OAuth endpoint...');
    const oauthResponse = await fetch(`${backendUrl}/auth/google/callback`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-code' }),
      timeout: 10000 
    });
    
    console.log('OAuth endpoint status:', oauthResponse.status);
    if (oauthResponse.status === 400) {
      console.log('✅ OAuth endpoint is accessible (expected 400 for invalid code)');
    } else {
      console.log('⚠️ Unexpected OAuth response:', oauthResponse.status);
    }
    
  } catch (error) {
    console.log('❌ OAuth endpoint test failed:', error.message);
  }
  
  console.log('\\n📋 Summary:');
  console.log('- If backend is down, Google Sign-In will fail');
  console.log('- Email signup should still work with Supabase directly');
  console.log('- Check if the backend is deployed and running on Railway');
}

testBackendStatus();
