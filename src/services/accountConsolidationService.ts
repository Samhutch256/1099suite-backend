import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './database';
import { cloudSyncService } from './cloudSyncService';

interface AccountData {
  userId: string;
  email: string;
  createdAt: string;
  dailyInputsCount: number;
  dataExists: boolean;
}

class AccountConsolidationService {
  // Find all accounts/data associated with an email
  async findAccountsByEmail(email: string): Promise<AccountData[]> {
    const normalizedEmail = email.toLowerCase();
    const accounts: AccountData[] = [];
    
    try {
      // Generate the expected consolidated user ID (proper UUID format)
      const primaryUserId = this.generateUUIDFromEmail(normalizedEmail);
      
      // Check cloud storage for any data with this email
      const cloudKeys = await this.getAllCloudKeys();
      
      for (const key of cloudKeys) {
        if (key.startsWith('cloud_data_')) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              const cloudData = JSON.parse(data);
              if (cloudData.userId && cloudData.dailyInputs) {
                // Check if this could be related to our email
                const potentialUserIds = this.generatePossibleUserIds(normalizedEmail);
                if (potentialUserIds.includes(cloudData.userId) || cloudData.userId === primaryUserId) {
                  accounts.push({
                    userId: cloudData.userId,
                    email: normalizedEmail,
                    createdAt: cloudData.lastSyncTime || new Date().toISOString(),
                    dailyInputsCount: cloudData.dailyInputs.length,
                    dataExists: true,
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error checking cloud key:', key, error);
          }
        }
      }
      
      // Also check local database for any data
      try {
        const localInputs = await databaseService.getDailyInputs(primaryUserId);
        if (localInputs.length > 0) {
          const existingAccount = accounts.find(a => a.userId === primaryUserId);
          if (!existingAccount) {
            accounts.push({
              userId: primaryUserId,
              email: normalizedEmail,
              createdAt: localInputs[0]?.createdAt || new Date().toISOString(),
              dailyInputsCount: localInputs.length,
              dataExists: true,
            });
          }
        }
      } catch (error) {
        console.error('Error checking local database:', error);
      }
      
      // Check for old-style random user IDs that might belong to this email
      await this.checkForOldStyleAccounts(normalizedEmail, accounts);
      
      return accounts;
    } catch (error) {
      console.error('Failed to find accounts by email:', error);
      return [];
    }
  }

  // Generate possible user IDs that could belong to this email
  private generatePossibleUserIds(email: string): string[] {
    const ids = [];
    const properUUID = this.generateUUIDFromEmail(email);
    const legacyEmailHash = this.simpleHashEmail(email);
    
    // Current proper UUID format
    ids.push(properUUID);
    
    // Legacy formats that might exist for migration
    ids.push(`user_${legacyEmailHash}`);
    ids.push(`email_${legacyEmailHash}`);
    ids.push(`google_${legacyEmailHash}`);
    ids.push(`apple_${legacyEmailHash}`);
    
    return ids;
  }

  // Check for old-style random user IDs that might need migration
  private async checkForOldStyleAccounts(email: string, accounts: AccountData[]): Promise<void> {
    try {
      // Check AsyncStorage for any user data that might match
      const allKeys = await AsyncStorage.getAllKeys();
      
      for (const key of allKeys) {
        if (key.startsWith('user_') || key.includes('auth') || key.includes('daily')) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data && data.includes(email)) {
              // This might be old user data - mark for investigation
              console.log('Found potential old account data for email:', email, 'in key:', key);
            }
          } catch (error) {
            // Ignore individual key errors
          }
        }
      }
    } catch (error) {
      console.error('Error checking for old accounts:', error);
    }
  }

  // Consolidate all accounts for an email into one primary account
  async consolidateAccountsByEmail(email: string, supabaseUserId: string): Promise<string> {
    console.warn('Account consolidation is disabled. Always using Supabase Auth user ID.');
    return supabaseUserId;
  }

  // Deduplicate daily inputs by date, keeping the most recent
  private deduplicateInputsByDate(inputs: any[]): any[] {
    const inputMap = new Map();
    
    for (const input of inputs) {
      // Validate input structure
      if (!input || typeof input !== 'object') {
        console.warn('⚠️ Skipping invalid input during deduplication:', input);
        continue;
      }

      // Ensure valid date
      const date = input.date;
      if (!date || typeof date !== 'string') {
        console.warn('⚠️ Skipping input with invalid date during deduplication:', input);
        continue;
      }
      
      const existing = inputMap.get(date);
      const inputTime = new Date(input.createdAt || 0).getTime();
      const existingTime = existing ? new Date(existing.createdAt || 0).getTime() : 0;
      
      if (!existing || inputTime > existingTime) {
        // Sanitize input data before storing
        const sanitizedInput = this.sanitizeInputData(input);
        inputMap.set(date, sanitizedInput);
      }
    }
    
    return Array.from(inputMap.values());
  }

  // Sanitize input data to ensure all required fields exist
  private sanitizeInputData(input: any): any {
    return {
      id: input.id || `temp_${Date.now()}`,
      date: input.date || new Date().toISOString().split('T')[0],
      doorsKnocked: Number(input.doorsKnocked) || 0,
      appointments: Number(input.appointments) || 0,
      appointmentHolds: Number(input.appointmentHolds) || 0,
      closedDeals: Number(input.closedDeals) || 0,
      accountsServiced: Number(input.accountsServiced) || 0,
      hoursWorked: Number(input.hoursWorked) || 0,
      notes: String(input.notes || ''),
      createdAt: input.createdAt || new Date().toISOString(),
      // Breakdown fields
      outreachDoorKnocks: Number(input.outreachDoorKnocks) || 0,
      outreachTagsPut: Number(input.outreachTagsPut) || 0,
      outreachCallsMade: Number(input.outreachCallsMade) || 0,
      appointmentsSetDoorKnocks: Number(input.appointmentsSetDoorKnocks) || 0,
      appointmentsSetTagsPut: Number(input.appointmentsSetTagsPut) || 0,
      appointmentsSetCallsMade: Number(input.appointmentsSetCallsMade) || 0,
      appointmentsSetReferrals: Number(input.appointmentsSetReferrals) || 0,
      appointmentsSetInbound: Number(input.appointmentsSetInbound) || 0,
      appointmentsHeldDoorKnocks: Number(input.appointmentsHeldDoorKnocks) || 0,
      appointmentsHeldTagsPut: Number(input.appointmentsHeldTagsPut) || 0,
      appointmentsHeldCallsMade: Number(input.appointmentsHeldCallsMade) || 0,
      appointmentsHeldReferrals: Number(input.appointmentsHeldReferrals) || 0,
      appointmentsHeldInbound: Number(input.appointmentsHeldInbound) || 0,
      dealsClosedDoorKnocks: Number(input.dealsClosedDoorKnocks) || 0,
      dealsClosedTagsPut: Number(input.dealsClosedTagsPut) || 0,
      dealsClosedCallsMade: Number(input.dealsClosedCallsMade) || 0,
      dealsClosedReferrals: Number(input.dealsClosedReferrals) || 0,
      dealsClosedInbound: Number(input.dealsClosedInbound) || 0,
      accountsServicedDoorKnocks: Number(input.accountsServicedDoorKnocks) || 0,
      accountsServicedTagsPut: Number(input.accountsServicedTagsPut) || 0,
      accountsServicedCallsMade: Number(input.accountsServicedCallsMade) || 0,
      accountsServicedReferrals: Number(input.accountsServicedReferrals) || 0,
      accountsServicedInbound: Number(input.accountsServicedInbound) || 0,
      tallyCounts: (input.tallyCounts && typeof input.tallyCounts === 'object') ? input.tallyCounts : {},
    };
  }

  // Save consolidated data to primary account
  private async saveConsolidatedData(primaryUserId: string, inputs: any[]): Promise<void> {
    try {
      console.log(`💾 Saving ${inputs.length} inputs to primary account ${primaryUserId}`);
      
      // Clear existing data for primary user
      await databaseService.clearUserData(primaryUserId);
      
      // Save each input to database
      for (const input of inputs) {
        try {
          // Validate input before saving
          if (!input || !input.date) {
            console.warn('⚠️ Skipping invalid input during consolidation save:', input);
            continue;
          }

          // Prepare properly formatted input data
          const consolidatedInput = {
            date: input.date,
            doorsKnocked: input.doorsKnocked || 0,
            appointments: input.appointments || 0,
            appointmentHolds: input.appointmentHolds || 0,
            closedDeals: input.closedDeals || 0,
            accountsServiced: input.accountsServiced || 0,
            hoursWorked: input.hoursWorked || 0,
            notes: input.notes || '',
            createdAt: input.createdAt || new Date().toISOString(),
            // Breakdown fields
            outreachDoorKnocks: input.outreachDoorKnocks || 0,
            outreachTagsPut: input.outreachTagsPut || 0,
            outreachCallsMade: input.outreachCallsMade || 0,
            appointmentsSetDoorKnocks: input.appointmentsSetDoorKnocks || 0,
            appointmentsSetTagsPut: input.appointmentsSetTagsPut || 0,
            appointmentsSetCallsMade: input.appointmentsSetCallsMade || 0,
            appointmentsSetReferrals: input.appointmentsSetReferrals || 0,
            appointmentsSetInbound: input.appointmentsSetInbound || 0,
            appointmentsHeldDoorKnocks: input.appointmentsHeldDoorKnocks || 0,
            appointmentsHeldTagsPut: input.appointmentsHeldTagsPut || 0,
            appointmentsHeldCallsMade: input.appointmentsHeldCallsMade || 0,
            appointmentsHeldReferrals: input.appointmentsHeldReferrals || 0,
            appointmentsHeldInbound: input.appointmentsHeldInbound || 0,
            dealsClosedDoorKnocks: input.dealsClosedDoorKnocks || 0,
            dealsClosedTagsPut: input.dealsClosedTagsPut || 0,
            dealsClosedCallsMade: input.dealsClosedCallsMade || 0,
            dealsClosedReferrals: input.dealsClosedReferrals || 0,
            dealsClosedInbound: input.dealsClosedInbound || 0,
            accountsServicedDoorKnocks: input.accountsServicedDoorKnocks || 0,
            accountsServicedTagsPut: input.accountsServicedTagsPut || 0,
            accountsServicedCallsMade: input.accountsServicedCallsMade || 0,
            accountsServicedReferrals: input.accountsServicedReferrals || 0,
            accountsServicedInbound: input.accountsServicedInbound || 0,
            tallyCounts: input.tallyCounts || {},
          };
          
          await databaseService.saveDailyInput(primaryUserId, consolidatedInput);
          
          console.log('✅ Saved consolidated input for date:', consolidatedInput.date);
        } catch (error) {
          console.error('❌ Failed to save consolidated input:', error, 'Input:', input);
        }
      }
      
      // Upload to cloud
      await cloudSyncService.uploadUserData(primaryUserId);
      
      console.log('✅ Consolidated data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save consolidated data:', error);
      throw error;
    }
  }

  // Clean up old account data
  private async cleanupOldAccounts(accounts: AccountData[], primaryUserId: string): Promise<void> {
    for (const account of accounts) {
      if (account.userId !== primaryUserId) {
        try {
          // Remove cloud data
          const cloudKey = `cloud_data_${account.userId}`;
          await AsyncStorage.removeItem(cloudKey);
          
          // Clear local database data
          await databaseService.clearUserData(account.userId);
          
          console.log(`🗑️ Cleaned up old account: ${account.userId}`);
        } catch (error) {
          console.error(`⚠️ Failed to clean up account ${account.userId}:`, error);
        }
      }
    }
  }

  // Get all cloud storage keys
  private async getAllCloudKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith('cloud_data_'));
    } catch (error) {
      console.error('Failed to get cloud keys:', error);
      return [];
    }
  }

  // Generate consistent UUID from email (same logic as auth store)
  private generateUUIDFromEmail(email: string): string {
    // Create a consistent UUID-like string from email
    // This ensures the same email always gets the same UUID
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

  // Legacy method for backward compatibility
  private hashEmail(email: string): string {
    return this.generateUUIDFromEmail(email);
  }

  // Simple hash for legacy format migration
  private simpleHashEmail(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Force account consolidation for current user
  async forceConsolidationForCurrentUser(email: string): Promise<string> {
    console.log('🚀 Forcing account consolidation for current user');
    return await this.consolidateAccountsByEmail(email);
  }
}

export const accountConsolidationService = new AccountConsolidationService();