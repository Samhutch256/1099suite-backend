import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLeadFilterStore, LeadFilterSettings } from '../state/leadFilterStore';
import { getOrderedStages } from '../types/pipeline';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface LeadFilterSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  isSubField?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  enabled,
  onToggle,
  icon,
  color = 'bg-gray-500',
  isSubField = false,
}) => (
  <View className={cn(
    "flex-row items-center justify-between py-3 px-4 rounded-lg border",
    isSubField ? "bg-gray-50 border-gray-200 ml-4" : "bg-white border-gray-200",
    !enabled && "opacity-50"
  )}>
    <View className="flex-row items-center flex-1">
      {icon && (
        <View className={cn("w-6 h-6 rounded-full items-center justify-center mr-3", color)}>
          <Ionicons name={icon} size={12} color="white" />
        </View>
      )}
      <Text className={cn(
        "font-medium",
        isSubField ? "text-sm text-gray-700" : "text-base text-gray-900"
      )}>
        {title}
      </Text>
    </View>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
      thumbColor={enabled ? '#ffffff' : '#ffffff'}
    />
  </View>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text className="text-lg font-semibold text-gray-900 mb-3 px-2">{title}</Text>
);

export const LeadFilterSettingsModal: React.FC<LeadFilterSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { settings, updateFilterVisibility, resetToDefaults } = useLeadFilterStore();

  // Use shared pipeline constants instead of hardcoded arrays
  const orderedStages = getOrderedStages();
  const inProcessFilters = orderedStages
    .filter(stage => stage.isProgression)
    .map(stage => ({
      key: stage.key as keyof LeadFilterSettings,
      title: stage.label,
      icon: stage.icon as const,
      color: stage.color
    }));

  const cancelledFilters = [
    { key: 'cancelled_appointment' as keyof LeadFilterSettings, title: 'Cancelled Appointment', icon: 'calendar-outline' as const, color: 'bg-orange-500' },
    { key: 'held_not_interested' as keyof LeadFilterSettings, title: 'Held Not Interested', icon: 'close-outline' as const, color: 'bg-orange-500' },
    { key: 'unqualified' as keyof LeadFilterSettings, title: 'Unqualified', icon: 'ban' as const, color: 'bg-gray-500' },
    { key: 'cancelled_contract' as keyof LeadFilterSettings, title: 'Cancelled Contract', icon: 'close-circle' as const, color: 'bg-red-500' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 bg-white border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-900">Filter Settings</Text>
          <View className="flex-row items-center space-x-3">
            <Pressable
              onPress={resetToDefaults}
              className="px-4 py-2 rounded-lg bg-gray-100"
            >
              <Text className="text-gray-700 font-medium">Reset</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          className="p-6" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={true}
          alwaysBounceVertical={false}
        >
          <Text className="text-sm text-gray-600 mb-4">
            Customize which lead status filters are visible in your pipeline. Hidden filters won't appear in the filter tabs, but you can still access those leads through "All Leads".
          </Text>
          
          <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="information-circle" size={16} color="#d97706" />
              <Text className="text-sm font-semibold text-amber-800 ml-2">Important Note</Text>
            </View>
            <Text className="text-sm text-amber-700">
              Stages that are toggled OFF will not be available when creating new leads or updating existing lead statuses. If a lead is currently in a hidden stage, you'll be prompted to reassign it to a visible stage.
            </Text>
          </View>

          {/* In-Process Filters */}
          <View className="mb-6">
            <SectionHeader title="In-Process Pipeline" />
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {inProcessFilters.map((filter, index) => (
                <React.Fragment key={filter.key}>
                  <SettingItem
                    title={filter.title}
                    enabled={settings[filter.key]}
                    onToggle={(enabled) => updateFilterVisibility(filter.key, enabled)}
                    icon={filter.icon}
                    color={filter.color}
                  />
                  {index < inProcessFilters.length - 1 && (
                    <View className="h-px bg-gray-100 my-2" />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Cancelled Filters */}
          <View className="mb-6">
            <SectionHeader title="Cancelled Pipeline" />
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {cancelledFilters.map((filter, index) => (
                <React.Fragment key={filter.key}>
                  <SettingItem
                    title={filter.title}
                    enabled={settings[filter.key]}
                    onToggle={(enabled) => updateFilterVisibility(filter.key, enabled)}
                    icon={filter.icon}
                    color={filter.color}
                  />
                  {index < cancelledFilters.length - 1 && (
                    <View className="h-px bg-gray-100 my-2" />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};