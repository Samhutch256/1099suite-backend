import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  isActive: boolean;
  performance: {
    revenue: number;
    leadsGenerated: number;
    expenses: number;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: TeamMember[];
  ownerId: string;
}

interface TeamStore {
  teams: Team[];
  currentUserId: string | null;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  createTeam: (name: string, description?: string, userEmail?: string, userName?: string) => void;
  deleteTeam: (teamId: string) => void;
  addMemberToTeam: (teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>) => void;
  removeMemberFromTeam: (teamId: string, memberId: string) => void;
  leaveTeam: (teamId: string) => void;
  updateTeamMember: (teamId: string, memberId: string, updates: Partial<TeamMember>) => void;
  updateCurrentUserData: (userEmail: string, userName: string) => void;
  
  // Getters
  getUserTeams: () => Team[];
  getTeamById: (teamId: string) => Team | undefined;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      teams: [],
      currentUserId: null,
      
      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
      },
      
      createTeam: (name: string, description?: string, userEmail?: string, userName?: string) => {
        const { currentUserId } = get();
        if (!currentUserId) return;
        
        const newTeam: Team = {
          id: Date.now().toString(),
          name,
          description,
          createdAt: new Date().toISOString(),
          members: [{
            id: currentUserId,
            name: userName || 'You',
            email: userEmail || 'your.email@company.com',
            role: 'Owner',
            joinedAt: new Date().toISOString(),
            isActive: true,
            performance: {
              revenue: 0,
              leadsGenerated: 0,
              expenses: 0,
            },
          }],
          ownerId: currentUserId,
        };
        
        set((state) => ({
          teams: [...state.teams, newTeam],
        }));
      },
      
      deleteTeam: (teamId: string) => {
        const { currentUserId } = get();
        const team = get().getTeamById(teamId);
        
        if (!team || team.ownerId !== currentUserId) return;
        
        set((state) => ({
          teams: state.teams.filter(t => t.id !== teamId),
        }));
      },
      
      addMemberToTeam: (teamId: string, memberData: Omit<TeamMember, 'id' | 'joinedAt'>) => {
        const newMember: TeamMember = {
          ...memberData,
          id: Date.now().toString(),
          joinedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId
              ? { ...team, members: [...team.members, newMember] }
              : team
          ),
        }));
      },
      
      removeMemberFromTeam: (teamId: string, memberId: string) => {
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId
              ? { ...team, members: team.members.filter(m => m.id !== memberId) }
              : team
          ),
        }));
      },
      
      leaveTeam: (teamId: string) => {
        const { currentUserId } = get();
        if (!currentUserId) return;
        
        const team = get().getTeamById(teamId);
        if (!team) return;
        
        // If owner is leaving, transfer ownership to first member or delete team
        if (team.ownerId === currentUserId) {
          const otherMembers = team.members.filter(m => m.id !== currentUserId);
          
          if (otherMembers.length > 0) {
            // Transfer ownership to first member
            set((state) => ({
              teams: state.teams.map(t =>
                t.id === teamId
                  ? {
                      ...t,
                      ownerId: otherMembers[0].id,
                      members: otherMembers.map((m, index) => 
                        index === 0 ? { ...m, role: 'Owner' } : m
                      ),
                    }
                  : t
              ),
            }));
          } else {
            // Delete team if no other members
            get().deleteTeam(teamId);
          }
        } else {
          // Regular member leaving
          get().removeMemberFromTeam(teamId, currentUserId);
        }
      },
      
      updateTeamMember: (teamId: string, memberId: string, updates: Partial<TeamMember>) => {
        set((state) => ({
          teams: state.teams.map(team =>
            team.id === teamId
              ? {
                  ...team,
                  members: team.members.map(member =>
                    member.id === memberId ? { ...member, ...updates } : member
                  ),
                }
              : team
          ),
        }));
      },
      
      updateCurrentUserData: (userEmail: string, userName: string) => {
        const { currentUserId } = get();
        if (!currentUserId) return;
        
        set((state) => ({
          teams: state.teams.map(team => ({
            ...team,
            members: team.members.map(member =>
              member.id === currentUserId
                ? {
                    ...member,
                    email: userEmail,
                    name: userName,
                  }
                : member
            ),
          })),
        }));
      },
      
      getUserTeams: () => {
        const { currentUserId, teams } = get();
        if (!currentUserId) return [];
        
        return teams.filter(team =>
          team.members.some(member => member.id === currentUserId)
        );
      },
      
      getTeamById: (teamId: string) => {
        return get().teams.find(team => team.id === teamId);
      },
    }),
    {
      name: 'team-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        teams: state.teams,
      }),
    }
  )
);