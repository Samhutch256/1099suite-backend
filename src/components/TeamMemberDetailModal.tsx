import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn';
import { TeamMember } from '../state/contractorStore';
import { TeamPermissions } from './TeamManagementModal';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface TeamMemberDetailModalProps {
  visible: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onUpdatePermissions: (memberId: string, permissions: TeamPermissions) => void;
  onRemoveMember: (memberId: string) => void;
  onTransferOwnership: (memberId: string) => void;
  currentUserRole: string;
}

export const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  visible,
  onClose,
  member,
  onUpdatePermissions,
  onRemoveMember,
  onTransferOwnership,
  currentUserRole,
}) => {
  const [permissions, setPermissions] = useState<TeamPermissions>({
    canViewKPIs: member?.permissions?.canViewKPIs ?? true,
    canEditKPIs: member?.permissions?.canEditKPIs ?? false,
    canManageTeam: member?.permissions?.canManageTeam ?? false,
    canViewFinancials: member?.permissions?.canViewFinancials ?? false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updatePermission = (key: keyof TeamPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSavePermissions = () => {
    if (member) {
      onUpdatePermissions(member.id, permissions);
      setHasChanges(false);
    }
  };

  const handleRemoveMember = () => {
    if (!member) return;

    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name} from the team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemoveMember(member.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleTransferOwnership = () => {
    if (!member) return;

    Alert.alert(
      'Transfer Team Ownership',
      `Are you sure you want to transfer team ownership to ${member.name}? You will lose administrative privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'default',
          onPress: () => {
            onTransferOwnership(member.id);
            onClose();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Manager': 'bg-purple-500',
      'Sales Rep': 'bg-blue-500',
      'Contractor': 'bg-green-500',
      'Admin': 'bg-orange-500',
      'Team Lead': 'bg-indigo-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const canManageUser = currentUserRole === 'Admin' || currentUserRole === 'Manager';

  if (!member) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1f2e', '#2d3748', '#4a5568']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person" size={16} color="white" />
                </View>
                <Text className="text-xl font-bold text-white">Team Member</Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown}>
              {/* Member Profile */}
              <View className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 mb-6">
                <View className="flex-row items-start">
                  {member.avatar ? (
                    <View className="w-16 h-16 rounded-full bg-gray-300 mr-4" />
                  ) : (
                    <View className={cn("w-16 h-16 rounded-full items-center justify-center mr-4", getRoleColor(member.role))}>
                      <Text className="text-white font-bold text-xl">
                        {getInitials(member.name)}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white text-xl font-bold mb-1">{member.name}</Text>
                    <Text className="text-gray-300 mb-2">{member.email}</Text>
                    <View className="flex-row items-center">
                      <View className={cn("px-3 py-1 rounded-full mr-3", getRoleColor(member.role))}>
                        <Text className="text-white text-sm font-medium">{member.role}</Text>
                      </View>
                      <View className={cn(
                        "px-3 py-1 rounded-full",
                        member.isActive ? "bg-green-500" : "bg-gray-500"
                      )}>
                        <Text className="text-white text-sm font-medium">
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Performance Stats */}
              <View className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 mb-6">
                <Text className="text-white font-semibold text-lg mb-4">Performance</Text>
                <View className="grid grid-cols-2 gap-4">
                  <View className="bg-gray-900/50 rounded-lg p-4">
                    <Text className="text-green-400 text-2xl font-bold">
                      {formatCurrency(member.performance.revenue)}
                    </Text>
                    <Text className="text-gray-400 text-sm">Revenue</Text>
                  </View>
                  <View className="bg-gray-900/50 rounded-lg p-4">
                    <Text className="text-blue-400 text-2xl font-bold">
                      {member.performance.leadsGenerated}
                    </Text>
                    <Text className="text-gray-400 text-sm">Leads Generated</Text>
                  </View>
                  <View className="bg-gray-900/50 rounded-lg p-4">
                    <Text className="text-purple-400 text-2xl font-bold">
                      {member.performance.dealsWon}
                    </Text>
                    <Text className="text-gray-400 text-sm">Deals Won</Text>
                  </View>
                  <View className="bg-gray-900/50 rounded-lg p-4">
                    <Text className="text-yellow-400 text-2xl font-bold">
                      {member.performance.appointmentsHeld}
                    </Text>
                    <Text className="text-gray-400 text-sm">Appointments</Text>
                  </View>
                </View>
              </View>

              {/* Permissions */}
              {canManageUser && (
                <View className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white font-semibold text-lg">Permissions</Text>
                    {hasChanges && (
                      <Pressable
                        onPress={handleSavePermissions}
                        className="bg-purple-500 px-4 py-2 rounded-lg"
                      >
                        <Text className="text-white font-medium">Save</Text>
                      </Pressable>
                    )}
                  </View>
                  
                  <View className="space-y-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-medium">View KPIs</Text>
                        <Text className="text-sm text-gray-400">Can view team performance metrics</Text>
                      </View>
                      <Switch
                        value={permissions.canViewKPIs}
                        onValueChange={(value) => updatePermission('canViewKPIs', value)}
                        trackColor={{ false: '#374151', true: '#a855f7' }}
                        thumbColor={permissions.canViewKPIs ? '#ffffff' : '#9ca3af'}
                      />
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-medium">Edit KPIs</Text>
                        <Text className="text-sm text-gray-400">Can modify KPI targets and settings</Text>
                      </View>
                      <Switch
                        value={permissions.canEditKPIs}
                        onValueChange={(value) => updatePermission('canEditKPIs', value)}
                        trackColor={{ false: '#374151', true: '#a855f7' }}
                        thumbColor={permissions.canEditKPIs ? '#ffffff' : '#9ca3af'}
                      />
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-medium">Manage Team</Text>
                        <Text className="text-sm text-gray-400">Can invite/remove team members</Text>
                      </View>
                      <Switch
                        value={permissions.canManageTeam}
                        onValueChange={(value) => updatePermission('canManageTeam', value)}
                        trackColor={{ false: '#374151', true: '#a855f7' }}
                        thumbColor={permissions.canManageTeam ? '#ffffff' : '#9ca3af'}
                      />
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-medium">View Financials</Text>
                        <Text className="text-sm text-gray-400">Can see revenue and expense data</Text>
                      </View>
                      <Switch
                        value={permissions.canViewFinancials}
                        onValueChange={(value) => updatePermission('canViewFinancials', value)}
                        trackColor={{ false: '#374151', true: '#a855f7' }}
                        thumbColor={permissions.canViewFinancials ? '#ffffff' : '#9ca3af'}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Admin Actions */}
              {canManageUser && (
                <View className="space-y-3">
                  <Pressable
                    onPress={handleTransferOwnership}
                    className="bg-yellow-600 rounded-xl py-4 flex-row items-center justify-center"
                  >
                    <Ionicons name="swap-horizontal" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Transfer Ownership</Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={handleRemoveMember}
                    className="bg-red-600 rounded-xl py-4 flex-row items-center justify-center"
                  >
                    <Ionicons name="person-remove" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Remove from Team</Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};