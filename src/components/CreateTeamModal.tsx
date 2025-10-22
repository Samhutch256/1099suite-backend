import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

interface CreateTeamModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTeam: (name: string, description?: string) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  visible,
  onClose,
  onCreateTeam,
}) => {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (teamName.trim()) {
      onCreateTeam(teamName.trim(), description.trim() || undefined);
      setTeamName('');
      setDescription('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTeamName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-800">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-purple-500 rounded-full items-center justify-center mr-3">
                <Ionicons name="people" size={18} color="white" />
              </View>
              <Text className="text-xl font-semibold text-white">Create Team</Text>
            </View>
            <Pressable onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>

          {/* Form */}
          <View className="flex-1 px-6 py-6">
            <View className="mb-6">
              <Text className="text-lg font-medium text-white mb-4">Team Name</Text>
              <TextInput
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Sales Team Alpha"
                placeholderTextColor="#94a3b8"
                className="bg-slate-700 text-white px-4 py-4 rounded-xl text-lg"
                autoFocus
              />
            </View>

            <View className="mb-8">
              <Text className="text-lg font-medium text-white mb-4">Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the team's focus and goals..."
                placeholderTextColor="#94a3b8"
                className="bg-slate-700 text-white px-4 py-4 rounded-xl text-lg"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Buttons */}
          <View className="px-6 pb-6 space-y-3">
            <Pressable
              onPress={handleCreate}
              disabled={!teamName.trim()}
              className={cn(
                "py-4 rounded-xl flex-row items-center justify-center",
                teamName.trim() ? "bg-purple-500" : "bg-gray-600"
              )}
            >
              <Ionicons 
                name="people" 
                size={20} 
                color="white" 
                style={{ marginRight: 8 }} 
              />
              <Text className="text-white font-semibold text-lg">Create Team</Text>
            </Pressable>

            <Pressable
              onPress={handleCancel}
              className="py-4 rounded-xl border border-gray-600 flex-row items-center justify-center"
            >
              <Text className="text-gray-300 font-semibold text-lg">Cancel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};