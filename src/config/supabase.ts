import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bqkmykfooztuhvwwalcu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'REMOVED_SENSITIVE_DATA';

// Environment check
console.log('🔧 Supabase URL present:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('🔧 Supabase Anon Key present:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Custom storage implementation with better error handling
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.warn('⚠️ Error reading from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('⚠️ Error writing to AsyncStorage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('⚠️ Error removing from AsyncStorage:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  LEADS: 'leads',
  EXPENSES: 'expenses',
  TEAM_MEMBERS: 'team_members',
  FOLLOW_UP_REMINDERS: 'follow_up_reminders',
  DAILY_INPUTS: 'daily_inputs',
  EXPENSE_CATEGORIES: 'expense_categories',
  PLUID_ACCOUNTS: 'plaid_accounts',
  PLUID_TRANSACTIONS: 'plaid_transactions',
  PLUID_TOKENS: 'plaid_tokens',
  MILEAGE_ENTRIES: 'mileage_entries',
  OUTREACH_ACTIVITIES: 'outreach_activities',
  SETTINGS: 'settings',
  LEAD_FILTERS: 'lead_filters',
  JESSICA_CHAT_HISTORY: 'jessica_chat_history',
} as const;

// Database types
export interface DatabaseLead {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address?: string;
  status: string;
  highest_stage_reached?: string;
  cancellation_status?: string | null;
  selected_pipeline_stages?: string[] | null;
  value: number;
  revenue: {
    guaranteedRevenue: number;
    pipelineRevenue: number;
    guaranteedPaidOut: boolean;
    pipelinePaidOut: boolean;
    totalRevenue: number;
    paidOutRevenue: number;
  } | null;
  notes: string;
  source: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  appointment_notes?: string | null;
  appointment_status?: string | null;
  cancelled_reason?: string | null;
  lost_reason?: string | null;
  is_cancelled?: boolean | null;
  appointment_created_from?: string | null;
  appointment_set_on_date?: string | null;
  date_set?: string | null;
  date_set_for?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receipt?: string | null;
  is_deductible: boolean;
  mileage?: number | null;
  start_location?: string | null;
  end_location?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTeamMember {
  id: string;
  user_id: string; // The user who owns this team
  member_user_id?: string | null; // The actual user account (if they've joined)
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  is_active: boolean;
  joined_at: string;
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
  } | null;
  invite_status?: string | null;
  invited_at?: string | null;
  invited_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  current_office?: string | null;
  settings?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseFollowUpReminder {
  id: string;
  user_id: string;
  lead_id: string;
  date: string;
  time: string;
  type: string;
  notes: string;
  completed: boolean;
  completed_at?: string | null;
  notification_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDailyInput {
  id: string;
  user_id: string;
  date: string;
  doors_knocked: number;
  appointments: number;
  appointment_holds: number;
  closed_deals: number;
  accounts_serviced: number;
  hours_worked: number;
  outreach_door_knocks?: number | null;
  outreach_tags_put?: number | null;
  outreach_calls_made?: number | null;
  outreach_referrals?: number | null;
  outreach_inbound?: number | null;
  appointments_set_door_knocks?: number | null;
  appointments_set_tags_put?: number | null;
  appointments_set_calls_made?: number | null;
  appointments_set_referrals?: number | null;
  appointments_set_inbound?: number | null;
  appointments_held_door_knocks?: number | null;
  appointments_held_tags_put?: number | null;
  appointments_held_calls_made?: number | null;
  appointments_held_referrals?: number | null;
  appointments_held_inbound?: number | null;
  deals_closed_door_knocks?: number | null;
  deals_closed_tags_put?: number | null;
  deals_closed_calls_made?: number | null;
  deals_closed_referrals?: number | null;
  deals_closed_inbound?: number | null;
  accounts_serviced_door_knocks?: number | null;
  accounts_serviced_tags_put?: number | null;
  accounts_serviced_calls_made?: number | null;
  accounts_serviced_referrals?: number | null;
  accounts_serviced_inbound?: number | null;
  tally_counts?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}