import { supabase } from '../config/supabase';
import { WorkingSimpleLeadsFilters } from '../hooks/useWorkingSimpleLeadsFilters';

export interface WorkingSimpleFilteredLeadsResult {
  leads: any[];
  totalCount: number;
  kpis: {
    total: number;
    guaranteed: number;
    pipeline: number;
    paidOut: number;
  };
}

// Helper function to get date range based on time period
const getDateRange = (timePeriod: string, customStartDate?: string, customEndDate?: string) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timePeriod) {
    case 'today':
      return {
        start: startOfDay.toISOString(),
        end: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    case 'week':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return {
        start: startOfWeek.toISOString(),
        end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      };
    case 'year':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        start: startOfYear.toISOString(),
        end: endOfYear.toISOString(),
      };
    case 'custom':
      if (customStartDate && customEndDate) {
        return {
          start: new Date(customStartDate).toISOString(),
          end: new Date(customEndDate).toISOString(),
        };
      }
      return null;
    default:
      return null;
  }
};

// Helper function to get sort field and order
const getSortConfig = (sortBy: string, sortOrder: string) => {
  let field = 'created_at';
  let ascending = sortOrder === 'asc';
  
  switch (sortBy) {
    case 'date':
      field = 'created_at';
      break;
    case 'name':
      field = 'name';
      break;
    case 'revenue':
      // For revenue, we need to sort by the total revenue calculation
      // We'll use a computed field or sort by value as fallback
      field = 'value';
      break;
  }
  
  return { field, ascending };
};

export const fetchWorkingSimpleFilteredLeads = async (
  userId: string,
  filters: WorkingSimpleLeadsFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<WorkingSimpleFilteredLeadsResult> => {
  try {
    console.log('[WorkingSimpleLeadsFilterService] Fetching filtered leads with:', { filters, page, pageSize });

    // Start building the query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    console.log('[WorkingSimpleLeadsFilterService] Base query created for user:', userId);

    // Apply time period filter
    if (filters.timePeriod !== 'all') {
      const dateRange = getDateRange(filters.timePeriod, filters.customStartDate, filters.customEndDate);
      if (dateRange) {
        console.log('[WorkingSimpleLeadsFilterService] Applying time period filter:', {
          timePeriod: filters.timePeriod,
          dateField: filters.dateField,
          dateRange,
          customStartDate: filters.customStartDate,
          customEndDate: filters.customEndDate
        });
        query = query.gte(filters.dateField, dateRange.start);
        query = query.lte(filters.dateField, dateRange.end);
      } else {
        console.log('[WorkingSimpleLeadsFilterService] No date range calculated for timePeriod:', filters.timePeriod);
      }
    }

    // Apply status filter
    if (filters.status === 'active') {
      console.log('[WorkingSimpleLeadsFilterService] Applying active status filter');
      // Active leads are those that are NOT cancelled
      query = query.eq('is_cancelled', false);
    } else if (filters.status === 'inactive') {
      console.log('[WorkingSimpleLeadsFilterService] Applying inactive status filter');
      // Inactive leads are those that ARE cancelled
      query = query.eq('is_cancelled', true);
    }

    // Apply sources filter
    if (filters.sources.length > 0) {
      console.log('[WorkingSimpleLeadsFilterService] Applying sources filter:', filters.sources);
      query = query.in('source', filters.sources);
    }

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.trim().toLowerCase();
      console.log('[WorkingSimpleLeadsFilterService] Applying search filter:', searchTerm);
      query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    const { field, ascending } = getSortConfig(filters.sortBy, filters.sortOrder);
    query = query.order(field, { ascending });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('[WorkingSimpleLeadsFilterService] Error fetching leads:', error);
      throw error;
    }

    console.log('[WorkingSimpleLeadsFilterService] Query result:', {
      leadsCount: leads?.length || 0,
      totalCount: count || 0,
      sampleLead: leads?.[0],
      allLeads: leads?.map(lead => ({
        id: lead.id,
        name: lead.name,
        status: lead.status,
        is_cancelled: lead.is_cancelled,
        created_at: lead.created_at,
        date_set: lead.date_set,
        date_set_for: lead.date_set_for
      }))
    });

    // Calculate KPIs
    const kpis = {
      total: leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0,
      guaranteed: leads?.reduce((sum, lead) => sum + (lead.guaranteed_revenue || 0), 0) || 0,
      pipeline: leads?.reduce((sum, lead) => sum + (lead.pipeline_revenue || 0), 0) || 0,
      paidOut: leads?.reduce((sum, lead) => sum + (lead.paid_out_revenue || 0), 0) || 0,
    };

    console.log('[WorkingSimpleLeadsFilterService] Calculated KPIs:', kpis);

    return {
      leads: leads || [],
      totalCount: count || 0,
      kpis,
    };
  } catch (error) {
    console.error('[WorkingSimpleLeadsFilterService] Error:', error);
    throw error;
  }
};
