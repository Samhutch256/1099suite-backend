import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

interface AppointmentSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSourceSelected: (source: 'door_knocks' | 'tags_put' | 'calls_made' | 'referrals' | 'inbound' | 'other') => void;
  appointmentType: 'set' | 'held';
  count: number;
}

const leadSources = [
  { 
    value: 'door_knocks' as const, 
    label: 'Door Knocks', 
    emoji: '🏠',
    description: 'Direct door-to-door outreach'
  },
  { 
    value: 'tags_put' as const, 
    label: 'Tags Put', 
    emoji: '🏷️',
    description: 'Tags or flyers left at properties'
  },
  { 
    value: 'calls_made' as const, 
    label: 'Calls Made', 
    emoji: '📞',
    description: 'Phone calls to prospects'
  },
  { 
    value: 'referrals' as const, 
    label: 'Referrals', 
    emoji: '👥',
    description: 'Referred by existing customers'
  },
  { 
    value: 'inbound' as const, 
    label: 'Inbound', 
    emoji: '📥',
    description: 'Customer contacted you first'
  },
  { 
    value: 'other' as const, 
    label: 'Other', 
    emoji: '❓',
    description: 'Other lead generation method'
  },
];

export const AppointmentSourceModal: React.FC<AppointmentSourceModalProps> = ({
  visible,
  onClose,
  onSourceSelected,
  appointmentType,
  count,
}) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedSource(null);
    }
  }, [visible]);

  const handleSourceSelect = (source: typeof leadSources[0]['value']) => {
    setSelectedSource(source);
  };

  const handleContinue = () => {
    if (!selectedSource) {
      Alert.alert('Selection Required', 'Please select how the appointment was generated.');
      return;
    }
    
    onSourceSelected(selectedSource as any);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Lead Tracking?',
      `⚠️ Skipping will count the appointment${count > 1 ? 's' : ''} toward your KPIs but won't track ${count > 1 ? 'them' : 'it'} in your lead pipeline.\n\nYou'll miss out on:\n• Lead source attribution\n• Pipeline tracking\n• Follow-up reminders\n• Conversion analysis`,
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip Anyway', 
          style: 'destructive', 
          onPress: () => {
            // Show a brief confirmation
            Alert.alert(
              'Skipped',
              'Appointment will count in KPIs only.',
              [{ text: 'OK', onPress: onClose }]
            );
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {appointmentType === 'held' ? 'Appointment Held' : 'Appointment Set'}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                How was this appointment generated?
              </Text>
            </View>
            <Pressable onPress={handleSkip} className="ml-4">
              <Text className="text-blue-600 font-medium">Skip</Text>
            </Pressable>
          </View>
          
          <View className="mt-3 p-3 bg-blue-50 rounded-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-medium text-blue-800">
                  📊 Step 1 of 2: Select lead source
                </Text>
                <Text className="text-xs text-blue-600 mt-1">
                  This helps track your lead sources and pipeline performance
                </Text>
              </View>
              <View className="bg-blue-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">{count}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lead Sources */}
        <ScrollView className="flex-1 px-6 py-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Select Lead Generation Method:
          </Text>
          
          <View className="space-y-3">
            {leadSources.map((source) => (
              <Pressable
                key={source.value}
                onPress={() => handleSourceSelect(source.value)}
                className={cn(
                  "bg-white rounded-xl p-4 border-2 transition-colors",
                  selectedSource === source.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                )}
              >
                <View className="flex-row items-center">
                  <View className={cn(
                    "w-6 h-6 rounded-full border-2 mr-4 items-center justify-center",
                    selectedSource === source.value
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  )}>
                    {selectedSource === source.value && (
                      <View className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </View>
                  
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-2xl mr-3">{source.emoji}</Text>
                      <Text className={cn(
                        "text-lg font-semibold",
                        selectedSource === source.value ? "text-blue-900" : "text-gray-900"
                      )}>
                        {source.label}
                      </Text>
                    </View>
                    <Text className={cn(
                      "text-sm",
                      selectedSource === source.value ? "text-blue-700" : "text-gray-600"
                    )}>
                      {source.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="bg-white border-t border-gray-200 px-6 py-4">
          <Pressable
            onPress={handleContinue}
            disabled={!selectedSource}
            className={cn(
              "rounded-xl py-4 items-center",
              selectedSource 
                ? "bg-blue-500" 
                : "bg-gray-300"
            )}
          >
            <Text className={cn(
              "font-semibold text-lg",
              selectedSource ? "text-white" : "text-gray-500"
            )}>
              Continue to Lead Association
            </Text>
          </Pressable>
          
          <Text className="text-xs text-gray-500 text-center mt-2">
            Next: Associate with existing lead or create new lead
          </Text>
        </View>
      </View>
    </Modal>
  );
};