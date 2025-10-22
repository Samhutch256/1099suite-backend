import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

interface SimpleFilters {
  timePeriod: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
  status: 'all' | 'active' | 'inactive';
  searchQuery: string;
}

interface SimpleLeadsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SimpleFilters) => void;
  currentFilters: SimpleFilters;
}

const RadioButton: React.FC<{
  label: string;
  value: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  icon?: string;
}> = ({ label, value, selectedValue, onSelect, icon }) => (
  <Pressable
    onPress={() => onSelect(value)}
    className={`flex-row items-center p-3 rounded-lg mb-2 ${
      selectedValue === value ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
    }`}
  >
    <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
      selectedValue === value ? 'border-blue-500' : 'border-gray-300'
    }`}>
      {selectedValue === value && (
        <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      )}
    </View>
    {icon && (
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedValue === value ? '#3b82f6' : '#6b7280'} 
        className="mr-2"
      />
    )}
    <Text className={`flex-1 ${selectedValue === value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
      {label}
    </Text>
  </Pressable>
);

const ToggleButton: React.FC<{
  label: string;
  value: string;
  selectedValue: string;
  onSelect: (value: string) => void;
}> = ({ label, value, selectedValue, onSelect }) => (
  <Pressable
    onPress={() => onSelect(value)}
    className={`flex-1 py-2 px-4 rounded-lg mr-2 ${
      selectedValue === value ? 'bg-blue-500' : 'bg-gray-100'
    }`}
  >
    <Text className={`text-sm font-medium text-center ${
      selectedValue === value ? 'text-white' : 'text-gray-700'
    }`}>
      {label}
    </Text>
  </Pressable>
);

export const SimpleLeadsFilterSheet: React.FC<SimpleLeadsFilterSheetProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<SimpleFilters>(currentFilters);

  // Sync local filters with current filters when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      timePeriod: 'all',
      status: 'all',
      searchQuery: '',
    });
  };

  const timePeriodOptions = [
    { value: 'all', label: 'All Time', icon: 'infinite' },
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'week', label: 'This Week', icon: 'calendar' },
    { value: 'month', label: 'This Month', icon: 'calendar' },
    { value: 'quarter', label: 'This Quarter', icon: 'calendar' },
    { value: 'year', label: 'This Year', icon: 'calendar' },
  ];

  const hasActiveFilters = () => {
    return localFilters.timePeriod !== 'all' || 
           localFilters.status !== 'all' || 
           localFilters.searchQuery.trim() !== '';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '70%', minHeight: '40%' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Filter Leads</Text>
              <View className="flex-row items-center space-x-2">
                {hasActiveFilters() && (
                  <Pressable
                    onPress={handleReset}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg"
                  >
                    <Text className="text-sm text-gray-600">Clear All</Text>
                  </Pressable>
                )}
                <Pressable onPress={onClose} className="p-2">
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>
            </View>

            {/* Content */}
            <ScrollView 
              className="px-4 py-4" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Search Section */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">Search</Text>
                <TextInput
                  placeholder="Search leads by name, company, or email..."
                  value={localFilters.searchQuery}
                  onChangeText={(text) => setLocalFilters(prev => ({ ...prev, searchQuery: text }))}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Time Period Section */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">Time Period</Text>
                {timePeriodOptions.map((option) => (
                  <RadioButton
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    selectedValue={localFilters.timePeriod}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, timePeriod: value as any }))}
                    icon={option.icon}
                  />
                ))}
              </View>

              {/* Status Section */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">Status</Text>
                <View className="flex-row">
                  <ToggleButton
                    label="All"
                    value="all"
                    selectedValue={localFilters.status}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                  />
                  <ToggleButton
                    label="Active"
                    value="active"
                    selectedValue={localFilters.status}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                  />
                  <ToggleButton
                    label="Inactive"
                    value="inactive"
                    selectedValue={localFilters.status}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View className="p-4 border-t border-gray-200 bg-white">
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={handleReset}
                  className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-700 font-semibold">Reset</Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">Apply Filters</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
