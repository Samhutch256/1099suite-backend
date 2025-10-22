import { create } from 'zustand';
import { generateUniqueId } from '../utils/generateId';
import { notificationService } from '../services/notificationService';
import { databaseService } from '../services/database';
import { supabaseService } from '../services/supabaseService';
import { LeadStage, ProgressionStage, CancellationStage, getProgressionStages } from '../types/pipeline';

// Helper function to check if user ID is in old format (non-UUID)
const isOldUserIdFormat = (userId: string): boolean => {
  return userId.startsWith('user_') && !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
};

// Utility function to validate UUID format for Supabase
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
import { supabase } from '../config/supabase';

export interface FollowUpReminder {
  id: string;
  date: string;
  time: string;
  type: 'call' | 'email' | 'meeting' | 'other';
  notes: string;
  completed: boolean;
  completedAt?: string;
  notificationId?: string; // ID for scheduled notification
  createdAt: string;
}

export interface LeadRevenue {
  guaranteedRevenue: number;        // Revenue guaranteed (signed contracts)
  pipelineRevenue: number;          // Potential revenue (all active leads)
  guaranteedPaidOut: boolean;       // Whether guaranteed revenue has been paid out
  pipelinePaidOut: boolean;         // Whether pipeline revenue has been paid out
  totalRevenue: number;             // Sum of guaranteed + pipeline revenue
  paidOutRevenue: number;           // Calculated: sum of paid out amounts
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address?: string;
  status: LeadStage;
  highestStageReached?: ProgressionStage;
  cancellationStatus?: CancellationStage;
  selectedPipelineStages?: ProgressionStage[];
  value: number;  // Keep for backward compatibility, represents total potential value
  revenue?: LeadRevenue;  // Optional for backward compatibility
  notes: string;
  createdAt: string;
  updatedAt: string;
  source: 'door_knocks' | 'tags_put' | 'calls_made' | 'referrals' | 'inbound' | 'other';
  
  // Appointment tracking
  appointmentDate?: string; // ISO date string for scheduled appointment
  appointmentTime?: string; // Time string
  appointmentNotes?: string;
  appointmentStatus?: 'scheduled' | 'held' | 'signed' | 'cancelled';
  cancelledReason?: 'cancelled_appointment' | 'cancelled_contract';
  lostReason?: 'not_interested' | 'unqualified' | 'budget' | 'competitor' | 'other';
  isCancelled?: boolean;
  appointmentCreatedFrom?: string; // Daily input ID that created this appointment
  appointmentSetOnDate?: string; // The date when the appointment was actually set (from daily input)
  
  // Legacy fields for backwards compatibility
  dateSet?: string;
  dateSetFor?: string;
  
  // File uploads
  fileUrls?: string[]; // Array of file URLs or URIs
  
  followUpReminders: FollowUpReminder[];
  nextFollowUp?: string; // Date of next pending follow-up
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  vendor_name?: string;
  card_used?: string;
  is_business: boolean;
  client_id?: string;
  timestamp: string; // ISO string
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  joinedAt: string;
  performance: {
    leadsGenerated: number;
    revenue: number;
    expenses: number;
    dealsWon: number;
    appointmentsHeld: number;
  };
  permissions?: {
    canViewKPIs: boolean;
    canEditKPIs: boolean;
    canManageTeam: boolean;
    canViewFinancials: boolean;
  };
  inviteStatus?: 'pending' | 'accepted' | 'declined';
  invitedAt?: string;
  invitedBy?: string;
}

export interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeLeads: number;
  conversionRate: number;
  monthlyGrowth: number;
  // New revenue metrics
  guaranteedRevenue: number;
  pipelineRevenue: number;
  paidOutRevenue: number;
  revenueBreakdown: {
    guaranteedRevenue: number;
    pipelineRevenue: number;
    paidOutRevenue: number;
    totalRevenue: number;
  };
}

interface ContractorState {
  // User context
  currentUserId: string | null;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime: string | null;
  
  // CRM Data
  leads: Lead[];
  
  // Expense Data
  expenses: Expense[];
  clients: Client[];
  expenseCategories: ExpenseCategory[];
  
  // Team Data
  teamMembers: TeamMember[];
  currentOffice: string;
  
  // User management
  setCurrentUser: (userId: string) => void;
  clearUserData: () => void;
  loadUserData: (userId: string) => Promise<void>;
  saveUserData: () => Promise<void>;
  
  // Supabase sync methods
  syncWithSupabase: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'followUpReminders'>) => Promise<Lead>;
  fixCancelledLeadRevenue: (leadId: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  
  // Follow-up Actions
  addFollowUpReminder: (leadId: string, reminder: Omit<FollowUpReminder, 'id' | 'createdAt' | 'notificationId'>) => Promise<void>;
  updateFollowUpReminder: (leadId: string, reminderId: string, updates: Partial<FollowUpReminder>) => void;
  deleteFollowUpReminder: (leadId: string, reminderId: string) => Promise<void>;
  completeFollowUpReminder: (leadId: string, reminderId: string, notes?: string) => Promise<void>;
  getUpcomingFollowUps: (days?: number) => Array<{ lead: Lead; reminder: FollowUpReminder }>;
  getOverdueFollowUps: () => Array<{ lead: Lead; reminder: FollowUpReminder }>;
  
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at'>) => Promise<void>;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  
  addTeamMember: (member: Omit<TeamMember, 'id' | 'joinedAt'>) => void;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;
  inviteTeamMember: (email: string, role: string, permissions: any) => Promise<void>;
  acceptTeamInvite: (inviteId: string) => void;
  updateMemberPermissions: (memberId: string, permissions: any) => void;
  transferTeamOwnership: (newOwnerId: string) => void;
  
  setCurrentOffice: (office: string) => void;
  
  // Computed values
  getKPIData: () => KPIData;
  getLeadsByStatus: (status: Lead['status']) => Lead[];
  getExpensesByCategory: () => Record<string, number>;
  getTeamPerformance: () => TeamMember[];
}

// Helper function to get the next pending follow-up date
const getNextFollowUpDate = (reminders: FollowUpReminder[]): string | undefined => {
  const now = new Date();
  const pending = reminders
    .filter(reminder => !reminder.completed)
    .map(reminder => new Date(`${reminder.date}T${reminder.time}`))
    .filter(date => date >= now)
    .sort((a, b) => a.getTime() - b.getTime());
    
  return pending.length > 0 ? pending[0].toISOString() : undefined;
};

// Helper function to migrate old leads to new revenue structure
const migrateLeadRevenue = (lead: Lead): Lead => {
  if (lead.revenue && 'guaranteedPaidOut' in lead.revenue) {
    return lead; // Already has new revenue structure
  }
  
  const leadValue = lead.value || 0;
  const isCancelled = lead.isCancelled || 
    ['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status);
  
  // Preserve guaranteed revenue even for cancelled leads if they had signed deals
  const guaranteedRevenue = ['signed_deal', 'installed'].includes(lead.status) ? leadValue : 0;
  
  // Pipeline revenue should be 0 for cancelled leads (no future potential)
  const pipelineRevenue = !['signed_deal', 'installed'].includes(lead.status) && 
                         !isCancelled &&
                         !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status) ? leadValue : 0;
  
  // Check if there's existing revenue data to preserve
  const existingRevenue = lead.revenue as LeadRevenue | undefined;
  const finalGuaranteedRevenue = typeof existingRevenue?.guaranteedRevenue === 'number'
    ? existingRevenue.guaranteedRevenue
    : guaranteedRevenue;
  const finalPipelineRevenue = typeof existingRevenue?.pipelineRevenue === 'number'
    ? existingRevenue.pipelineRevenue
    : pipelineRevenue;
  const totalRevenue = finalGuaranteedRevenue + finalPipelineRevenue;

  // For migration, assume installed leads have been paid out (even if later cancelled)
  const guaranteedPaidOut = lead.status === 'installed' && finalGuaranteedRevenue > 0;
  const pipelinePaidOut = false; // Pipeline revenue is never paid out by default
  
  const paidOutRevenue = (guaranteedPaidOut ? finalGuaranteedRevenue : 0) + 
                        (pipelinePaidOut ? finalPipelineRevenue : 0);
  
  return {
    ...lead,
    revenue: {
      guaranteedRevenue: finalGuaranteedRevenue,
      pipelineRevenue: finalPipelineRevenue,
      guaranteedPaidOut,
      pipelinePaidOut,
      totalRevenue,
      paidOutRevenue,
    },
  };
};

export const useContractorStore = create<ContractorState>()((set, get) => ({
      currentUserId: null,
      isOnline: true,
      syncStatus: 'idle',
      lastSyncTime: null,
      leads: [],
      expenses: [],
      clients: [],
      expenseCategories: [],
      teamMembers: [],
      currentOffice: 'Main Office',
      
      initializeAuth: async () => {
        try {
          const user = await supabaseService.getCurrentUser();
          if (user) {
            // Special case for samhutch256@gmail.com to use existing user ID
            const correctUserId = user.email?.toLowerCase() === 'samhutch256@gmail.com' 
              ? '1efa846a-b408-4196-84bd-e93e2c7d9e9b' 
              : user.id;
            set({ currentUserId: correctUserId });
            await get().syncWithSupabase();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          const { user } = await supabaseService.signInWithEmail(email, password);
          if (user) {
            // Special case for samhutch256@gmail.com to use existing user ID
            const correctUserId = email.toLowerCase() === 'samhutch256@gmail.com' 
              ? '1efa846a-b408-4196-84bd-e93e2c7d9e9b' 
              : user.id;
            set({ currentUserId: correctUserId });
            await get().syncWithSupabase();
          }
        } catch (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      },

      signUp: async (email: string, password: string, name?: string) => {
        try {
          const { user } = await supabaseService.signUpWithEmail(email, password, name);
          if (user) {
            set({ currentUserId: user.id });
            // Create user profile
            await supabaseService.createOrUpdateUser(user.id, {
              email: user.email || email,
              name: name || email.split('@')[0],
            });
            await get().syncWithSupabase();
          }
        } catch (error) {
          console.error('Sign up error:', error);
          throw error;
        }
      },

      signOut: async () => {
        try {
          await supabaseService.signOut();
          set({
            currentUserId: null,
            leads: [],
            expenses: [],
            teamMembers: [],
            currentOffice: 'Main Office',
            syncStatus: 'idle',
            lastSyncTime: null,
          });
        } catch (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      },

      setCurrentUser: (userId: string) => {
        const state = get();
        if (state.currentUserId !== userId) {
          // Only update currentUserId and currentOffice, do not clear leads/expenses/teamMembers
          set({
            currentUserId: userId,
            currentOffice: 'Main Office',
          });
          // Sync with Supabase
          get().syncWithSupabase();
        }
      },

      syncWithSupabase: async () => {
        const state = get();
        if (!state.currentUserId) return;

        // Validate UUID format before attempting Supabase sync
        if (!isValidUUID(state.currentUserId)) {
          console.warn('⚠️ Invalid UUID format, falling back to local SQLite sync:', state.currentUserId);
          try {
            // Fallback to local data loading
            await get().loadUserData(state.currentUserId);
          } catch (error) {
            console.error('❌ Local fallback sync failed:', error);
            set({ syncStatus: 'error' });
          }
          return;
        }

        set({ syncStatus: 'syncing' });

        try {
          console.log('🔄 Syncing data from Supabase (primary storage) for user:', state.currentUserId);
          const data = await supabaseService.syncUserData(state.currentUserId);
          
          // Cache data locally for offline access
          try {
            for (const lead of data.leads) {
              await databaseService.saveLead(state.currentUserId, lead, false);
            }
            for (const expense of data.expenses) {
              await databaseService.saveExpense(state.currentUserId, expense, false);
              // The following properties may not exist on data, so check before iterating
              if (Array.isArray((data as any).clients)) {
                for (const client of (data as any).clients) {
                  await databaseService.saveClient(state.currentUserId, client, false);
                }
              }
              if (Array.isArray((data as any).expenseCategories)) {
                for (const category of (data as any).expenseCategories) {
                  await databaseService.saveExpenseCategory(state.currentUserId, category, false);
                }
              }
            }
            console.log('✅ Data cached locally for offline access');
          } catch (cacheError) {
            console.warn('⚠️ Failed to cache data locally:', cacheError);
          }
          
          set({
            leads: data.leads,
            expenses: data.expenses,
            clients: (data as any).clients || [],
            expenseCategories: (data as any).expenseCategories || [],
            teamMembers: (data as any).teamMembers || [],
            syncStatus: 'idle',
            lastSyncTime: new Date().toISOString(),
          });
          
          console.log(`✅ Successfully synced ${data.leads.length} leads, ${data.expenses.length} expenses from Supabase`);
        } catch (error) {
          console.error('❌ Sync error with Supabase, falling back to local data:', error);
          
          // Fallback to local SQLite data
          try {
            await get().loadUserData(state.currentUserId);
            set({ syncStatus: 'idle' });
            console.log('✅ Fallback to local data successful');
          } catch (localError) {
            console.error('❌ Local fallback sync also failed:', localError);
            set({ syncStatus: 'error' });
            throw error;
          }
        }
      },
      
      clearUserData: () => {
        set({
          currentUserId: null,
          leads: [],
          expenses: [],
          clients: [],
          expenseCategories: [],
          teamMembers: [],
          currentOffice: 'Main Office',
        });
      },
      
      loadUserData: async (userId: string) => {
        try {
          console.log(`📂 Loading user data from Supabase (primary) for: ${userId}`);
          
          // Load data from Supabase first, fallback to local SQLite
          const [leads, expenses, teamMembers, clients, expenseCategories] = await Promise.all([
            databaseService.getLeadsSupabaseFirst(userId),
            databaseService.getExpensesSupabaseFirst(userId),
            databaseService.getTeamMembers(userId), // Keep team members local for now
            databaseService.getClients(userId),
            databaseService.getExpenseCategories(userId)
          ]);
          
          // Load follow-up reminders for all leads
          console.log(`📂 Loading follow-up reminders for ${leads.length} leads...`);
          const remindersPromises = leads.map(async (lead) => {
            try {
              const reminders = await supabaseService.getFollowUpReminders(userId, lead.id);
              return { leadId: lead.id, reminders };
            } catch (error) {
              console.warn(`Failed to load reminders for lead ${lead.id}:`, error);
              return { leadId: lead.id, reminders: [] };
            }
          });
          
          const remindersResults = await Promise.all(remindersPromises);
          
          // Create a map of lead ID to reminders
          const remindersMap = new Map();
          remindersResults.forEach(({ leadId, reminders }) => {
            remindersMap.set(leadId, reminders);
          });
          
          // Migrate leads to new revenue structure and add reminders
          let migratedLeads = leads.map(lead => {
            const leadReminders = remindersMap.get(lead.id) || [];
            return {
              ...migrateLeadRevenue(lead),
              followUpReminders: leadReminders,
              nextFollowUp: getNextFollowUpDate(leadReminders)
            };
          });
          
          console.log(`📂 Loaded ${migratedLeads.length} leads with reminders from database`);
          console.log(`📂 Total reminders loaded: ${remindersResults.reduce((sum, { reminders }) => sum + reminders.length, 0)}`);
          
          // Fix cancelled leads with pipeline revenue that should be guaranteed
          migratedLeads = migratedLeads.map(lead => {
            const isCancelled = lead.isCancelled || 
              ['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status);
            
            if (isCancelled && lead.revenue && lead.revenue.pipelineRevenue > 0 && lead.revenue.pipelinePaidOut) {
              return {
                ...lead,
                revenue: {
                  ...lead.revenue,
                  guaranteedRevenue: lead.revenue.pipelineRevenue,
                  pipelineRevenue: 0,
                  guaranteedPaidOut: true,
                  pipelinePaidOut: false,
                  totalRevenue: lead.revenue.pipelineRevenue,
                  paidOutRevenue: lead.revenue.pipelineRevenue
                }
              };
            }
            return lead;
          });
          
          set({
            currentUserId: userId,
            leads: migratedLeads,
            expenses: expenses,
            clients: clients,
            expenseCategories: expenseCategories,
            teamMembers: teamMembers,
            currentOffice: 'Main Office', // Could be stored in user settings later
          });
          
          console.log(`📂 Successfully loaded data from database`);
        } catch (error) {
          console.error('Failed to load user contractor data from database:', error);
          // Fallback to empty state
          set({
            currentUserId: userId,
            leads: [],
            expenses: [],
            teamMembers: [],
            currentOffice: 'Main Office',
          });
        }
      },
      
      saveUserData: async () => {
        const state = get();
        if (!state.currentUserId) return;
        
        try {
          console.log(`💾 Saving ${state.leads.length} leads for user: ${state.currentUserId}`);
          
          // Check for leads with date fields
          const leadsWithDates = state.leads.filter(lead => lead.dateSet || lead.dateSetFor);
          if (leadsWithDates.length > 0) {
            console.log('📅 [saveUserData] Leads with date fields:', leadsWithDates.map(lead => ({
              id: lead.id,
              name: lead.name,
              dateSet: lead.dateSet,
              dateSetFor: lead.dateSetFor
            })));
          }
          
          // ALWAYS try Supabase first
          if (state.leads.length > 0) {
            console.log('🔄 Saving leads to Supabase (primary)...');
            try {
              // Save each lead to Supabase
              for (const lead of state.leads) {
                try {
                  // Create updates object with all lead fields
                  const updates: Partial<Lead> = {
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    company: lead.company,
                    address: lead.address,
                    status: lead.status,
                    highestStageReached: lead.highestStageReached,
                    cancellationStatus: lead.cancellationStatus,
                    selectedPipelineStages: lead.selectedPipelineStages,
                    value: lead.value,
                    revenue: lead.revenue,
                    notes: lead.notes,
                    source: lead.source,
                    appointmentDate: lead.appointmentDate,
                    appointmentTime: lead.appointmentTime,
                    appointmentNotes: lead.appointmentNotes,
                    appointmentStatus: lead.appointmentStatus,
                    cancelledReason: lead.cancelledReason,
                    lostReason: lead.lostReason,
                    isCancelled: lead.isCancelled,
                    appointmentCreatedFrom: lead.appointmentCreatedFrom,
                    appointmentSetOnDate: lead.appointmentSetOnDate,
                    dateSet: lead.dateSet,
                    dateSetFor: lead.dateSetFor,
                    fileUrls: lead.fileUrls,
                    followUpReminders: lead.followUpReminders,
                    nextFollowUp: lead.nextFollowUp,
                    updatedAt: new Date().toISOString(),
                  };
                  
                  await supabaseService.updateLead(state.currentUserId!, lead.id, updates);
                  console.log(`✅ Saved lead ${lead.name} to Supabase`);
                } catch (error) {
                  console.error(`❌ Failed to save lead ${lead.name} to Supabase:`, error);
                  throw error; // Re-throw to trigger local fallback
                }
              }
              console.log('✅ Successfully saved all leads to Supabase');
              
              // If Supabase succeeds, also save to local for offline access
              console.log('💾 Also caching to local database for offline access...');
              await Promise.all([
                ...state.leads.map(lead => databaseService.saveLead(state.currentUserId!, lead)),
                ...state.expenses.map(expense => databaseService.saveExpense(state.currentUserId!, expense)),
                ...state.clients.map(client => databaseService.saveClient(state.currentUserId!, client)),
                ...state.expenseCategories.map(category => databaseService.saveExpenseCategory(state.currentUserId!, category)),
                ...state.teamMembers.map(member => databaseService.saveTeamMember(state.currentUserId!, member))
              ]);
              console.log('✅ Successfully cached data locally');
              
            } catch (supabaseError) {
              console.error('❌ Supabase save failed, falling back to local only:', supabaseError);
              
              // Fallback to local database only
              await Promise.all([
                ...state.leads.map(lead => databaseService.saveLead(state.currentUserId!, lead)),
                ...state.expenses.map(expense => databaseService.saveExpense(state.currentUserId!, expense)),
                ...state.clients.map(client => databaseService.saveClient(state.currentUserId!, client)),
                ...state.expenseCategories.map(category => databaseService.saveExpenseCategory(state.currentUserId!, category)),
                ...state.teamMembers.map(member => databaseService.saveTeamMember(state.currentUserId!, member))
              ]);
              console.log('✅ Saved to local database (offline mode)');
            }
          } else {
            // No leads to save, just cache other data locally
            await Promise.all([
              ...state.expenses.map(expense => databaseService.saveExpense(state.currentUserId!, expense)),
              ...state.clients.map(client => databaseService.saveClient(state.currentUserId!, client)),
              ...state.expenseCategories.map(category => databaseService.saveExpenseCategory(state.currentUserId!, category)),
              ...state.teamMembers.map(member => databaseService.saveTeamMember(state.currentUserId!, member))
            ]);
            console.log('✅ Cached non-lead data locally');
          }
        } catch (error) {
          console.error('Failed to save user contractor data:', error);
        }
      },
      
      addLead: async (leadData) => {
        // Always get the authenticated user's ID directly from Supabase
        const user = await supabaseService.getCurrentUser();
        if (!user) throw new Error('No authenticated user');

        console.log('📝 [ContractorStore] addLead called with data:', leadData);
        console.log('📅 [ContractorStore] Date Set:', leadData.dateSet);
        console.log('📅 [ContractorStore] Date Set For:', leadData.dateSetFor);

        // Compute pipeline and revenue fields as before
        let finalStatus: Lead['status'] = leadData.status || 'new';
        let highestStageReached: Lead['highestStageReached'] = 'new';
        if (leadData.selectedPipelineStages && leadData.selectedPipelineStages.length > 0) {
          const stageOrder: Lead['status'][] = getProgressionStages().map(stage => stage.key);
          const selectedIndices = leadData.selectedPipelineStages.map(stage => stageOrder.indexOf(stage as Lead['status'])).filter(index => index !== -1);
          if (selectedIndices.length > 0) {
            const highestIndex = Math.max(...selectedIndices);
            finalStatus = stageOrder[highestIndex];
            highestStageReached = stageOrder[highestIndex] as Lead['highestStageReached'];
          }
        }
        // Use the revenue data provided by the user instead of calculating based on status
        const userRevenue = leadData.revenue;
        const guaranteedRevenue: number = userRevenue?.guaranteedRevenue || 0;
        const pipelineRevenue: number = userRevenue?.pipelineRevenue || 0;
        const totalRevenue: number = guaranteedRevenue + pipelineRevenue;
        const guaranteedPaidOut: boolean = userRevenue?.guaranteedPaidOut || false;
        const pipelinePaidOut: boolean = userRevenue?.pipelinePaidOut || false;
        const paidOutRevenue: number = (guaranteedPaidOut ? guaranteedRevenue : 0) + (pipelinePaidOut ? pipelineRevenue : 0);

        // Remove followUpReminders from leadData before spreading
        const { followUpReminders: _omit, ...leadDataWithoutReminders } = leadData as any;

        const revenue: LeadRevenue = {
          guaranteedRevenue,
          pipelineRevenue,
          guaranteedPaidOut,
          pipelinePaidOut,
          totalRevenue,
          paidOutRevenue,
        };
        const leadToCreate: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'followUpReminders' | 'revenue'> & { revenue: LeadRevenue } = {
          ...leadDataWithoutReminders,
          name: leadData.name || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          company: leadData.company || '',
          status: finalStatus,
          highestStageReached,
          value: totalRevenue, // Keep legacy value in sync with total revenue
          revenue,
          notes: leadData.notes || '',
          source: leadData.source || 'other',
          appointmentStatus: leadData.appointmentStatus || 'scheduled',
          selectedPipelineStages: leadData.selectedPipelineStages,
        };

        console.log('📝 [ContractorStore] Processed lead data:', leadToCreate);
        console.log('📅 [ContractorStore] Final dates:', {
          dateSet: leadToCreate.dateSet,
          dateSetFor: leadToCreate.dateSetFor
        });

        const localLead: Lead = {
          ...leadToCreate,
          id: generateUniqueId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          followUpReminders: Array.isArray((leadData as any).followUpReminders) ? (leadData as any).followUpReminders : [],
        };

        // Set currentUserId to the authenticated user's ID before syncing
        set({ currentUserId: user.id });

        let supabaseLead;
        if (isValidUUID(user.id)) {
          try {
            console.log('📝 [ContractorStore] Creating lead in Supabase...');
            supabaseLead = await supabaseService.createLead(user.id, leadToCreate);
            console.log('✅ [ContractorStore] Lead created in Supabase:', supabaseLead);
          } catch (error) {
            console.warn('⚠️ Supabase lead creation failed, using local storage only:', error);
            supabaseLead = null;
          }
        } else {
          console.warn('⚠️ Invalid UUID format, using local storage only for lead creation');
          supabaseLead = null;
        }

        const finalLead = supabaseLead ? {
          ...localLead,
          id: supabaseLead.id,
          createdAt: supabaseLead.createdAt,
          updatedAt: supabaseLead.updatedAt,
        } : localLead;

        console.log('📝 [ContractorStore] Saving lead to local database...');
        await databaseService.saveLead(user.id, finalLead);
        console.log('✅ [ContractorStore] Lead saved to local database');

        console.log('📝 [ContractorStore] Updating local state...');
        set((state) => ({ leads: [...state.leads, finalLead] }));
        console.log('✅ [ContractorStore] Local state updated');

        console.log(`✅ Lead added: ${finalLead.name} with status '${finalLead.status}' and highest stage '${finalLead.highestStageReached}'`);
        console.log(`💾 Lead saved to Supabase database for user: ${user.id}`);

        // Immediately sync with Supabase after adding a lead
        console.log('🔄 Immediately syncing leads from Supabase for user:', user.id);
        await get().syncWithSupabase();

        return finalLead;
      },
      
      updateLead: async (id, updates) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        // Skip Supabase operations for invalid UUID formats
        const canUseSupabase = isValidUUID(state.currentUserId);
        
        // Find the current lead to track stage changes
        const currentLead = state.leads.find(lead => lead.id === id);
        if (!currentLead) {
          throw new Error('Lead not found');
        }
        
        const oldStatus = currentLead.status;
        const newStatus = updates.status;
        
        // Calculate updated revenue if status or revenue data changes
        let updatedRevenue = currentLead.revenue;
        if (newStatus !== oldStatus || updates.value !== undefined || updates.revenue) {
          const migratedLead = migrateLeadRevenue(currentLead);
          const currentRevenue: LeadRevenue = migratedLead.revenue!;
          
          // If revenue object is provided in updates, use it
          if (updates.revenue) {
            const guaranteedRevenue = updates.revenue.guaranteedRevenue || 0;
            const pipelineRevenue = updates.revenue.pipelineRevenue || 0;
            const totalRevenue = guaranteedRevenue + pipelineRevenue;
            const paidOutRevenue = (updates.revenue.guaranteedPaidOut ? guaranteedRevenue : 0) + 
                                  (updates.revenue.pipelinePaidOut ? pipelineRevenue : 0);
            
            updatedRevenue = {
              ...updates.revenue,
              totalRevenue,
              paidOutRevenue,
            };
          } else {
            // Auto-calculate based on status change
            const finalStatus = newStatus || currentLead.status;
            const wasCancelled = currentLead.isCancelled || 
                               ['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(currentLead.status);
            const isCancelled = currentLead.isCancelled || updates.isCancelled ||
                               ['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(finalStatus);
            
            // Preserve existing revenue amounts - don't reset on cancellation
            let guaranteedRevenue = currentRevenue.guaranteedRevenue || 0;
            let pipelineRevenue = currentRevenue.pipelineRevenue || 0;
            
            // If moving to cancelled status for the first time, convert pipeline to guaranteed if payments were made
            if (isCancelled && !wasCancelled) {
              // Temporarily simplified logic to avoid TypeScript issues
              // TODO: Fix type inference issue with currentRevenue.pipelinePaidOut
              if (pipelineRevenue > 0) {
                // For now, just clear pipeline revenue on cancellation
                pipelineRevenue = 0;
              }
            }
            
            const totalRevenue = guaranteedRevenue + pipelineRevenue;
            
            // Auto-update paid out status based on lead status and revenue conversion
            let guaranteedPaidOut = currentRevenue.guaranteedPaidOut || (finalStatus === 'installed' && guaranteedRevenue > 0);
            let pipelinePaidOut = currentRevenue.pipelinePaidOut || false;
            
            // If we converted pipeline to guaranteed revenue due to cancellation with payment
            // Temporarily simplified logic to avoid TypeScript issues
            // TODO: Fix type inference issue with currentRevenue.pipelinePaidOut
            if (isCancelled && !wasCancelled && currentRevenue.pipelineRevenue > 0) {
              // For now, just set guaranteed as paid out if there was pipeline revenue
              guaranteedPaidOut = true;
              pipelinePaidOut = false;
            }
            
            const paidOutRevenue = (guaranteedPaidOut ? guaranteedRevenue : 0) + 
                                  (pipelinePaidOut ? pipelineRevenue : 0);
            
            updatedRevenue = {
              guaranteedRevenue,
              pipelineRevenue,
              guaranteedPaidOut,
              pipelinePaidOut,
              totalRevenue,
              paidOutRevenue,
            };
          }
        }
        
        const finalUpdates = {
          ...updates,
          revenue: updatedRevenue,
        };

        console.log('📝 [ContractorStore] updateLead called with updates:', updates);
        console.log('📅 [ContractorStore] Date Set in updates:', updates.dateSet);
        console.log('📅 [ContractorStore] Date Set For in updates:', updates.dateSetFor);
        console.log('📝 [ContractorStore] Final updates:', finalUpdates);
        console.log('📝 [ContractorStore] Current lead in state:', currentLead);

        try {
          // Update in Supabase database (primary storage) if UUID is valid
          if (canUseSupabase) {
            try {
              await supabaseService.updateLead(state.currentUserId!, id, finalUpdates);
            } catch (error) {
              console.warn('⚠️ Supabase lead update failed, continuing with local storage only:', error);
            }
          } else {
            console.warn('⚠️ Invalid UUID format, using local storage only for lead update');
          }
          
          // Also update in local database for offline access
          await databaseService.updateLead(state.currentUserId!, id, {
            ...finalUpdates,
            updatedAt: new Date().toISOString()
          });
          
          // Update local state
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id
                ? { 
                    ...lead, 
                    ...finalUpdates, 
                    updatedAt: new Date().toISOString() 
                  }
                : lead
            ),
          }));
          
          // Log stage change for analytics
          if (oldStatus && newStatus && oldStatus !== newStatus) {
            console.log(`🔄 Lead stage change: ${currentLead.name} moved from ${oldStatus} to ${newStatus}`);
            
            // Track stage progression metrics in database
            try {
              databaseService.trackStageChange(
                state.currentUserId,
                id,
                currentLead.name,
                oldStatus,
                newStatus,
                currentLead.source,
                currentLead.value || 0
              );
            } catch (error) {
              console.error('Failed to track stage change in database:', error);
            }
          }
          
        } catch (error) {
          console.error('Failed to update lead:', error);
          throw error;
        }
      },
      
      deleteLead: async (id) => {
        const state = get();
        console.log('[ContractorStore] deleteLead called with id:', id);
        console.log('[ContractorStore] currentUserId:', state.currentUserId);
        
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        // Skip Supabase operations for invalid UUID formats
        const canUseSupabase = isValidUUID(state.currentUserId);
        console.log('[ContractorStore] canUseSupabase:', canUseSupabase);
        
        try {
          // Delete from Supabase database (primary storage) if UUID is valid
          if (canUseSupabase) {
            try {
              console.log('[ContractorStore] Deleting from Supabase...');
              await supabaseService.deleteLead(state.currentUserId!, id);
              console.log('[ContractorStore] Successfully deleted from Supabase');
            } catch (error) {
              console.warn('⚠️ Supabase lead deletion failed, continuing with local storage only:', error);
            }
          } else {
            console.warn('⚠️ Invalid UUID format, using local storage only for lead deletion');
          }
          
          // Also delete from local database
          console.log('[ContractorStore] Deleting from local database...');
          await databaseService.deleteLead(state.currentUserId!, id);
          console.log('[ContractorStore] Successfully deleted from local database');
          
          // Update local state
          console.log('[ContractorStore] Updating local state...');
          set((state) => ({
            leads: state.leads.filter((lead) => lead.id !== id),
          }));
          console.log('[ContractorStore] Local state updated successfully');
          
        } catch (error) {
          console.error('Failed to delete lead:', error);
          throw error;
        }
      },

      fixCancelledLeadRevenue: (leadId) => {
        const state = get();
        const lead = state.leads.find(l => l.id === leadId);
        
        if (!lead || !lead.revenue) return;
        
        const isCancelled = lead.isCancelled || 
          ['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status);
        
        if (isCancelled && lead.revenue.pipelineRevenue > 0 && lead.revenue.pipelinePaidOut) {
          // Convert pipeline revenue to guaranteed revenue for cancelled deals with payments
          const newRevenue = {
            ...lead.revenue,
            guaranteedRevenue: lead.revenue.pipelineRevenue,
            pipelineRevenue: 0,
            guaranteedPaidOut: true,
            pipelinePaidOut: false,
            totalRevenue: lead.revenue.pipelineRevenue,
            paidOutRevenue: lead.revenue.pipelineRevenue
          };
          
          set((state) => ({
            leads: state.leads.map((l) =>
              l.id === leadId
                ? { ...l, revenue: newRevenue, updatedAt: new Date().toISOString() }
                : l
            ),
          }));
          
          setTimeout(() => get().saveUserData(), 0);
        }
      },

      // Follow-up reminder functions
      addFollowUpReminder: async (leadId, reminderData) => {
        const state = get();
        const newReminder: FollowUpReminder = {
          ...reminderData,
          id: generateUniqueId('reminder_'),
          createdAt: new Date().toISOString(),
        };

        // Schedule notification if not completed
        if (!newReminder.completed) {
          try {
            const lead = state.leads.find(l => l.id === leadId);
            if (lead) {
              const notificationId = await notificationService.scheduleFollowUpReminder(
                newReminder,
                lead.name,
                lead.phone
              );
              
              if (notificationId) {
                newReminder.notificationId = notificationId;
              }
            }
          } catch (error) {
            console.error('Error scheduling notification:', error);
            // Continue saving the reminder even if notification fails
          }
        }

        // Update local state immediately
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  followUpReminders: [...lead.followUpReminders, newReminder],
                  nextFollowUp: getNextFollowUpDate([...lead.followUpReminders, newReminder]),
                  updatedAt: new Date().toISOString(),
                }
              : lead
          ),
        }));

        // Save to Supabase if UUID is valid
        const canUseSupabase = isValidUUID(state.currentUserId || '');
        if (canUseSupabase && state.currentUserId !== null) {
          try {
            await supabaseService.createFollowUpReminder(state.currentUserId!, leadId, {
              date: newReminder.date,
              time: newReminder.time,
              type: newReminder.type,
              notes: newReminder.notes,
              completed: newReminder.completed,
              completedAt: newReminder.completedAt,
            });
            console.log('✅ [ContractorStore] Reminder saved to Supabase');
          } catch (error) {
            console.warn('⚠️ Supabase reminder save failed, continuing with local storage only:', error);
          }
        } else {
          console.warn('⚠️ Invalid UUID format, using local storage only for reminder');
        }
        
        // Also save to local database for offline access
        setTimeout(async () => await get().saveUserData(), 0);
        
        // Refresh reminders from database to ensure consistency
        setTimeout(async () => {
          try {
            const refreshedReminders = await supabaseService.getFollowUpReminders(state.currentUserId!, leadId);
            set((state) => ({
              leads: state.leads.map((lead) =>
                lead.id === leadId
                  ? {
                      ...lead,
                      followUpReminders: refreshedReminders,
                      nextFollowUp: getNextFollowUpDate(refreshedReminders),
                    }
                  : lead
              ),
            }));
            console.log('✅ [ContractorStore] Refreshed reminders from database');
          } catch (error) {
            console.warn('⚠️ Failed to refresh reminders from database:', error);
          }
        }, 500);
      },

      updateFollowUpReminder: async (leadId, reminderId, updates) => {
        const state = get();
        
        // Update local state immediately
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  followUpReminders: lead.followUpReminders.map((reminder) =>
                    reminder.id === reminderId ? { ...reminder, ...updates } : reminder
                  ),
                  nextFollowUp: getNextFollowUpDate(
                    lead.followUpReminders.map((reminder) =>
                      reminder.id === reminderId ? { ...reminder, ...updates } : reminder
                    )
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : lead
          ),
        }));

        // Save to Supabase if UUID is valid
        const canUseSupabase = isValidUUID(state.currentUserId || '');
        if (canUseSupabase && state.currentUserId) {
          const userId = state.currentUserId; // Type guard to ensure it's not null
          try {
            await supabaseService.updateFollowUpReminder(userId, reminderId, updates);
            console.log('✅ [ContractorStore] Reminder updated in Supabase');
          } catch (error) {
            console.warn('⚠️ Supabase reminder update failed, continuing with local storage only:', error);
          }
        } else {
          console.warn('⚠️ Invalid UUID format, using local storage only for reminder update');
        }
        
        setTimeout(() => get().saveUserData(), 0);
      },

      deleteFollowUpReminder: async (leadId, reminderId) => {
        const state = get();
        const lead = state.leads.find(l => l.id === leadId);
        const reminder = lead?.followUpReminders.find(r => r.id === reminderId);
        
        // Cancel notification if it exists
        if (reminder?.notificationId) {
          try {
            await notificationService.cancelNotification(reminder.notificationId ?? undefined);
          } catch (error) {
            console.error('Error cancelling notification:', error);
          }
        }

        // Update local state immediately
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  followUpReminders: lead.followUpReminders.filter(
                    (reminder) => reminder.id !== reminderId
                  ),
                  nextFollowUp: getNextFollowUpDate(
                    lead.followUpReminders.filter((reminder) => reminder.id !== reminderId)
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : lead
          ),
        }));

        // Delete from Supabase if UUID is valid
        const canUseSupabase = isValidUUID(state.currentUserId || '');
        if (canUseSupabase && state.currentUserId) {
          const userId = state.currentUserId; // Type guard to ensure it's not null
          try {
            await supabaseService.deleteFollowUpReminder(userId, reminderId);
            console.log('✅ [ContractorStore] Reminder deleted from Supabase');
          } catch (error) {
            console.warn('⚠️ Supabase reminder deletion failed, continuing with local storage only:', error);
          }
        } else {
          console.warn('⚠️ Invalid UUID format, using local storage only for reminder deletion');
        }
        
        setTimeout(async () => await get().saveUserData(), 0);
      },

      completeFollowUpReminder: async (leadId, reminderId, notes) => {
        const state = get();
        const lead = state.leads.find(l => l.id === leadId);
        const reminder = lead?.followUpReminders.find(r => r.id === reminderId);
        
        // Cancel notification if it exists
        if (reminder?.notificationId) {
          try {
            await notificationService.cancelNotification(reminder.notificationId ?? undefined);
          } catch (error) {
            console.error('Error cancelling notification:', error);
          }
        }

        const completionUpdates = {
          completed: true,
          completedAt: new Date().toISOString(),
          notes: notes ? `${reminder?.notes || ''}\n\nCompleted: ${notes}` : reminder?.notes || '',
        };

        // Update local state immediately
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  followUpReminders: lead.followUpReminders.map((reminder) =>
                    reminder.id === reminderId
                      ? { ...reminder, ...completionUpdates }
                      : reminder
                  ),
                  nextFollowUp: getNextFollowUpDate(
                    lead.followUpReminders.map((reminder) =>
                      reminder.id === reminderId
                        ? { ...reminder, completed: true }
                        : reminder
                    )
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : lead
          ),
        }));

        // Save to Supabase if UUID is valid
        const canUseSupabase = isValidUUID(state.currentUserId || '');
        if (canUseSupabase && state.currentUserId) {
          const userId = state.currentUserId; // Type guard to ensure it's not null
          try {
            await supabaseService.updateFollowUpReminder(userId, reminderId, completionUpdates);
            console.log('✅ [ContractorStore] Reminder completion saved to Supabase');
          } catch (error) {
            console.warn('⚠️ Supabase reminder completion save failed, continuing with local storage only:', error);
          }
        } else {
          console.warn('⚠️ Invalid UUID format, using local storage only for reminder completion');
        }
        
        setTimeout(async () => await get().saveUserData(), 0);
      },

      getUpcomingFollowUps: (days = 7) => {
        const { leads } = get();
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const upcoming: Array<{ lead: Lead; reminder: FollowUpReminder }> = [];

        leads.forEach((lead) => {
          lead.followUpReminders.forEach((reminder) => {
            if (!reminder.completed) {
              const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
              if (reminderDateTime >= now && reminderDateTime <= futureDate) {
                upcoming.push({ lead, reminder });
              }
            }
          });
        });

        return upcoming.sort((a, b) => {
          const dateA = new Date(`${a.reminder.date}T${a.reminder.time}`);
          const dateB = new Date(`${b.reminder.date}T${b.reminder.time}`);
          return dateA.getTime() - dateB.getTime();
        });
      },

      getOverdueFollowUps: () => {
        const { leads } = get();
        const now = new Date();
        const overdue: Array<{ lead: Lead; reminder: FollowUpReminder }> = [];

        leads.forEach((lead) => {
          lead.followUpReminders.forEach((reminder) => {
            if (!reminder.completed) {
              const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
              if (reminderDateTime < now) {
                overdue.push({ lead, reminder });
              }
            }
          });
        });

        return overdue.sort((a, b) => {
          const dateA = new Date(`${a.reminder.date}T${a.reminder.time}`);
          const dateB = new Date(`${b.reminder.date}T${b.reminder.time}`);
          return dateA.getTime() - dateB.getTime();
        });
      },
      
      addExpense: async (expenseData) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        const newExpense: Expense = {
          ...expenseData,
          id: generateUniqueId('expense_'),
          user_id: state.currentUserId,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));
        
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      updateExpense: async (id, updates) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === id ? { ...expense, ...updates } : expense
          ),
        }));
        
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      deleteExpense: async (id) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));
        
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      addClient: async (clientData) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        const newClient: Client = {
          ...clientData,
          id: generateUniqueId('client_'),
          user_id: state.currentUserId,
        };
        set((state) => ({ clients: [...state.clients, newClient] }));
        
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      updateClient: async (id, updates) => {
        set((state) => ({
          clients: state.clients.map((client) =>
            client.id === id ? { ...client, ...updates } : client
          ),
        }));
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      deleteClient: async (id) => {
        set((state) => ({
          clients: state.clients.filter((client) => client.id !== id),
        }));
        setTimeout(async () => await get().saveUserData(), 0);
      },

      addExpenseCategory: async (categoryData) => {
        const state = get();
        if (!state.currentUserId) {
          throw new Error('No user logged in');
        }
        
        const newCategory: ExpenseCategory = {
          ...categoryData,
          id: generateUniqueId('category_'),
          user_id: state.currentUserId,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ expenseCategories: [...state.expenseCategories, newCategory] }));
        
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      updateExpenseCategory: async (id, updates) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.map((category) =>
            category.id === id ? { ...category, ...updates } : category
          ),
        }));
        setTimeout(async () => await get().saveUserData(), 0);
      },

      deleteExpenseCategory: async (id) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.filter((category) => category.id !== id),
        }));
        setTimeout(async () => await get().saveUserData(), 0);
      },
      
      addTeamMember: (memberData) => {
        const newMember: TeamMember = {
          ...memberData,
          id: generateUniqueId('member_'),
          joinedAt: new Date().toISOString(),
        };
        set((state) => ({ teamMembers: [...state.teamMembers, newMember] }));
      },
      
      updateTeamMember: (id, updates) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((member) =>
            member.id === id ? { ...member, ...updates } : member
          ),
        }));
      },
      
      removeTeamMember: (id) => {
        set((state) => ({
          teamMembers: state.teamMembers.filter((member) => member.id !== id),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      inviteTeamMember: async (email: string, role: string, permissions: any) => {
        const newMember: TeamMember = {
          id: generateUniqueId('invite_'),
          name: email.split('@')[0], // Temporary name until they accept
          email,
          role,
          isActive: false,
          joinedAt: new Date().toISOString(),
          performance: {
            leadsGenerated: 0,
            revenue: 0,
            expenses: 0,
            dealsWon: 0,
            appointmentsHeld: 0,
          },
          permissions,
          inviteStatus: 'pending',
          invitedAt: new Date().toISOString(),
          invitedBy: get().currentUserId || 'unknown',
        };
        
        set((state) => ({ teamMembers: [...state.teamMembers, newMember] }));
        
        // Simulate sending email invitation
        console.log(`Email invitation sent to ${email} for role ${role}`);
        
        setTimeout(() => get().saveUserData(), 0);
      },

      acceptTeamInvite: (inviteId: string) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((member) =>
            member.id === inviteId 
              ? { ...member, inviteStatus: 'accepted', isActive: true }
              : member
          ),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      updateMemberPermissions: (memberId: string, permissions: any) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((member) =>
            member.id === memberId 
              ? { ...member, permissions }
              : member
          ),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      transferTeamOwnership: (newOwnerId: string) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((member) => {
            if (member.id === newOwnerId) {
              return { 
                ...member, 
                role: 'Admin',
                permissions: {
                  canViewKPIs: true,
                  canEditKPIs: true,
                  canManageTeam: true,
                  canViewFinancials: true,
                }
              };
            }
            // Demote current admin to manager
            if (member.role === 'Admin') {
              return { 
                ...member, 
                role: 'Manager',
                permissions: {
                  canViewKPIs: true,
                  canEditKPIs: true,
                  canManageTeam: false,
                  canViewFinancials: true,
                }
              };
            }
            return member;
          }),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },
      
      setCurrentOffice: (office) => {
        set({ currentOffice: office });
      },
      
      getKPIData: () => {
        const state = get();
        
        // Calculate revenue metrics - include cancelled leads for guaranteed and paid out revenue
        const guaranteedRevenue = state.leads
          .reduce((sum, lead) => sum + (lead.revenue?.guaranteedRevenue || 0), 0);
          
        // Pipeline revenue should exclude cancelled leads (only active potential revenue)
        const pipelineRevenue = state.leads
          .filter((lead) => !lead.isCancelled && 
                           !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status))
          .reduce((sum, lead) => sum + (lead.revenue?.pipelineRevenue || 0), 0);
          
        // Paid out revenue includes all leads (even cancelled ones, if payment was received)
        const paidOutRevenue = state.leads
          .reduce((sum, lead) => sum + (lead.revenue?.paidOutRevenue || 0), 0);
          
        // Total revenue is guaranteed + active pipeline (excluding cancelled pipeline revenue)
        const totalRevenue = guaranteedRevenue + pipelineRevenue;
        
        const totalExpenses = state.expenses.reduce(
          (sum, expense) => sum + expense.amount,
          0
        );
        
        const netProfit = paidOutRevenue - totalExpenses; // Use paid out revenue for net profit
        const activeLeads = state.leads.filter(
          (lead) => !['installed'].includes(lead.status) && 
                   !lead.isCancelled &&
                   !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status)
        ).length;
        
        const totalLeads = state.leads.length;
        const wonLeads = state.leads.filter((lead) => lead.status === 'installed').length; // Include all installed, even if later cancelled
        const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
        
        // Mock monthly growth for demo
        const monthlyGrowth = 12.5;
        
        return {
          totalRevenue: paidOutRevenue, // Use paid out revenue as the main total
          totalExpenses,
          netProfit,
          activeLeads,
          conversionRate,
          monthlyGrowth,
          guaranteedRevenue,
          pipelineRevenue,
          paidOutRevenue,
          revenueBreakdown: {
            guaranteedRevenue,
            pipelineRevenue,
            paidOutRevenue,
            totalRevenue,
          },
        };
      },

      getAppointmentMetrics: () => {
        const state = get();
        const leadsWithAppointments = state.leads.filter(lead => lead.appointmentDate);
        
        const scheduled = leadsWithAppointments.filter(lead => lead.appointmentStatus === 'scheduled').length;
        // Count as held: appointmentStatus='held' OR any status after held (signed_deal, held_not_interested, etc)
        const held = leadsWithAppointments.filter(lead => 
          lead.appointmentStatus === 'held' || 
          lead.appointmentStatus === 'signed' ||
          ['signed_deal', 'installed', 'held_not_interested'].includes(lead.status)
        ).length;
        const signed = leadsWithAppointments.filter(lead => lead.appointmentStatus === 'signed').length;
        // Count cancelled appointments and leads with cancelled_appointment status as cancelled (not held)
        const cancelled = leadsWithAppointments.filter(lead => 
          lead.appointmentStatus === 'cancelled' || lead.status === 'cancelled_appointment'
        ).length;
        
        // Cancelled appointment breakdown
        const cancelledAppointments = leadsWithAppointments.filter(lead => 
          lead.appointmentStatus === 'cancelled' && lead.cancelledReason === 'cancelled_appointment'
        ).length;
        const cancelledContracts = leadsWithAppointments.filter(lead => 
          lead.appointmentStatus === 'cancelled' && lead.cancelledReason === 'cancelled_contract'
        ).length;
        
        const total = scheduled + held + signed + cancelled;
        
        return {
          scheduled,
          held,
          signed,
          cancelled,
          cancelledAppointments,
          cancelledContracts,
          total,
          metrics: {
            holdRate: scheduled > 0 ? (held / (scheduled + held + cancelled)) * 100 : 0,
            signRate: held > 0 ? (signed / held) * 100 : 0,
            cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
          }
        };
      },
      
      getLeadsByStatus: (status) => {
        return get().leads.filter((lead) => {
          // If lead is cancelled, use cancellation status for filtering
          const effectiveStatus = lead.isCancelled && lead.cancellationStatus ? lead.cancellationStatus : lead.status;
          return effectiveStatus === status;
        });
      },

      getPipelineMetrics: () => {
        const state = get();
        const leads = state.leads;
        
        const stageMetrics = {
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          appointment_set: leads.filter(l => l.status === 'appointment_set').length,
          // For pipeline metrics, count all held appointments including those that progressed beyond held
          appointment_held: leads.filter(l => 
            l.status === 'appointment_held' ||
            ['negotiation', 'signed_deal', 'installed', 'held_not_interested'].includes(l.status)
          ).length,
          negotiation: leads.filter(l => l.status === 'negotiation').length,
          signed_deal: leads.filter(l => l.status === 'signed_deal').length,
          installed: leads.filter(l => l.status === 'installed').length,
          lost: 0, // Remove lost status as it's not in the Lead type
        };

        const total = leads.length;
        const active = leads.filter(l => !['installed', 'lost', 'cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(l.status)).length;
        
        // Conversion rates
        const contactRate = stageMetrics.new > 0 ? (stageMetrics.contacted / stageMetrics.new) * 100 : 0;
        const appointmentRate = stageMetrics.contacted > 0 ? (stageMetrics.appointment_set / stageMetrics.contacted) * 100 : 0;
        const holdRate = stageMetrics.appointment_set > 0 ? (stageMetrics.appointment_held / stageMetrics.appointment_set) * 100 : 0;
        const closeRate = stageMetrics.appointment_held > 0 ? (stageMetrics.signed_deal / stageMetrics.appointment_held) * 100 : 0;
        const installRate = stageMetrics.signed_deal > 0 ? (stageMetrics.installed / stageMetrics.signed_deal) * 100 : 0;
        
        return {
          stages: stageMetrics,
          totals: { total, active },
          conversions: {
            contactRate,
            appointmentRate, 
            holdRate,
            closeRate,
            installRate
          }
        };
      },
      
      getExpensesByCategory: () => {
        const expenses = get().expenses;
        return expenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {} as Record<string, number>);
      },
      
      getTeamPerformance: () => {
        return get().teamMembers.sort(
          (a, b) => b.performance.revenue - a.performance.revenue
        );
      },
    }));