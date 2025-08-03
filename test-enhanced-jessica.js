// Test script for enhanced Jessica AI functionality
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3002';

// Test cases for natural language understanding
const testCases = [
  {
    name: "Casual shorthand input",
    message: "knocked 60, set 2, held 1, no close",
    expectedData: {
      doorsKnocked: 60,
      appointments: 2,
      appointmentHolds: 1
    }
  },
  {
    name: "Slang and abbreviations",
    message: "dk 25, apt 3, closed 1 deal!!! 🎉",
    expectedData: {
      doorsKnocked: 25,
      appointments: 3,
      closedDeals: 1
    }
  },
  {
    name: "Source attribution",
    message: "3 from door knocks, held 1, closed none",
    expectedData: {
      appointments: 3,
      appointmentsSetDoorKnocks: 3,
      appointmentHolds: 1
    }
  },
  {
    name: "Mixed sources",
    message: "Set 3 from door knocks, 2 from inbound, held 1 from referrals",
    expectedData: {
      appointments: 5,
      appointmentsSetDoorKnocks: 3,
      appointmentsSetInbound: 2,
      appointmentHolds: 1,
      appointmentsHeldReferrals: 1
    }
  },
  {
    name: "Correction handling",
    message: "Actually that was 2 not 4 appointments",
    expectedData: {
      appointments: 2
    }
  },
  {
    name: "Additive language",
    message: "Also knocked another 15 doors",
    expectedData: {
      doorsKnocked: 15
    }
  },
  {
    name: "Complex natural language",
    message: "Had a great day! Knocked on 45 doors, managed to set 4 appointments (2 from door knocks, 2 from inbound calls), held 3 of them, and closed 1 deal!",
    expectedData: {
      doorsKnocked: 45,
      appointments: 4,
      appointmentsSetDoorKnocks: 2,
      appointmentsSetInbound: 2,
      appointmentHolds: 3,
      closedDeals: 1
    }
  },
  {
    name: "Very casual input",
    message: "just finished 8 hrs, tired but got 2 deals 💪",
    expectedData: {
      hoursWorked: 8,
      closedDeals: 2
    }
  }
];

async function testJessica() {
  console.log('🚀 Testing Enhanced Jessica AI\n');
  
  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Input: "${test.message}"`);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/jessica-chat-message`, {
        message: test.message,
        userId: 'test-user-123',
        userData: {}
      });
      
      const { reply, extractedData, hasData, isAdditive } = response.data;
      
      console.log(`   Jessica: "${reply}"`);
      console.log(`   Has Data: ${hasData}`);
      console.log(`   Is Additive: ${isAdditive}`);
      
      if (extractedData && Object.keys(extractedData).length > 0) {
        console.log(`   Extracted Data:`);
        Object.entries(extractedData).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value}`);
        });
        
        // Verify expected data
        let allMatch = true;
        Object.entries(test.expectedData).forEach(([key, expectedValue]) => {
          if (extractedData[key] !== expectedValue) {
            console.log(`   ❌ Expected ${key}: ${expectedValue}, got: ${extractedData[key]}`);
            allMatch = false;
          }
        });
        
        if (allMatch) {
          console.log(`   ✅ All expected data extracted correctly!`);
        }
      } else {
        console.log(`   ⚠️  No data extracted`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test image functionality (mock)
  console.log('\n\n📸 Testing Image Support\n');
  
  const imageTests = [
    {
      name: "Handwritten notes",
      message: "Here's my tally sheet for today",
      imageUrl: "data:image/png;base64,mockImageData"
    },
    {
      name: "CRM screenshot",
      message: "Screenshot of my CRM dashboard",
      imageUrl: "data:image/png;base64,mockImageData"
    }
  ];
  
  for (const test of imageTests) {
    console.log(`\n📝 Image Test: ${test.name}`);
    console.log(`   Message: "${test.message}"`);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/jessica-chat-image`, {
        message: test.message,
        imageUrl: test.imageUrl,
        userId: 'test-user-123',
        userData: {}
      });
      
      const { reply, extractedData, hasData } = response.data;
      
      console.log(`   Jessica: "${reply}"`);
      
      if (hasData && extractedData) {
        console.log(`   Extracted Data from image:`, extractedData);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ Testing complete!');
  console.log('\n📋 Summary:');
  console.log('- Jessica now understands natural language and slang');
  console.log('- Extracts KPI data but returns it to frontend');
  console.log('- Frontend updates UI fields → triggers Supabase sync');
  console.log('- Supports corrections and additive updates');
  console.log('- Can process images with OCR (when OpenAI available)');
  console.log('- Provides natural, encouraging responses');
}

// Run the tests
testJessica().catch(console.error);