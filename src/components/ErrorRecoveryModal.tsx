import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

interface ErrorRecoveryModalProps {
  visible: boolean;
  error: string;
  onClose: () => void;
  onRetry?: () => void;
  onResetDatabase?: () => void;
}

export const ErrorRecoveryModal: React.FC<ErrorRecoveryModalProps> = ({
  visible,
  error,
  onClose,
  onRetry,
  onResetDatabase
}) => {
  const isDataSavedLocally = error.includes('saved locally');
  const isDatabaseError = error.includes('Database error') || error.includes('runAsync');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-xl p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            <View className={cn(
              "w-16 h-16 rounded-full items-center justify-center mb-3",
              isDataSavedLocally ? "bg-orange-100" : "bg-red-100"
            )}>
              <Ionicons 
                name={isDataSavedLocally ? "warning" : "alert-circle"} 
                size={32} 
                color={isDataSavedLocally ? "#f97316" : "#ef4444"} 
              />
            </View>
            <Text className="text-lg font-semibold text-gray-900 text-center">
              {isDataSavedLocally ? "Sync Issue" : "Save Error"}
            </Text>
          </View>

          <Text className="text-gray-600 text-center mb-6 leading-5">
            {isDataSavedLocally 
              ? "Your data was saved locally but couldn't sync to the database. You can continue using the app normally."
              : isDatabaseError
              ? "There was a database error. Your data may not have been saved properly."
              : error
            }
          </Text>

          <View className="space-y-3">
            {onRetry && (
              <Pressable
                onPress={() => {
                  onRetry();
                  onClose();
                }}
                className="bg-blue-500 rounded-xl py-3 px-4"
              >
                <Text className="text-white font-medium text-center">
                  Try Again
                </Text>
              </Pressable>
            )}

            {isDatabaseError && onResetDatabase && (
              <Pressable
                onPress={() => {
                  onResetDatabase();
                  onClose();
                }}
                className="bg-orange-500 rounded-xl py-3 px-4"
              >
                <Text className="text-white font-medium text-center">
                  Reset Database
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              className="bg-gray-200 rounded-xl py-3 px-4"
            >
              <Text className="text-gray-700 font-medium text-center">
                {isDataSavedLocally ? "Continue" : "Close"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};