import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SubInput,
  Outcome,
  SUB_INPUT_OPTIONS,
  OUTCOME_OPTIONS,
  getTodayTallies,
  incrementTally,
  decrementTally,
  resetTalliesForSubInput,
  formatTallyCounts,
  getSubInputLabel,
  getOutcomeLabel,
  TallyCounts,
} from '../services/talliesService';

interface TallyModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  inputDate: Date;
  lastUsedSubInput?: SubInput;
}

export const TallyModal: React.FC<TallyModalProps> = ({
  visible,
  onClose,
  userId,
  inputDate,
  lastUsedSubInput = 'door_knocks',
}) => {
  const [selectedSubInput, setSelectedSubInput] = useState<SubInput>(lastUsedSubInput);
  const [selectedDate, setSelectedDate] = useState<Date>(inputDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tallyCounts, setTallyCounts] = useState<TallyCounts>({});
  const [loading, setLoading] = useState(false);
  const [optimisticCounts, setOptimisticCounts] = useState<TallyCounts>({});

  // Load tallies when modal opens, sub-input changes, or date changes
  useEffect(() => {
    if (visible && userId) {
      loadTallies();
    }
  }, [visible, selectedSubInput, selectedDate, userId]);

  const loadTallies = async () => {
    setLoading(true);
    try {
      const { data, error } = await getTodayTallies(userId, selectedSubInput, selectedDate);
      if (error) {
        console.error('Error loading tallies:', error);
        return;
      }
      
      const counts = formatTallyCounts(data);
      setTallyCounts(counts);
      setOptimisticCounts(counts);
    } catch (error) {
      console.error('Error loading tallies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async (outcome: Outcome) => {
    // Optimistic update
    const newCounts = { ...optimisticCounts };
    newCounts[outcome] = (newCounts[outcome] || 0) + 1;
    setOptimisticCounts(newCounts);

    try {
      const { error } = await incrementTally(userId, selectedSubInput, outcome, selectedDate);
      if (error) {
        console.error('Error incrementing tally:', error);
        // Revert optimistic update
        setOptimisticCounts(tallyCounts);
        Alert.alert('Error', 'Failed to update tally. Please try again.');
      } else {
        // Update the actual counts
        setTallyCounts(newCounts);
      }
    } catch (error) {
      console.error('Error incrementing tally:', error);
      setOptimisticCounts(tallyCounts);
      Alert.alert('Error', 'Failed to update tally. Please try again.');
    }
  };

  const handleDecrement = async (outcome: Outcome) => {
    const currentCount = optimisticCounts[outcome] || 0;
    if (currentCount <= 0) return;

    // Optimistic update
    const newCounts = { ...optimisticCounts };
    newCounts[outcome] = Math.max(0, currentCount - 1);
    setOptimisticCounts(newCounts);

    try {
      const { error } = await decrementTally(userId, selectedSubInput, outcome, selectedDate);
      if (error) {
        console.error('Error decrementing tally:', error);
        // Revert optimistic update
        setOptimisticCounts(tallyCounts);
        Alert.alert('Error', 'Failed to update tally. Please try again.');
      } else {
        // Update the actual counts
        setTallyCounts(newCounts);
      }
    } catch (error) {
      console.error('Error decrementing tally:', error);
      setOptimisticCounts(tallyCounts);
      Alert.alert('Error', 'Failed to update tally. Please try again.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Tallies',
      `Are you sure you want to reset all tallies for "${getSubInputLabel(selectedSubInput)}" on ${formatDate(selectedDate)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
                          try {
                const { error } = await resetTalliesForSubInput(userId, selectedSubInput, selectedDate);
              if (error) {
                console.error('Error resetting tallies:', error);
                Alert.alert('Error', 'Failed to reset tallies. Please try again.');
              } else {
                // Reset counts to 0
                const resetCounts = formatTallyCounts([]);
                setTallyCounts(resetCounts);
                setOptimisticCounts(resetCounts);
              }
            } catch (error) {
              console.error('Error resetting tallies:', error);
              Alert.alert('Error', 'Failed to reset tallies. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        {/* Header */}
        <View style={{ 
          backgroundColor: 'white', 
          paddingTop: 60, 
          paddingBottom: 20, 
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1f2e' }}>
              Tally
            </Text>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          {/* Date and Sub-input info */}
          <Text style={{ 
            fontSize: 14, 
            color: '#6b7280', 
            marginTop: 8,
            fontWeight: '500',
          }}>
            {isToday(selectedDate) ? 'Today' : formatDate(selectedDate)} • {getSubInputLabel(selectedSubInput)}
          </Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* Date Selector */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: 12 
            }}>
              Date
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#f3f4f6' : 'white',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: pressed ? '#d1d5db' : '#e5e7eb',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" style={{ marginRight: 8 }} />
                <Text style={{ 
                  fontSize: 16, 
                  color: '#374151',
                  fontWeight: '500',
                }}>
                  {formatDate(selectedDate)}
                </Text>
                {isToday(selectedDate) && (
                  <View style={{
                    backgroundColor: '#dcfce7',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: '#16a34a',
                      fontWeight: '600',
                    }}>
                      TODAY
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Sub-input Selector */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: 12 
            }}>
              Sub-input
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {SUB_INPUT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedSubInput(option.value)}
                  style={{
                    backgroundColor: selectedSubInput === option.value ? '#FF9900' : 'white',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: selectedSubInput === option.value ? '#FF9900' : '#e5e7eb',
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: selectedSubInput === option.value ? 'white' : '#374151',
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#FF9900" />
              <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading tallies...</Text>
            </View>
          )}

          {/* Outcome Pills */}
          {!loading && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: 12 
              }}>
                Outcomes
              </Text>
              <View style={{ gap: 12 }}>
                {OUTCOME_OPTIONS.map((option) => {
                  const count = optimisticCounts[option.value] || 0;
                  return (
                    <View
                      key={option.value}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: '500', 
                          color: '#374151',
                          flex: 1,
                        }}>
                          {option.label}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* Count Display */}
                          <View style={{
                            backgroundColor: '#f3f4f6',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            minWidth: 40,
                            alignItems: 'center',
                          }}>
                            <Text style={{ 
                              fontSize: 16, 
                              fontWeight: '600', 
                              color: '#374151' 
                            }}>
                              {count}
                            </Text>
                          </View>

                          {/* Decrement Button */}
                          <Pressable
                            onPress={() => handleDecrement(option.value)}
                            onLongPress={() => handleDecrement(option.value)}
                            disabled={count <= 0}
                            style={{
                              backgroundColor: count <= 0 ? '#f3f4f6' : '#fee2e2',
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: count <= 0 ? 0.5 : 1,
                            }}
                          >
                            <Ionicons 
                              name="remove" 
                              size={16} 
                              color={count <= 0 ? '#9ca3af' : '#dc2626'} 
                            />
                          </Pressable>

                          {/* Increment Button */}
                          <Pressable
                            onPress={() => handleIncrement(option.value)}
                            style={{
                              backgroundColor: '#dcfce7',
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="add" size={16} color="#16a34a" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={{ 
          backgroundColor: 'white', 
          padding: 20, 
          borderTopWidth: 1, 
          borderTopColor: '#e5e7eb',
          gap: 12,
        }}>
          <Pressable
            onPress={handleReset}
            style={{
              backgroundColor: '#fee2e2',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ 
              color: '#dc2626', 
              fontWeight: '600', 
              fontSize: 16 
            }}>
              Reset This Sub-input
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: '#FF9900',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontWeight: '600', 
              fontSize: 16 
            }}>
              Close
            </Text>
          </Pressable>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              margin: 20,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 10,
            }}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()} // Can't select future dates
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={{
                    backgroundColor: '#FF9900',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginTop: 16,
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '600', 
                    fontSize: 16 
                  }}>
                    Done
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};
