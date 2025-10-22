import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useContractorStore, Lead } from '../state/contractorStore';
import { cn } from '../utils/cn';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getOrderedStages } from '../types/pipeline';

type RootStackParamList = {
  EditLead: { leadId: string };
  LeadDetail: { leadId: string };
  // Add other screens here as needed
};

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  required = false,
}) => (
  <View className="mb-4">
    <Text className="text-gray-900 font-medium mb-2">
      {label}
      {required && <Text className="text-red-500 ml-1">*</Text>}
    </Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      className={cn(
        "bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900",
        multiline ? "h-24 text-top" : "h-12"
      )}
    />
  </View>
);

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log(`📅 Date picker event:`, event.type, selectedDate);
    setShowPicker(false);
    
    if (event.type === 'set' && selectedDate) {
      console.log(`📅 Date selected for ${label}:`, selectedDate);
      console.log(`📅 [DateField] Setting ${label} to:`, selectedDate.toISOString());
      onChange(selectedDate);
    } else if (event.type === 'dismissed') {
      console.log(`📅 Date picker dismissed for ${label}`);
    }
  };

  const openDatePicker = () => {
    console.log(`📅 Opening date picker for ${label}`);
    setShowPicker(true);
  };

  const clearDate = () => {
    console.log(`📅 Clearing date for ${label}`);
    console.log(`📅 [DateField] Clearing ${label}`);
    onChange(null);
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-900 font-medium mb-2">
        {label}
      </Text>
      
      <Pressable
        onPress={openDatePicker}
        className="bg-white border border-gray-200 rounded-xl px-4 py-3 h-12 flex-row items-center justify-between"
      >
        <Text className={`text-base ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? formatDate(value) : "Select date"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
      </Pressable>
      
      {value && (
        <Pressable
          onPress={clearDate}
          className="mt-2"
        >
          <Text className="text-red-500 text-sm">Clear date</Text>
        </Pressable>
      )}

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

interface StatusSelectorProps {
  selectedStatus: Lead['status'];
  onStatusChange: (status: Lead['status']) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  selectedStatus,
  onStatusChange,
}) => {
  const orderedStages = getOrderedStages();
  
  // Split stages into Active and Inactive sections
  const activeStages = orderedStages.filter(stage => stage.isProgression);
  const inactiveStages = orderedStages.filter(stage => stage.isCancellation);

  const renderStageOption = (stage: any) => ({
    key: stage.key,
    label: stage.label,
    description: stage.description,
    icon: stage.icon,
    color: stage.color
  });

  const renderStageItem = (option: any) => (
    <Pressable
      key={option.key}
      onPress={() => onStatusChange(option.key)}
      className={cn(
        "flex-row items-center p-4 rounded-xl border",
        selectedStatus === option.key ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
      )}
    >
      <View className={cn(
        "w-10 h-10 rounded-full items-center justify-center mr-4",
        selectedStatus === option.key ? option.color : "bg-gray-300"
      )}>
        <Ionicons 
          name={option.icon} 
          size={18} 
          color={selectedStatus === option.key ? "white" : "#6b7280"} 
        />
      </View>
      <View className="flex-1">
        <Text className={cn(
          "font-medium text-base",
          selectedStatus === option.key ? "text-green-700" : "text-gray-700"
        )}>
          {option.label}
        </Text>
        <Text className="text-sm text-gray-600 mt-1">
          {option.description}
        </Text>
      </View>
      <View className={cn(
        "w-6 h-6 rounded-full border-2 items-center justify-center",
        selectedStatus === option.key ? "bg-green-500 border-green-500" : "border-gray-300"
      )}>
        {selectedStatus === option.key && (
          <Ionicons name="checkmark" size={14} color="white" />
        )}
      </View>
    </Pressable>
  );

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-6">
        <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="trending-up" size={16} color="#10b981" />
        </View>
        <Text className="text-lg font-semibold text-gray-900">Status / Pipeline Stage</Text>
      </View>
      
      <Text className="text-sm text-gray-600 mb-4">
        Current stage in the sales pipeline
      </Text>

      {/* Active Stages Section */}
      <View className="mb-6">
        <View className="flex-row items-center mb-4">
          <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-2">
            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
          </View>
          <Text className="text-base font-semibold text-gray-900">Active</Text>
        </View>
        <View className="space-y-3">
          {activeStages.map(stage => renderStageItem(renderStageOption(stage)))}
        </View>
      </View>

      {/* Divider */}
      <View className="border-t border-gray-200 mb-6" />

      {/* Inactive Stages Section */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center mr-2">
            <Ionicons name="close-circle" size={12} color="#6b7280" />
          </View>
          <Text className="text-base font-semibold text-gray-700">Inactive</Text>
        </View>
        <View className="space-y-3">
          {inactiveStages.map(stage => renderStageItem(renderStageOption(stage)))}
        </View>
      </View>
    </View>
  );
};

type EditLeadScreenProps = NativeStackScreenProps<RootStackParamList, 'EditLead'>;

export const EditLeadScreen: React.FC<EditLeadScreenProps> = ({ navigation, route }) => {
  const { leadId } = route.params;
  const { leads, updateLead } = useContractorStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Find the lead to edit
  const existingLead = leads.find(lead => lead.id === leadId);
  

  
  // Split the name into first and last name
  const [firstName, ...lastNameParts] = (existingLead?.name || '').split(' ');
  const lastName = lastNameParts.join(' ');

  const [formData, setFormData] = useState({
    firstName: firstName || '',
    lastName: lastName || '',
    email: existingLead?.email || '',
    phone: existingLead?.phone || '',
    company: existingLead?.company || '',
    address: existingLead?.address || '',
    status: existingLead?.status || 'new' as Lead['status'],
    value: existingLead?.value?.toString() || '',
    source: existingLead?.source || '',
    notes: existingLead?.notes || '',
  });

  // Helper function to safely parse date strings from database
  const parseDateFromDatabase = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    
    // Handle "YYYY-MM-DD" format from database
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    
    // Fallback to regular Date parsing
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const [dateSet, setDateSet] = useState<Date | null>(
    parseDateFromDatabase(existingLead?.dateSet || existingLead?.appointmentSetOnDate)
  );
  const [dateSetFor, setDateSetFor] = useState<Date | null>(
    parseDateFromDatabase(existingLead?.dateSetFor || existingLead?.appointmentDate)
  );

  // Add debugging for date state changes
  useEffect(() => {
    console.log('📅 [EditLead] Initial date state:', {
      dateSet: dateSet?.toISOString(),
      dateSetFor: dateSetFor?.toISOString(),
      existingLeadDateSet: existingLead?.dateSet,
      existingLeadDateSetFor: existingLead?.dateSetFor
    });
  }, []);

  // Track date state changes
  useEffect(() => {
    console.log('📅 [EditLead] dateSet changed:', dateSet?.toISOString());
  }, [dateSet]);

  useEffect(() => {
    console.log('📅 [EditLead] dateSetFor changed:', dateSetFor?.toISOString());
  }, [dateSetFor]);

  // Helper function to convert Date to YYYY-MM-DD string safely
  const convertDateToString = (date: Date | null): string | undefined => {
    console.log('📅 [EditLead] convertDateToString called with:', date);
    if (!date) {
      console.log('📅 [EditLead] Date is null/undefined, returning undefined');
      return undefined;
    }
    const result = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log('📅 [EditLead] Converting date to string:', { date, result });
    return result;
  };

  // Remove auto-save for date fields to avoid state synchronization issues
  // Date fields will only be saved when the user explicitly submits the form

  if (!existingLead) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Lead not found</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      
      // Create updates object with only the fields that have changed
      const updates: Partial<Lead> = {
        name: fullName || 'Unnamed Lead',
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        address: formData.address.trim(),
        status: formData.status,
        value: parseFloat(formData.value) || 0,
        source: formData.source.trim() as Lead['source'],
        notes: formData.notes.trim(),
        dateSet: convertDateToString(dateSet),
        dateSetFor: convertDateToString(dateSetFor),
        appointmentSetOnDate: convertDateToString(dateSet),
        appointmentDate: convertDateToString(dateSetFor),
      };

      console.log('📝 [EditLead] Submitting with dates:', {
        dateSet: convertDateToString(dateSet),
        dateSetFor: convertDateToString(dateSetFor),
        appointmentSetOnDate: convertDateToString(dateSet),
        appointmentDate: convertDateToString(dateSetFor),
        dateSetObject: dateSet,
        dateSetForObject: dateSetFor
      });

      console.log('📝 [EditLead] Full updates object:', updates);
      console.log('📝 [EditLead] Updates object keys:', Object.keys(updates));
      console.log('📝 [EditLead] Updates object values:', Object.values(updates));

      await updateLead(leadId, updates);
      
      Alert.alert(
        'Success',
        'Lead updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ [EditLead] Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-4 w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900">Edit Lead</Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "bg-blue-500 px-4 py-2 rounded-lg",
              isSubmitting && "opacity-50"
            )}
          >
            <Text className="text-white font-medium">
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Contact Information Section */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={16} color="#3b82f6" />
              </View>
              <Text className="text-lg font-semibold text-gray-900">Contact Information</Text>
            </View>
            <Text className="text-sm text-blue-600 font-medium">Editable</Text>
          </View>

          {/* Name Fields */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <FormField
                label="Name"
                value={`${formData.firstName} ${formData.lastName}`.trim()}
                onChangeText={(text) => {
                  const [firstName, ...lastNameParts] = text.split(' ');
                  const lastName = lastNameParts.join(' ');
                  updateFormData('firstName', firstName || '');
                  updateFormData('lastName', lastName || '');
                }}
                placeholder="Enter full name"
              />
            </View>
          </View>

          {/* Contact Fields */}
          <FormField
            label="Company"
            value={formData.company}
            onChangeText={(text) => updateFormData('company', text)}
            placeholder="Enter company name"
          />

          <FormField
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="Enter email address"
            keyboardType="email-address"
          />

          <FormField
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          {/* Appointment Date Fields */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <DateField
                label="Date Set"
                value={dateSet}
                onChange={setDateSet}
              />
            </View>
            <View className="flex-1 ml-2">
              <DateField
                label="Date Set For"
                value={dateSetFor}
                onChange={setDateSetFor}
              />
            </View>
          </View>

          {/* Test button to manually set dates */}
          <View className="mb-4">
            <Pressable
              onPress={() => {
                console.log('🧪 [EditLead] Test button pressed');
                const testDate = new Date('2025-01-15');
                console.log('🧪 [EditLead] Setting test date:', testDate.toISOString());
                setDateSet(testDate);
                setDateSetFor(testDate);
              }}
              className="bg-red-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Test: Set Dates to 2025-01-15</Text>
            </Pressable>
          </View>
        </View>

        {/* Address Information */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="location" size={16} color="#10b981" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Address Information</Text>
          </View>

          <FormField
            label="Address"
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            placeholder="Enter address"
          />
        </View>

        {/* Deal Information */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="briefcase" size={16} color="#8b5cf6" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Deal Information</Text>
          </View>

          {/* Status */}
          <StatusSelector
            selectedStatus={formData.status}
            onStatusChange={(status) => updateFormData('status', status)}
          />

          {/* Deal Value */}
          <FormField
            label="Deal Value ($)"
            value={formData.value}
            onChangeText={(text) => updateFormData('value', text)}
            placeholder="Enter deal value"
            keyboardType="numeric"
          />

          {/* Source */}
          <FormField
            label="Lead Source"
            value={formData.source}
            onChangeText={(text) => updateFormData('source', text)}
            placeholder="Where did this lead come from?"
          />
        </View>

        {/* Notes */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="document-text" size={16} color="#eab308" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Notes</Text>
          </View>

          <FormField
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => updateFormData('notes', text)}
            placeholder="Add any additional notes..."
            multiline
          />
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};