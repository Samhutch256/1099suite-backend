// Debug script to check inbound accounts serviced data
import AsyncStorage from '@react-native-async-storage/async-storage';

const email = 'samhutch256@gmail.com';

// Function to generate consistent UUID from email (matching auth store logic)
function generateUUIDFromEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to ensure consistent length
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Format as UUID v4 style: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuid = [
    hex.slice(0, 8),
    hex.slice(0, 4),
    '4' + hex.slice(1, 4), // Version 4 UUID
    '8' + hex.slice(1, 4), // Variant bits
    hex.repeat(3).slice(0, 12)
  ].join('-');
  
  return uuid;
}

async function checkInboundData() {
  console.log('🔍 Checking inbound accounts serviced data for:', email);
  
  try {
    const expectedUserId = generateUUIDFromEmail(email.toLowerCase());
    console.log('Expected User ID:', expectedUserId);
    
    // Check KPI storage for daily inputs
    const kpiData = await AsyncStorage.getItem('kpi-storage');
    if (kpiData) {
      const parsed = JSON.parse(kpiData);
      console.log('📦 KPI Storage data:', parsed);
      
      if (parsed.state && parsed.state.dailyInputs) {
        console.log(`📊 Found ${parsed.state.dailyInputs.length} daily inputs`);
        
        // Look for inbound accounts serviced data
        const inboundData = parsed.state.dailyInputs.filter(input => 
          input.accountsServicedInbound && input.accountsServicedInbound > 0
        );
        
        console.log(`🎯 Found ${inboundData.length} inputs with inbound accounts serviced:`);
        inboundData.forEach(input => {
          console.log(`  Date: ${input.date}, Accounts Serviced Inbound: ${input.accountsServicedInbound}`);
        });
        
        // Show all inputs with their inbound breakdown
        console.log('📋 All inputs with inbound breakdown:');
        parsed.state.dailyInputs.forEach(input => {
          if (input.accountsServicedInbound !== undefined) {
            console.log(`  Date: ${input.date}, Accounts Serviced Inbound: ${input.accountsServicedInbound}`);
          }
        });
      }
    } else {
      console.log('📦 No KPI storage data found');
    }
    
  } catch (error) {
    console.error('❌ Error checking inbound data:', error);
  }
}

checkInboundData();
