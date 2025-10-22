import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useOutreachStore, OutreachType, TallyCategory } from '../state/outreachStore';
import { useKPIStore } from '../state/kpiStore';
import { useAuthStore } from '../state/authStore';
import { useRoute, RouteProp } from '@react-navigation/native';
import { databaseService } from '../services/database';
import { cn } from '../utils/cn';
import { OutreachErrorBoundary } from '../components/OutreachErrorBoundary';



interface OutreachOption {
  id: OutreachType;
  label: string;
  emoji: string;
}

const outreachOptions: OutreachOption[] = [
  { id: 'doorKnocks', label: 'Door Knocks', emoji: '🏠' },
  { id: 'tagsPut', label: 'Tags Put', emoji: '🏷️' },
  { id: 'callsMade', label: 'Calls Made', emoji: '📞' },
];

interface TallyButton {
  id: TallyCategory;
  label: string;
  color: string;
  textColor: string;
}

const tallyButtons: TallyButton[] = [
  { id: 'noAnswer', label: 'No Answer', color: 'bg-gray-600', textColor: 'text-white' },
  { id: 'interested', label: 'Interested', color: 'bg-green-600', textColor: 'text-white' },
  { id: 'notInterested', label: 'Not Interested', color: 'bg-red-600', textColor: 'text-white' },
  { id: 'unqualified', label: 'Unqualified', color: 'bg-yellow-600', textColor: 'text-white' },
  { id: 'appointmentSet', label: 'Appointment Set', color: 'bg-blue-600', textColor: 'text-white' },
];

type RootStackParamList = {
  TallyOutreach: { date?: string };
};

const TallyOutreachContent = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'TallyOutreach'>>();
  const { user } = useAuthStore();
  const { updateDailyInput, getTodayInput, addDailyInput, forceReload } = useKPIStore();
  const {
    selectedOutreachType,
    tallies,
    isLoading,
    error,
    setCurrentUser,
    setSelectedOutreachType,
    loadTalliesForDate,
    incrementTally,
    decrementTally,
    clearError,
  } = useOutreachStore();

  const [showError, setShowError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize with passed date or today
    if (route.params?.date) {
      return new Date(route.params.date);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id, setCurrentUser]);

  // Load tallies when date changes
  useEffect(() => {
    const dateString = selectedDate.toISOString().split('T')[0];
    loadTalliesForDate(dateString);
  }, [selectedDate, loadTalliesForDate]);

  // Auto-save when app goes to background or component unmounts
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: any) => {
      if (
        appState.current.match(/active|foreground/) &&
        nextAppState === 'background'
      ) {
        // App is going to background, auto-save
        try {
          await syncWithDailyInput();
          console.log('Auto-saved when app went to background');
        } catch (error) {
          console.error('Failed to auto-save on background:', error);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function - auto-save when component unmounts
    return () => {
      subscription?.remove();
      // Auto-save when modal closes
      syncWithDailyInput().catch(error => {
        console.error('Failed to auto-save on unmount:', error);
      });
    };
  }, []);

  // Auto-sync whenever tallies state changes
  useEffect(() => {
    if (tallies && user?.id) {
      const timeoutId = setTimeout(async () => {
        try {
          await syncWithDailyInput();
          
          // Also trigger a quick cloud sync for real-time cross-device sync
          const { cloudSyncService } = await import('../services/cloudSyncService');
          await cloudSyncService.quickSync(user.id);
          
          console.log('Auto-synced tallies to cloud');
        } catch (error) {
          console.error('Failed to auto-sync after tallies change:', error);
        }
      }, 500); // Small delay to batch rapid changes

      return () => clearTimeout(timeoutId);
    }
  }, [tallies]);

  // Auto-save periodically (every 30 seconds) as backup
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await syncWithDailyInput();
        console.log('Auto-saved periodically');
      } catch (error) {
        console.error('Failed to auto-save periodically:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleOutreachTypeChange = (type: OutreachType) => {
    setSelectedOutreachType(type);
    // Sync will happen automatically via useEffect
  };

  const handleTallyIncrement = async (category: TallyCategory) => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      console.log('Incrementing:', { selectedOutreachType, category, dateString });
      await incrementTally(category, dateString);
      // Sync will happen automatically via useEffect when tallies state changes
    } catch (error) {
      console.error('Failed to increment tally:', error);
    }
  };

  const handleTallyDecrement = async (category: TallyCategory) => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      console.log('Decrementing:', { selectedOutreachType, category, dateString });
      await decrementTally(category, dateString);
      // Sync will happen automatically via useEffect when tallies state changes
    } catch (error) {
      console.error('Failed to decrement tally:', error);
    }
  };

  const syncWithDailyInput = async () => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      
      // Get the latest tallies from the database to ensure we have fresh data
      if (user?.id) {
        const latestTallies = await databaseService.getOutreachTallies(user.id, dateString);
        
        // Calculate totals from the fresh database data
        const doorKnocksTotal = (Object.values(latestTallies.doorKnocks || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);
        const tagsPutTotal = (Object.values(latestTallies.tagsPut || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);  
        const callsMadeTotal = (Object.values(latestTallies.callsMade || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);
        
        // Total outreach attempts should be the sum of all types
        const totalOutreachAttempts = doorKnocksTotal + tagsPutTotal + callsMadeTotal;
        
        console.log('Syncing with fresh data:', {
          doorKnocksTotal,
          tagsPutTotal,
          callsMadeTotal,
          totalOutreachAttempts
        });

        // Check if an input already exists for this date
        const existingInput = await databaseService.getTodayInput(user.id);
        const inputsForDate = await databaseService.getDailyInputs(user.id, dateString, dateString);
        const existingInputForDate = inputsForDate.length > 0 ? inputsForDate[0] : null;

        const updateData = {
          outreachDoorKnocks: doorKnocksTotal,
          outreachTagsPut: tagsPutTotal,
          outreachCallsMade: callsMadeTotal,
          doorsKnocked: totalOutreachAttempts,
          tallyCounts: {
            doorKnocks_noAnswer: latestTallies.doorKnocks?.noAnswer || 0,
            doorKnocks_interested: latestTallies.doorKnocks?.interested || 0,
            doorKnocks_notInterested: latestTallies.doorKnocks?.notInterested || 0,
            doorKnocks_unqualified: latestTallies.doorKnocks?.unqualified || 0,
            doorKnocks_appointmentSet: latestTallies.doorKnocks?.appointmentSet || 0,
            tagsPut_noAnswer: latestTallies.tagsPut?.noAnswer || 0,
            tagsPut_interested: latestTallies.tagsPut?.interested || 0,
            tagsPut_notInterested: latestTallies.tagsPut?.notInterested || 0,
            tagsPut_unqualified: latestTallies.tagsPut?.unqualified || 0,
            tagsPut_appointmentSet: latestTallies.tagsPut?.appointmentSet || 0,
            callsMade_noAnswer: latestTallies.callsMade?.noAnswer || 0,
            callsMade_interested: latestTallies.callsMade?.interested || 0,
            callsMade_notInterested: latestTallies.callsMade?.notInterested || 0,
            callsMade_unqualified: latestTallies.callsMade?.unqualified || 0,
            callsMade_appointmentSet: latestTallies.callsMade?.appointmentSet || 0,
          },
        };

        if (existingInputForDate) {
          // Update existing input
          await updateDailyInput(existingInputForDate.id, updateData);
          console.log('Successfully updated existing daily input with total:', totalOutreachAttempts);
        } else {
          // Create new input
          const inputData = {
            date: dateString,
            appointments: 0,
            appointmentHolds: 0,
            closedDeals: 0,
            accountsServiced: 0,
            hoursWorked: 0,
            notes: '',
            ...updateData,
          };
          
          await addDailyInput(inputData);
          console.log('Successfully created new daily input with total:', totalOutreachAttempts);
        }
        
        // Force reload KPI store data to ensure all metrics are up to date
        await forceReload();
      }
    } catch (error) {
      console.error('Failed to sync with daily input:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // New tallies will be loaded automatically via useEffect
    }
  };

  const getCurrentTallies = () => {
    return tallies[selectedOutreachType] || { noAnswer: 0, interested: 0, notInterested: 0, unqualified: 0, appointmentSet: 0 };
  };

  const getTotalOutreachAttempts = () => {
    const currentTallies = getCurrentTallies();
    return (Object.values(currentTallies) as number[]).reduce((sum, count) => sum + (count || 0), 0);
  };

  const getAllOutreachAttempts = () => {
    // Ensure we have valid tallies object
    if (!tallies) return 0;
    
    const doorKnocksTotal = (Object.values(tallies.doorKnocks || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);
    const tagsPutTotal = (Object.values(tallies.tagsPut || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);  
    const callsMadeTotal = (Object.values(tallies.callsMade || {}) as number[]).reduce((sum, count) => sum + (count || 0), 0);
    
    console.log('Calculating totals:', { doorKnocksTotal, tagsPutTotal, callsMadeTotal, tallies });
    return doorKnocksTotal + tagsPutTotal + callsMadeTotal;
  };

  const getSelectedOutreachOption = () => {
    return outreachOptions.find(option => option.id === selectedOutreachType);
  };

  return (
    <View className="flex-1 bg-gray-900">
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* Date Selection */}
        <View className="px-6 py-4 border-b border-gray-700">
          <Text className="text-lg font-semibold text-white mb-3">
            Select Date:
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={20} color="#ff8c00" />
              <Text className="text-white font-medium ml-3">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Error Display */}
        {showError && error && (
          <View className="mx-6 mt-4 p-4 bg-red-600/20 border border-red-600 rounded-lg">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Input Selector */}
        <View className="px-6 py-6">
          <Text className="text-lg font-semibold text-white mb-4">
            For Outreach – Ways the Action Was Performed:
          </Text>
          
          <View className="space-y-3">
            {outreachOptions.map((option, index) => (
              <Pressable
                key={option.id}
                onPress={() => handleOutreachTypeChange(option.id)}
                className={cn(
                  "flex-row items-center p-4 rounded-lg border-2 transition-colors",
                  selectedOutreachType === option.id
                    ? "bg-orange-600/20 border-orange-500"
                    : "bg-gray-800 border-gray-600"
                )}
              >
                <View className={cn(
                  "w-6 h-6 rounded-full border-2 mr-4 items-center justify-center",
                  selectedOutreachType === option.id
                    ? "border-orange-500 bg-orange-500"
                    : "border-gray-500"
                )}>
                  {selectedOutreachType === option.id && (
                    <View className="w-3 h-3 rounded-full bg-white" />
                  )}
                </View>
                <Text className="text-2xl mr-3">{option.emoji}</Text>
                <Text className={cn(
                  "text-lg font-medium",
                  selectedOutreachType === option.id ? "text-orange-400" : "text-white"
                )}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tally Buttons */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-white mb-4">
            {getSelectedOutreachOption()?.emoji} {getSelectedOutreachOption()?.label} Results:
          </Text>
          
          <View className="space-y-4">
            {tallyButtons.map((button, index) => {
              const currentCount = getCurrentTallies()[button.id] || 0;
              
              return (
                <View
                  key={button.id}
                  className={cn(
                    "flex-row items-center justify-between p-4 rounded-lg mb-3",
                    button.color,
                    isLoading && "opacity-50"
                  )}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Text className={cn("text-lg font-semibold", button.textColor)}>
                    {button.label}
                  </Text>
                  <View className="flex-row items-center">
                    {/* Subtract Button */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTallyDecrement(button.id);
                      }}
                      disabled={isLoading || currentCount <= 0}
                      className={cn(
                        "w-8 h-8 rounded-full items-center justify-center mr-2",
                        currentCount <= 0 ? "bg-gray-500/30" : "bg-white/20"
                      )}
                    >
                      <Ionicons 
                        name="remove" 
                        size={18} 
                        color={currentCount <= 0 ? "#9ca3af" : "white"} 
                      />
                    </Pressable>
                    
                    {/* Count Display */}
                    <View className="bg-white/20 px-3 py-1 rounded-full mr-2">
                      <Text className={cn("text-lg font-bold", button.textColor)}>
                        {currentCount}
                      </Text>
                    </View>
                    
                    {/* Add Button */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTallyIncrement(button.id);
                      }}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-full items-center justify-center bg-white/30"
                    >
                      <Ionicons name="add" size={18} color="white" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Total Summary */}
        <View className="mx-6 mt-6 p-6 bg-gray-800 rounded-lg border border-gray-600">
          <Text className="text-white text-center text-lg font-medium mb-2">
            Total Outreach Attempts Today
          </Text>
          <Text className="text-white text-center text-lg mb-2">
            ({getSelectedOutreachOption()?.emoji} {getSelectedOutreachOption()?.label})
          </Text>
          <View className="items-center mb-4">
            <View className="bg-orange-600 px-6 py-3 rounded-full">
              <Text className="text-white text-3xl font-bold">
                {getTotalOutreachAttempts()}
              </Text>
            </View>
          </View>
          
          {/* All Types Summary */}
          <View className="border-t border-gray-600 pt-4">
            <Text className="text-gray-300 text-center text-sm mb-2">
              All Outreach Types Total: {getAllOutreachAttempts()}
            </Text>
            <View className="flex-row items-center justify-center">
              {isLoading ? (
                <>
                  <Ionicons name="sync" size={16} color="#60a5fa" />
                  <Text className="text-blue-400 text-sm ml-2">
                    Saving...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text className="text-green-400 text-sm ml-2">
                    Auto-saved to Daily Input
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View className="mx-6 mt-4 p-4 bg-blue-600/20 border border-blue-600 rounded-lg">
            <Text className="text-blue-400 text-center">Saving...</Text>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

export const TallyOutreachScreen = () => {
  return (
    <OutreachErrorBoundary>
      <TallyOutreachContent />
    </OutreachErrorBoundary>
  );
};