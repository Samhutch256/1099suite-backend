import { create } from 'zustand';
import { databaseService } from '../services/database';
import { supabaseService } from '../services/supabaseService';

export interface LeadFilterSettings {
  // In-process stages
  new: boolean;
  contacted: boolean;
  appointment_set: boolean;
  appointment_held: boolean;
  negotiation: boolean;
  signed_deal: boolean;
  site_survey_scheduled: boolean;
  site_survey_completed: boolean;
  change_order_required: boolean;
  submitted_for_permits: boolean;
  permits_approved: boolean;
  install_scheduled: boolean;
  installed: boolean;
  
  // Cancelled stages
  cancelled_appointment: boolean;
  held_not_interested: boolean;
  unqualified: boolean;
  cancelled_contract: boolean;
}

interface LeadFilterState {
  currentUserId: string | null;
  settings: LeadFilterSettings;
  isInitialized: boolean;
  updateFilterVisibility: (filter: keyof LeadFilterSettings, visible: boolean) => void;
  resetToDefaults: () => void;
  setCurrentUser: (userId: string) => void;
  loadUserSettings: (userId: string) => Promise<void>;
  saveUserSettings: () => Promise<void>;
  initializeWithUser: (userId: string) => Promise<void>;
}

const defaultSettings: LeadFilterSettings = {
  // In-process stages (all enabled by default)
  new: true,
  contacted: true,
  appointment_set: true,
  appointment_held: true,
  negotiation: true,
  signed_deal: true,
  site_survey_scheduled: true,
  site_survey_completed: true,
  change_order_required: true,
  submitted_for_permits: true,
  permits_approved: true,
  install_scheduled: true,
  installed: true,
  
  // Cancelled stages (all enabled by default)
  cancelled_appointment: true,
  held_not_interested: true,
  unqualified: true,
  cancelled_contract: true,
};

export const useLeadFilterStore = create<LeadFilterState>()((set, get) => ({
      currentUserId: null,
      settings: defaultSettings,
      isInitialized: false,

      setCurrentUser: (userId: string) => {
        console.log(`🔄 [LeadFilterStore] Setting current user: ${userId}`);
        set({ currentUserId: userId });
        get().loadUserSettings(userId);
      },

      initializeWithUser: async (userId: string) => {
        console.log(`🚀 [LeadFilterStore] Initializing with user: ${userId}`);
        try {
          let userSettings;
          
          try {
            userSettings = await supabaseService.getUserSettings(userId);
            console.log(`📂 [LeadFilterStore] Loaded settings from Supabase:`, userSettings.leadFilterSettings);
            
            await databaseService.saveUserSettings(userId, {
              leadFilterSettings: userSettings.leadFilterSettings
            });
            console.log(`✅ [LeadFilterStore] Cached settings to local database`);
          } catch (supabaseError) {
            console.warn('⚠️ [LeadFilterStore] Failed to load from Supabase, falling back to local:', supabaseError);
            userSettings = await databaseService.getUserSettings(userId);
          }
          
          const mergedSettings = { ...defaultSettings, ...userSettings.leadFilterSettings };
          console.log(`📂 [LeadFilterStore] Final merged settings:`, mergedSettings);
          
          set({ 
            currentUserId: userId,
            settings: mergedSettings,
            isInitialized: true
          });
          
          console.log(`✅ [LeadFilterStore] Successfully initialized with database settings`);
        } catch (error) {
          console.error('❌ [LeadFilterStore] Failed to initialize with user settings:', error);
          set({ 
            currentUserId: userId,
            settings: defaultSettings,
            isInitialized: true
          });
        }
      },

      loadUserSettings: async (userId: string) => {
        try {
          console.log(`📂 [LeadFilterStore] Loading user settings for user: ${userId}`);
          const userSettings = await databaseService.getUserSettings(userId);
          console.log(`📂 [LeadFilterStore] Loaded user settings:`, userSettings.leadFilterSettings);
          
          const mergedSettings = { ...defaultSettings, ...userSettings.leadFilterSettings };
          console.log(`📂 [LeadFilterStore] Merged settings:`, mergedSettings);
          
          set({ 
            currentUserId: userId,
            settings: mergedSettings
          });
        } catch (error) {
          console.error('❌ [LeadFilterStore] Failed to load lead filter settings:', error);
          set({ 
            currentUserId: userId,
            settings: defaultSettings 
          });
        }
      },

      saveUserSettings: async () => {
        const state = get();
        if (!state.currentUserId) {
          console.log('⚠️ [LeadFilterStore] No current user ID, skipping save');
          return;
        }
        
        try {
          console.log(`💾 [LeadFilterStore] Saving filter settings for user ${state.currentUserId}:`, state.settings);
          
          await Promise.all([
            supabaseService.saveUserSettings(state.currentUserId, {
              leadFilterSettings: state.settings
            }),
            databaseService.saveUserSettings(state.currentUserId, {
              leadFilterSettings: state.settings
            })
          ]);
          
          console.log(`✅ [LeadFilterStore] Successfully saved filter settings to Supabase and local database`);
        } catch (error) {
          console.error('❌ [LeadFilterStore] Failed to save lead filter settings:', error);
          
          try {
            await databaseService.saveUserSettings(state.currentUserId, {
              leadFilterSettings: state.settings
            });
            console.log(`✅ [LeadFilterStore] Saved to local database as fallback`);
          } catch (fallbackError) {
            console.error('❌ [LeadFilterStore] Fallback save also failed:', fallbackError);
          }
        }
      },

      updateFilterVisibility: async (filter, visible) => {
        console.log(`🔧 [LeadFilterStore] Updating filter ${filter} to ${visible}`);
        console.log(`🔧 [LeadFilterStore] Current settings before update:`, get().settings);
        
        set((state) => ({
          settings: {
            ...state.settings,
            [filter]: visible,
          },
        }));
        
        console.log(`🔧 [LeadFilterStore] Settings after update:`, get().settings);
        
        // Save to database
        try {
          await get().saveUserSettings();
          console.log(`✅ [LeadFilterStore] Successfully saved filter settings for ${filter}`);
        } catch (error) {
          console.error(`❌ [LeadFilterStore] Failed to save filter settings:`, error);
        }
      },

      resetToDefaults: async () => {
        set({ settings: defaultSettings });
        
        // Save to database
        await get().saveUserSettings();
      },
    })
);