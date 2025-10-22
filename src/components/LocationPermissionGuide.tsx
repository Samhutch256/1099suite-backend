import React from 'react';
import { View, Text, Pressable, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationPermissionGuideProps {
  visible: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  onContinueAnyway?: () => void;
}

export const LocationPermissionGuide: React.FC<LocationPermissionGuideProps> = ({
  visible,
  onClose,
  onTryAgain,
  onContinueAnyway,
}) => {
  if (!visible) return null;

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="location" size={32} color="#3b82f6" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            Location Access Required
          </Text>
          <Text className="text-gray-600 text-center">
            For accurate mileage tracking, 1099 Suite needs "Always Allow" location access.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-900 mb-2">How to enable:</Text>
          <View className="space-y-2">
            <View className="flex-row">
              <Text className="text-sm text-gray-600 w-4">1.</Text>
              <Text className="text-sm text-gray-600 flex-1">Open Settings</Text>
            </View>
            <View className="flex-row">
              <Text className="text-sm text-gray-600 w-4">2.</Text>
              <Text className="text-sm text-gray-600 flex-1">Go to Privacy & Security</Text>
            </View>
            <View className="flex-row">
              <Text className="text-sm text-gray-600 w-4">3.</Text>
              <Text className="text-sm text-gray-600 flex-1">Tap Location Services</Text>
            </View>
            <View className="flex-row">
              <Text className="text-sm text-gray-600 w-4">4.</Text>
              <Text className="text-sm text-gray-600 flex-1">Find 1099 Suite</Text>
            </View>
            <View className="flex-row">
              <Text className="text-sm text-gray-600 w-4">5.</Text>
              <Text className="text-sm text-gray-600 flex-1 font-semibold">Select "Always"</Text>
            </View>
          </View>
        </View>

        <View className="space-y-3">
          <Pressable
            onPress={openSettings}
            className="bg-blue-500 rounded-xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="settings" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">Open Settings</Text>
          </Pressable>
          
          <Pressable
            onPress={onTryAgain}
            className="bg-gray-200 rounded-xl py-4 items-center"
          >
            <Text className="text-gray-700 font-semibold">Try Again</Text>
          </Pressable>
          
          {onContinueAnyway && (
            <Pressable
              onPress={onContinueAnyway}
              className="bg-orange-500 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-semibold">Continue with Basic Tracking</Text>
            </Pressable>
          )}
          
          <Pressable
            onPress={onClose}
            className="py-2 items-center"
          >
            <Text className="text-gray-500">Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};