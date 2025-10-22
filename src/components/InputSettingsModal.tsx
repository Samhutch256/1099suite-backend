import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInputSettingsStore, InputFieldSettings } from '../state/inputSettingsStore';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface InputSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isSubField?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  enabled,
  onToggle,
  isSubField = false,
  icon,
  color = 'bg-gray-500',
}) => (
  <View className={cn(
    "flex-row items-center justify-between py-3 px-4 rounded-lg border",
    isSubField ? "bg-gray-50 border-gray-200 ml-8" : "bg-white border-gray-200",
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

export const InputSettingsModal: React.FC<InputSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { settings, updateMainFieldSetting, updateSubFieldSetting, resetToDefaults } = useInputSettingsStore();

  const fieldConfigs = [
    {
      key: 'outreachAttempts' as keyof InputFieldSettings,
      title: 'Outreach Attempts',
      icon: 'home' as const,
      color: 'bg-blue-500',
      subFields: [
        { key: 'doorKnocks', title: 'Door Knocks', icon: 'home' as const, color: 'bg-blue-400' },
        { key: 'tagsPut', title: 'Tags Put', icon: 'pricetag' as const, color: 'bg-blue-400' },
        { key: 'callsMade', title: 'Calls Made', icon: 'call' as const, color: 'bg-blue-400' },
        { key: 'referrals', title: 'Referrals', icon: 'people' as const, color: 'bg-blue-400' },
        { key: 'inbound', title: 'Inbound', icon: 'arrow-down-circle' as const, color: 'bg-blue-400' },
      ],
    },
    {
      key: 'appointmentsSet' as keyof InputFieldSettings,
      title: 'Appointments Set',
      icon: 'calendar' as const,
      color: 'bg-green-500',
      subFields: [
        { key: 'doorKnocks', title: 'Door Knocks', icon: 'home' as const, color: 'bg-green-400' },
        { key: 'tagsPut', title: 'Tags Put', icon: 'pricetag' as const, color: 'bg-green-400' },
        { key: 'callsMade', title: 'Calls Made', icon: 'call' as const, color: 'bg-green-400' },
        { key: 'referrals', title: 'Referrals', icon: 'people' as const, color: 'bg-green-400' },
        { key: 'inbound', title: 'Inbound', icon: 'arrow-down-circle' as const, color: 'bg-green-400' },
      ],
    },
    {
      key: 'appointmentsHeld' as keyof InputFieldSettings,
      title: 'Appointments Held/Ran',
      icon: 'time' as const,
      color: 'bg-yellow-500',
      subFields: [
        { key: 'doorKnocks', title: 'Door Knocks', icon: 'home' as const, color: 'bg-yellow-400' },
        { key: 'tagsPut', title: 'Tags Put', icon: 'pricetag' as const, color: 'bg-yellow-400' },
        { key: 'callsMade', title: 'Calls Made', icon: 'call' as const, color: 'bg-yellow-400' },
        { key: 'referrals', title: 'Referrals', icon: 'people' as const, color: 'bg-yellow-400' },
        { key: 'inbound', title: 'Inbound', icon: 'arrow-down-circle' as const, color: 'bg-yellow-400' },
      ],
    },
    {
      key: 'dealsClosed' as keyof InputFieldSettings,
      title: 'Deals Closed',
      icon: 'checkmark-circle' as const,
      color: 'bg-green-600',
      subFields: [
        { key: 'doorKnocks', title: 'Door Knocks', icon: 'home' as const, color: 'bg-green-500' },
        { key: 'tagsPut', title: 'Tags Put', icon: 'pricetag' as const, color: 'bg-green-500' },
        { key: 'callsMade', title: 'Calls Made', icon: 'call' as const, color: 'bg-green-500' },
        { key: 'referrals', title: 'Referrals', icon: 'people' as const, color: 'bg-green-500' },
        { key: 'inbound', title: 'Inbound', icon: 'arrow-down-circle' as const, color: 'bg-green-500' },
      ],
    },
    {
      key: 'accountsServiced' as keyof InputFieldSettings,
      title: 'Accounts Serviced',
      icon: 'briefcase' as const,
      color: 'bg-purple-500',
      subFields: [
        { key: 'doorKnocks', title: 'Door Knocks', icon: 'home' as const, color: 'bg-purple-400' },
        { key: 'tagsPut', title: 'Tags Put', icon: 'pricetag' as const, color: 'bg-purple-400' },
        { key: 'callsMade', title: 'Calls Made', icon: 'call' as const, color: 'bg-purple-400' },
        { key: 'referrals', title: 'Referrals', icon: 'people' as const, color: 'bg-purple-400' },
        { key: 'inbound', title: 'Inbound', icon: 'arrow-down-circle' as const, color: 'bg-purple-400' },
      ],
    },
    {
      key: 'hoursWorked' as keyof InputFieldSettings,
      title: 'Hours Worked',
      icon: 'time' as const,
      color: 'bg-indigo-500',
    },
    {
      key: 'notes' as keyof InputFieldSettings,
      title: 'Notes',
      icon: 'document-text' as const,
      color: 'bg-gray-500',
    },
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
        <View className="px-6 py-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
              >
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
              <Text className="text-xl font-bold text-gray-900">Input Settings</Text>
            </View>
            <Pressable
              onPress={resetToDefaults}
              className="bg-gray-100 px-3 py-2 rounded-lg"
            >
              <Text className="text-gray-700 font-medium text-sm">Reset</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView 
          className="flex-1 px-6 py-6" 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text className="text-base font-semibold text-gray-900 mb-4">
            Customize which input fields are visible
          </Text>
          <Text className="text-sm text-gray-600 mb-6">
            Toggle main fields on/off, and customize their sub-options when enabled.
          </Text>

          <View className="space-y-4">
            {fieldConfigs.map((field) => {
              const fieldSetting = settings[field.key];
              const hasSubFields = 'subFields' in fieldSetting;

              return (
                <View key={field.key} className="mb-4">
                  {/* Main Field */}
                  <SettingItem
                    title={field.title}
                    enabled={fieldSetting.enabled}
                    onToggle={(enabled) => updateMainFieldSetting(field.key, enabled)}
                    icon={field.icon}
                    color={field.color}
                  />

                  {/* Sub Fields */}
                  {hasSubFields && fieldSetting.enabled && field.subFields && (
                    <View className="mt-2 space-y-2">
                      {field.subFields.map((subField) => (
                        <SettingItem
                          key={`${field.key}-${subField.key}`}
                          title={subField.title}
                          enabled={fieldSetting.subFields[subField.key]}
                          onToggle={(enabled) => updateSubFieldSetting(field.key, subField.key, enabled)}
                          isSubField
                          icon={subField.icon}
                          color={subField.color}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};