import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './database';
import { useAuthStore } from '../state/authStore';
import { useKPIStore } from '../state/kpiStore';
import { useContractorStore } from '../state/contractorStore';
import { useMileageStore } from '../state/mileageStore';
import { useOutreachStore } from '../state/outreachStore';
import { usePlaidStore } from '../state/plaidStore';
import { useLeadFilterStore } from '../state/leadFilterStore';
import { useInputSettingsStore } from '../state/inputSettingsStore';
import { useSettingsStore } from '../state/settingsStore';
import { useVisibilityStore } from '../state/visibilityStore';
import { useTeamStore } from '../state/teamStore';

interface MigrationProgress {
  step: string;
  completed: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: MigrationProgress) => void;

class DataMigrationService {
  
  async migrateAllDataToDatabase(onProgress?: ProgressCallback): Promise<void> {
    console.log('🚀 Starting complete data migration to database...');
    
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User must be authenticated to migrate data');
      }

      const totalSteps = 10;
      let currentStep = 0;

      const updateProgress = (step: string, message: string) => {
        currentStep++;
        onProgress?.({
          step,
          completed: currentStep,
          total: totalSteps,
          message
        });
      };

      // Initialize database first
      updateProgress('init', 'Initializing database...');
      await databaseService.initialize();

      // Step 1: Migrate user data
      updateProgress('users', 'Migrating user data...');
      await this.migrateUserData(user);

      // Step 2: Migrate KPI data (daily inputs)
      updateProgress('kpi', 'Migrating KPI and daily inputs...');
      await this.migrateKPIData(user.id);

      // Step 3: Migrate contractor data (leads, expenses)
      updateProgress('contractor', 'Migrating leads and expenses...');
      await this.migrateContractorData(user.id);

      // Step 4: Migrate mileage data
      updateProgress('mileage', 'Migrating mileage trips...');
      await this.migrateMileageData(user.id);

      // Step 5: Migrate team data
      updateProgress('team', 'Migrating team members...');
      await this.migrateTeamData(user.id);

      // Step 6: Migrate Plaid data
      updateProgress('plaid', 'Migrating banking data...');
      await this.migratePlaidData(user.id);

      // Step 7: Migrate settings
      updateProgress('settings', 'Migrating user settings...');
      await this.migrateSettingsData(user.id);

      // Step 8: Migrate outreach data
      updateProgress('outreach', 'Migrating outreach data...');
      await this.migrateOutreachData(user.id);

      // Step 9: Clear all local storage
      updateProgress('cleanup', 'Clearing local storage...');
      await this.clearAllLocalStorage();

      // Step 10: Reinitialize stores to use database
      updateProgress('reinit', 'Reinitializing app state...');
      await this.reinitializeStores(user.id);

      console.log('✅ Data migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  private async migrateUserData(user: any): Promise<void> {
    try {
      // User data is already saved to database during authentication
      // But let's ensure it's up to date
      await databaseService.saveUser({
        userId: user.id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || new Date().toISOString(),
      });
      console.log('✅ User data migrated');
    } catch (error) {
      console.error('❌ Failed to migrate user data:', error);
      throw error;
    }
  }

  private async migrateKPIData(userId: string): Promise<void> {
    try {
      const kpiState = useKPIStore.getState();
      
      // Migrate all daily inputs
      for (const input of kpiState.dailyInputs) {
        const existingInputs = await databaseService.getDailyInputsByDate(userId, input.date);
        
        if (existingInputs.length === 0) {
          await databaseService.saveDailyInput(userId, input);
        }
      }
      
      console.log(`✅ Migrated ${kpiState.dailyInputs.length} daily inputs`);
    } catch (error) {
      console.error('❌ Failed to migrate KPI data:', error);
      throw error;
    }
  }

  private async migrateContractorData(userId: string): Promise<void> {
    try {
      const contractorState = useContractorStore.getState();
      
      // Migrate leads
      for (const lead of contractorState.leads) {
        const existingLead = await databaseService.getLeadById(userId, lead.id);
        
        if (!existingLead) {
          await databaseService.saveLead(userId, lead);
        }
      }
      
      // Migrate expenses
      for (const expense of contractorState.expenses) {
        const existingExpense = await databaseService.getExpenseById(userId, expense.id);
        
        if (!existingExpense) {
          await databaseService.saveExpense(userId, expense);
        }
      }
      
      console.log(`✅ Migrated ${contractorState.leads.length} leads and ${contractorState.expenses.length} expenses`);
    } catch (error) {
      console.error('❌ Failed to migrate contractor data:', error);
      throw error;
    }
  }

  private async migrateMileageData(userId: string): Promise<void> {
    try {
      const mileageState = useMileageStore.getState();
      
      // Migrate mileage trips
      for (const trip of mileageState.trips) {
        const existingTrip = await databaseService.getMileageTripById(userId, trip.id);
        
        if (!existingTrip) {
          await databaseService.saveMileageTrip(userId, trip);
        }
      }
      
      console.log(`✅ Migrated ${mileageState.trips.length} mileage trips`);
    } catch (error) {
      console.error('❌ Failed to migrate mileage data:', error);
      throw error;
    }
  }

  private async migrateTeamData(userId: string): Promise<void> {
    try {
      const teamState = useTeamStore.getState();
      
      // Migrate team members
      for (const member of teamState.teamMembers) {
        const existingMember = await databaseService.getTeamMemberById(userId, member.id);
        
        if (!existingMember) {
          await databaseService.saveTeamMember(userId, member);
        }
      }
      
      console.log(`✅ Migrated ${teamState.teamMembers.length} team members`);
    } catch (error) {
      console.error('❌ Failed to migrate team data:', error);
      throw error;
    }
  }

  private async migratePlaidData(userId: string): Promise<void> {
    try {
      const plaidState = usePlaidStore.getState();
      
      // Migrate Plaid accounts
      for (const account of plaidState.linkedAccounts) {
        const existingAccount = await databaseService.getPlaidAccountById(userId, account.account_id);
        
        if (!existingAccount) {
          await databaseService.savePlaidAccount(userId, account);
        }
      }
      
      // Migrate transactions
      for (const transaction of plaidState.transactions) {
        const existingTransaction = await databaseService.getPlaidTransactionById(userId, transaction.transaction_id);
        
        if (!existingTransaction) {
          await databaseService.savePlaidTransaction(userId, transaction);
        }
      }
      
      console.log(`✅ Migrated ${plaidState.linkedAccounts.length} accounts and ${plaidState.transactions.length} transactions`);
    } catch (error) {
      console.error('❌ Failed to migrate Plaid data:', error);
      throw error;
    }
  }

  private async migrateSettingsData(userId: string): Promise<void> {
    try {
      const leadFilterSettings = useLeadFilterStore.getState().settings;
      const inputSettings = useInputSettingsStore.getState().settings;
      const appSettings = useSettingsStore.getState();
      const kpiVisibility = useKPIStore.getState().metricVisibility;
      
      // Extract visibility settings from the visibility store
      const visibilityState = useVisibilityStore.getState();
      const visibilitySettings = {
        showOutreach: visibilityState.showOutreach,
        showAppointmentsSet: visibilityState.showAppointmentsSet,
        showAppointmentsHeld: visibilityState.showAppointmentsHeld,
        showClosedDeals: visibilityState.showClosedDeals,
        showAccountsServiced: visibilityState.showAccountsServiced,
        showHoursWorked: visibilityState.showHoursWorked,
        showConversionRates: visibilityState.showConversionRates,
        showEfficiencyMetrics: visibilityState.showEfficiencyMetrics,
        showDoorKnocksAnalysis: visibilityState.showDoorKnocksAnalysis,
        showTagsAnalysis: visibilityState.showTagsAnalysis,
        showCallsAnalysis: visibilityState.showCallsAnalysis,
        showReferralsAnalysis: visibilityState.showReferralsAnalysis,
        showInboundAnalysis: visibilityState.showInboundAnalysis,
        showSourcePerformanceSummary: visibilityState.showSourcePerformanceSummary,
        showTodaysProgress: visibilityState.showTodaysProgress,
        showOutreachDoorKnocks: visibilityState.showOutreachDoorKnocks,
        showOutreachTagsPut: visibilityState.showOutreachTagsPut,
        showOutreachCallsMade: visibilityState.showOutreachCallsMade,
        showOutreachReferrals: visibilityState.showOutreachReferrals,
        showOutreachInbound: visibilityState.showOutreachInbound,
        showAppointmentsSetDoorKnocks: visibilityState.showAppointmentsSetDoorKnocks,
        showAppointmentsSetTagsPut: visibilityState.showAppointmentsSetTagsPut,
        showAppointmentsSetCallsMade: visibilityState.showAppointmentsSetCallsMade,
        showAppointmentsSetReferrals: visibilityState.showAppointmentsSetReferrals,
        showAppointmentsSetInbound: visibilityState.showAppointmentsSetInbound,
        showAppointmentsHeldDoorKnocks: visibilityState.showAppointmentsHeldDoorKnocks,
        showAppointmentsHeldTagsPut: visibilityState.showAppointmentsHeldTagsPut,
        showAppointmentsHeldCallsMade: visibilityState.showAppointmentsHeldCallsMade,
        showAppointmentsHeldReferrals: visibilityState.showAppointmentsHeldReferrals,
        showAppointmentsHeldInbound: visibilityState.showAppointmentsHeldInbound,
        showClosedDealsDoorKnocks: visibilityState.showClosedDealsDoorKnocks,
        showClosedDealsTagsPut: visibilityState.showClosedDealsTagsPut,
        showClosedDealsCallsMade: visibilityState.showClosedDealsCallsMade,
        showClosedDealsReferrals: visibilityState.showClosedDealsReferrals,
        showClosedDealsInbound: visibilityState.showClosedDealsInbound,
        showAccountsServicedDoorKnocks: visibilityState.showAccountsServicedDoorKnocks,
        showAccountsServicedTagsPut: visibilityState.showAccountsServicedTagsPut,
        showAccountsServicedCallsMade: visibilityState.showAccountsServicedCallsMade,
        showAccountsServicedReferrals: visibilityState.showAccountsServicedReferrals,
        showAccountsServicedInbound: visibilityState.showAccountsServicedInbound,
      };
      
      await databaseService.saveUserSettings(userId, {
        leadFilterSettings,
        inputSettings,
        appSettings,
        kpiVisibility,
        visibilitySettings
      });
      
      console.log('✅ Migrated user settings');
    } catch (error) {
      console.error('❌ Failed to migrate settings data:', error);
      throw error;
    }
  }

  private async migrateOutreachData(userId: string): Promise<void> {
    try {
      const outreachState = useOutreachStore.getState();
      
      // Save outreach tally data to daily inputs if needed
      if (outreachState.tallyCounts && Object.keys(outreachState.tallyCounts).length > 0) {
        const today = new Date().toISOString().split('T')[0];
        await databaseService.updateOutreachTally(userId, today, outreachState.tallyCounts);
      }
      
      console.log('✅ Migrated outreach data');
    } catch (error) {
      console.error('❌ Failed to migrate outreach data:', error);
      throw error;
    }
  }

  private async clearAllLocalStorage(): Promise<void> {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter out system keys we want to keep (if any)
      const keysToRemove = allKeys.filter(key => 
        !key.startsWith('DevMenu') && 
        !key.startsWith('__react') &&
        !key.startsWith('EXPO_')
      );
      
      // Remove all app-related keys
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      console.log(`✅ Cleared ${keysToRemove.length} local storage keys`);
    } catch (error) {
      console.error('❌ Failed to clear local storage:', error);
      throw error;
    }
  }

  private async reinitializeStores(userId: string): Promise<void> {
    try {
      // Reinitialize all stores to load data from database
      const { loadUserData: loadKPIData } = useKPIStore.getState();
      const { loadUserData: loadContractorData } = useContractorStore.getState();
      const { loadUserData: loadMileageData } = useMileageStore.getState();
      const { loadUserData: loadPlaidData } = usePlaidStore.getState();
      
      // Load data from database
      await Promise.all([
        loadKPIData(userId),
        loadContractorData(userId),
        loadMileageData(userId),
        loadPlaidData(userId),
      ]);
      
      console.log('✅ Stores reinitialized with database data');
    } catch (error) {
      console.error('❌ Failed to reinitialize stores:', error);
      throw error;
    }
  }

  async clearLocalStorageOnly(): Promise<void> {
    try {
      console.log('🧹 Clearing all local storage...');
      
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter out system keys we want to keep
      const keysToRemove = allKeys.filter(key => 
        !key.startsWith('DevMenu') && 
        !key.startsWith('__react') &&
        !key.startsWith('EXPO_')
      );
      
      // Remove all app-related keys
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      console.log(`✅ Cleared ${keysToRemove.length} local storage keys`);
      console.log('Keys removed:', keysToRemove);
      
    } catch (error) {
      console.error('❌ Failed to clear local storage:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{ localKeys: string[]; databaseTables: string[] }> {
    try {
      // Get local storage keys
      const localKeys = await AsyncStorage.getAllKeys();
      
      // Get database table info
      await databaseService.initialize();
      const dbInfo = await databaseService.getDatabaseInfo();
      
      return {
        localKeys: localKeys.filter(key => 
          !key.startsWith('DevMenu') && 
          !key.startsWith('__react') &&
          !key.startsWith('EXPO_')
        ),
        databaseTables: dbInfo.tableInfo.map((t: any) => t.name)
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      throw error;
    }
  }
}

export const dataMigrationService = new DataMigrationService();