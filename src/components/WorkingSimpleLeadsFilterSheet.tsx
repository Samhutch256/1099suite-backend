import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { WorkingSimpleLeadsFilters } from '../hooks/useWorkingSimpleLeadsFilters';

interface WorkingSimpleLeadsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: WorkingSimpleLeadsFilters) => void;
  currentFilters: WorkingSimpleLeadsFilters;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    minHeight: '50%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioButtonSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  radioButtonUnselected: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radioIcon: {
    marginRight: 12,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#1d4ed8',
  },
  radioTextUnselected: {
    color: '#374151',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pillUnselected: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: 'white',
  },
  pillTextUnselected: {
    color: '#6b7280',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#374151',
  },
  applyButtonText: {
    color: 'white',
  },
  customDateSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  customDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});

const RadioButton: React.FC<{
  label: string;
  value: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  icon?: string;
}> = ({ label, value, selectedValue, onSelect, icon }) => (
  <Pressable
    onPress={() => onSelect(value)}
    style={[
      styles.radioButton,
      selectedValue === value ? styles.radioButtonSelected : styles.radioButtonUnselected,
    ]}
  >
    {icon && (
      <Ionicons
        name={icon as any}
        size={20}
        color={selectedValue === value ? '#3b82f6' : '#6b7280'}
        style={styles.radioIcon}
      />
    )}
    <Text
      style={[
        styles.radioText,
        selectedValue === value ? styles.radioTextSelected : styles.radioTextUnselected,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const MultiSelectPill: React.FC<{
  label: string;
  value: string;
  selected: boolean;
  onToggle: (value: string) => void;
}> = ({ label, value, selected, onToggle }) => (
  <Pressable
    onPress={() => onToggle(value)}
    style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
  >
    <Text
      style={[
        styles.pillText,
        selected ? styles.pillTextSelected : styles.pillTextUnselected,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

export const WorkingSimpleLeadsFilterSheet: React.FC<WorkingSimpleLeadsFilterSheetProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<WorkingSimpleLeadsFilters>(currentFilters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
      searchQuery: '',
      timePeriod: 'all',
      customStartDate: undefined,
      customEndDate: undefined,
      dateField: 'created_at',
      sources: [],
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setLocalFilters(prev => ({ ...prev, customStartDate: dateString }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setLocalFilters(prev => ({ ...prev, customEndDate: dateString }));
    }
  };

  const timePeriodOptions = [
    { value: 'all', label: 'All Time', icon: 'infinite' },
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'week', label: 'This Week', icon: 'calendar' },
    { value: 'month', label: 'This Month', icon: 'calendar' },
    { value: 'year', label: 'This Year', icon: 'calendar' },
    { value: 'custom', label: 'Custom Range', icon: 'calendar-outline' },
  ];

  const dateFieldOptions = [
    { value: 'created_at', label: 'Date Created', icon: 'add-circle' },
    { value: 'date_set', label: 'Date Set', icon: 'calendar' },
    { value: 'date_set_for', label: 'Date Set For', icon: 'time' },
  ];

  const sourceOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'door_knocks', label: 'Door Knock' },
    { value: 'referrals', label: 'Referral' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'revenue', label: 'Revenue' },
  ];

  const sortOrderOptions = [
    { value: 'desc', label: 'High to Low' },
    { value: 'asc', label: 'Low to High' },
  ];

  const toggleArrayValue = (array: string[], value: string): string[] => {
    return array.includes(value) 
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const hasActiveFilters = () => {
    return localFilters.searchQuery.trim() !== '' || 
           localFilters.timePeriod !== 'all' || 
           (localFilters.timePeriod === 'custom' && (localFilters.customStartDate || localFilters.customEndDate)) ||
           localFilters.sources.length > 0 ||
           localFilters.status !== 'all' ||
           localFilters.sortBy !== 'date' || 
           localFilters.sortOrder !== 'desc';
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Filter & Sort</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {hasActiveFilters() && (
                    <Pressable onPress={handleReset} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>Clear All</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

              <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Search Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Search</Text>
                  <TextInput
                    placeholder="Search leads..."
                    value={localFilters.searchQuery}
                    onChangeText={(text) => setLocalFilters(prev => ({ ...prev, searchQuery: text }))}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Time Period Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Time Period</Text>
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
                  
                  {/* Custom Date Range Picker */}
                  {localFilters.timePeriod === 'custom' && (
                    <View style={styles.customDateSection}>
                      <Text style={styles.customDateLabel}>Start Date</Text>
                      <Pressable
                        style={styles.datePickerButton}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Text style={styles.datePickerText}>
                          {localFilters.customStartDate || 'Select Start Date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                      </Pressable>
                      
                      <Text style={styles.customDateLabel}>End Date</Text>
                      <Pressable
                        style={styles.datePickerButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Text style={styles.datePickerText}>
                          {localFilters.customEndDate || 'Select End Date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Date Field Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Filter By Date Field</Text>
                  {dateFieldOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.dateField}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, dateField: value as any }))}
                      icon={option.icon}
                    />
                  ))}
                </View>

                {/* Sources Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lead Sources</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
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

                {/* Status Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Status</Text>
                  {statusOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.status}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, status: value as any }))}
                    />
                  ))}
                </View>

                {/* Sort Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  {sortOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.sortBy}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, sortBy: value as any }))}
                    />
                  ))}
                </View>

                {/* Sort Order Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sort Order</Text>
                  {sortOrderOptions.map((option) => (
                    <RadioButton
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selectedValue={localFilters.sortOrder}
                      onSelect={(value) => setLocalFilters(prev => ({ ...prev, sortOrder: value as any }))}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* Footer Actions */}
              <View style={styles.footer}>
                <View style={styles.footerButtons}>
                  <Pressable onPress={handleReset} style={[styles.footerButton, styles.resetButton]}>
                    <Text style={[styles.footerButtonText, styles.resetButtonText]}>Reset</Text>
                  </Pressable>
                  <Pressable onPress={handleApply} style={[styles.footerButton, styles.applyButton]}>
                    <Text style={[styles.footerButtonText, styles.applyButtonText]}>Apply</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Date Pickers - Outside Modal */}
      {showStartDatePicker && (
        <DateTimePicker
          value={localFilters.customStartDate ? new Date(localFilters.customStartDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={localFilters.customEndDate ? new Date(localFilters.customEndDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
    </>
  );
};