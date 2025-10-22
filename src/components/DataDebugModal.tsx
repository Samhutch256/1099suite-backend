import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../state/authStore';
import { useKPIStore } from '../state/kpiStore';
import { useContractorStore } from '../state/contractorStore';
import { databaseService } from '../services/database';
import { cn } from '../utils/cn';

interface DataDebugModalProps {
  onClose: () => void;
}

interface DebugInfo {
  asyncStorageKeys: string[];
  asyncStorageData: { [key: string]: any };
  databaseInfo: any;
  userInfo: any;
  dailyInputsCount: number;
  leadsCount: number;
}

export const DataDebugModal: React.FC<DataDebugModalProps> = ({ onClose }) => {
  const { user } = useAuthStore();
  const { dailyInputs, clearUserData: clearKPIData } = useKPIStore();
  const { leads, clearUserData: clearContractorData } = useContractorStore();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const generateUUIDFromEmail = (email: string): string => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = [
      hex.slice(0, 8),
      hex.slice(0, 4),
      '4' + hex.slice(1, 4),
      '8' + hex.slice(1, 4),
      hex.repeat(3).slice(0, 12)
    ].join('-');
    
    return uuid;
  };

  const collectDebugInfo = async () => {
    setLoading(true);
    try {
      // Get AsyncStorage info
      const allKeys = await AsyncStorage.getAllKeys();
      const asyncStorageData: { [key: string]: any } = {};
      
      for (const key of allKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            asyncStorageData[key] = JSON.parse(data);
          }
        } catch (error) {
          asyncStorageData[key] = `Error parsing: ${error}`;
        }
      }

      // Get database info
      let databaseInfo = null;
      let dailyInputsCount = 0;
      try {
        if (user) {
          const expectedUserId = generateUUIDFromEmail(user.email.toLowerCase());
          const dailyInputsData = await databaseService.getDailyInputs(expectedUserId);
          dailyInputsCount = dailyInputsData.length;
          databaseInfo = await databaseService.getDatabaseInfo();
        }
      } catch (error) {
        databaseInfo = `Error: ${error}`;
      }

      setDebugInfo({
        asyncStorageKeys: Array.from(allKeys),
        asyncStorageData,
        databaseInfo,
        userInfo: user,
        dailyInputsCount,
        leadsCount: leads.length,
      });
    } catch (error) {
      Alert.alert('Error', `Failed to collect debug info: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllAsyncStorage = async () => {
    Alert.alert(
      'Clear All Local Storage',
      'This will clear ALL local storage data including authentication. You will need to sign in again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await SecureStore.deleteItemAsync('auth_token');
              // Add more SecureStore keys here if needed
              Alert.alert('Success', 'All local storage cleared. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', `Failed to clear storage: ${error}`);
            }
          },
        },
      ]
    );
  };

  const clearDatabaseData = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      'Clear Database Data',
      `This will clear all database data for ${user.email}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Database',
          style: 'destructive',
          onPress: async () => {
            try {
              const expectedUserId = generateUUIDFromEmail(user.email.toLowerCase());
              await databaseService.clearUserData(expectedUserId);
              Alert.alert('Success', 'Database data cleared for this user.');
              await collectDebugInfo(); // Refresh info
            } catch (error) {
              Alert.alert('Error', `Failed to clear database: ${error}`);
            }
          },
        },
      ]
    );
  };

  const clearStoreData = async () => {
    Alert.alert(
      'Clear Store Data',
      'This will clear all Zustand store data (KPI, Leads, etc.) but keep authentication. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Stores',
          style: 'destructive',
          onPress: async () => {
            try {
              clearKPIData();
              clearContractorData();
              Alert.alert('Success', 'Store data cleared.');
              await collectDebugInfo(); // Refresh info
            } catch (error) {
              Alert.alert('Error', `Failed to clear stores: ${error}`);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (user) { // Only collect if user is logged in
      collectDebugInfo();
    }
  }, [user]); // Depend on user

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
        <Text className="text-xl font-bold text-gray-900">Data Debug Tool</Text>
        <Pressable
          onPress={onClose}
          className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
        >
          <Ionicons name="close" size={20} color="#6b7280" />
        </Pressable>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        className="p-4"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {loading ? (
          <View className="items-center justify-center py-8">
            <View className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <Text className="text-gray-600">Collecting debug information...</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {/* User Info */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Current User</Text>
              {user ? (
                <View>
                  <Text className="text-gray-700">Email: {user.email}</Text>
                  <Text className="text-gray-700">ID: {user.id}</Text>
                  <Text className="text-gray-700">Expected ID: {generateUUIDFromEmail(user.email.toLowerCase())}</Text>
                  <Text className="text-gray-700">Provider: {user.provider}</Text>
                </View>
              ) : (
                <Text className="text-gray-500">No user logged in</Text>
              )}
            </View>

            {/* Data Counts */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Data Summary</Text>
              <Text className="text-gray-700">Daily Inputs (Store): {dailyInputs.length}</Text>
              <Text className="text-gray-700">Daily Inputs (Database): {debugInfo?.dailyInputsCount || 0}</Text>
              <Text className="text-gray-700">Leads: {debugInfo?.leadsCount || 0}</Text>
              <Text className="text-gray-700">AsyncStorage Keys: {debugInfo?.asyncStorageKeys.length || 0}</Text>
            </View>

            {/* AsyncStorage Keys */}
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Local Storage Keys</Text>
              {debugInfo?.asyncStorageKeys.map((key) => (
                <Text key={key} className="text-gray-700 text-sm">• {key}</Text>
              ))}
            </View>

            {/* Action Buttons */}
            <View className="space-y-3">
              <Pressable
                onPress={collectDebugInfo}
                className="bg-blue-500 rounded-lg py-3 px-4 items-center"
              >
                <Text className="text-white font-semibold">Refresh Debug Info</Text>
              </Pressable>

              <Pressable
                onPress={clearStoreData}
                className="bg-orange-500 rounded-lg py-3 px-4 items-center"
              >
                <Text className="text-white font-semibold">Clear Store Data Only</Text>
              </Pressable>

              <Pressable
                onPress={clearDatabaseData}
                className="bg-red-500 rounded-lg py-3 px-4 items-center"
              >
                <Text className="text-white font-semibold">Clear Database Data</Text>
              </Pressable>

              <Pressable
                onPress={clearAllAsyncStorage}
                className="bg-red-600 rounded-lg py-3 px-4 items-center"
              >
                <Text className="text-white font-semibold">Clear ALL Local Storage</Text>
              </Pressable>
            </View>

            {/* Debug Details */}
            {debugInfo && (
              <View className="bg-white rounded-xl p-4 border border-gray-200">
                <Text className="text-lg font-semibold text-gray-900 mb-2">Debug Details</Text>
                <ScrollView horizontal>
                  <Text className="text-xs text-gray-600 font-mono">
                    {JSON.stringify(debugInfo, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};