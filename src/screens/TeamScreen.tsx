import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTeamStore, Team, TeamMember } from '../state/teamStore';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { TeamMemberModal } from '../components/TeamMemberModal';

interface TeamCardProps {
  team: Team;
  onPress: () => void;
  onDelete: () => void;
  onLeave: () => void;
  isOwner: boolean;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, onDelete, onLeave, isOwner }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalRevenue = team.members.reduce((sum, member) => sum + member.performance.revenue, 0);
  const totalLeads = team.members.reduce((sum, member) => sum + member.performance.leadsGenerated, 0);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 active:scale-98"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 bg-purple-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="people" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">{team.name}</Text>
              <Text className="text-sm text-gray-600">{team.members.length} members</Text>
            </View>
          </View>
          {team.description && (
            <Text className="text-sm text-gray-600 mb-3">{team.description}</Text>
          )}
        </View>
        
        <View className="flex-row space-x-2">
          <Pressable
            onPress={onPress}
            className="bg-blue-100 px-3 py-1 rounded-lg"
          >
            <Text className="text-blue-700 text-sm font-medium">Manage</Text>
          </Pressable>
          
          <Pressable
            onPress={isOwner ? onDelete : onLeave}
            className="bg-red-100 px-3 py-1 rounded-lg"
          >
            <Text className="text-red-700 text-sm font-medium">
              {isOwner ? 'Delete' : 'Leave'}
            </Text>
          </Pressable>
        </View>
      </View>
      
      <View className="flex-row justify-between pt-3 border-t border-gray-100">
        <View className="items-center">
          <Text className="text-xs text-gray-500">Revenue</Text>
          <Text className="text-sm font-semibold text-green-600">
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-gray-500">Leads</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {totalLeads}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-gray-500">Created</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {new Date(team.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              year: 'numeric' 
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

interface PerformanceMetricProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const PerformanceMetric: React.FC<PerformanceMetricProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
}) => (
  <View className="bg-white rounded-xl p-4 flex-1 mx-1 shadow-sm border border-gray-100">
    <View className="flex-row items-center justify-between mb-2">
      <View className={cn("w-8 h-8 rounded-full items-center justify-center", color)}>
        <Ionicons name={icon} size={16} color="white" />
      </View>
    </View>
    <Text className="text-xl font-bold text-gray-900 mb-1">{value}</Text>
    <Text className="text-sm text-gray-600">{title}</Text>
    {subtitle && (
      <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
    )}
  </View>
);

export const TeamScreen: React.FC = () => {
  const { 
    teams,
    currentUserId,
    createTeam,
    deleteTeam,
    leaveTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    getUserTeams,
    setCurrentUser,
    updateCurrentUserData
  } = useTeamStore();
  
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (user?.id && user.id !== currentUserId) {
      setCurrentUser(user.id);
    }
    
    // Update existing team member data with real user info
    if (user?.email && user?.name) {
      updateCurrentUserData(user.email, user.name);
    }
  }, [user?.id, user?.email, user?.name, currentUserId, setCurrentUser, updateCurrentUserData]);

  const userTeams = getUserTeams();

  const filteredTeams = userTeams.filter(team =>
    searchQuery === '' ||
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTeam = (name: string, description?: string) => {
    createTeam(name, description, user?.email, user?.name);
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTeam(teamId),
        },
      ]
    );
  };

  const handleLeaveTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    Alert.alert(
      'Leave Team',
      `Are you sure you want to leave "${team.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveTeam(teamId),
        },
      ]
    );
  };

  const handleTeamPress = (team: Team) => {
    setSelectedTeam(team);
    setShowMemberModal(true);
  };

  const handleAddMember = (teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>) => {
    addMemberToTeam(teamId, member);
  };

  const handleRemoveMember = (teamId: string, memberId: string) => {
    removeMemberFromTeam(teamId, memberId);
  };

  const isTeamOwner = (team: Team) => {
    return currentUserId === team.ownerId;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const allMembers = userTeams.flatMap(team => team.members);
  const totalRevenue = allMembers.reduce((sum, member) => sum + member.performance.revenue, 0);
  const totalLeads = allMembers.reduce((sum, member) => sum + member.performance.leadsGenerated, 0);
  const averageRevenue = allMembers.length > 0 ? totalRevenue / allMembers.length : 0;

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-600">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-white">Teams</Text>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="bg-green-500 px-4 py-2 rounded-xl flex-row items-center"
            >
              <Ionicons name="people" size={18} color="white" />
              <Text className="text-white font-medium ml-1">Create Team</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              placeholder="Search teams..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Performance Metrics */}
          {userTeams.length > 0 && (
            <View className="px-6 py-4">
              <Text className="text-lg font-semibold text-white mb-4">
                Overall Performance
              </Text>
              <View className="flex-row">
                <PerformanceMetric
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  subtitle={`${allMembers.length} members`}
                  icon="trending-up"
                  color="bg-green-500"
                />
                <PerformanceMetric
                  title="Teams"
                  value={userTeams.length.toString()}
                  subtitle="active teams"
                  icon="people"
                  color="bg-blue-500"
                />
                <PerformanceMetric
                  title="Avg Revenue"
                  value={formatCurrency(averageRevenue)}
                  subtitle="per member"
                  icon="analytics"
                  color="bg-purple-500"
                />
              </View>
            </View>
          )}

          {/* Teams List */}
          <View className="px-6">
            <Text className="text-lg font-semibold text-white mb-4">Your Teams</Text>
            
            {filteredTeams.length === 0 ? (
              <View className="items-center justify-center py-12">
                <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
                  <Ionicons name="people-outline" size={24} color="#9ca3af" />
                </View>
                <Text className="text-lg font-medium text-white mb-2">
                  {userTeams.length === 0 ? 'No teams yet' : 'No teams found'}
                </Text>
                <Text className="text-gray-300 text-center mb-6">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Create your first team to get started"}
                </Text>
                {!searchQuery && (
                  <Pressable
                    onPress={() => setShowCreateModal(true)}
                    className="bg-purple-500 px-6 py-3 rounded-xl"
                  >
                    <Text className="text-white font-medium">Create Team</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <Text className="text-sm text-gray-300 mb-4">
                  {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
                </Text>
                {filteredTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onPress={() => handleTeamPress(team)}
                    onDelete={() => handleDeleteTeam(team.id)}
                    onLeave={() => handleLeaveTeam(team.id)}
                    isOwner={isTeamOwner(team)}
                  />
                ))}
              </>
            )}
          </View>
          
          <View className="h-20" />
        </ScrollView>

        {/* Create Team Modal */}
        <CreateTeamModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTeam={handleCreateTeam}
        />

        {/* Team Member Modal */}
        <TeamMemberModal
          visible={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          team={selectedTeam}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          isOwner={selectedTeam ? isTeamOwner(selectedTeam) : false}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};