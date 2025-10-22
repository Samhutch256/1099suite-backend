import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InputFieldSettings {
  // Main input fields
  outreachAttempts: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  appointmentsSet: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  appointmentRan: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  appointmentsHeld: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  dealsClosed: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  installs: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  accountsServiced: {
    enabled: boolean;
    subFields: {
      doorKnocks: boolean;
      tagsPut: boolean;
      callsMade: boolean;
      referrals: boolean;
      inbound: boolean;
    };
  };
  hoursWorked: {
    enabled: boolean;
  };
  notes: {
    enabled: boolean;
  };
}

interface InputSettingsState {
  settings: InputFieldSettings;
  settingsVersion: number;
  updateMainFieldSetting: (field: keyof InputFieldSettings, enabled: boolean) => void;
  updateSubFieldSetting: (mainField: keyof InputFieldSettings, subField: string, enabled: boolean) => void;
  updateSettings: (field: string, enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultSettings: InputFieldSettings = {
  outreachAttempts: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  appointmentsSet: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  appointmentRan: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  appointmentsHeld: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  dealsClosed: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  installs: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  accountsServiced: {
    enabled: true,
    subFields: {
      doorKnocks: true,
      tagsPut: true,
      callsMade: true,
      referrals: true,
      inbound: true,
    },
  },
  hoursWorked: {
    enabled: true,
  },
  notes: {
    enabled: true,
  },
};

const SETTINGS_VERSION = 2; // Increment when adding new fields

export const useInputSettingsStore = create<InputSettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      settingsVersion: SETTINGS_VERSION,

      updateMainFieldSetting: (field, enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [field]: {
              ...state.settings[field],
              enabled,
            },
          },
        }));
      },

      updateSubFieldSetting: (mainField, subField, enabled) => {
        set((state) => {
          const currentMainField = state.settings[mainField];
          if ('subFields' in currentMainField) {
            return {
              settings: {
                ...state.settings,
                [mainField]: {
                  ...currentMainField,
                  subFields: {
                    ...currentMainField.subFields,
                    [subField]: enabled,
                  },
                },
              },
            };
          }
          return state;
        });
      },

      updateSettings: (field, enabled) => {
        // Handle nested field paths like "outreachAttempts.socialMedia"
        if (field.includes('.')) {
          const [mainField, subField] = field.split('.');
          const mainFieldKey = mainField as keyof InputFieldSettings;
          set((state) => {
            const currentMainField = state.settings[mainFieldKey];
            if ('subFields' in currentMainField) {
              return {
                settings: {
                  ...state.settings,
                  [mainFieldKey]: {
                    ...currentMainField,
                    subFields: {
                      ...currentMainField.subFields,
                      [subField]: enabled,
                    },
                  },
                },
              };
            }
            return state;
          });
        } else {
          // Handle main field
          const mainFieldKey = field as keyof InputFieldSettings;
          set((state) => ({
            settings: {
              ...state.settings,
              [mainFieldKey]: {
                ...state.settings[mainFieldKey],
                enabled,
              },
            },
          }));
        }
      },

      resetToDefaults: () => {
        set({ settings: defaultSettings, settingsVersion: SETTINGS_VERSION });
      },
    }),
    {
      name: 'input-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrationError: (error) => {
        console.error('Settings rehydration error:', error);
      },
      // Migration logic
      migrate: (persistedState: any, version: number) => {
        if (!persistedState.settingsVersion || persistedState.settingsVersion < SETTINGS_VERSION) {
          console.log('Migrating input settings to new version');
          // Merge old settings with new defaults, ensuring new fields are added
          const migratedSettings = {
            ...defaultSettings,
            ...persistedState.settings,
            outreachAttempts: {
              ...defaultSettings.outreachAttempts,
              ...persistedState.settings?.outreachAttempts,
              subFields: {
                ...defaultSettings.outreachAttempts.subFields,
                ...persistedState.settings?.outreachAttempts?.subFields
              }
            }
          };
          return {
            settings: migratedSettings,
            settingsVersion: SETTINGS_VERSION
          };
        }
        return persistedState;
      },
      version: SETTINGS_VERSION,
    }
  )
);