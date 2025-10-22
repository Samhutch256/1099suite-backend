import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../services/database';

export interface AppSettings {
  // Theme & Display
  darkMode: boolean;
  colorScheme: 'blue' | 'green' | 'purple' | 'orange';
  
  // Privacy & Security
  shareAnalytics: boolean;
  
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  weeklyReports: boolean;
}

interface SettingsState {
  currentUserId: string | null;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
  setCurrentUser: (userId: string) => void;
  loadUserSettings: (userId: string) => Promise<void>;
  saveUserSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  // Theme & Display
  darkMode: false,
  colorScheme: 'blue',
  
  // Privacy & Security
  shareAnalytics: false,
  
  // Notifications
  pushNotifications: true,
  emailNotifications: false,
  weeklyReports: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      settings: defaultSettings,
      
      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
        get().loadUserSettings(userId);
      },

      loadUserSettings: async (userId: string) => {
        try {
          const userSettings = await databaseService.getUserSettings(userId);
          set({ 
            currentUserId: userId,
            settings: { ...defaultSettings, ...userSettings.appSettings }
          });
        } catch (error) {
          console.error('Failed to load app settings:', error);
          set({ 
            currentUserId: userId,
            settings: defaultSettings 
          });
        }
      },

      saveUserSettings: async () => {
        const state = get();
        if (!state.currentUserId) return;
        
        try {
          await databaseService.saveUserSettings(state.currentUserId, {
            appSettings: state.settings
          });
        } catch (error) {
          console.error('Failed to save app settings:', error);
        }
      },
      
      updateSetting: async (key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
        
        // Save to database
        await get().saveUserSettings();
      },
      
      resetSettings: async () => {
        set({ settings: defaultSettings });
        
        // Save to database
        await get().saveUserSettings();
      },
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);