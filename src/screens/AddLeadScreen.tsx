import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContractorStore, Lead } from '../state/contractorStore';
import { useLeadFilterStore } from '../state/leadFilterStore';
import { getVisibleProgressionStages } from '../utils/stageVisibility';
import { cn } from '../utils/cn';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { getOrderedStages } from '../types/pipeline';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}) => (
  <View className="mb-4">
    <Text className="text-gray-900 font-medium mb-2">
      {label}
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

interface SourceSelectionProps {
  selectedSource: Lead['source'];
  onSourceSelect: (source: Lead['source']) => void;
}

const SourceSelection: React.FC<SourceSelectionProps> = ({ selectedSource, onSourceSelect }) => {
  const sourceOptions = [
    { key: 'door_knocks' as const, label: '🚪 Door Knocks', description: 'Direct door-to-door outreach' },
    { key: 'tags_put' as const, label: '🏷️ Tags Put', description: 'Direct mail and advertising tags' },
    { key: 'calls_made' as const, label: '📞 Cold Calls', description: 'Phone outreach campaigns' },
    { key: 'referrals' as const, label: '👥 Referrals', description: 'Word-of-mouth recommendations' },
    { key: 'inbound' as const, label: '🌐 Inbound', description: 'Website inquiries and online leads' },
    { key: 'other' as const, label: '📋 Other', description: 'Other lead generation methods' },
  ];

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-6">
        <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="megaphone" size={16} color="#8b5cf6" />
        </View>
        <Text className="text-lg font-semibold text-gray-900">Lead Source</Text>
      </View>
      
      <Text className="text-sm text-gray-600 mb-4">
        How was this lead generated?
      </Text>

      <View className="space-y-3">
        {sourceOptions.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => onSourceSelect(option.key)}
            className={cn(
              "flex-row items-center p-4 rounded-xl border",
              selectedSource === option.key ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"
            )}
          >
            <View className="flex-1">
              <Text className={cn(
                "font-medium text-base",
                selectedSource === option.key ? "text-purple-700" : "text-gray-700"
              )}>
                {option.label}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {option.description}
              </Text>
            </View>
            <View className={cn(
              "w-6 h-6 rounded-full border-2 items-center justify-center",
              selectedSource === option.key ? "bg-purple-500 border-purple-500" : "border-gray-300"
            )}>
              {selectedSource === option.key && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

interface StatusSelectionProps {
  selectedStatus: Lead['status'];
  onStatusSelect: (status: Lead['status']) => void;
}

const StatusSelection: React.FC<StatusSelectionProps> = ({ selectedStatus, onStatusSelect }) => {
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
      onPress={() => onStatusSelect(option.key)}
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

interface RevenueSectionProps {
  guaranteedRevenue: string;
  pipelineRevenue: string;
  guaranteedPaidOut: boolean;
  pipelinePaidOut: boolean;
  onGuaranteedRevenueChange: (value: string) => void;
  onPipelineRevenueChange: (value: string) => void;
  onGuaranteedPaidOutChange: (value: boolean) => void;
  onPipelinePaidOutChange: (value: boolean) => void;
}

const RevenueSection: React.FC<RevenueSectionProps> = ({
  guaranteedRevenue,
  pipelineRevenue,
  guaranteedPaidOut,
  pipelinePaidOut,
  onGuaranteedRevenueChange,
  onPipelineRevenueChange,
  onGuaranteedPaidOutChange,
  onPipelinePaidOutChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="cash" size={16} color="#eab308" />
          </View>
          <Text className="text-lg font-semibold text-gray-900">Revenue Tracking</Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </Pressable>
      
      {isExpanded && (
        <View className="mt-4 space-y-4">
          <View className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Guaranteed Revenue</Text>
                <Text className="text-xs text-gray-500">Revenue from signed contracts</Text>
              </View>
            </View>
            <TextInput
              value={guaranteedRevenue}
              onChangeText={onGuaranteedRevenueChange}
              placeholder="Enter amount (e.g., 5000)"
              keyboardType="decimal-pad"
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
            />
            <Pressable
              onPress={() => onGuaranteedPaidOutChange(!guaranteedPaidOut)}
              className="flex-row items-center"
            >
              <View className={cn(
                "w-5 h-5 rounded border-2 items-center justify-center mr-2",
                guaranteedPaidOut ? "bg-green-500 border-green-500" : "border-gray-300"
              )}>
                {guaranteedPaidOut && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
              <Text className="text-sm text-gray-700">This amount has been paid out</Text>
            </Pressable>
          </View>
          
          <View className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="trending-up-outline" size={16} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Pipeline Revenue</Text>
                <Text className="text-xs text-gray-500">Potential revenue from active leads</Text>
              </View>
            </View>
            <TextInput
              value={pipelineRevenue}
              onChangeText={onPipelineRevenueChange}
              placeholder="Enter amount (e.g., 10000)"
              keyboardType="decimal-pad"
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
            />
            <Pressable
              onPress={() => onPipelinePaidOutChange(!pipelinePaidOut)}
              className="flex-row items-center"
            >
              <View className={cn(
                "w-5 h-5 rounded border-2 items-center justify-center mr-2",
                pipelinePaidOut ? "bg-blue-500 border-blue-500" : "border-gray-300"
              )}>
                {pipelinePaidOut && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
              <Text className="text-sm text-gray-700">This amount has been paid out</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

interface FileUploadSectionProps {
  files: Array<{ name: string; uri: string; type: string }>;
  onFilesChange: (files: Array<{ name: string; uri: string; type: string }>) => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ files, onFilesChange }) => {
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFile = result.assets[0];
        onFilesChange([...files, {
          name: newFile.name || 'Document',
          uri: newFile.uri,
          type: newFile.mimeType || 'application/octet-stream',
        }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-6">
        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="document" size={16} color="#3b82f6" />
        </View>
        <Text className="text-lg font-semibold text-gray-900">File Uploads</Text>
      </View>
      
      <Text className="text-sm text-gray-600 mb-4">
        Attach files to this lead (PDF, images, documents, etc.)
      </Text>

      <Pressable
        onPress={pickDocument}
        className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-6 items-center"
      >
        <Ionicons name="cloud-upload" size={32} color="#3b82f6" />
        <Text className="text-blue-600 font-medium mt-2">Tap to upload files</Text>
        <Text className="text-blue-500 text-sm mt-1">PDF, images, documents</Text>
      </Pressable>

      {files.length > 0 && (
        <View className="mt-4 space-y-2">
          <Text className="text-sm font-medium text-gray-700">Uploaded Files:</Text>
          {files.map((file, index) => (
            <View key={index} className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">{file.name}</Text>
                <Text className="text-xs text-gray-500">{file.type}</Text>
              </View>
              <Pressable
                onPress={() => removeFile(index)}
                className="ml-2"
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

interface AddLeadScreenProps {
  navigation: any;
}

export const AddLeadScreen: React.FC<AddLeadScreenProps> = ({ navigation }) => {
  const { addLead } = useContractorStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    dateSet: null as Date | null,
    dateSetFor: null as Date | null,
    status: 'new' as Lead['status'],
    source: 'other' as Lead['source'],
    guaranteedRevenue: '',
    pipelineRevenue: '',
    guaranteedPaidOut: false,
    pipelinePaidOut: false,
    notes: '',
  });

  const [files, setFiles] = useState<Array<{ name: string; uri: string; type: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (key: string, value: string | Date | null | boolean) => {
    console.log(`📝 Updating form data: ${key} =`, value);
    if (key === 'dateSet' || key === 'dateSetFor') {
      console.log(`🔍 [${key}] Previous value:`, formData[key as keyof typeof formData]);
      console.log(`🔍 [${key}] New value:`, value);
      console.log(`🔍 [${key}] New value type:`, typeof value);
      if (value instanceof Date) {
        console.log(`🔍 [${key}] Date object:`, value.toISOString());
      }
    }
    setFormData(prev => {
      const newData = { ...prev, [key]: value };
      if (key === 'dateSet' || key === 'dateSetFor') {
        console.log(`🔍 [${key}] Updated form data:`, newData[key as keyof typeof newData]);
      }
      return newData;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const leadName = formData.name.trim() || 'Unnamed Lead';
      
      // Calculate total revenue
      const guaranteedRevenue = parseFloat(formData.guaranteedRevenue) || 0;
      const pipelineRevenue = parseFloat(formData.pipelineRevenue) || 0;
      const totalRevenue = guaranteedRevenue + pipelineRevenue;
      
      const newLead = {
        name: leadName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        address: formData.address.trim(),
        value: totalRevenue, // Set the legacy value field to total revenue
        notes: formData.notes.trim(),
        status: formData.status,
        source: formData.source,
        // Map date fields to the correct database columns
        dateSet: formData.dateSet ? 
          `${formData.dateSet.getFullYear()}-${String(formData.dateSet.getMonth() + 1).padStart(2, '0')}-${String(formData.dateSet.getDate()).padStart(2, '0')}` : 
          undefined,
        dateSetFor: formData.dateSetFor ? 
          `${formData.dateSetFor.getFullYear()}-${String(formData.dateSetFor.getMonth() + 1).padStart(2, '0')}-${String(formData.dateSetFor.getDate()).padStart(2, '0')}` : 
          undefined,
        // Add revenue data with proper structure
        revenue: {
          guaranteedRevenue: guaranteedRevenue,
          pipelineRevenue: pipelineRevenue,
          guaranteedPaidOut: formData.guaranteedPaidOut,
          pipelinePaidOut: formData.pipelinePaidOut,
          totalRevenue: totalRevenue,
          paidOutRevenue: (formData.guaranteedPaidOut ? guaranteedRevenue : 0) + 
                         (formData.pipelinePaidOut ? pipelineRevenue : 0),
        },
        // Add file references (in a real app, you'd upload to storage and save URLs)
        fileUrls: files.map(file => file.uri), // This would be storage URLs in production
      };

      console.log('📝 Creating lead with data:', newLead);
      console.log('📅 Date Set:', formData.dateSet, '→', newLead.dateSet);
      console.log('📅 Date Set For:', formData.dateSetFor, '→', newLead.dateSetFor);
      console.log('🔍 [DateSetFor] Form data before submit:', formData.dateSetFor);
      console.log('🔍 [DateSetFor] New lead data:', newLead.dateSetFor);
      console.log('🔍 [DateSet] Form data before submit:', formData.dateSet);
      console.log('🔍 [DateSet] New lead data:', newLead.dateSet);

      await addLead(newLead);

      Alert.alert(
        'Success',
        'Lead has been added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error adding lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Error Adding Lead', 
        `Failed to add lead: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`
      );
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
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">Add Lead</Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "px-6 py-2 rounded-xl flex-row items-center",
              isSubmitting ? "bg-gray-300" : "bg-blue-500"
            )}
          >
            {isSubmitting && (
              <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            <Text className="text-white font-medium">
              {isSubmitting ? 'Saving...' : 'Save Lead'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        className="px-6 py-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Contact Information */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="person" size={16} color="#3b82f6" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Contact Information</Text>
          </View>

          <FormField
            label="Name"
            value={formData.name}
            onChangeText={(text) => updateFormData('name', text)}
            placeholder="Enter full name"
          />

          <FormField
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <FormField
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="Enter email address"
            keyboardType="email-address"
          />

          <FormField
            label="Address"
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            placeholder="Enter address"
          />

          <FormField
            label="Company"
            value={formData.company}
            onChangeText={(text) => updateFormData('company', text)}
            placeholder="Enter company name"
          />
        </View>

        {/* Deal Information */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="briefcase" size={16} color="#10b981" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Deal Information</Text>
          </View>

          <DateField
            label="Date Set"
            value={formData.dateSet}
            onChange={(date) => updateFormData('dateSet', date)}
          />

          <DateField
            label="Date Set For"
            value={formData.dateSetFor}
            onChange={(date) => updateFormData('dateSetFor', date)}
          />
        </View>

        {/* Lead Source Selection */}
        <SourceSelection
          selectedSource={formData.source}
          onSourceSelect={(source) => updateFormData('source', source)}
        />

        {/* Status Selection */}
        <StatusSelection
          selectedStatus={formData.status}
          onStatusSelect={(status) => updateFormData('status', status)}
        />

        {/* Revenue Tracking */}
        <RevenueSection
          guaranteedRevenue={formData.guaranteedRevenue}
          pipelineRevenue={formData.pipelineRevenue}
          guaranteedPaidOut={formData.guaranteedPaidOut}
          pipelinePaidOut={formData.pipelinePaidOut}
          onGuaranteedRevenueChange={(value) => updateFormData('guaranteedRevenue', value)}
          onPipelineRevenueChange={(value) => updateFormData('pipelineRevenue', value)}
          onGuaranteedPaidOutChange={(value) => updateFormData('guaranteedPaidOut', value)}
          onPipelinePaidOutChange={(value) => updateFormData('pipelinePaidOut', value)}
        />

        {/* Notes */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="document-text" size={16} color="#8b5cf6" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">Notes</Text>
          </View>
          
          <FormField
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => updateFormData('notes', text)}
            placeholder="Enter any additional notes about this lead..."
            multiline={true}
          />
        </View>

        {/* File Uploads */}
        <FileUploadSection
          files={files}
          onFilesChange={setFiles}
        />

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};