import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLeadsFilters, LeadsFilters, DateKey, RangePreset } from '../hooks/useLeadsFilters';
import { resolveRange, formatDateRange } from '../utils/dateRangeUtils';
import { cn } from '../utils/cn';

interface LeadsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: LeadsFilters) => void;
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text className="text-lg font-semibold text-gray-900 mb-3 px-2">{title}</Text>
);

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

const MultiSelectPill: React.FC<{
  label: string;
  value: string;
  selected: boolean;
  onToggle: (value: string) => void;
  color?: string;
}> = ({ label, value, selected, onToggle, color = 'blue' }) => (
  <Pressable
    onPress={() => onToggle(value)}
    className={`px-3 py-2 rounded-full mr-2 mb-2 ${
      selected ? `bg-${color}-500` : 'bg-gray-100'
    }`}
  >
    <Text className={`text-sm font-medium ${
      selected ? 'text-white' : 'text-gray-700'
    }`}>
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

export const LeadsFilterSheet: React.FC<LeadsFilterSheetProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const { filters, updateFilter, updateFilters, resetFilters, hasActiveFilters } = useLeadsFilters();
  const [localFilters, setLocalFilters] = useState<LeadsFilters>(filters);

  // Sync local filters with global filters when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    updateFilters(localFilters);
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      rangePreset: 'all',
      dateKey: 'created',
      stages: [],
      status: 'any',
      sources: [],
      tags: [],
      revenueType: 'total',
      followUp: 'any',
    });
  };

  const toggleArrayValue = (array: string[], value: string): string[] => {
    return array.includes(value) 
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const dateRangeOptions = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'week', label: 'This Week', icon: 'calendar' },
    { value: 'month', label: 'This Month', icon: 'calendar' },
    { value: 'quarter', label: 'This Quarter', icon: 'calendar' },
    { value: 'year', label: 'This Year', icon: 'calendar' },
    { value: 'all', label: 'All Time', icon: 'infinite' },
    { value: 'custom', label: 'Custom Range', icon: 'calendar-outline' },
  ];

  const dateFieldOptions = [
    { value: 'created', label: 'Created', icon: 'add-circle' },
    { value: 'updated', label: 'Updated', icon: 'refresh' },
    { value: 'appt_set', label: 'Appointment Set', icon: 'calendar' },
    { value: 'appt_held', label: 'Appointment Held', icon: 'checkmark-circle' },
    { value: 'deal_signed', label: 'Deal Signed', icon: 'document-text' },
    { value: 'service_completed', label: 'Service Completed', icon: 'checkmark-done-circle' },
    { value: 'follow_up_due', label: 'Follow-up Due', icon: 'time' },
  ];

  const stageOptions = [
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'contacted', label: 'Contacted', color: 'yellow' },
    { value: 'appointment_set', label: 'Appointment Set', color: 'green' },
    { value: 'appointment_held', label: 'Appointment Held', color: 'purple' },
    { value: 'negotiation', label: 'Negotiation', color: 'indigo' },
    { value: 'signed_deal', label: 'Signed Deal', color: 'emerald' },
    { value: 'site_survey_scheduled', label: 'Site Survey Scheduled', color: 'teal' },
    { value: 'site_survey_completed', label: 'Site Survey Completed', color: 'cyan' },
    { value: 'submitted_for_permits', label: 'Submitted for Permits', color: 'blue' },
    { value: 'permits_approved', label: 'Permits Approved', color: 'green' },
    { value: 'install_scheduled', label: 'Install Scheduled', color: 'orange' },
    { value: 'change_order_required', label: 'Change Order Required', color: 'amber' },
    { value: 'closed_won', label: 'Closed Won', color: 'green' },
    { value: 'closed_lost', label: 'Closed Lost', color: 'red' },
    { value: 'serviced', label: 'Serviced', color: 'emerald' },
  ];

  const sourceOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'door_knocks', label: 'Door Knock' },
    { value: 'referrals', label: 'Referral' },
    { value: 'calls_made', label: 'Calls' },
    { value: 'tags_put', label: 'Tags' },
    { value: 'ads', label: 'Ads' },
    { value: 'other', label: 'Other' },
  ];

  const revenueTypeOptions = [
    { value: 'guaranteed', label: 'Guaranteed' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'paid', label: 'Paid' },
    { value: 'total', label: 'Total' },
  ];

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
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%', minHeight: '60%' }}>
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
              style={{ height: 400 }}
              className="px-4 py-2" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >


              {/* Date Range Section */}
              <View className="mb-6">
                <SectionHeader title="Date Range" />
                
                {/* Range Preset */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Time Period</Text>
                  {dateRangeOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.rangePreset}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, rangePreset: value as RangePreset }))}
                      icon={option.icon}
                    />
                  ))}
                </View>

                {/* Custom Date Range */}
                {localFilters.rangePreset === 'custom' && (
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Custom Date Range</Text>
                    <View className="flex-row space-x-2">
                      <View className="flex-1">
                        <Text className="text-xs text-gray-600 mb-1">Start Date</Text>
                        <TextInput
                          placeholder="YYYY-MM-DD"
                          value={localFilters.start || ''}
                          onChangeText={(text) => setLocalFilters(prev => ({ ...prev, start: text }))}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-600 mb-1">End Date</Text>
                        <TextInput
                          placeholder="YYYY-MM-DD"
                          value={localFilters.end || ''}
                          onChangeText={(text) => setLocalFilters(prev => ({ ...prev, end: text }))}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Date Field Selector */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Date Field</Text>
                  {dateFieldOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.dateKey}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, dateKey: value as DateKey }))}
                      icon={option.icon}
                    />
                  ))}
                </View>
              </View>

              {/* Pipeline & Status Section */}
              <View className="mb-6">
                <SectionHeader title="Pipeline & Status" />
                
                {/* Stages */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Stages</Text>
                  <View className="flex-row flex-wrap">
                    {stageOptions.map((option) => (
                      <MultiSelectPill
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        selected={localFilters.stages.includes(option.value)}
                        onToggle={(value) => setLocalFilters(prev => ({
                          ...prev,
                          stages: toggleArrayValue(prev.stages, value)
                        }))}
                        color={option.color}
                      />
                    ))}
                  </View>
                </View>

                {/* Active/Inactive */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
                  <View className="flex-row">
                    <ToggleButton
                      label="Any"
                      value="any"
                      selectedValue={localFilters.status || 'any'}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                    />
                    <ToggleButton
                      label="Active"
                      value="active"
                      selectedValue={localFilters.status || 'any'}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                    />
                    <ToggleButton
                      label="Inactive"
                      value="inactive"
                      selectedValue={localFilters.status || 'any'}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                    />
                  </View>
                </View>
              </View>

              {/* Source & Tags Section */}
              <View className="mb-6">
                <SectionHeader title="Source & Tags" />
                
                {/* Sources */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Sources</Text>
                  <View className="flex-row flex-wrap">
                    {sourceOptions.map((option) => (
                      <MultiSelectPill
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        selected={localFilters.sources.includes(option.value)}
                        onToggle={(value) => setLocalFilters(prev => ({
                          ...prev,
                          sources: toggleArrayValue(prev.sources, value)
                        }))}
                      />
                    ))}
                  </View>
                </View>

                {/* Tags */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Tags</Text>
                  <TextInput
                    placeholder="Type to add tags..."
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    // TODO: Implement tag input with type-ahead
                  />
                  {localFilters.tags.length > 0 && (
                    <View className="flex-row flex-wrap mt-2">
                      {localFilters.tags.map((tag) => (
                        <MultiSelectPill
                          key={tag}
                          label={tag}
                          value={tag}
                          selected={true}
                          onToggle={(value) => setLocalFilters(prev => ({
                            ...prev,
                            tags: prev.tags.filter(t => t !== value)
                          }))}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Ownership Section */}
              <View className="mb-6">
                <SectionHeader title="Ownership" />
                
                {/* Owner */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Owner</Text>
                  <View className="border border-gray-300 rounded-lg px-3 py-2">
                    <Text className="text-sm text-gray-900">Current User</Text>
                  </View>
                </View>

                {/* Assignee */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Assignee (Optional)</Text>
                  <View className="border border-gray-300 rounded-lg px-3 py-2">
                    <Text className="text-sm text-gray-500">Select assignee...</Text>
                  </View>
                </View>
              </View>

              {/* Revenue Section */}
              <View className="mb-6">
                <SectionHeader title="Revenue" />
                
                {/* Revenue Type */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Revenue Type</Text>
                  <View className="flex-row flex-wrap">
                    {revenueTypeOptions.map((option) => (
                      <MultiSelectPill
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        selected={localFilters.revenueType === option.value}
                        onToggle={(value) => setLocalFilters(prev => ({ ...prev, revenueType: value as any }))}
                      />
                    ))}
                  </View>
                </View>

                {/* Min/Max Revenue */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Revenue Range</Text>
                  <View className="flex-row space-x-2">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600 mb-1">Min</Text>
                      <TextInput
                        placeholder="0"
                        value={localFilters.revenueMin?.toString() || ''}
                        onChangeText={(text) => setLocalFilters(prev => ({
                          ...prev,
                          revenueMin: parseFloat(text) || undefined
                        }))}
                        keyboardType="numeric"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600 mb-1">Max</Text>
                      <TextInput
                        placeholder="∞"
                        value={localFilters.revenueMax?.toString() || ''}
                        onChangeText={(text) => setLocalFilters(prev => ({
                          ...prev,
                          revenueMax: parseFloat(text) || undefined
                        }))}
                        keyboardType="numeric"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Follow-Up Section */}
              <View className="mb-6">
                <SectionHeader title="Follow-Up" />
                
                <View className="flex-row">
                  <ToggleButton
                    label="Any"
                    value="any"
                    selectedValue={localFilters.followUp}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, followUp: value as any }))}
                  />
                  <ToggleButton
                    label="Has Follow-up Due"
                    value="due"
                    selectedValue={localFilters.followUp}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, followUp: value as any }))}
                  />
                  <ToggleButton
                    label="No Follow-up Set"
                    value="none"
                    selectedValue={localFilters.followUp}
                    onSelect={(value) => setLocalFilters(prev => ({ ...prev, followUp: value as any }))}
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
