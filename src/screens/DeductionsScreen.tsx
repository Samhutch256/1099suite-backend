import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';
import { ExpensesContent } from '../components/ExpensesContent';
import { MileageContent } from '../components/MileageContent';
import { BankManagementModal } from '../components/BankManagementModal';

type DeductionTab = 'expenses' | 'mileage';

export const DeductionsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DeductionTab>('expenses');
  const [showBankSettings, setShowBankSettings] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const tabs = [
    {
      id: 'expenses' as const,
      label: 'Expenses & Income',
      icon: 'receipt' as const,
      description: 'Bank transactions',
    },
    {
      id: 'mileage' as const,
      label: 'Mileage',
      icon: 'car' as const,
      description: 'GPS tracking',
    },
  ];

  // Reset scroll position when switching tabs
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [activeTab]);

  const handleTabPress = (tabId: DeductionTab) => {
    setActiveTab(tabId);
  };

  return (
    <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Tab Header - Fixed at top */}
        <View className="px-6 py-4 border-b border-gray-600 bg-transparent">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-white">Deductions</Text>
            <Pressable
              onPress={() => setShowBankSettings(true)}
              className="w-10 h-10 bg-gray-700/50 rounded-full items-center justify-center"
            >
              <Ionicons name="settings" size={20} color="#9ca3af" />
            </Pressable>
          </View>
          
          <View className="flex-row bg-gray-800/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                className={cn(
                  "flex-1 flex-row items-center justify-center py-3 px-4 rounded-lg",
                  activeTab === tab.id ? "bg-purple-500" : "transparent"
                )}
              >
                <Ionicons 
                  name={tab.icon} 
                  size={20} 
                  color={activeTab === tab.id ? "#ffffff" : "#9ca3af"} 
                />
                <View className="ml-2 flex-1">
                  <Text className={cn(
                    "font-semibold text-sm",
                    activeTab === tab.id ? "text-white" : "text-gray-300"
                  )}>
                    {tab.label}
                  </Text>
                  <Text className={cn(
                    "text-xs",
                    activeTab === tab.id ? "text-purple-100" : "text-gray-400"
                  )}>
                    {tab.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={true}
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tab Content */}
          <View style={{ flex: 1 }}>
            {activeTab === 'expenses' ? <ExpensesContent /> : <MileageContent />}
          </View>
          
          {/* Bottom padding to ensure content doesn't get cut off by navigation */}
          <View className="h-20" />
        </ScrollView>

        {/* Bank Management Modal */}
        <BankManagementModal
          visible={showBankSettings}
          onClose={() => setShowBankSettings(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};
