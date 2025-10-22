import { supabase } from '../config/supabase';
import { SimpleLeadsFilters } from '../hooks/useSimpleLeadsFilters';

export interface SimpleFilteredLeadsResult {
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
const getDateRange = (timePeriod: string) => {
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
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
      return {
        start: startOfQuarter.toISOString(),
        end: endOfQuarter.toISOString(),
      };
    case 'year':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
      return {
        start: startOfYear.toISOString(),
        end: endOfYear.toISOString(),
      };
    default:
      return null;
  }
};

export const fetchSimpleFilteredLeads = async (
  userId: string,
  filters: SimpleLeadsFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<SimpleFilteredLeadsResult> => {
  try {
    console.log('[SimpleLeadsFilterService] Fetching filtered leads with:', { filters, page, pageSize });

    // Start building the query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply time period filter
    if (filters.timePeriod !== 'all') {
      const dateRange = getDateRange(filters.timePeriod);
      if (dateRange) {
        query = query.gte('created_at', dateRange.start);
        query = query.lte('created_at', dateRange.end);
      }
    }

    // Apply status filter
    if (filters.status === 'active') {
      query = query.eq('is_cancelled', false);
    } else if (filters.status === 'inactive') {
      query = query.eq('is_cancelled', true);
    }

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.trim().toLowerCase();
      query = query.or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('[SimpleLeadsFilterService] Error fetching leads:', error);
      throw error;
    }

    // Calculate KPIs
    const kpis = {
      total: leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0,
      guaranteed: leads?.reduce((sum, lead) => sum + (lead.guaranteed_revenue || 0), 0) || 0,
      pipeline: leads?.reduce((sum, lead) => sum + (lead.pipeline_revenue || 0), 0) || 0,
      paidOut: leads?.reduce((sum, lead) => sum + (lead.paid_out_revenue || 0), 0) || 0,
    };

    return {
      leads: leads || [],
      totalCount: count || 0,
      kpis,
    };
  } catch (error) {
    console.error('[SimpleLeadsFilterService] Error:', error);
    throw error;
  }
};
