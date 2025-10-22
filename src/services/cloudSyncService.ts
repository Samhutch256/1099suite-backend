import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyInput } from '../state/kpiStore';
import { databaseService } from './database';

interface CloudSyncData {
  userId: string;
  dailyInputs: DailyInput[];
  lastSyncTime: string;
  deviceId: string;
}

class CloudSyncService {
  private syncInProgress = false;
  private deviceId: string;

  constructor() {
    // Generate unique device identifier
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `device_${timestamp}_${random}`;
  }

  private getCloudKey(userId: string): string {
    return `cloud_data_${userId}`;
  }

  // Upload local data to cloud
  async uploadUserData(userId: string): Promise<void> {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      console.log('🔄 Uploading data to cloud for user:', userId);

      // Get all local daily inputs
      const localInputs = await databaseService.getDailyInputs(userId);
      
      const cloudData: CloudSyncData = {
        userId,
        dailyInputs: localInputs,
        lastSyncTime: new Date().toISOString(),
        deviceId: this.deviceId,
      };

      // Save to cloud (AsyncStorage simulating cloud storage)
      await AsyncStorage.setItem(this.getCloudKey(userId), JSON.stringify(cloudData));
      
      console.log('✅ Data uploaded to cloud successfully');
    } catch (error) {
      console.error('❌ Failed to upload data to cloud:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Download cloud data and merge with local
  async downloadAndMergeUserData(userId: string): Promise<void> {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      console.log('⬇️ Downloading and merging cloud data for user:', userId);

      // Get cloud data
      const cloudDataString = await AsyncStorage.getItem(this.getCloudKey(userId));
      if (!cloudDataString) {
        console.log('📄 No cloud data found, uploading local data');
        await this.uploadUserData(userId);
        return;
      }

      const cloudData: CloudSyncData = JSON.parse(cloudDataString);
      
      // Get local data
      const localInputs = await databaseService.getDailyInputs(userId);
      
      // Merge cloud and local data
      const mergedInputs = this.mergeInputs(localInputs, cloudData.dailyInputs);
      
      // Clear local database and save merged data
      await this.replaceDatabaseData(userId, mergedInputs);
      
      // Update cloud with merged data
      await this.uploadUserData(userId);
      
      console.log('✅ Data sync completed successfully');
    } catch (error) {
      console.error('❌ Failed to sync data:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Merge two arrays of daily inputs, keeping the most recent version of each date
  private mergeInputs(localInputs: DailyInput[], cloudInputs: DailyInput[]): DailyInput[] {
    const inputMap = new Map<string, DailyInput>();
    
    // Add all inputs to map, using date as key
    [...localInputs, ...cloudInputs].forEach(input => {
      const existing = inputMap.get(input.date);
      if (!existing || new Date(input.createdAt) > new Date(existing.createdAt)) {
        inputMap.set(input.date, input);
      }
    });
    
    return Array.from(inputMap.values());
  }

  // Replace all database data with merged data
  private async replaceDatabaseData(userId: string, inputs: DailyInput[]): Promise<void> {
    try {
      // Clear existing data for user (Note: this clears all user data)
      await databaseService.clearUserData(userId);
      
      // Save each input
      for (const input of inputs) {
        try {
          const { id, ...inputData } = input;
          
          // Ensure all required fields are present
          const syncedInput = {
            date: input.date,
            doorsKnocked: input.doorsKnocked || 0,
            appointments: input.appointments || 0,
            appointmentHolds: input.appointmentHolds || 0,
            closedDeals: input.closedDeals || 0,
            accountsServiced: input.accountsServiced || 0,
            hoursWorked: input.hoursWorked || 0,
            notes: input.notes || '',
            createdAt: input.createdAt || new Date().toISOString(),
            // Include all breakdown fields
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
          
          await databaseService.saveDailyInput(userId, syncedInput);
        } catch (error) {
          console.error('Failed to save input during sync:', error);
        }
      }
    } catch (error) {
      console.error('Failed to replace database data:', error);
      throw error;
    }
  }

  // Full sync: download cloud data, merge, and upload
  async fullSync(userId: string): Promise<void> {
    console.log('🔄 Starting full sync for user:', userId);
    await this.downloadAndMergeUserData(userId);
  }

  // Quick sync: just upload current data
  async quickSync(userId: string): Promise<void> {
    console.log('⚡ Starting quick sync for user:', userId);
    await this.uploadUserData(userId);
  }

  // Check if cloud has newer data
  async hasNewerCloudData(userId: string): Promise<boolean> {
    try {
      const cloudDataString = await AsyncStorage.getItem(this.getCloudKey(userId));
      if (!cloudDataString) return false;

      const cloudData: CloudSyncData = JSON.parse(cloudDataString);
      const localInputs = await databaseService.getDailyInputs(userId);
      
      // Check if cloud has more recent data
      if (cloudData.dailyInputs.length > localInputs.length) return true;
      
      // Check if any cloud data is newer than local
      const localLatestTime = Math.max(...localInputs.map(i => new Date(i.createdAt).getTime()), 0);
      const cloudLatestTime = Math.max(...cloudData.dailyInputs.map(i => new Date(i.createdAt).getTime()), 0);
      
      return cloudLatestTime > localLatestTime;
    } catch (error) {
      console.error('Failed to check cloud data:', error);
      return false;
    }
  }

  // Get sync status
  getSyncStatus(): { syncing: boolean; deviceId: string } {
    return {
      syncing: this.syncInProgress,
      deviceId: this.deviceId,
    };
  }
}

export const cloudSyncService = new CloudSyncService();