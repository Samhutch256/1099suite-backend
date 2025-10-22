import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../services/database';

export interface OutreachTallies {
  doorKnocks: {
    noAnswer: number;
    interested: number;
    notInterested: number;
    unqualified: number;
    appointmentSet: number;
  };
  tagsPut: {
    noAnswer: number;
    interested: number;
    notInterested: number;
    unqualified: number;
    appointmentSet: number;
  };
  callsMade: {
    noAnswer: number;
    interested: number;
    notInterested: number;
    unqualified: number;
    appointmentSet: number;
  };
}

export type OutreachType = 'doorKnocks' | 'tagsPut' | 'callsMade';
export type TallyCategory = 'noAnswer' | 'interested' | 'notInterested' | 'unqualified' | 'appointmentSet';

interface OutreachState {
  currentUserId: string | null;
  selectedOutreachType: OutreachType;
  tallies: OutreachTallies;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  setSelectedOutreachType: (type: OutreachType) => void;
  loadTalliesForDate: (date: string) => Promise<void>;
  incrementTally: (category: TallyCategory, date?: string) => Promise<void>;
  decrementTally: (category: TallyCategory, date?: string) => Promise<void>;
  resetTallies: () => void;
  clearError: () => void;
}

const getDefaultTallies = (): OutreachTallies => ({
  doorKnocks: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 },
  tagsPut: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 },
  callsMade: { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 }
});

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const useOutreachStore = create<OutreachState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      selectedOutreachType: 'doorKnocks',
      tallies: getDefaultTallies(),
      isLoading: false,
      error: null,

      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
        // Don't automatically load - let the component handle date loading
      },

      setSelectedOutreachType: (type: OutreachType) => {
        set({ selectedOutreachType: type });
      },

      loadTalliesForDate: async (date: string) => {
        const { currentUserId } = get();
        if (!currentUserId) {
          set({ error: 'No user logged in' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const tallies = await databaseService.getOutreachTallies(currentUserId, date);
          set({ tallies, isLoading: false });
        } catch (error) {
          console.error('Failed to load outreach tallies:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load tallies',
            isLoading: false 
          });
        }
      },

      incrementTally: async (category: TallyCategory, date?: string) => {
        const { currentUserId, selectedOutreachType } = get();
        if (!currentUserId) {
          set({ error: 'No user logged in' });
          return;
        }

        const targetDate = date || getTodayDateString();
        set({ isLoading: true, error: null });

        try {
          const updatedTallies = await databaseService.updateOutreachTally(
            currentUserId,
            targetDate,
            selectedOutreachType,
            category,
            1
          );
          
          set({ tallies: updatedTallies, isLoading: false });
        } catch (error) {
          console.error('Failed to increment tally:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update tally',
            isLoading: false 
          });
        }
      },

      decrementTally: async (category: TallyCategory, date?: string) => {
        const { currentUserId, selectedOutreachType, tallies } = get();
        if (!currentUserId) {
          set({ error: 'No user logged in' });
          return;
        }

        // Check if there's something to decrement
        const currentCount = tallies[selectedOutreachType][category] || 0;
        if (currentCount <= 0) {
          return; // Don't allow negative values
        }

        const targetDate = date || getTodayDateString();
        set({ isLoading: true, error: null });

        try {
          const updatedTallies = await databaseService.updateOutreachTally(
            currentUserId,
            targetDate,
            selectedOutreachType,
            category,
            -1
          );
          
          set({ tallies: updatedTallies, isLoading: false });
        } catch (error) {
          console.error('Failed to decrement tally:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update tally',
            isLoading: false 
          });
        }
      },

      resetTallies: () => {
        set({ tallies: getDefaultTallies(), error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'outreach-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedOutreachType: state.selectedOutreachType,
        // Don't persist tallies, currentUserId, or loading states
        // They should be loaded fresh from database
      }),
    }
  )
);