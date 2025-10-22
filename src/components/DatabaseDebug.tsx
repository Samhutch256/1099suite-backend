import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { databaseService } from '../services/database';

interface DatabaseDebugProps {
  visible: boolean;
  onClose: () => void;
}

export const DatabaseDebug: React.FC<DatabaseDebugProps> = ({ visible, onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const info = await databaseService.getDatabaseInfo();
      setDebugInfo(info);
    } catch (error) {
      Alert.alert('Error', `Failed to get database info: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete all local data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await databaseService.resetDatabase();
              Alert.alert('Success', 'Database reset successfully');
              setDebugInfo(null);
            } catch (error) {
              Alert.alert('Error', `Failed to reset database: ${error}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const verifySchema = async () => {
    setLoading(true);
    try {
      const isValid = await databaseService.verifySchema();
      Alert.alert('Schema Check', isValid ? 'Schema is valid' : 'Schema has issues');
    } catch (error) {
      Alert.alert('Error', `Schema verification failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-lg max-h-[80%]">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-bold text-gray-900">Database Debug</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="space-y-3 mb-6">
            <Pressable
              onPress={runDiagnostics}
              disabled={loading}
              className="bg-blue-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">
                {loading ? 'Running...' : 'Run Diagnostics'}
              </Text>
            </Pressable>

            <Pressable
              onPress={verifySchema}
              disabled={loading}
              className="bg-green-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Verify Schema</Text>
            </Pressable>

            <Pressable
              onPress={resetDatabase}
              disabled={loading}
              className="bg-red-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Reset Database</Text>
            </Pressable>
          </View>

          {debugInfo && (
            <View className="bg-gray-100 rounded-xl p-4">
              <Text className="font-semibold text-gray-900 mb-2">Database Info:</Text>
              <Text className="text-sm text-gray-700 mb-2">
                Columns: {debugInfo.columnsCount}
              </Text>
              <Text className="text-sm text-gray-700 mb-2">
                Has Required Columns: {debugInfo.hasRequiredColumns ? 'Yes' : 'No'}
              </Text>
              
              <Text className="font-semibold text-gray-900 mb-2 mt-4">Table Structure:</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {debugInfo.tableInfo?.map((col: any, index: number) => (
                  <Text key={index} className="text-xs text-gray-600 mb-1">
                    {col.name} ({col.type})
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};