import { supabase } from '../config/supabase';
import { UltraSimpleLeadsFilters } from '../hooks/useUltraSimpleLeadsFilters';

export interface UltraSimpleFilteredLeadsResult {
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
      field = 'value';
      break;
  }
  
  return { field, ascending };
};

export const fetchUltraSimpleFilteredLeads = async (
  userId: string,
  filters: UltraSimpleLeadsFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<UltraSimpleFilteredLeadsResult> => {
  try {
    console.log('[UltraSimpleLeadsFilterService] Fetching filtered leads with:', { filters, page, pageSize });

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

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.trim().toLowerCase();
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
      console.error('[UltraSimpleLeadsFilterService] Error fetching leads:', error);
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
    console.error('[UltraSimpleLeadsFilterService] Error:', error);
    throw error;
  }
};
