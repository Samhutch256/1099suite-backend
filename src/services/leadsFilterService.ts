import { supabase } from '../config/supabase';
import { LeadsFilters, DateKey } from '../hooks/useLeadsFilters';
import { resolveRange } from '../utils/dateRangeUtils';
import { Lead } from '../state/contractorStore';

export interface FilteredLeadsResult {
  leads: Lead[];
  totalCount: number;
  revenueBreakdown: {
    guaranteed: number;
    pipeline: number;
    paidOut: number;
    total: number;
  };
}

const dateFieldMapping: Record<DateKey, string> = {
  created: 'created_at',
  updated: 'updated_at',
  appt_set: 'appointment_set_on_date',
  appt_held: 'appointment_date',
  deal_signed: 'date_set',
  service_completed: 'date_set_for',
  follow_up_due: 'next_follow_up', // This would need to be computed
};

export const fetchFilteredLeads = async (
  userId: string,
  filters: LeadsFilters,
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 25
): Promise<FilteredLeadsResult> => {
  try {
    console.log('[LeadsFilterService] Fetching filtered leads with:', { filters, searchQuery, page, pageSize });

    // Start building the query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply date range filters
    if (filters.rangePreset !== 'all') {
      const { start, end } = resolveRange(filters.rangePreset, filters.start, filters.end);
      const dateField = dateFieldMapping[filters.dateKey];
      
      if (dateField && dateField !== 'next_follow_up') {
        if (start) {
          query = query.gte(dateField, start);
        }
        if (end) {
          query = query.lte(dateField, end);
        }
      }
    }

    // Apply stage filters
    if (filters.stages.length > 0) {
      query = query.in('status', filters.stages);
    }

    // Apply status filters
    if (filters.status && filters.status !== 'any') {
      if (filters.status === 'active') {
        query = query.eq('is_cancelled', false);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_cancelled', true);
      }
    }

    // Apply source filters
    if (filters.sources.length > 0) {
      query = query.in('source', filters.sources);
    }

    // Apply tag filters (if tags field exists)
    if (filters.tags.length > 0) {
      // Note: This assumes a tags field exists in the database
      // If not, you might need to store tags differently
      query = query.contains('tags', filters.tags);
    }

    // Apply owner filter (defaults to current user)
    if (filters.ownerId) {
      query = query.eq('user_id', filters.ownerId);
    }

    // Apply assignee filter (if assignee_id field exists)
    if (filters.assigneeId) {
      query = query.eq('assignee_id', filters.assigneeId);
    }

    // Apply revenue filters
    if (filters.revenueType && (filters.revenueMin !== undefined || filters.revenueMax !== undefined)) {
      let revenueField = 'value'; // Default to total value
      
      if (filters.revenueType === 'guaranteed') {
        // This would need to be computed from revenue.guaranteedRevenue
        revenueField = 'value'; // Placeholder
      } else if (filters.revenueType === 'pipeline') {
        // This would need to be computed from revenue.pipelineRevenue
        revenueField = 'value'; // Placeholder
      } else if (filters.revenueType === 'paid') {
        // This would need to be computed from revenue.paidOutRevenue
        revenueField = 'value'; // Placeholder
      }

      if (filters.revenueMin !== undefined) {
        query = query.gte(revenueField, filters.revenueMin);
      }
      if (filters.revenueMax !== undefined) {
        query = query.lte(revenueField, filters.revenueMax);
      }
    }

    // Apply follow-up filters
    if (filters.followUp === 'due') {
      // This would need to be computed from follow_up_reminders
      // For now, we'll filter client-side
    } else if (filters.followUp === 'none') {
      // This would need to be computed from follow_up_reminders
      // For now, we'll filter client-side
    }

    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim().toLowerCase();
      query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    console.log('[LeadsFilterService] Executing query...');
    const { data: leads, error, count } = await query;

    if (error) {
      console.error('[LeadsFilterService] Query error:', error);
      throw error;
    }

    console.log('[LeadsFilterService] Raw leads from database:', leads?.length || 0);

    // Transform database leads to Lead objects
    const transformedLeads = (leads || []).map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      address: lead.address,
      status: lead.status,
      highestStageReached: lead.highest_stage_reached,
      cancellationStatus: lead.cancellation_status,
      selectedPipelineStages: lead.selected_pipeline_stages,
      value: lead.value || 0,
      revenue: lead.revenue ? {
        guaranteedRevenue: lead.revenue.guaranteedRevenue || 0,
        pipelineRevenue: lead.revenue.pipelineRevenue || 0,
        guaranteedPaidOut: lead.revenue.guaranteedPaidOut || false,
        pipelinePaidOut: lead.revenue.pipelinePaidOut || false,
        totalRevenue: (lead.revenue.guaranteedRevenue || 0) + (lead.revenue.pipelineRevenue || 0),
        paidOutRevenue: lead.revenue.paidOutRevenue || 0,
      } : undefined,
      notes: lead.notes || '',
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      source: lead.source,
      appointmentDate: lead.appointment_date,
      appointmentTime: lead.appointment_time,
      appointmentNotes: lead.appointment_notes,
      appointmentStatus: lead.appointment_status,
      cancelledReason: lead.cancelled_reason,
      lostReason: lead.lost_reason,
      isCancelled: lead.is_cancelled || false,
      appointmentCreatedFrom: lead.appointment_created_from,
      appointmentSetOnDate: lead.appointment_set_on_date,
      dateSet: lead.date_set,
      dateSetFor: lead.date_set_for,
      fileUrls: lead.file_urls || [],
      followUpReminders: [], // Will be loaded separately
      nextFollowUp: undefined, // Will be computed
    }));

    // Apply client-side filters that can't be done server-side
    let filteredLeads = transformedLeads;

    // Apply follow-up filters client-side
    if (filters.followUp === 'due') {
      // Filter leads that have follow-ups due
      filteredLeads = filteredLeads.filter(lead => {
        // This would need to be computed from follow_up_reminders
        // For now, we'll return all leads
        return true;
      });
    } else if (filters.followUp === 'none') {
      // Filter leads that have no follow-ups
      filteredLeads = filteredLeads.filter(lead => {
        // This would need to be computed from follow_up_reminders
        // For now, we'll return all leads
        return true;
      });
    }

    // Calculate revenue breakdown
    const revenueBreakdown = {
      guaranteed: filteredLeads.reduce((sum, lead) => sum + (lead.revenue?.guaranteedRevenue || 0), 0),
      pipeline: filteredLeads.reduce((sum, lead) => {
        if (!lead.isCancelled && !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status)) {
          return sum + (lead.revenue?.pipelineRevenue || 0);
        }
        return sum;
      }, 0),
      paidOut: filteredLeads.reduce((sum, lead) => sum + (lead.revenue?.paidOutRevenue || 0), 0),
      total: 0,
    };
    revenueBreakdown.total = revenueBreakdown.guaranteed + revenueBreakdown.pipeline;

    console.log('[LeadsFilterService] Final result:', {
      leadsCount: filteredLeads.length,
      totalCount: count || 0,
      revenueBreakdown,
    });

    return {
      leads: filteredLeads,
      totalCount: count || 0,
      revenueBreakdown,
    };
  } catch (error) {
    console.error('[LeadsFilterService] Error fetching filtered leads:', error);
    throw error;
  }
};

// Helper function to get available tags for type-ahead
export const getAvailableTags = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('tags')
      .eq('user_id', userId)
      .not('tags', 'is', null);

    if (error) throw error;

    const allTags = (data || [])
      .flatMap(lead => lead.tags || [])
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates

    return allTags.sort();
  } catch (error) {
    console.error('[LeadsFilterService] Error fetching tags:', error);
    return [];
  }
};
