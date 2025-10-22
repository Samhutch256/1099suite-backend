import { supabase, TABLES, DatabaseLead, DatabaseExpense, DatabaseTeamMember, DatabaseUser, DatabaseFollowUpReminder, DatabaseDailyInput } from '../config/supabase';
import { Lead, Expense, TeamMember, FollowUpReminder, Client, ExpenseCategory } from '../state/contractorStore';
import { DailyInput } from '../state/kpiStore';

export class SupabaseService {
  // Getter for supabase client
  get supabase() {
    return supabase;
  }

  // Auth methods
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signUpWithEmail(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Re-authenticate the user, then update password
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) throw getUserError;
    if (!user || !user.email) throw new Error('No authenticated user');

    // Verify current password by attempting sign-in
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) throw new Error('Current password is incorrect');

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Use an allowed redirect URL (configured in Supabase) so the email is sent
      redirectTo: '1099suite://confirmed',
    });
    if (error) throw error;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting user data from Supabase:', userId);
      
      // Delete all user data from all tables
      // This will cascade due to ON DELETE CASCADE in the database schema
      
      // Delete from users table (this will trigger cascade deletes for all related data)
      const { error: userError } = await supabase
        .from(TABLES.USERS)
        .delete()
        .eq('id', userId);
      
      if (userError) {
        console.error('❌ Error deleting user data from users table:', userError);
        throw userError;
      }
      
      console.log('✅ User data deleted successfully from Supabase');
      console.log('ℹ️ Note: Auth account remains but all data is deleted');
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      throw error;
    }
  }

  // User methods
  async createOrUpdateUser(userId: string, userData: Partial<DatabaseUser>) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert({
        id: userId,
        ...userData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUser(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  // Lead methods
  async getLeads(userId: string): Promise<Lead[]> {
    const { data, error } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    console.log('[getLeads] Supabase leads query result:', { data, error });
    
    if (data && data.length > 0) {
      console.log('📅 [getLeads] Sample lead date fields:', {
        id: data[0].id,
        date_set: data[0].date_set,
        date_set_for: data[0].date_set_for
      });
    }

    if (error) throw error;
    
    const mappedLeads = (data || []).map(this.mapDatabaseLeadToLead);
    
    // Load reminders for each lead
    console.log('📂 Loading reminders for', mappedLeads.length, 'leads...');
    const leadsWithReminders = await Promise.all(
      mappedLeads.map(async (lead) => {
        try {
          const reminders = await this.getFollowUpReminders(userId, lead.id);
          console.log(`📂 Loaded ${reminders.length} reminders for lead ${lead.id}`);
          return {
            ...lead,
            followUpReminders: reminders,
            nextFollowUp: this.getNextFollowUpDate(reminders)
          };
        } catch (error) {
          console.warn(`⚠️ Failed to load reminders for lead ${lead.id}:`, error);
          return {
            ...lead,
            followUpReminders: [],
            nextFollowUp: undefined
          };
        }
      })
    );
    
    if (leadsWithReminders.length > 0) {
      console.log('📅 [getLeads] Mapped lead date fields:', {
        id: leadsWithReminders[0].id,
        dateSet: leadsWithReminders[0].dateSet,
        dateSetFor: leadsWithReminders[0].dateSetFor,
        remindersCount: leadsWithReminders[0].followUpReminders.length
      });
    }
    
    return leadsWithReminders;
  }

  async createLead(userId: string, lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'followUpReminders'>): Promise<Lead> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    console.log('currentUserId:', userId, 'auth.uid:', user.id);
    const dbLead: Omit<DatabaseLead, 'id' | 'created_at' | 'updated_at'> = {
      user_id: user.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      address: lead.address,
      status: lead.status,
      highest_stage_reached: lead.highestStageReached,
      cancellation_status: lead.cancellationStatus,
      selected_pipeline_stages: lead.selectedPipelineStages,
      value: lead.value,
      revenue: lead.revenue || null,
      notes: lead.notes,
      source: lead.source,
      appointment_date: lead.appointmentDate,
      appointment_time: lead.appointmentTime,
      appointment_notes: lead.appointmentNotes,
      appointment_status: lead.appointmentStatus,
      cancelled_reason: lead.cancelledReason,
      lost_reason: lead.lostReason,
      is_cancelled: lead.isCancelled,
      appointment_created_from: (lead.appointmentCreatedFrom ?? undefined),
      appointment_set_on_date: (lead.appointmentSetOnDate ?? undefined),
      // Add the missing date fields that are in the database schema
      date_set: lead.dateSet,
      date_set_for: lead.dateSetFor,
    };

    console.log('📝 Creating lead in Supabase with data:', dbLead);
    console.log('📅 [SupabaseService] Date Set:', lead.dateSet, '→', dbLead.date_set);
    console.log('📅 [SupabaseService] Date Set For:', lead.dateSetFor, '→', dbLead.date_set_for);

    const { data, error } = await supabase
      .from(TABLES.LEADS)
      .insert(dbLead)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase lead creation error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}${error.hint ? ` (${error.hint})` : ''}`);
    }
    
    console.log('✅ Lead created successfully in Supabase:', data);
    console.log('📅 [SupabaseService] Created lead date_set:', data.date_set);
    console.log('📅 [SupabaseService] Created lead date_set_for:', data.date_set_for);
    
    const mappedLead = this.mapDatabaseLeadToLead(data);
    console.log('📅 [SupabaseService] Mapped lead dateSet:', mappedLead.dateSet);
    console.log('📅 [SupabaseService] Mapped lead dateSetFor:', mappedLead.dateSetFor);
    
    // NOTE: syncWithSupabase should be triggered from the store after lead creation
    return mappedLead;
  }

  async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<void> {
    const dbUpdates: Partial<DatabaseLead> = {
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      company: updates.company,
      address: updates.address,
      status: updates.status,
      highest_stage_reached: updates.highestStageReached,
      cancellation_status: updates.cancellationStatus,
      selected_pipeline_stages: updates.selectedPipelineStages,
      value: updates.value,
      revenue: updates.revenue || null,
      notes: updates.notes,
      source: updates.source,
      appointment_date: updates.appointmentDate,
      appointment_time: updates.appointmentTime,
      appointment_notes: updates.appointmentNotes,
      appointment_status: updates.appointmentStatus,
      cancelled_reason: updates.cancelledReason,
      lost_reason: updates.lostReason,
      is_cancelled: updates.isCancelled,
      appointment_created_from: (updates.appointmentCreatedFrom ?? undefined),
      appointment_set_on_date: (updates.appointmentSetOnDate ?? undefined),
      date_set: updates.dateSet,
      date_set_for: updates.dateSetFor,
      updated_at: new Date().toISOString(),
    };

    console.log('📝 [SupabaseService] updateLead called with updates:', updates);
    console.log('📅 [SupabaseService] Date Set:', updates.dateSet, '→', dbUpdates.date_set);
    console.log('📅 [SupabaseService] Date Set For:', updates.dateSetFor, '→', dbUpdates.date_set_for);
    console.log('📝 [SupabaseService] Database updates:', dbUpdates);

    const { error } = await supabase
      .from(TABLES.LEADS)
      .update(dbUpdates)
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [SupabaseService] Update error:', error);
      throw error;
    }
    
    console.log('✅ [SupabaseService] Lead updated successfully');
  }

  async deleteLead(userId: string, leadId: string): Promise<void> {
    // First delete related follow-up reminders
    await supabase
      .from(TABLES.FOLLOW_UP_REMINDERS)
      .delete()
      .eq('lead_id', leadId)
      .eq('user_id', userId);

    // Then delete the lead
    const { error } = await supabase
      .from(TABLES.LEADS)
      .delete()
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Follow-up reminder methods
  async getFollowUpReminders(userId: string, leadId: string): Promise<FollowUpReminder[]> {
    const { data, error } = await supabase
      .from(TABLES.FOLLOW_UP_REMINDERS)
      .select('*')
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .order('date', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(this.mapDatabaseReminderToReminder);
  }

  async createFollowUpReminder(userId: string, leadId: string, reminder: Omit<FollowUpReminder, 'id' | 'createdAt' | 'notificationId'>): Promise<FollowUpReminder> {
    const dbReminder: Omit<DatabaseFollowUpReminder, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      lead_id: leadId,
      date: reminder.date,
      time: reminder.time,
      type: reminder.type,
      notes: reminder.notes,
      completed: reminder.completed,
      completed_at: reminder.completedAt,
      notification_id: null, // Will be set after notification is scheduled
    };

    const { data, error } = await supabase
      .from(TABLES.FOLLOW_UP_REMINDERS)
      .insert(dbReminder)
      .select()
      .single();

    if (error) throw error;
    
    return this.mapDatabaseReminderToReminder(data);
  }

  async updateFollowUpReminder(userId: string, reminderId: string, updates: Partial<FollowUpReminder>): Promise<void> {
    const dbUpdates: Partial<DatabaseFollowUpReminder> = {
      date: updates.date,
      time: updates.time,
      type: updates.type,
      notes: updates.notes,
      completed: updates.completed,
      completed_at: updates.completedAt,
      notification_id: updates.notificationId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(TABLES.FOLLOW_UP_REMINDERS)
      .update(dbUpdates)
      .eq('id', reminderId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteFollowUpReminder(userId: string, reminderId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.FOLLOW_UP_REMINDERS)
      .delete()
      .eq('id', reminderId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Expense methods
  async getExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(this.mapDatabaseExpenseToExpense);
  }

  async createExpense(userId: string, expense: Omit<Expense, 'id'>): Promise<Expense> {
    const dbExpense: Omit<DatabaseExpense, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      description: expense.notes || expense.vendor_name || '', // Use notes or vendor_name as description
      amount: expense.amount,
      category: expense.category,
      date: expense.timestamp, // Map timestamp to date
      receipt: undefined, // Not available in Expense interface
      is_deductible: expense.is_business, // Map is_business to is_deductible
      mileage: undefined, // Not available in Expense interface
      start_location: undefined, // Not available in Expense interface
      end_location: undefined, // Not available in Expense interface
    };

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .insert(dbExpense)
      .select()
      .single();

    if (error) throw error;
    
    return this.mapDatabaseExpenseToExpense(data);
  }

  async updateExpense(userId: string, expenseId: string, updates: Partial<Expense>): Promise<void> {
    const dbUpdates: Partial<DatabaseExpense> = {
      description: updates.notes, // Map notes to description
      amount: updates.amount,
      category: updates.category,
      date: updates.timestamp, // Map timestamp to date
      receipt: undefined, // Not available in Expense interface
      is_deductible: updates.is_business, // Map is_business to is_deductible
      mileage: undefined, // Not available in Expense interface
      start_location: undefined, // Not available in Expense interface
      end_location: undefined, // Not available in Expense interface
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(TABLES.EXPENSES)
      .update(dbUpdates)
      .eq('id', expenseId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.EXPENSES)
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Team member methods
  async getTeamMembers(userId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(this.mapDatabaseTeamMemberToTeamMember);
  }

  async createTeamMember(userId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>): Promise<TeamMember> {
    const dbMember: Omit<DatabaseTeamMember, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      member_user_id: null,
      name: member.name,
      email: member.email,
      role: member.role,
      avatar: member.avatar,
      is_active: member.isActive,
      joined_at: new Date().toISOString(),
      performance: member.performance,
      permissions: member.permissions,
      invite_status: member.inviteStatus,
      invited_at: member.invitedAt,
      invited_by: member.invitedBy,
    };

    const { data, error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .insert(dbMember)
      .select()
      .single();

    if (error) throw error;
    
    return this.mapDatabaseTeamMemberToTeamMember(data);
  }

  async updateTeamMember(userId: string, memberId: string, updates: Partial<TeamMember>): Promise<void> {
    const dbUpdates: Partial<DatabaseTeamMember> = {
      name: updates.name,
      email: updates.email,
      role: updates.role,
      avatar: updates.avatar,
      is_active: updates.isActive,
      performance: updates.performance,
      permissions: updates.permissions,
      invite_status: updates.inviteStatus,
      invited_at: updates.invitedAt,
      invited_by: updates.invitedBy,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .update(dbUpdates)
      .eq('id', memberId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteTeamMember(userId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .delete()
      .eq('id', memberId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Client methods
  async getClients(userId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(this.mapDatabaseClientToClient);
  }

  async createClient(userId: string, client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const dbClient = {
      ...client,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('clients')
      .insert(dbClient)
      .select()
      .single();
    if (error) throw error;
    return this.mapDatabaseClientToClient(data);
  }

  async updateClient(userId: string, clientId: string, updates: Partial<Client>): Promise<void> {
    const dbUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', clientId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteClient(userId: string, clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // Expense Category methods
  async getExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(this.mapDatabaseExpenseCategoryToExpenseCategory);
  }

  async createExpenseCategory(userId: string, category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> {
    const dbCategory = {
      ...category,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('expense_categories')
      .insert(dbCategory)
      .select()
      .single();
    if (error) throw error;
    return this.mapDatabaseExpenseCategoryToExpenseCategory(data);
  }

  async updateExpenseCategory(userId: string, categoryId: string, updates: Partial<ExpenseCategory>): Promise<void> {
    const dbUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('expense_categories')
      .update(dbUpdates)
      .eq('id', categoryId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteExpenseCategory(userId: string, categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // Mapping functions
  private mapDatabaseLeadToLead(dbLead: DatabaseLead): Lead {
    return {
      id: dbLead.id,
      name: dbLead.name,
      email: dbLead.email,
      phone: dbLead.phone,
      company: dbLead.company,
      address: dbLead.address || undefined,
      status: dbLead.status as Lead['status'],
      highestStageReached: dbLead.highest_stage_reached as Lead['highestStageReached'],
      cancellationStatus: dbLead.cancellation_status as Lead['cancellationStatus'],
      selectedPipelineStages: dbLead.selected_pipeline_stages as Lead['selectedPipelineStages'],
      value: dbLead.value,
      revenue: dbLead.revenue || undefined,
      notes: dbLead.notes,
      source: dbLead.source as Lead['source'],
      appointmentDate: dbLead.appointment_date || undefined,
      appointmentTime: dbLead.appointment_time || undefined,
      appointmentNotes: dbLead.appointment_notes || undefined,
      appointmentStatus: dbLead.appointment_status as Lead['appointmentStatus'],
      cancelledReason: dbLead.cancelled_reason as Lead['cancelledReason'],
      lostReason: dbLead.lost_reason as Lead['lostReason'],
      isCancelled: dbLead.is_cancelled || false,
      appointmentCreatedFrom: (dbLead.appointment_created_from ?? undefined),
      appointmentSetOnDate: (dbLead.appointment_set_on_date ?? undefined),
      dateSet: dbLead.date_set || undefined,
      dateSetFor: dbLead.date_set_for || undefined,
      createdAt: dbLead.created_at,
      updatedAt: dbLead.updated_at,
      followUpReminders: [], // Will be loaded separately
      nextFollowUp: undefined, // Will be calculated after loading reminders
    };
  }

  private mapDatabaseReminderToReminder(dbReminder: DatabaseFollowUpReminder): FollowUpReminder {
    return {
      id: dbReminder.id,
      date: dbReminder.date,
      time: dbReminder.time,
      type: dbReminder.type as FollowUpReminder['type'],
      notes: dbReminder.notes,
      completed: dbReminder.completed,
      completedAt: dbReminder.completed_at ?? undefined,
      notificationId: dbReminder.notification_id ?? undefined,
      createdAt: dbReminder.created_at,
    };
  }

  private mapDatabaseExpenseToExpense(dbExpense: DatabaseExpense): Expense {
    return {
      id: dbExpense.id,
      user_id: dbExpense.user_id,
      amount: dbExpense.amount,
      category: dbExpense.category,
      vendor_name: undefined, // Not available in DatabaseExpense
      card_used: undefined, // Not available in DatabaseExpense
      is_business: dbExpense.is_deductible, // Map is_deductible to is_business
      client_id: undefined, // Not available in DatabaseExpense
      timestamp: dbExpense.date, // Map date to timestamp
      notes: dbExpense.description, // Map description to notes
      created_at: dbExpense.created_at,
    };
  }

  private mapDatabaseTeamMemberToTeamMember(dbMember: DatabaseTeamMember): TeamMember {
    return {
      id: dbMember.id,
      name: dbMember.name,
      email: dbMember.email,
      role: dbMember.role,
      avatar: dbMember.avatar || undefined,
      isActive: dbMember.is_active,
      joinedAt: dbMember.joined_at,
      performance: dbMember.performance,
      permissions: dbMember.permissions ?? undefined,
      inviteStatus: dbMember.invite_status as TeamMember['inviteStatus'],
      invitedAt: dbMember.invited_at || undefined,
      invitedBy: dbMember.invited_by || undefined,
    };
  }

  // Mapping helpers
  private mapDatabaseClientToClient(dbClient: any): Client {
    return {
      id: dbClient.id,
      user_id: dbClient.user_id,
      name: dbClient.name,
      email: dbClient.email,
    };
  }

  private mapDatabaseExpenseCategoryToExpenseCategory(dbCategory: any): ExpenseCategory {
    return {
      id: dbCategory.id,
      user_id: dbCategory.user_id,
      name: dbCategory.name,
      created_at: dbCategory.created_at,
    };
  }

  // Sync methods for loading all user data
  async syncUserData(userId: string) {
    const [leads, expenses, teamMembers] = await Promise.all([
      this.getLeads(userId),
      this.getExpenses(userId),
      this.getTeamMembers(userId),
    ]);

    // Load follow-up reminders for all leads
    const leadsWithReminders = await Promise.all(
      leads.map(async (lead) => {
        const reminders = await this.getFollowUpReminders(userId, lead.id);
        return {
          ...lead,
          followUpReminders: reminders,
          nextFollowUp: this.getNextFollowUpDate(reminders),
        };
      })
    );

    return {
      leads: leadsWithReminders,
      expenses,
      teamMembers,
    };
  }

  getNextFollowUpDate(reminders: FollowUpReminder[]): string | undefined {
    if (!reminders || reminders.length === 0) return undefined;
    
    const now = new Date();
    const upcomingReminders = reminders
      .filter(reminder => !reminder.completed)
      .filter(reminder => {
        const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
        return reminderDateTime > now;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
    
    if (upcomingReminders.length === 0) return undefined;
    
    const nextReminder = upcomingReminders[0];
    return `${nextReminder.date}T${nextReminder.time}`;
  }

  // Daily Input methods
  async getDailyInputs(userId: string): Promise<DailyInput[]> {
    const { data, error } = await supabase
      .from(TABLES.DAILY_INPUTS)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(this.mapDatabaseDailyInputToDailyInput);
  }

  async createDailyInput(userId: string, input: Omit<DailyInput, 'id'>): Promise<DailyInput> {
    const dbInput: Omit<DatabaseDailyInput, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      date: input.date,
      doors_knocked: input.doorsKnocked,
      appointments: input.appointments,
      appointment_holds: input.appointmentHolds,
      closed_deals: input.closedDeals,
      accounts_serviced: input.accountsServiced,
      hours_worked: input.hoursWorked,
      outreach_door_knocks: input.outreachDoorKnocks,
      outreach_tags_put: input.outreachTagsPut,
      outreach_calls_made: input.outreachCallsMade,
      outreach_referrals: input.outreachReferrals,
      outreach_inbound: input.outreachInbound,
      appointments_set_door_knocks: input.appointmentsSetDoorKnocks,
      appointments_set_tags_put: input.appointmentsSetTagsPut,
      appointments_set_calls_made: input.appointmentsSetCallsMade,
      appointments_set_referrals: input.appointmentsSetReferrals,
      appointments_set_inbound: input.appointmentsSetInbound,
      appointments_held_door_knocks: input.appointmentsHeldDoorKnocks,
      appointments_held_tags_put: input.appointmentsHeldTagsPut,
      appointments_held_calls_made: input.appointmentsHeldCallsMade,
      appointments_held_referrals: input.appointmentsHeldReferrals,
      appointments_held_inbound: input.appointmentsHeldInbound,
      deals_closed_door_knocks: input.dealsClosedDoorKnocks,
      deals_closed_tags_put: input.dealsClosedTagsPut,
      deals_closed_calls_made: input.dealsClosedCallsMade,
      deals_closed_referrals: input.dealsClosedReferrals,
      deals_closed_inbound: input.dealsClosedInbound,
      accounts_serviced_door_knocks: input.accountsServicedDoorKnocks,
      accounts_serviced_tags_put: input.accountsServicedTagsPut,
      accounts_serviced_calls_made: input.accountsServicedCallsMade,
      accounts_serviced_referrals: input.accountsServicedReferrals,
      accounts_serviced_inbound: input.accountsServicedInbound,
      tally_counts: input.tallyCounts,
    };
    
    console.log('[createDailyInput] User ID:', userId);
    console.log('[createDailyInput] Input date:', input.date);
    console.log('[createDailyInput] Supabase payload:', JSON.stringify(dbInput, null, 2));
    
    try {
      // First try with upsert (requires unique constraint)
      let { data, error } = await supabase
        .from(TABLES.DAILY_INPUTS)
        .upsert(dbInput, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      // If upsert fails due to missing constraint, fall back to insert/update
      if (error && error.code === '42P10') {
        console.log('[createDailyInput] Upsert failed, trying insert/update approach');
        
        // Check if record exists
        const { data: existingData } = await supabase
          .from(TABLES.DAILY_INPUTS)
          .select('*')
          .eq('user_id', userId)
          .eq('date', input.date)
          .single();
        
        if (existingData) {
          // Update existing record
          const { data: updateData, error: updateError } = await supabase
            .from(TABLES.DAILY_INPUTS)
            .update(dbInput)
            .eq('user_id', userId)
            .eq('date', input.date)
            .select()
            .single();
          
          if (updateError) {
            console.error('❌ Supabase daily_inputs update error:', updateError);
            throw updateError;
          }
          
          data = updateData;
          error = null;
        } else {
          // Insert new record
          const { data: insertData, error: insertError } = await supabase
            .from(TABLES.DAILY_INPUTS)
            .insert(dbInput)
            .select()
            .single();
          
          if (insertError) {
            console.error('❌ Supabase daily_inputs insert error:', insertError);
            throw insertError;
          }
          
          data = insertData;
          error = null;
        }
      }
      
      console.log('[createDailyInput] Supabase response:', { data, error });
      
      if (error) {
        console.error('❌ Supabase daily_inputs upsert error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      if (!data) {
        console.error('❌ Supabase returned no data');
        throw new Error('No data returned from Supabase upsert');
      }
      
      console.log('✅ Supabase daily_inputs upsert success:', data);
      return this.mapDatabaseDailyInputToDailyInput(data);
    } catch (err) {
      console.error('❌ Supabase daily_inputs upsert exception:', err);
      
      // More robust error logging
      try {
        const errorDetails = {
          name: err instanceof Error ? err.name : typeof err === 'string' ? 'StringError' : 'Unknown',
          message: err instanceof Error ? err.message : typeof err === 'string' ? err : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          type: typeof err,
          stringified: JSON.stringify(err, null, 2)
        };
        console.error('❌ Exception details:', errorDetails);
      } catch (logError) {
        console.error('❌ Failed to log error details:', logError);
        console.error('❌ Original error:', err);
      }
      
      throw err;
    }
  }

  async updateDailyInput(userId: string, inputId: string, updates: Partial<DailyInput>): Promise<void> {
    // Validate input parameters
    if (!inputId || typeof inputId !== 'string' || inputId.trim() === '') {
      throw new Error('Invalid inputId provided for update');
    }
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid userId provided for update');
    }

    // Check if inputId is a UUID (Supabase id) or syncId (local format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(inputId);
    
    console.log('[updateDailyInput] inputId type:', isUuid ? 'UUID' : 'syncId');
    console.log('[updateDailyInput] inputId:', inputId);

    const dbUpdates: Partial<DatabaseDailyInput> = {
      date: updates.date,
      doors_knocked: updates.doorsKnocked,
      appointments: updates.appointments,
      appointment_holds: updates.appointmentHolds,
      closed_deals: updates.closedDeals,
      accounts_serviced: updates.accountsServiced,
      hours_worked: updates.hoursWorked,
      outreach_door_knocks: updates.outreachDoorKnocks,
      outreach_tags_put: updates.outreachTagsPut,
      outreach_calls_made: updates.outreachCallsMade,
      outreach_referrals: updates.outreachReferrals,
      outreach_inbound: updates.outreachInbound,
      appointments_set_door_knocks: updates.appointmentsSetDoorKnocks,
      appointments_set_tags_put: updates.appointmentsSetTagsPut,
      appointments_set_calls_made: updates.appointmentsSetCallsMade,
      appointments_set_referrals: updates.appointmentsSetReferrals,
      appointments_set_inbound: updates.appointmentsSetInbound,
      appointments_held_door_knocks: updates.appointmentsHeldDoorKnocks,
      appointments_held_tags_put: updates.appointmentsHeldTagsPut,
      appointments_held_calls_made: updates.appointmentsHeldCallsMade,
      appointments_held_referrals: updates.appointmentsHeldReferrals,
      appointments_held_inbound: updates.appointmentsHeldInbound,
      deals_closed_door_knocks: updates.dealsClosedDoorKnocks,
      deals_closed_tags_put: updates.dealsClosedTagsPut,
      deals_closed_calls_made: updates.dealsClosedCallsMade,
      deals_closed_referrals: updates.dealsClosedReferrals,
      deals_closed_inbound: updates.dealsClosedInbound,
      accounts_serviced_door_knocks: updates.accountsServicedDoorKnocks,
      accounts_serviced_tags_put: updates.accountsServicedTagsPut,
      accounts_serviced_calls_made: updates.accountsServicedCallsMade,
      accounts_serviced_referrals: updates.accountsServicedReferrals,
      accounts_serviced_inbound: updates.accountsServicedInbound,
      tally_counts: updates.tallyCounts,
      updated_at: new Date().toISOString(),
    };

    console.log('[updateDailyInput] User ID:', userId);
    console.log('[updateDailyInput] Input ID:', inputId);
    console.log('[updateDailyInput] Updates:', JSON.stringify(dbUpdates, null, 2));

    // Check if we have any valid updates
    const hasValidUpdates = Object.values(dbUpdates).some(value => value !== undefined && value !== null);
    if (!hasValidUpdates) {
      console.warn('[updateDailyInput] No valid updates provided, skipping update');
      return;
    }

    try {
      let query;
      
      if (isUuid) {
        // If it's a UUID, use it directly for the update
        query = supabase
          .from(TABLES.DAILY_INPUTS)
          .update(dbUpdates)
          .eq('id', inputId)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        // If it's a syncId, we need to find the record by user_id and date
        // Extract date from syncId format: userId_date_timestamp
        const syncIdParts = inputId.split('_');
        if (syncIdParts.length < 3) {
          throw new Error(`Invalid syncId format: ${inputId}`);
        }
        
        // Try to extract date from syncId - it could be in different positions
        let dateFromSyncId = null;
        
        // Look for a date pattern in the syncId parts
        for (let i = 1; i < syncIdParts.length - 1; i++) {
          const part = syncIdParts[i];
          // Check if this part looks like a date (YYYY-MM-DD or YYYYMMDD)
          if (part.length === 10 && part.includes('-')) {
            // Format: YYYY-MM-DD
            dateFromSyncId = part;
            break;
          } else if (part.length === 8 && /^\d{8}$/.test(part)) {
            // Format: YYYYMMDD
            dateFromSyncId = `${part.substring(0, 4)}-${part.substring(4, 6)}-${part.substring(6, 8)}`;
            break;
          }
        }
        
        // If we couldn't find a date pattern, use the date from updates
        if (!dateFromSyncId) {
          dateFromSyncId = updates.date || new Date().toISOString().split('T')[0];
          console.log('[updateDailyInput] Could not extract date from syncId, using updates.date:', dateFromSyncId);
        } else {
          console.log('[updateDailyInput] Extracted date from syncId:', dateFromSyncId);
        }
        
        // Try to find by user_id and date first
        query = supabase
          .from(TABLES.DAILY_INPUTS)
          .update(dbUpdates)
          .eq('user_id', userId)
          .eq('date', dateFromSyncId)
          .select()
          .single();
      }

      const { data, error } = await query;

      console.log('[updateDailyInput] Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase daily_inputs update error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Log the actual query parameters for debugging
        console.error('❌ Query parameters:', {
          table: TABLES.DAILY_INPUTS,
          updates: dbUpdates,
          inputId,
          userId,
          isUuid
        });
        
        // If no rows were updated, try to create the record instead
        if (error.code === 'PGRST116' || error.message.includes('No rows returned')) {
          console.log('⚠️ No existing record found, attempting to create new record...');
          try {
            const newInput = {
              user_id: userId,
              date: updates.date || new Date().toISOString().split('T')[0],
              ...dbUpdates
            };
            
            const { data: createdData, error: createError } = await supabase
              .from(TABLES.DAILY_INPUTS)
              .insert(newInput)
              .select()
              .single();
              
            if (createError) {
              console.error('❌ Failed to create new record:', createError);
              throw createError;
            }
            
            console.log('✅ Created new daily input record:', createdData);
            return;
          } catch (createErr) {
            console.error('❌ Failed to create new record:', createErr);
            throw createErr;
          }
        }
        
        throw error;
      }

      if (!data) {
        console.error('❌ Supabase returned no data for update');
        throw new Error('No data returned from Supabase update');
      }

      console.log('✅ Supabase daily_inputs update success:', data);
    } catch (err) {
      console.error('❌ Supabase daily_inputs update exception:', err);
      
      // More robust error logging
      try {
        const errorDetails = {
          name: err instanceof Error ? err.name : typeof err === 'string' ? 'StringError' : 'Unknown',
          message: err instanceof Error ? err.message : typeof err === 'string' ? err : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          type: typeof err,
          stringified: JSON.stringify(err, null, 2)
        };
        console.error('❌ Exception details:', errorDetails);
      } catch (logError) {
        console.error('❌ Failed to log error details:', logError);
        console.error('❌ Original error:', err);
      }
      
      throw err;
    }
  }

  async deleteDailyInput(userId: string, inputId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.DAILY_INPUTS)
      .delete()
      .eq('id', inputId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Verify Supabase table schema
  async verifyDailyInputsTableSchema(): Promise<{ isValid: boolean; missingColumns?: string[] }> {
    try {
      console.log('[verifyDailyInputsTableSchema] 🔍 Verifying daily_inputs table schema...');
      
      // Instead of inserting test data (which violates RLS), just check if the table exists
      // and has the expected columns by attempting to select from it
      const { data, error } = await supabase
        .from(TABLES.DAILY_INPUTS)
        .select('id, user_id, date, doors_knocked, appointments, appointment_holds, closed_deals, accounts_serviced, hours_worked, outreach_door_knocks, outreach_tags_put, outreach_calls_made, outreach_referrals, outreach_inbound, appointments_set_door_knocks, appointments_set_tags_put, appointments_set_calls_made, appointments_set_referrals, appointments_set_inbound, appointments_held_door_knocks, appointments_held_tags_put, appointments_held_calls_made, appointments_held_referrals, appointments_held_inbound, deals_closed_door_knocks, deals_closed_tags_put, deals_closed_calls_made, deals_closed_referrals, deals_closed_inbound, accounts_serviced_door_knocks, accounts_serviced_tags_put, accounts_serviced_calls_made, accounts_serviced_referrals, accounts_serviced_inbound, tally_counts, created_at')
        .limit(1);

      if (error) {
        console.error('[verifyDailyInputsTableSchema] Schema validation failed:', error);
        return { isValid: false, missingColumns: [error.message] };
      }

      console.log('[verifyDailyInputsTableSchema] ✅ Schema validation passed');
      return { isValid: true };
    } catch (error) {
      console.error('[verifyDailyInputsTableSchema] Schema validation error:', error);
      return { isValid: false, missingColumns: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Mapping functions for daily inputs
  private mapDatabaseDailyInputToDailyInput(dbInput: DatabaseDailyInput): DailyInput {
    return {
      id: dbInput.id,
      date: dbInput.date,
      doorsKnocked: dbInput.doors_knocked,
      appointments: dbInput.appointments,
      appointmentHolds: dbInput.appointment_holds,
      closedDeals: dbInput.closed_deals,
      accountsServiced: dbInput.accounts_serviced,
      hoursWorked: dbInput.hours_worked,
      outreachDoorKnocks: dbInput.outreach_door_knocks ?? 0,
      outreachTagsPut: dbInput.outreach_tags_put ?? 0,
      outreachCallsMade: dbInput.outreach_calls_made ?? 0,
      outreachReferrals: dbInput.outreach_referrals ?? 0,
      outreachInbound: dbInput.outreach_inbound ?? 0,
      appointmentsSetDoorKnocks: dbInput.appointments_set_door_knocks ?? 0,
      appointmentsSetTagsPut: dbInput.appointments_set_tags_put ?? 0,
      appointmentsSetCallsMade: dbInput.appointments_set_calls_made ?? 0,
      appointmentsSetReferrals: dbInput.appointments_set_referrals ?? 0,
      appointmentsSetInbound: dbInput.appointments_set_inbound ?? 0,
      appointmentsHeldDoorKnocks: dbInput.appointments_held_door_knocks ?? 0,
      appointmentsHeldTagsPut: dbInput.appointments_held_tags_put ?? 0,
      appointmentsHeldCallsMade: dbInput.appointments_held_calls_made ?? 0,
      appointmentsHeldReferrals: dbInput.appointments_held_referrals ?? 0,
      appointmentsHeldInbound: dbInput.appointments_held_inbound ?? 0,
      dealsClosedDoorKnocks: dbInput.deals_closed_door_knocks ?? 0,
      dealsClosedTagsPut: dbInput.deals_closed_tags_put ?? 0,
      dealsClosedCallsMade: dbInput.deals_closed_calls_made ?? 0,
      dealsClosedReferrals: dbInput.deals_closed_referrals ?? 0,
      dealsClosedInbound: dbInput.deals_closed_inbound ?? 0,
      accountsServicedDoorKnocks: dbInput.accounts_serviced_door_knocks ?? 0,
      accountsServicedTagsPut: dbInput.accounts_serviced_tags_put ?? 0,
      accountsServicedCallsMade: dbInput.accounts_serviced_calls_made ?? 0,
      accountsServicedReferrals: dbInput.accounts_serviced_referrals ?? 0,
      accountsServicedInbound: dbInput.accounts_serviced_inbound ?? 0,
      tallyCounts: dbInput.tally_counts || {},
      createdAt: dbInput.created_at,
    };
  }

  // Add this new method to handle user profile creation
  async createUserProfile(userId: string, email: string, name?: string): Promise<void> {
    try {
      console.log('🔧 Creating user profile for:', email);
      
      // First, try to check if the user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (existingUser) {
        console.log('✅ User profile already exists');
        return;
      }
      
      // Try to insert the user profile
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: name || email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error('❌ Error creating user profile:', error);
        
        // If it's a permission error, log it but don't throw
        if (error.code === '42501') {
          console.warn('⚠️ Permission denied for user profile creation - this is expected if RLS is blocking the operation');
          return; // Don't throw, just return gracefully
        }
        
        throw error;
      }
      
      console.log('✅ User profile created successfully');
    } catch (error) {
      console.error('❌ Failed to create user profile:', error);
      
      // Don't throw the error - just log it and continue
      // The trigger function should handle this automatically
      console.warn('⚠️ User profile creation failed, but continuing - trigger should handle this');
    }
  }

  async saveUserSettings(userId: string, settings: {
    appSettings?: any;
    leadFilterSettings?: any;
    inputSettings?: any;
    kpiVisibility?: any;
    visibilitySettings?: any;
  }): Promise<void> {
    try {
      console.log('💾 [SupabaseService] Saving user settings to Supabase for user:', userId);
      
      const { data: existing } = await supabase
        .from('user_settings')
        .select('app_settings, lead_filter_settings, input_settings, kpi_visibility, visibility_settings')
        .eq('user_id', userId)
        .maybeSingle();

      const settingsData: any = {
        user_id: userId,
        app_settings: existing?.app_settings || {},
        lead_filter_settings: existing?.lead_filter_settings || {},
        input_settings: existing?.input_settings || {},
        kpi_visibility: existing?.kpi_visibility || {},
        visibility_settings: existing?.visibility_settings || {},
      };

      if (settings.appSettings !== undefined) {
        settingsData.app_settings = settings.appSettings;
      }
      if (settings.leadFilterSettings !== undefined) {
        settingsData.lead_filter_settings = settings.leadFilterSettings;
      }
      if (settings.inputSettings !== undefined) {
        settingsData.input_settings = settings.inputSettings;
      }
      if (settings.kpiVisibility !== undefined) {
        settingsData.kpi_visibility = settings.kpiVisibility;
      }
      if (settings.visibilitySettings !== undefined) {
        settingsData.visibility_settings = settings.visibilitySettings;
      }

      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('❌ [SupabaseService] Failed to save user settings:', upsertError);
        throw upsertError;
      }
      
      console.log('✅ [SupabaseService] User settings saved successfully');
    } catch (error) {
      console.error('❌ [SupabaseService] Error saving user settings:', error);
      throw error;
    }
  }

  async getUserSettings(userId: string): Promise<{
    appSettings: any;
    leadFilterSettings: any;
    inputSettings: any;
    kpiVisibility: any;
    visibilitySettings: any;
  }> {
    try {
      console.log('📂 [SupabaseService] Loading user settings from Supabase for user:', userId);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ [SupabaseService] No settings found, returning defaults');
          return {
            appSettings: {},
            leadFilterSettings: {},
            inputSettings: {},
            kpiVisibility: {},
            visibilitySettings: {}
          };
        }
        console.error('❌ [SupabaseService] Failed to load user settings:', error);
        throw error;
      }

      console.log('✅ [SupabaseService] User settings loaded successfully');
      return {
        appSettings: data.app_settings || {},
        leadFilterSettings: data.lead_filter_settings || {},
        inputSettings: data.input_settings || {},
        kpiVisibility: data.kpi_visibility || {},
        visibilitySettings: data.visibility_settings || {}
      };
    } catch (error) {
      console.error('❌ [SupabaseService] Error loading user settings:', error);
      return {
        appSettings: {},
        leadFilterSettings: {},
        inputSettings: {},
        kpiVisibility: {},
        visibilitySettings: {}
      };
    }
  }
}

export const supabaseService = new SupabaseService();
