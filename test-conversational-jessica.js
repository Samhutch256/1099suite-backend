const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:5001';

async function testJessica(message, userId = 'test-user-123') {
  try {
    console.log(`\n🧪 Testing: "${message}"`);
    
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

async function runConversationalTests() {
  console.log('🚀 Testing Jessica Conversational AI\n');
  
  const testCases = [
    // Freeform language tests
    "Closed 1, set 3 from inbound, knocked 40",
    "Held two appointments today but didn't close any",
    "Knocked on doors from 1-3pm, got 1 appt",
    "I only knocked 15 doors, no sets, just a call back from a guy named Brad",
    
    // Conversational corrections
    "No you haven't",
    "Actually I set 2, not 3",
    "That's not right",
    
    // Natural variations
    "Got 2 appointments from inbound calls",
    "Set 3 appointments via door knocks",
    "Closed 1 deal under inbound",
    "Worked 8 hours today",
    "Received 15 inbound calls",
    
    // Complex combinations
    "Busy day — knocked 25 doors, set 4 from door knocks, held 2 from referrals, closed 1 from inbound",
    "Today's summary: 30 doors, 3 sets from inbound, 2 held, 1 deal closed",
    
    // Ambiguous cases
    "Just a regular day",
    "Not much happened",
    "Same as yesterday",
  ];
  
  for (const testCase of testCases) {
    await testJessica(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }
  
  console.log('\n✅ All conversational tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runConversationalTests().catch(console.error);
}

module.exports = { testJessica }; 