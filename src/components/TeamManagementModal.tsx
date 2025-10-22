import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn';

interface TeamManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onInviteMember: (email: string, role: string, permissions: TeamPermissions) => void;
  onCreateTeam: (teamName: string, description: string) => void;
  mode: 'invite' | 'createTeam';
}

export interface TeamPermissions {
  canViewKPIs: boolean;
  canEditKPIs: boolean;
  canManageTeam: boolean;
  canViewFinancials: boolean;
}

const roles = [
  { id: 'Sales Rep', label: 'Sales Rep', description: 'Individual contributor focused on sales activities' },
  { id: 'Team Lead', label: 'Team Lead', description: 'Leads a small team of sales reps' },
  { id: 'Manager', label: 'Manager', description: 'Manages multiple teams and has full access' },
  { id: 'Contractor', label: 'Contractor', description: 'Independent contractor with limited access' },
  { id: 'Admin', label: 'Admin', description: 'Full administrative access to all features' },
];

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  visible,
  onClose,
  onInviteMember,
  onCreateTeam,
  mode,
}) => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Sales Rep');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [permissions, setPermissions] = useState<TeamPermissions>({
    canViewKPIs: true,
    canEditKPIs: false,
    canManageTeam: false,
    canViewFinancials: false,
  });

  const handleSubmit = () => {
    if (mode === 'invite') {
      if (email.trim() && selectedRole) {
        onInviteMember(email.trim(), selectedRole, permissions);
        setEmail('');
        setSelectedRole('Sales Rep');
        setPermissions({
          canViewKPIs: true,
          canEditKPIs: false,
          canManageTeam: false,
          canViewFinancials: false,
        });
        onClose();
      }
    } else {
      if (teamName.trim()) {
        onCreateTeam(teamName.trim(), teamDescription.trim());
        setTeamName('');
        setTeamDescription('');
        onClose();
      }
    }
  };

  const updatePermission = (key: keyof TeamPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const getRolePermissions = (roleId: string) => {
    const rolePermissions: Record<string, TeamPermissions> = {
      'Sales Rep': { canViewKPIs: true, canEditKPIs: false, canManageTeam: false, canViewFinancials: false },
      'Team Lead': { canViewKPIs: true, canEditKPIs: true, canManageTeam: false, canViewFinancials: true },
      'Manager': { canViewKPIs: true, canEditKPIs: true, canManageTeam: true, canViewFinancials: true },
      'Contractor': { canViewKPIs: true, canEditKPIs: false, canManageTeam: false, canViewFinancials: false },
      'Admin': { canViewKPIs: true, canEditKPIs: true, canManageTeam: true, canViewFinancials: true },
    };
    return rolePermissions[roleId] || rolePermissions['Sales Rep'];
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setPermissions(getRolePermissions(roleId));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1f2e', '#2d3748', '#4a5568']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-purple-500 rounded-full items-center justify-center mr-3">
                  <Ionicons 
                    name={mode === 'invite' ? 'person-add' : 'people'} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <Text className="text-xl font-bold text-white">
                  {mode === 'invite' ? 'Invite Team Member' : 'Create Team'}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24 }} showsVerticalScrollIndicator={false}>
            {mode === 'invite' ? (
              <View>
                {/* Email Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: 'white', fontWeight: '600', marginBottom: 8 }}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="colleague@company.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderWidth: 1,
                      borderColor: '#4B5563',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: 'white'
                    }}
                  />
                </View>

                {/* Role Selection */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: 'white', fontWeight: '600', marginBottom: 12 }}>Role</Text>
                  {roles.map((role) => (
                    <Pressable
                      key={role.id}
                      onPress={() => handleRoleSelect(role.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: selectedRole === role.id ? '#a855f7' : '#4B5563',
                        backgroundColor: selectedRole === role.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(31, 41, 55, 0.5)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontWeight: '600',
                            marginBottom: 4,
                            color: selectedRole === role.id ? '#c4b5fd' : 'white'
                          }}>
                            {role.label}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#9ca3af' }}>
                            {role.description}
                          </Text>
                        </View>
                        {selectedRole === role.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#a855f7" />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Permissions */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: 'white', fontWeight: '600', marginBottom: 12 }}>Permissions</Text>
                  <View style={{
                    backgroundColor: 'rgba(31, 41, 55, 0.5)',
                    borderWidth: 1,
                    borderColor: '#4B5563',
                    borderRadius: 12,
                    padding: 16
                  }}>
                    <View style={{ gap: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: '500' }}>View KPIs</Text>
                          <Text style={{ fontSize: 14, color: '#9ca3af' }}>Can view team performance metrics</Text>
                        </View>
                        <Switch
                          value={permissions.canViewKPIs}
                          onValueChange={(value) => updatePermission('canViewKPIs', value)}
                          trackColor={{ false: '#374151', true: '#a855f7' }}
                          thumbColor={permissions.canViewKPIs ? '#ffffff' : '#9ca3af'}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: '500' }}>Edit KPIs</Text>
                          <Text style={{ fontSize: 14, color: '#9ca3af' }}>Can modify KPI targets and settings</Text>
                        </View>
                        <Switch
                          value={permissions.canEditKPIs}
                          onValueChange={(value) => updatePermission('canEditKPIs', value)}
                          trackColor={{ false: '#374151', true: '#a855f7' }}
                          thumbColor={permissions.canEditKPIs ? '#ffffff' : '#9ca3af'}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: '500' }}>Manage Team</Text>
                          <Text style={{ fontSize: 14, color: '#9ca3af' }}>Can invite/remove team members</Text>
                        </View>
                        <Switch
                          value={permissions.canManageTeam}
                          onValueChange={(value) => updatePermission('canManageTeam', value)}
                          trackColor={{ false: '#374151', true: '#a855f7' }}
                          thumbColor={permissions.canManageTeam ? '#ffffff' : '#9ca3af'}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'white', fontWeight: '500' }}>View Financials</Text>
                          <Text style={{ fontSize: 14, color: '#9ca3af' }}>Can see revenue and expense data</Text>
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
                </View>
              </View>
            ) : (
              <View>
                {/* Team Name */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: 'white', fontWeight: '600', marginBottom: 8 }}>Team Name</Text>
                  <TextInput
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="Sales Team Alpha"
                    placeholderTextColor="#9ca3af"
                    style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderWidth: 1,
                      borderColor: '#4B5563',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: 'white'
                    }}
                  />
                </View>

                {/* Team Description */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: 'white', fontWeight: '600', marginBottom: 8 }}>Description (Optional)</Text>
                  <TextInput
                    value={teamDescription}
                    onChangeText={setTeamDescription}
                    placeholder="Describe the team's focus and goals..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderWidth: 1,
                      borderColor: '#4B5563',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: 'white',
                      textAlignVertical: 'top'
                    }}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#4B5563' }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: '#374151',
                  borderRadius: 12,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={mode === 'invite' ? !email.trim() : !teamName.trim()}
                style={{
                  flex: 1,
                  backgroundColor: (mode === 'invite' ? email.trim() : teamName.trim()) ? '#a855f7' : '#4B5563',
                  borderRadius: 12,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons 
                  name={mode === 'invite' ? 'mail' : 'people'} 
                  size={20} 
                  color="white" 
                />
                <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
                  {mode === 'invite' ? 'Send Invite' : 'Create Team'}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};