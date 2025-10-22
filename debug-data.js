// Debug utility to inspect and manage data for samhutch256@gmail.com
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

// Debug functions
const debugUtils = {
  // Check what data exists in AsyncStorage for this email
  async checkAsyncStorageData() {
    console.log('🔍 Checking AsyncStorage data for:', email);
    
    try {
      const expectedUserId = generateUUIDFromEmail(email.toLowerCase());
      console.log('Expected User ID:', expectedUserId);
      
      // Check different possible storage keys
      const storageKeys = [
        'kpi-storage',
        'contractor-storage', 
        'lead-filter-storage',
        'plaid-storage',
        'mileage-storage',
        'outreach-storage',
        'auth-storage'
      ];
      
      for (const key of storageKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            console.log(`📦 Found data in ${key}:`, parsed);
          } else {
            console.log(`📦 No data in ${key}`);
          }
        } catch (error) {
          console.log(`❌ Error reading ${key}:`, error.message);
        }
      }
      
      // Check all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🗝️ All AsyncStorage keys:', allKeys);
      
    } catch (error) {
      console.error('❌ Error checking AsyncStorage:', error);
    }
  },
  
  // Clear all AsyncStorage data for this email/user
  async clearAsyncStorageData() {
    console.log('🧹 Clearing AsyncStorage data for:', email);
    
    try {
      // Get all keys and clear them
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);
      console.log('✅ Cleared all AsyncStorage data');
    } catch (error) {
      console.error('❌ Error clearing AsyncStorage:', error);
    }
  },
  
  // Clear database data for this user
  async clearDatabaseData() {
    console.log('🗄️ Clearing database data for:', email);
    
    try {
      const { databaseService } = await import('./src/services/database.js');
      const expectedUserId = generateUUIDFromEmail(email.toLowerCase());
      
      console.log('Clearing data for User ID:', expectedUserId);
      await databaseService.clearUserData(expectedUserId);
      console.log('✅ Cleared database data');
    } catch (error) {
      console.error('❌ Error clearing database:', error);
    }
  },
  
  // Check what data exists in database for this user
  async checkDatabaseData() {
    console.log('🗄️ Checking database data for:', email);
    
    try {
      const { databaseService } = await import('./src/services/database.js');
      const expectedUserId = generateUUIDFromEmail(email.toLowerCase());
      
      console.log('Checking data for User ID:', expectedUserId);
      
      // Check daily inputs
      const dailyInputs = await databaseService.getDailyInputs(expectedUserId);
      console.log(`📊 Found ${dailyInputs.length} daily inputs`);
      if (dailyInputs.length > 0) {
        console.log('Sample daily input:', dailyInputs[0]);
      }
      
      // You could add more data checks here (leads, expenses, etc.)
      
    } catch (error) {
      console.error('❌ Error checking database:', error);
    }
  }
};

export default debugUtils;