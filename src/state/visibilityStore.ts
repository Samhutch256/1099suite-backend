import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../services/database';

interface VisibilityState {
  currentUserId: string | null;
  
  // Main cards
  showOutreach: boolean;
  showAppointmentsSet: boolean;
  showAppointmentsHeld: boolean;
  showClosedDeals: boolean;
  showAccountsServiced: boolean;
  showHoursWorked: boolean;
  // Revenue breakdown metrics
  showRevenueGuaranteed: boolean;
  showRevenuePipeline: boolean;
  showRevenuePaidOut: boolean;
  showRevenueTotal: boolean;
  // KPI Analysis sections
  showConversionRates: boolean;
  showOutreachToAppointments: boolean;
  showAppointmentsToHeld: boolean;
  showHeldToClosed: boolean;
  showClosedToServiced: boolean;
  showOverallCloseRate: boolean;
  showOverallServiceRate: boolean;
  showEfficiencyMetrics: boolean;
  showDoorKnocksAnalysis: boolean;
  showTagsAnalysis: boolean;
  showCallsAnalysis: boolean;
  showReferralsAnalysis: boolean;
  showInboundAnalysis: boolean;
  showSourcePerformanceSummary: boolean;
  showTodaysProgress: boolean;
  // Sub-inputs for Outreach
  showOutreachDoorKnocks: boolean;
  showOutreachTagsPut: boolean;
  showOutreachCallsMade: boolean;
  showOutreachReferrals: boolean;
  showOutreachInbound: boolean;
  // Sub-inputs for Appointments Set
  showAppointmentsSetDoorKnocks: boolean;
  showAppointmentsSetTagsPut: boolean;
  showAppointmentsSetCallsMade: boolean;
  showAppointmentsSetReferrals: boolean;
  showAppointmentsSetInbound: boolean;
  // Sub-inputs for Appointments Held
  showAppointmentsHeldDoorKnocks: boolean;
  showAppointmentsHeldTagsPut: boolean;
  showAppointmentsHeldCallsMade: boolean;
  showAppointmentsHeldReferrals: boolean;
  showAppointmentsHeldInbound: boolean;
  // Sub-inputs for Closed Deals
  showClosedDealsDoorKnocks: boolean;
  showClosedDealsTagsPut: boolean;
  showClosedDealsCallsMade: boolean;
  showClosedDealsReferrals: boolean;
  showClosedDealsInbound: boolean;
  // Sub-inputs for Accounts Serviced
  showAccountsServicedDoorKnocks: boolean;
  showAccountsServicedTagsPut: boolean;
  showAccountsServicedCallsMade: boolean;
  showAccountsServicedReferrals: boolean;
  showAccountsServicedInbound: boolean;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  loadUserSettings: (userId: string) => Promise<void>;
  saveUserSettings: () => Promise<void>;
  
  // Individual setters
  setShowOutreach: (value: boolean) => void;
  setShowAppointmentsSet: (value: boolean) => void;
  setShowAppointmentsHeld: (value: boolean) => void;
  setShowClosedDeals: (value: boolean) => void;
  setShowAccountsServiced: (value: boolean) => void;
  setShowHoursWorked: (value: boolean) => void;
  setShowRevenueGuaranteed: (value: boolean) => void;
  setShowRevenuePipeline: (value: boolean) => void;
  setShowRevenuePaidOut: (value: boolean) => void;
  setShowRevenueTotal: (value: boolean) => void;
  setShowConversionRates: (value: boolean) => void;
  setShowOutreachToAppointments: (value: boolean) => void;
  setShowAppointmentsToHeld: (value: boolean) => void;
  setShowHeldToClosed: (value: boolean) => void;
  setShowClosedToServiced: (value: boolean) => void;
  setShowOverallCloseRate: (value: boolean) => void;
  setShowOverallServiceRate: (value: boolean) => void;
  setShowEfficiencyMetrics: (value: boolean) => void;
  setShowDoorKnocksAnalysis: (value: boolean) => void;
  setShowTagsAnalysis: (value: boolean) => void;
  setShowCallsAnalysis: (value: boolean) => void;
  setShowReferralsAnalysis: (value: boolean) => void;
  setShowInboundAnalysis: (value: boolean) => void;
  setShowSourcePerformanceSummary: (value: boolean) => void;
  setShowTodaysProgress: (value: boolean) => void;
  setShowOutreachDoorKnocks: (value: boolean) => void;
  setShowOutreachTagsPut: (value: boolean) => void;
  setShowOutreachCallsMade: (value: boolean) => void;
  setShowOutreachReferrals: (value: boolean) => void;
  setShowOutreachInbound: (value: boolean) => void;
  setShowAppointmentsSetDoorKnocks: (value: boolean) => void;
  setShowAppointmentsSetTagsPut: (value: boolean) => void;
  setShowAppointmentsSetCallsMade: (value: boolean) => void;
  setShowAppointmentsSetReferrals: (value: boolean) => void;
  setShowAppointmentsSetInbound: (value: boolean) => void;
  setShowAppointmentsHeldDoorKnocks: (value: boolean) => void;
  setShowAppointmentsHeldTagsPut: (value: boolean) => void;
  setShowAppointmentsHeldCallsMade: (value: boolean) => void;
  setShowAppointmentsHeldReferrals: (value: boolean) => void;
  setShowAppointmentsHeldInbound: (value: boolean) => void;
  setShowClosedDealsDoorKnocks: (value: boolean) => void;
  setShowClosedDealsTagsPut: (value: boolean) => void;
  setShowClosedDealsCallsMade: (value: boolean) => void;
  setShowClosedDealsReferrals: (value: boolean) => void;
  setShowClosedDealsInbound: (value: boolean) => void;
  setShowAccountsServicedDoorKnocks: (value: boolean) => void;
  setShowAccountsServicedTagsPut: (value: boolean) => void;
  setShowAccountsServicedCallsMade: (value: boolean) => void;
  setShowAccountsServicedReferrals: (value: boolean) => void;
  setShowAccountsServicedInbound: (value: boolean) => void;
  
  // Generic setter (for backward compatibility)
  setVisibility: (key: keyof VisibilityState, value: boolean) => void;
  resetAllVisibility: () => void;
}

export const useVisibilityStore = create<VisibilityState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      showOutreach: true,
      showAppointmentsSet: true,
      showAppointmentsHeld: true,
      showClosedDeals: true,
      showAccountsServiced: true,
      showHoursWorked: true,
      showRevenueGuaranteed: true,
      showRevenuePipeline: true,
      showRevenuePaidOut: true,
      showRevenueTotal: true,
      showConversionRates: true,
      showOutreachToAppointments: true,
      showAppointmentsToHeld: true,
      showHeldToClosed: true,
      showClosedToServiced: true,
      showOverallCloseRate: true,
      showOverallServiceRate: true,
      showEfficiencyMetrics: true,
      showDoorKnocksAnalysis: true,
      showTagsAnalysis: true,
      showCallsAnalysis: true,
      showReferralsAnalysis: true,
      showInboundAnalysis: true,
      showSourcePerformanceSummary: true,
      showTodaysProgress: true,
      showOutreachDoorKnocks: true,
      showOutreachTagsPut: true,
      showOutreachCallsMade: true,
      showOutreachReferrals: true,
      showOutreachInbound: true,
      showAppointmentsSetDoorKnocks: true,
      showAppointmentsSetTagsPut: true,
      showAppointmentsSetCallsMade: true,
      showAppointmentsSetReferrals: true,
      showAppointmentsSetInbound: true,
      showAppointmentsHeldDoorKnocks: true,
      showAppointmentsHeldTagsPut: true,
      showAppointmentsHeldCallsMade: true,
      showAppointmentsHeldReferrals: true,
      showAppointmentsHeldInbound: true,
      showClosedDealsDoorKnocks: true,
      showClosedDealsTagsPut: true,
      showClosedDealsCallsMade: true,
      showClosedDealsReferrals: true,
      showClosedDealsInbound: true,
      showAccountsServicedDoorKnocks: true,
      showAccountsServicedTagsPut: true,
      showAccountsServicedCallsMade: true,
      showAccountsServicedReferrals: true,
      showAccountsServicedInbound: true,

      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
        get().loadUserSettings(userId);
      },

      loadUserSettings: async (userId: string) => {
        try {
          const userSettings = await databaseService.getUserSettings(userId);
          if (userSettings.visibilitySettings) {
            set({ 
              currentUserId: userId,
              ...userSettings.visibilitySettings
            });
          } else {
            set({ currentUserId: userId });
          }
        } catch (error) {
          console.error('Failed to load visibility settings:', error);
          set({ currentUserId: userId });
        }
      },

      saveUserSettings: async () => {
        const state = get();
        if (!state.currentUserId) return;
        
        try {
          // Extract all visibility settings (excluding currentUserId and action methods)
          const visibilitySettings = {
            showOutreach: state.showOutreach,
            showAppointmentsSet: state.showAppointmentsSet,
            showAppointmentsHeld: state.showAppointmentsHeld,
            showClosedDeals: state.showClosedDeals,
            showAccountsServiced: state.showAccountsServiced,
            showHoursWorked: state.showHoursWorked,
            showRevenueGuaranteed: state.showRevenueGuaranteed,
            showRevenuePipeline: state.showRevenuePipeline,
            showRevenuePaidOut: state.showRevenuePaidOut,
            showRevenueTotal: state.showRevenueTotal,
            showConversionRates: state.showConversionRates,
            showOutreachToAppointments: state.showOutreachToAppointments,
            showAppointmentsToHeld: state.showAppointmentsToHeld,
            showHeldToClosed: state.showHeldToClosed,
            showClosedToServiced: state.showClosedToServiced,
            showOverallCloseRate: state.showOverallCloseRate,
            showOverallServiceRate: state.showOverallServiceRate,
            showEfficiencyMetrics: state.showEfficiencyMetrics,
            showDoorKnocksAnalysis: state.showDoorKnocksAnalysis,
            showTagsAnalysis: state.showTagsAnalysis,
            showCallsAnalysis: state.showCallsAnalysis,
            showReferralsAnalysis: state.showReferralsAnalysis,
            showInboundAnalysis: state.showInboundAnalysis,
            showSourcePerformanceSummary: state.showSourcePerformanceSummary,
            showTodaysProgress: state.showTodaysProgress,
            showOutreachDoorKnocks: state.showOutreachDoorKnocks,
            showOutreachTagsPut: state.showOutreachTagsPut,
            showOutreachCallsMade: state.showOutreachCallsMade,
            showOutreachReferrals: state.showOutreachReferrals,
            showOutreachInbound: state.showOutreachInbound,
            showAppointmentsSetDoorKnocks: state.showAppointmentsSetDoorKnocks,
            showAppointmentsSetTagsPut: state.showAppointmentsSetTagsPut,
            showAppointmentsSetCallsMade: state.showAppointmentsSetCallsMade,
            showAppointmentsSetReferrals: state.showAppointmentsSetReferrals,
            showAppointmentsSetInbound: state.showAppointmentsSetInbound,
            showAppointmentsHeldDoorKnocks: state.showAppointmentsHeldDoorKnocks,
            showAppointmentsHeldTagsPut: state.showAppointmentsHeldTagsPut,
            showAppointmentsHeldCallsMade: state.showAppointmentsHeldCallsMade,
            showAppointmentsHeldReferrals: state.showAppointmentsHeldReferrals,
            showAppointmentsHeldInbound: state.showAppointmentsHeldInbound,
            showClosedDealsDoorKnocks: state.showClosedDealsDoorKnocks,
            showClosedDealsTagsPut: state.showClosedDealsTagsPut,
            showClosedDealsCallsMade: state.showClosedDealsCallsMade,
            showClosedDealsReferrals: state.showClosedDealsReferrals,
            showClosedDealsInbound: state.showClosedDealsInbound,
            showAccountsServicedDoorKnocks: state.showAccountsServicedDoorKnocks,
            showAccountsServicedTagsPut: state.showAccountsServicedTagsPut,
            showAccountsServicedCallsMade: state.showAccountsServicedCallsMade,
            showAccountsServicedReferrals: state.showAccountsServicedReferrals,
            showAccountsServicedInbound: state.showAccountsServicedInbound,
          };

          await databaseService.saveUserSettings(state.currentUserId, {
            visibilitySettings
          });
        } catch (error) {
          console.error('Failed to save visibility settings:', error);
        }
      },

      // Individual setters with database saving
      setShowOutreach: (value) => {
        set({ showOutreach: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSet: (value) => {
        set({ showAppointmentsSet: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeld: (value) => {
        set({ showAppointmentsHeld: value });
        get().saveUserSettings();
      },
      setShowClosedDeals: (value) => {
        set({ showClosedDeals: value });
        get().saveUserSettings();
      },
      setShowAccountsServiced: (value) => {
        set({ showAccountsServiced: value });
        get().saveUserSettings();
      },
      setShowHoursWorked: (value) => {
        set({ showHoursWorked: value });
        get().saveUserSettings();
      },
      setShowRevenueGuaranteed: (value) => {
        set({ showRevenueGuaranteed: value });
        get().saveUserSettings();
      },
      setShowRevenuePipeline: (value) => {
        set({ showRevenuePipeline: value });
        get().saveUserSettings();
      },
      setShowRevenuePaidOut: (value) => {
        set({ showRevenuePaidOut: value });
        get().saveUserSettings();
      },
      setShowRevenueTotal: (value) => {
        set({ showRevenueTotal: value });
        get().saveUserSettings();
      },
      setShowConversionRates: (value) => {
        set({ showConversionRates: value });
        get().saveUserSettings();
      },
      setShowOutreachToAppointments: (value) => {
        set({ showOutreachToAppointments: value });
        get().saveUserSettings();
      },
      setShowAppointmentsToHeld: (value) => {
        set({ showAppointmentsToHeld: value });
        get().saveUserSettings();
      },
      setShowHeldToClosed: (value) => {
        set({ showHeldToClosed: value });
        get().saveUserSettings();
      },
      setShowClosedToServiced: (value) => {
        set({ showClosedToServiced: value });
        get().saveUserSettings();
      },
      setShowOverallCloseRate: (value) => {
        set({ showOverallCloseRate: value });
        get().saveUserSettings();
      },
      setShowOverallServiceRate: (value) => {
        set({ showOverallServiceRate: value });
        get().saveUserSettings();
      },
      setShowEfficiencyMetrics: (value) => {
        set({ showEfficiencyMetrics: value });
        get().saveUserSettings();
      },
      setShowDoorKnocksAnalysis: (value) => {
        set({ showDoorKnocksAnalysis: value });
        get().saveUserSettings();
      },
      setShowTagsAnalysis: (value) => {
        set({ showTagsAnalysis: value });
        get().saveUserSettings();
      },
      setShowCallsAnalysis: (value) => {
        set({ showCallsAnalysis: value });
        get().saveUserSettings();
      },
      setShowReferralsAnalysis: (value) => {
        set({ showReferralsAnalysis: value });
        get().saveUserSettings();
      },
      setShowInboundAnalysis: (value) => {
        set({ showInboundAnalysis: value });
        get().saveUserSettings();
      },
      setShowSourcePerformanceSummary: (value) => {
        set({ showSourcePerformanceSummary: value });
        get().saveUserSettings();
      },
      setShowTodaysProgress: (value) => {
        set({ showTodaysProgress: value });
        get().saveUserSettings();
      },
      setShowOutreachDoorKnocks: (value) => {
        set({ showOutreachDoorKnocks: value });
        get().saveUserSettings();
      },
      setShowOutreachTagsPut: (value) => {
        set({ showOutreachTagsPut: value });
        get().saveUserSettings();
      },
      setShowOutreachCallsMade: (value) => {
        set({ showOutreachCallsMade: value });
        get().saveUserSettings();
      },
      setShowOutreachReferrals: (value) => {
        set({ showOutreachReferrals: value });
        get().saveUserSettings();
      },
      setShowOutreachInbound: (value) => {
        set({ showOutreachInbound: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSetDoorKnocks: (value) => {
        set({ showAppointmentsSetDoorKnocks: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSetTagsPut: (value) => {
        set({ showAppointmentsSetTagsPut: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSetCallsMade: (value) => {
        set({ showAppointmentsSetCallsMade: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSetReferrals: (value) => {
        set({ showAppointmentsSetReferrals: value });
        get().saveUserSettings();
      },
      setShowAppointmentsSetInbound: (value) => {
        set({ showAppointmentsSetInbound: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeldDoorKnocks: (value) => {
        set({ showAppointmentsHeldDoorKnocks: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeldTagsPut: (value) => {
        set({ showAppointmentsHeldTagsPut: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeldCallsMade: (value) => {
        set({ showAppointmentsHeldCallsMade: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeldReferrals: (value) => {
        set({ showAppointmentsHeldReferrals: value });
        get().saveUserSettings();
      },
      setShowAppointmentsHeldInbound: (value) => {
        set({ showAppointmentsHeldInbound: value });
        get().saveUserSettings();
      },
      setShowClosedDealsDoorKnocks: (value) => {
        set({ showClosedDealsDoorKnocks: value });
        get().saveUserSettings();
      },
      setShowClosedDealsTagsPut: (value) => {
        set({ showClosedDealsTagsPut: value });
        get().saveUserSettings();
      },
      setShowClosedDealsCallsMade: (value) => {
        set({ showClosedDealsCallsMade: value });
        get().saveUserSettings();
      },
      setShowClosedDealsReferrals: (value) => {
        set({ showClosedDealsReferrals: value });
        get().saveUserSettings();
      },
      setShowClosedDealsInbound: (value) => {
        set({ showClosedDealsInbound: value });
        get().saveUserSettings();
      },
      setShowAccountsServicedDoorKnocks: (value) => {
        set({ showAccountsServicedDoorKnocks: value });
        get().saveUserSettings();
      },
      setShowAccountsServicedTagsPut: (value) => {
        set({ showAccountsServicedTagsPut: value });
        get().saveUserSettings();
      },
      setShowAccountsServicedCallsMade: (value) => {
        set({ showAccountsServicedCallsMade: value });
        get().saveUserSettings();
      },
      setShowAccountsServicedReferrals: (value) => {
        set({ showAccountsServicedReferrals: value });
        get().saveUserSettings();
      },
      setShowAccountsServicedInbound: (value) => {
        set({ showAccountsServicedInbound: value });
        get().saveUserSettings();
      },
      
      // Generic setter (for backward compatibility)
      setVisibility: (key, value) => {
        set({ [key]: value } as Partial<VisibilityState>);
        get().saveUserSettings();
      },
      resetAllVisibility: () => {
        set({
          showOutreach: true,
          showAppointmentsSet: true,
          showAppointmentsHeld: true,
          showClosedDeals: true,
          showAccountsServiced: true,
          showHoursWorked: true,
          showRevenueGuaranteed: true,
          showRevenuePipeline: true,
          showRevenuePaidOut: true,
          showRevenueTotal: true,
          showConversionRates: true,
          showOutreachToAppointments: true,
          showAppointmentsToHeld: true,
          showHeldToClosed: true,
          showClosedToServiced: true,
          showOverallCloseRate: true,
          showOverallServiceRate: true,
          showEfficiencyMetrics: true,
          showDoorKnocksAnalysis: true,
          showTagsAnalysis: true,
          showCallsAnalysis: true,
          showReferralsAnalysis: true,
          showInboundAnalysis: true,
          showSourcePerformanceSummary: true,
          showTodaysProgress: true,
          showOutreachDoorKnocks: true,
          showOutreachTagsPut: true,
          showOutreachCallsMade: true,
          showOutreachReferrals: true,
          showOutreachInbound: true,
          showAppointmentsSetDoorKnocks: true,
          showAppointmentsSetTagsPut: true,
          showAppointmentsSetCallsMade: true,
          showAppointmentsSetReferrals: true,
          showAppointmentsSetInbound: true,
          showAppointmentsHeldDoorKnocks: true,
          showAppointmentsHeldTagsPut: true,
          showAppointmentsHeldCallsMade: true,
          showAppointmentsHeldReferrals: true,
          showAppointmentsHeldInbound: true,
          showClosedDealsDoorKnocks: true,
          showClosedDealsTagsPut: true,
          showClosedDealsCallsMade: true,
          showClosedDealsReferrals: true,
          showClosedDealsInbound: true,
          showAccountsServicedDoorKnocks: true,
          showAccountsServicedTagsPut: true,
          showAccountsServicedCallsMade: true,
          showAccountsServicedReferrals: true,
          showAccountsServicedInbound: true,
        });
        get().saveUserSettings();
      },
    }),
    {
      name: 'visibility-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 
