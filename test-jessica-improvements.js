const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:5001';

async function testJessica(message, userId = 'test-user-123') {
  try {
    console.log(`\n🧪 Testing Jessica with: "${message}"`);
    
    const response = await fetch(`${BACKEND_URL}/api/jessica-chat-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        userData: {
          kpiData: { totalDoors: 0, totalAppointments: 0 },
          mileageData: { totalMileage: 0 },
          supabaseData: { leads: [], expenses: [] },
          userInfo: { userId, isAuthenticated: true }
        }
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', data.response);
    
    if (data.extractedData) {
      console.log('📊 Extracted Data:', data.extractedData);
    }
    
    if (data.shouldSave) {
      console.log('💾 Data was saved to Supabase');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error testing Jessica:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Jessica AI Improvements\n');
  
  const testCases = [
    "I set 2 appointments from inbound calls today",
    "Closed 1 deal, knocked 30 doors, 3 appointments from door knocks",
    "Busy day — set 4, held 2, closed 1",
    "I knocked 25 doors and set 3 appointments from referrals",
    "Worked 8 hours today, held 2 appointments from inbound calls",
    "Set 5 appointments from door knocks and closed 2 deals from inbound",
    "Today's activities:\n• Knocked 20 doors\n• Set 3 appointments from door knocks\n• Held 1 appointment from referrals\n• Closed 2 deals from inbound calls",
    "I received 15 inbound calls today",
    "Serviced 2 accounts from door knocks",
    "Just a regular day, nothing special",
  ];
  
  for (const testCase of testCases) {
    await testJessica(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testJessica }; 