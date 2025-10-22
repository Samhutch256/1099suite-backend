import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Team, TeamMember } from '../state/teamStore';
import { cn } from '../utils/cn';
import { invitationService } from '../services/invitationService';
import { LoadingSpinner } from './LoadingSpinner';

interface TeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  team: Team | null;
  onAddMember: (teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>) => void;
  onRemoveMember: (teamId: string, memberId: string) => void;
  isOwner: boolean;
}

const MemberCard: React.FC<{
  member: TeamMember;
  onRemove: () => void;
  canRemove: boolean;
}> = ({ member, onRemove, canRemove }) => {
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
      'Owner': 'bg-purple-500',
      'Manager': 'bg-blue-500',
      'Sales Rep': 'bg-green-500',
      'Member': 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  return (
    <View className="bg-slate-700 rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className={cn("w-10 h-10 rounded-full items-center justify-center mr-3", getRoleColor(member.role))}>
            <Text className="text-white font-semibold text-sm">{getInitials(member.name)}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-white font-medium mr-2">{member.name}</Text>
              {member.isActive ? (
                <View className="w-2 h-2 bg-green-500 rounded-full" />
              ) : (
                <View className="bg-yellow-500 px-2 py-1 rounded-full">
                  <Text className="text-xs text-yellow-900 font-medium">Pending</Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-gray-400 mb-1">{member.role}</Text>
            <Text className="text-xs text-gray-500">{member.email}</Text>
            {!member.isActive && (
              <Text className="text-xs text-yellow-400 mt-1">Invitation sent</Text>
            )}
          </View>
        </View>
        
        {canRemove && member.role !== 'Owner' && (
          <Pressable
            onPress={onRemove}
            className="bg-red-500 px-3 py-2 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  visible,
  onClose,
  team,
  onAddMember,
  onRemoveMember,
  isOwner,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [isInviting, setIsInviting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleAddMember = async () => {
    if (!team || !newMemberName.trim() || !newMemberEmail.trim() || isInviting) return;

    // Check if email already exists
    const emailExists = team.members.some(
      member => member.email.toLowerCase() === newMemberEmail.trim().toLowerCase()
    );
    
    if (emailExists) {
      Alert.alert(
        'Email Already Added',
        `${newMemberEmail.trim()} is already a member of this team.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsInviting(true);
    
    try {
      const newMember = {
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        role: newMemberRole,
        isActive: false, // Initially inactive until they accept invitation
        performance: {
          revenue: 0,
          leadsGenerated: 0,
          expenses: 0,
        },
      };

      // Send email invitation
      await invitationService.sendTeamInvitation({
        teamId: team.id,
        teamName: team.name,
        inviterName: 'You', // In a real app, get from user context
        inviteeEmail: newMemberEmail.trim(),
        inviteeName: newMemberName.trim(),
        role: newMemberRole,
      });
      
      onAddMember(team.id, newMember);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberRole('Member');
      setEmailError('');
      setShowAddForm(false);

      Alert.alert(
        'Invitation Sent! 📧',
        `${newMemberName.trim()} has been invited to join "${team.name}" as a ${newMemberRole}.\n\nThey will receive an email at ${newMemberEmail.trim()} with instructions to join the team. The invitation expires in 7 days.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send invitation. Please check the email address and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsInviting(false);
    }
  };



  const handleRemoveMember = (memberId: string) => {
    if (!team) return;
    
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this team member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveMember(team.id, memberId),
        },
      ]
    );
  };

  const roles = ['Member', 'Sales Rep', 'Manager'];

  if (!team) return null;

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
              <View>
                <Text className="text-xl font-semibold text-white">{team.name}</Text>
                <Text className="text-sm text-gray-400">{team.members.length} members</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            {/* Add Member Button */}
            {isOwner && !showAddForm && (
              <Pressable
                onPress={() => setShowAddForm(true)}
                className="bg-purple-500 rounded-xl p-4 mb-6 flex-row items-center justify-center"
              >
                <Ionicons name="person-add" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-lg">Add Member</Text>
              </Pressable>
            )}

            {/* Add Member Form */}
            {showAddForm && (
              <View className="bg-slate-700 rounded-xl p-4 mb-6">
                <Text className="text-lg font-semibold text-white mb-4">Add Team Member</Text>
                
                <View className="mb-4">
                  <Text className="text-sm text-gray-300 mb-2">Name</Text>
                  <TextInput
                    value={newMemberName}
                    onChangeText={setNewMemberName}
                    placeholder="Enter name"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-600 text-white px-3 py-3 rounded-lg"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-300 mb-2">Email</Text>
                  <TextInput
                    value={newMemberEmail}
                    onChangeText={(text) => {
                      setNewMemberEmail(text);
                      setEmailError('');
                      // Basic email validation
                      if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
                        setEmailError('Please enter a valid email address');
                      }
                    }}
                    placeholder="Enter email"
                    placeholderTextColor="#94a3b8"
                    className={cn(
                      "bg-slate-600 text-white px-3 py-3 rounded-lg",
                      emailError ? "border border-red-500" : ""
                    )}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {emailError && (
                    <Text className="text-red-400 text-xs mt-1">{emailError}</Text>
                  )}
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-300 mb-2">Role</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {roles.map((role) => (
                      <Pressable
                        key={role}
                        onPress={() => setNewMemberRole(role)}
                        className={cn(
                          "px-4 py-2 rounded-full mr-3",
                          newMemberRole === role ? "bg-purple-500" : "bg-slate-600"
                        )}
                      >
                        <Text className={cn(
                          "text-sm font-medium",
                          newMemberRole === role ? "text-white" : "text-gray-300"
                        )}>
                          {role}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View className="flex-row space-x-3">
                  <Pressable
                    onPress={handleAddMember}
                    disabled={!newMemberName.trim() || !newMemberEmail.trim() || isInviting || !!emailError}
                    className={cn(
                      "flex-1 py-3 rounded-lg flex-row items-center justify-center",
                      (newMemberName.trim() && newMemberEmail.trim() && !isInviting && !emailError) 
                        ? "bg-green-500" 
                        : "bg-gray-600"
                    )}
                  >
                    {isInviting && (
                      <View className="mr-2">
                        <LoadingSpinner size={16} color="white" />
                      </View>
                    )}
                    <Text className="text-white font-medium text-center">
                      {isInviting ? 'Sending...' : 'Send Invitation'}
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => {
                      setShowAddForm(false);
                      setNewMemberName('');
                      setNewMemberEmail('');
                      setNewMemberRole('Member');
                      setEmailError('');
                      setIsInviting(false);
                    }}
                    disabled={isInviting}
                    className={cn(
                      "flex-1 py-3 rounded-lg border border-gray-600",
                      isInviting ? "opacity-50" : ""
                    )}
                  >
                    <Text className="text-gray-300 font-medium text-center">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Members List */}
            <Text className="text-lg font-semibold text-white mb-4">Team Members</Text>
            {team.members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onRemove={() => handleRemoveMember(member.id)}
                canRemove={isOwner}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};