import { create } from 'zustand';
import { databaseService } from '../services/database';
import { generateUniqueId } from '../utils/generateId';
import { useAuthStore } from '../state/authStore';

export interface DailyInput {
  id: string;
  date: string;
  doorsKnocked: number;
  appointments: number;
  appointmentHolds: number;
  closedDeals: number;
  accountsServiced: number;
  hoursWorked: number;
  notes?: string;
  
  // Sub-inputs for breakdown of how activities were performed
  outreachDoorKnocks?: number;
  outreachTagsPut?: number;
  outreachCallsMade?: number;
  outreachReferrals?: number;
  outreachInbound?: number;
  appointmentsSetDoorKnocks?: number;
  appointmentsSetTagsPut?: number;
  appointmentsSetCallsMade?: number;
  appointmentsSetReferrals?: number;
  appointmentsSetInbound?: number;
  appointmentsHeldDoorKnocks?: number;
  appointmentsHeldTagsPut?: number;
  appointmentsHeldCallsMade?: number;
  appointmentsHeldReferrals?: number;
  appointmentsHeldInbound?: number;
  dealsClosedDoorKnocks?: number;
  dealsClosedTagsPut?: number;
  dealsClosedCallsMade?: number;
  dealsClosedReferrals?: number;
  dealsClosedInbound?: number;
  accountsServicedDoorKnocks?: number;
  accountsServicedTagsPut?: number;
  accountsServicedCallsMade?: number;
  accountsServicedReferrals?: number;
  accountsServicedInbound?: number;
  
  // Tally counter breakdown for outreach attempts
  tallyCounts?: { [key: string]: number };
  
  createdAt: string;
}

export interface KPIMetrics {
  doorsPerAppointment: number;
  appointmentHoldRate: number;
  appointmentToClosedRate: number;
  closeToAccountServicedRate: number;
  totalDoors: number;
  totalAppointments: number;
  totalDeals: number;
  totalAccountsServiced: number;
  totalHoursWorked: number;
  dollarsPerHour: number;
  totalRevenue: number;
}

export interface MetricVisibilitySettings {
  outreach: boolean;
  appointments: boolean;
  appointmentsHeld: boolean;
  dealsClosed: boolean;
  accountsServiced: boolean;
  hoursWorked: boolean;
  doorKnocksAnalysis: boolean;
  tagsAnalysis: boolean;
  callsAnalysis: boolean;
  referralsAnalysis: boolean;
  inboundAnalysis: boolean;
  sourcePerformanceSummary: boolean;
  conversionRates: boolean;
  efficiencyMetrics: boolean;
  todaysProgress: boolean;
}

interface KPIState {
  dailyInputs: DailyInput[];
  currentUserId: string | null;
  isSyncing: boolean;
  lastSyncTime: string | null;
  metricVisibility: MetricVisibilitySettings;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  loadUserData: (userId: string) => Promise<void>;
  addDailyInput: (input: Omit<DailyInput, 'id' | 'createdAt'>) => Promise<void>;
  updateDailyInput: (id: string, updates: Partial<DailyInput>) => Promise<void>;
  deleteDailyInput: (id: string) => Promise<void>;
  clearUserData: () => void;
  
  // Sync actions
  syncData: () => Promise<void>;
  forceSyncFromCloud: () => Promise<void>;
  forceReload: () => Promise<void>;
  
  // Visibility management
  toggleMetricVisibility: (metric: keyof MetricVisibilitySettings) => void;
  resetVisibilitySettings: () => void;
  
  // Computed metrics
  getKPIMetrics: (dateRange?: { start: string; end: string }, totalRevenue?: number) => KPIMetrics;
  getDailyInputsByDateRange: (start: string, end: string) => DailyInput[];
  getTodayInput: () => DailyInput | null;
}

const defaultVisibilitySettings: MetricVisibilitySettings = {
  outreach: true,
  appointments: true,
  appointmentsHeld: true,
  dealsClosed: true,
  accountsServiced: true,
  hoursWorked: true,
  doorKnocksAnalysis: true,
  tagsAnalysis: true,
  callsAnalysis: true,
  referralsAnalysis: true,
  inboundAnalysis: true,
  sourcePerformanceSummary: true,
  conversionRates: true,
  efficiencyMetrics: true,
  todaysProgress: true,
};

export const useKPIStore = create<KPIState>()((set, get) => ({
      dailyInputs: [],
      currentUserId: null,
      isSyncing: false,
      lastSyncTime: null,
      metricVisibility: defaultVisibilitySettings,
      
      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
      },
      
      loadUserData: async (userId: string) => {
        try {
          console.log('📂 Loading daily inputs from Supabase (primary) for:', userId);
          const dailyInputs = await databaseService.getDailyInputsSupabaseFirst(userId);
          set({ dailyInputs, currentUserId: userId });
          console.log(`✅ Loaded ${dailyInputs.length} daily inputs from Supabase`);
        } catch (error) {
          console.error('Failed to load daily inputs from Supabase, trying local SQLite:', error);
          
          try {
            const dailyInputs = await databaseService.getDailyInputs(userId);
            set({ dailyInputs, currentUserId: userId });
            console.log(`✅ Loaded ${dailyInputs.length} daily inputs from local SQLite fallback`);
          } catch (localError) {
            console.error('Failed to load from local SQLite as well:', localError);
            
            // If it's a table-related error, try resetting the database
            if (localError instanceof Error && localError.message.includes('no such table')) {
              try {
                console.log('Attempting to reset database due to table error...');
                await databaseService.resetDatabase();
                const dailyInputs = await databaseService.getDailyInputs(userId);
                set({ dailyInputs, currentUserId: userId });
                console.log('Database reset successful');
                return;
              } catch (resetError) {
                console.error('Failed to reset database:', resetError);
              }
            }
            
            // Set the user ID even if data loading fails, so they can still use the app
            set({ dailyInputs: [], currentUserId: userId });
          }
        }
      },
      
      addDailyInput: async (inputData) => {
        const state = get();
        console.log('[addDailyInput] called');
        console.log('[addDailyInput] currentUserId:', state.currentUserId);
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        const newInput: DailyInput = {
          ...inputData,
          id: generateUniqueId('input_'),
          createdAt: new Date().toISOString(),
        };
        console.log('[addDailyInput] newInput:', newInput);
        
        try {
          console.log('💾 Saving daily input to Supabase (primary)...');
          const savedInput = await databaseService.saveDailyInputSupabaseFirst(state.currentUserId, newInput);
          set((state) => ({ dailyInputs: [...state.dailyInputs, savedInput] }));
          console.log('✅ Daily input saved to Supabase successfully');
          
          // Auto-sync after adding data (for additional backup)
          try {
            const { cloudSyncService } = await import('../services/cloudSyncService');
            await cloudSyncService.quickSync(state.currentUserId);
            console.log('✅ Auto-sync after add completed');
          } catch (error) {
            console.error('⚠️ Auto-sync after add failed:', error);
          }
        } catch (error) {
          console.error('Failed to save daily input:', error);
          
          // Try one more time after schema verification/reset
          try {
            console.log('Retrying save after schema verification...');
            await databaseService.verifySchema();
            const syncId = await databaseService.saveDailyInput(state.currentUserId, newInput);
            const savedInput = { ...newInput, id: syncId };
            set((state) => ({ dailyInputs: [...state.dailyInputs, savedInput] }));
            
            // Auto-sync after retry save
            try {
              const { cloudSyncService } = await import('../services/cloudSyncService');
              await cloudSyncService.quickSync(state.currentUserId);
              console.log('✅ Auto-sync after retry save completed');
            } catch (error) {
              console.error('⚠️ Auto-sync after retry save failed:', error);
            }
          } catch (retryError) {
            console.error('Retry failed, saving locally:', retryError);
            // Save locally as fallback
            set((state) => ({ dailyInputs: [...state.dailyInputs, newInput] }));
            
            if (retryError instanceof Error && retryError.message.includes('runAsync')) {
              throw new Error('Database connection failed. Data saved locally - please restart the app and try again.');
            } else {
              throw new Error('Database error. Data saved locally - please restart the app.');
            }
          }
        }
      },
      
      updateDailyInput: async (id, updates) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        // Update locally first for immediate feedback
        set((state) => ({
          dailyInputs: state.dailyInputs.map((input) =>
            input.id === id ? { ...input, ...updates } : input
          ),
        }));
        
        try {
          console.log('📝 Updating daily input in Supabase (primary)...');
          await databaseService.updateDailyInputSupabaseFirst(state.currentUserId, id, updates);
          console.log('✅ Daily input updated in Supabase successfully');
          
          // Auto-sync after updating data (for additional backup)
          try {
            const { cloudSyncService } = await import('../services/cloudSyncService');
            await cloudSyncService.quickSync(state.currentUserId);
            console.log('✅ Auto-sync after update completed');
          } catch (error) {
            console.error('⚠️ Auto-sync after update failed:', error);
          }
        } catch (error) {
          console.error('Failed to update daily input:', error);
          
          // Provide more specific error messages
          if (error instanceof Error) {
            if (error.message.includes('runAsync')) {
              throw new Error('Database connection error. Update saved locally - please restart the app and try again.');
            } else if (error.message.includes('no such table')) {
              throw new Error('Database schema error. Please reset the database or restart the app.');
            } else {
              throw new Error(`Update error: ${error.message}. Data saved locally.`);
            }
          } else {
            throw new Error('Update saved locally. Please try syncing later.');
          }
        }
      },
      
      deleteDailyInput: async (id) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        try {
          await databaseService.deleteDailyInput(state.currentUserId, id);
          set((state) => ({
            dailyInputs: state.dailyInputs.filter((input) => input.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete daily input:', error);
          throw error;
        }
      },
      
      clearUserData: () => {
        set({ dailyInputs: [], currentUserId: null });
      },

      syncData: async () => {
        const { currentUserId } = get();
        if (!currentUserId || get().isSyncing) return;

        try {
          set({ isSyncing: true });
          
          // Import sync service
          const { cloudSyncService } = await import('../services/cloudSyncService');
          
          // Perform full sync
          await cloudSyncService.fullSync(currentUserId);
          
          // Reload data after sync
          const dailyInputs = await databaseService.getDailyInputs(currentUserId);
          set({ 
            dailyInputs, 
            lastSyncTime: new Date().toISOString(),
            isSyncing: false 
          });
          
          console.log('✅ Data sync completed');
        } catch (error) {
          console.error('❌ Sync failed:', error);
          set({ isSyncing: false });
        }
      },

      forceSyncFromCloud: async () => {
        const { currentUserId } = get();
        if (!currentUserId || get().isSyncing) return;

        try {
          set({ isSyncing: true });
          
          // Import sync service
          const { cloudSyncService } = await import('../services/cloudSyncService');
          
          // Force download from cloud
          await cloudSyncService.downloadAndMergeUserData(currentUserId);
          
          // Reload data after sync
          const dailyInputs = await databaseService.getDailyInputs(currentUserId);
          set({ 
            dailyInputs, 
            lastSyncTime: new Date().toISOString(),
            isSyncing: false 
          });
          
          console.log('✅ Force sync from cloud completed');
        } catch (error) {
          console.error('❌ Force sync failed:', error);
          set({ isSyncing: false });
        }
      },

      forceReload: async () => {
        const { currentUserId } = get();
        if (!currentUserId) return;

        try {
          console.log('🔄 Force reloading data from database');
          const dailyInputs = await databaseService.getDailyInputs(currentUserId);
          set({ dailyInputs });
          console.log('✅ Force reload completed, loaded', dailyInputs.length, 'inputs');
        } catch (error) {
          console.error('❌ Force reload failed:', error);
        }
      },

      toggleMetricVisibility: (metric: keyof MetricVisibilitySettings) => {
        set((state) => ({
          metricVisibility: {
            ...state.metricVisibility,
            [metric]: !state.metricVisibility[metric],
          },
        }));
      },

      resetVisibilitySettings: () => {
        set({ metricVisibility: defaultVisibilitySettings });
      },
      
      getKPIMetrics: (dateRange, totalRevenue = 0) => {
        const state = get();
        let inputs = state.dailyInputs;
        
        if (dateRange) {
          inputs = inputs.filter(input => {
            const inputDate = new Date(input.date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            return inputDate >= startDate && inputDate <= endDate;
          });
        }
        
        // Calculate totals with lead-based filtering
        const totals = inputs.reduce(
          (acc, input) => {
            const inputDate = new Date(input.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Only count appointments that have passed or are scheduled for today/past
            let validAppointments = input.appointments;
            let validAppointmentHolds = input.appointmentHolds;
            
            // If we have lead data, we could filter based on appointment dates
            // For now, we'll use the input date as the baseline
            if (inputDate > today) {
              // Future appointments - don't count in metrics yet
              validAppointments = 0;
              validAppointmentHolds = 0;
            }
            
            return {
              doorsKnocked: acc.doorsKnocked + input.doorsKnocked,
              appointments: acc.appointments + validAppointments,
              appointmentHolds: acc.appointmentHolds + validAppointmentHolds,
              closedDeals: acc.closedDeals + input.closedDeals,
              accountsServiced: acc.accountsServiced + input.accountsServiced,
              hoursWorked: acc.hoursWorked + input.hoursWorked,
            };
          },
          {
            doorsKnocked: 0,
            appointments: 0,
            appointmentHolds: 0,
            closedDeals: 0,
            accountsServiced: 0,
            hoursWorked: 0,
          }
        );
        
        return {
          doorsPerAppointment: totals.appointments > 0 ? totals.doorsKnocked / totals.appointments : 0,
          appointmentHoldRate: totals.appointments > 0 ? (totals.appointmentHolds / totals.appointments) * 100 : 0,
          appointmentToClosedRate: totals.appointments > 0 ? (totals.closedDeals / totals.appointments) * 100 : 0,
          closeToAccountServicedRate: totals.closedDeals > 0 ? (totals.accountsServiced / totals.closedDeals) * 100 : 0,
          totalDoors: totals.doorsKnocked,
          totalAppointments: totals.appointments,
          totalDeals: totals.closedDeals,
          totalAccountsServiced: totals.accountsServiced,
          totalHoursWorked: totals.hoursWorked,
          dollarsPerHour: totals.hoursWorked > 0 ? totalRevenue / totals.hoursWorked : 0,
          totalRevenue: totalRevenue,
        };
      },
      
      getDailyInputsByDateRange: (start, end) => {
        const state = get();
        return state.dailyInputs.filter(input => {
          const inputDate = new Date(input.date);
          const startDate = new Date(start);
          const endDate = new Date(end);
          return inputDate >= startDate && inputDate <= endDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      
      getTodayInput: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        const todayInput = state.dailyInputs.find(input => input.date === today);
        console.log('Looking for today input:', today, 'Found:', !!todayInput);
        console.log('All inputs:', state.dailyInputs.map(i => ({ date: i.date, doors: i.doorsKnocked })));
        return todayInput || null;
      },
    }));