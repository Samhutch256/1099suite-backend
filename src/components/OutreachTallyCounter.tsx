import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useKPIStore } from '../state/kpiStore';
import { useAuthStore } from '../state/authStore';

interface TallyItem {
  id: string;
  label: string;
  count: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface OutreachTallyCounterProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tallyCounts: { [key: string]: number }) => void;
  initialCounts?: { [key: string]: number };
  selectedDate?: Date;
}

export const OutreachTallyCounter: React.FC<OutreachTallyCounterProps> = ({
  visible,
  onClose,
  onSave,
  initialCounts = {},
  selectedDate = new Date(),
}) => {
  const { user } = useAuthStore();
  const { addDailyInput, updateDailyInput, dailyInputs, getTodayInput } = useKPIStore();
  const [tallyItems, setTallyItems] = useState<TallyItem[]>([
    {
      id: 'noAnswer',
      label: 'No Answer / Not Home',
      count: initialCounts.noAnswer || 0,
      color: 'bg-gray-500',
      icon: 'home-outline',
    },
    {
      id: 'notInterested',
      label: 'Not Interested',
      count: initialCounts.notInterested || 0,
      color: 'bg-red-500',
      icon: 'close-circle',
    },
    {
      id: 'interested',
      label: 'Interested',
      count: initialCounts.interested || 0,
      color: 'bg-yellow-500',
      icon: 'happy',
    },
    {
      id: 'appointmentSet',
      label: 'Set',
      count: initialCounts.appointmentSet || 0,
      color: 'bg-green-500',
      icon: 'calendar',
    },
    {
      id: 'unqualified',
      label: 'Unqualified',
      count: initialCounts.unqualified || 0,
      color: 'bg-orange-500',
      icon: 'warning',
    },
  ]);

  // Update counts when initialCounts change
  useEffect(() => {
    setTallyItems(prev => 
      prev.map(item => ({
        ...item,
        count: initialCounts[item.id] || 0,
      }))
    );
  }, [initialCounts]);

  const incrementCount = (id: string) => {
    setTallyItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, count: item.count + 1 } : item
      )
    );
  };

  const decrementCount = (id: string) => {
    setTallyItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, count: Math.max(0, item.count - 1) } : item
      )
    );
  };

  const resetCount = (id: string) => {
    setTallyItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, count: 0 } : item
      )
    );
  };

  const handleSave = () => {
    const counts: { [key: string]: number } = {};
    tallyItems.forEach(item => {
      counts[item.id] = item.count;
    });
    onSave(counts);
    onClose();
  };

  const getTotalCount = () => {
    return tallyItems.reduce((total, item) => total + item.count, 0);
  };

  const renderTallyMarks = (count: number, color: string) => {
    const groups = Math.floor(count / 5);
    const remainder = count % 5;
    const marks = [];

    // Add groups of 5 (with diagonal line)
    for (let i = 0; i < groups; i++) {
      marks.push(
        <View key={`group-${i}`} className="relative mr-2">
          <View className="flex-row space-x-1">
            {[...Array(4)].map((_, j) => (
              <View
                key={j}
                className={cn("w-1 h-8 rounded-full", color.replace('bg-', 'bg-'))}
              />
            ))}
          </View>
          {/* Diagonal line */}
          <View
            className={cn("absolute top-2 left-0 w-8 h-0.5 rounded-full", color.replace('bg-', 'bg-'))}
            style={{ transform: [{ rotate: '-20deg' }] }}
          />
        </View>
      );
    }

    // Add remaining marks
    if (remainder > 0) {
      marks.push(
        <View key="remainder" className="flex-row space-x-1">
          {[...Array(remainder)].map((_, i) => (
            <View
              key={i}
              className={cn("w-1 h-8 rounded-full", color.replace('bg-', 'bg-'))}
            />
          ))}
        </View>
      );
    }

    return marks;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1f2e', '#2d3748', '#4a5568']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="home" size={16} color="white" />
                </View>
                <Text className="text-xl font-bold text-white">Outreach Tally</Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <Text className="text-gray-300 mt-2">
              Tap + to count each interaction. Total: {getTotalCount()}
            </Text>
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            className="px-6 py-6" 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {tallyItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 100)}
                className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 mb-4"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View className={cn("w-10 h-10 rounded-full items-center justify-center mr-3", item.color)}>
                      <Ionicons name={item.icon} size={20} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-lg">{item.label}</Text>
                      <Text className="text-gray-400">Count: {item.count}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <Pressable
                      onPress={() => decrementCount(item.id)}
                      className="w-10 h-10 bg-gray-600 rounded-full items-center justify-center"
                      disabled={item.count === 0}
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={20} color={item.count === 0 ? "#6b7280" : "white"} />
                    </Pressable>
                    <Pressable
                      onPress={() => incrementCount(item.id)}
                      className={cn("w-10 h-10 rounded-full items-center justify-center", item.color)}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </Pressable>
                  </View>
                </View>

                {/* Tally Marks Display */}
                <View className="bg-gray-900/50 rounded-lg p-4 min-h-[60px] flex-row items-center flex-wrap">
                  {item.count === 0 ? (
                    <Text className="text-gray-500 italic">No marks yet</Text>
                  ) : (
                    renderTallyMarks(item.count, item.color)
                  )}
                </View>

                {/* Reset button for individual item */}
                {item.count > 0 && (
                  <Pressable
                    onPress={() => resetCount(item.id)}
                    className="mt-2 self-end"
                  >
                    <Text className="text-gray-400 text-sm">Reset</Text>
                  </Pressable>
                )}
              </Animated.View>
            ))}
          </ScrollView>

          {/* Save Button */}
          <View className="px-6 py-4 border-t border-gray-600">
            <Pressable
              onPress={handleSave}
              className="bg-blue-500 rounded-xl py-4 flex-row items-center justify-center"
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Save Tally ({getTotalCount()} total)
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};