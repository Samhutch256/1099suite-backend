import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../state/authStore';
import { formatDateForDatabase } from '../utils/dateRangeUtils';

export interface InputMetrics {
  appointments_set: number;
  door_knocks: number;
  tags_put: number;
  calls_made: number;
  referrals: number;
  inbound: number;
  appointments_held: number;
  closed_deals: number;
  accounts_serviced: number;
  hours_worked: number;
  notes?: string;
}

export interface InputData {
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string;
  period_end: string;
  appointments_set: number;
  door_knocks: number;
  tags_put: number;
  calls_made: number;
  referrals: number;
  inbound: number;
  appointments_held: number;
  closed_deals: number;
  accounts_serviced: number;
  hours_worked: number;
  notes: string;
}

export const useInputsForPeriod = (userId: string, periodType: 'day' | 'week' | 'month' | 'year', selectedDate: Date) => {
  const [data, setData] = useState<InputData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId || !periodType || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching period data:', { userId, periodType, selectedDate: formatDateForDatabase(selectedDate) });
      
      // Try to fetch from the view, fallback to direct table query if view doesn't exist
      let result, fetchError;
      
      try {
        const response = await supabase
          .from(`v_inputs_${periodType}`)
          .select('*')
          .eq('user_id', userId)
          .eq('period_start', formatDateForDatabase(selectedDate))
          .single();
        
        result = response.data;
        fetchError = response.error;
      } catch (viewError) {
        console.log(`View v_inputs_${periodType} doesn't exist, falling back to direct table query`);
        
        // Fallback: query inputs_log table directly
        const response = await supabase
          .from('inputs_log')
          .select('*')
          .eq('user_id', userId)
          .eq('period_type', periodType)
          .eq('period_start', formatDateForDatabase(selectedDate))
          .single();
        
        result = response.data;
        fetchError = response.error;
      }

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching period data:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (result) {
        setData(result);
      } else {
        // Return default structure with zeros
        const defaultData: InputData = {
          period_type: periodType,
          period_start: formatDateForDatabase(selectedDate),
          period_end: formatDateForDatabase(selectedDate),
          appointments_set: 0,
          door_knocks: 0,
          tags_put: 0,
          calls_made: 0,
          referrals: 0,
          inbound: 0,
          appointments_held: 0,
          closed_deals: 0,
          accounts_serviced: 0,
          hours_worked: 0,
          notes: ''
        };
        setData(defaultData);
      }
    } catch (err) {
      console.error('Error in useInputsForPeriod:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (metrics: InputMetrics): Promise<boolean> => {
    if (!userId || !periodType || !selectedDate) return false;

    setLoading(true);
    setError(null);

    try {
      console.log('Saving period data:', { userId, periodType, selectedDate: formatDateForDatabase(selectedDate), metrics });
      
      // Compute period bounds
      const periodStart = formatDateForDatabase(selectedDate);
      let periodEnd = periodStart;
      
      if (periodType === 'week') {
        // Monday to Sunday
        const dayOfWeek = selectedDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(selectedDate);
        monday.setDate(selectedDate.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        periodEnd = formatDateForDatabase(sunday);
      } else if (periodType === 'month') {
        const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        periodEnd = formatDateForDatabase(lastDay);
      } else if (periodType === 'year') {
        const lastDay = new Date(selectedDate.getFullYear(), 11, 31);
        periodEnd = formatDateForDatabase(lastDay);
      }

      const { error: upsertError } = await supabase
        .from('inputs_log')
        .upsert({
          user_id: userId,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          appointments_set: metrics.appointments_set || 0,
          door_knocks: metrics.door_knocks || 0,
          tags_put: metrics.tags_put || 0,
          calls_made: metrics.calls_made || 0,
          referrals: metrics.referrals || 0,
          inbound: metrics.inbound || 0,
          appointments_held: metrics.appointments_held || 0,
          closed_deals: metrics.closed_deals || 0,
          accounts_serviced: metrics.accounts_serviced || 0,
          hours_worked: metrics.hours_worked || 0,
          notes: metrics.notes || '',
          source: 'manual'
        }, { 
          onConflict: 'user_id,period_type,period_start',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error saving period data:', upsertError);
        setError(upsertError.message);
        return false;
      }

      // Refresh the data after saving
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error in saveData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async (): Promise<boolean> => {
    if (!userId || !periodType || !selectedDate) return false;

    setLoading(true);
    setError(null);

    try {
      console.log('Deleting period data:', { userId, periodType, selectedDate: formatDateForDatabase(selectedDate) });
      
      const { error: deleteError } = await supabase
        .from('inputs_log')
        .delete()
        .eq('user_id', userId)
        .eq('period_type', periodType)
        .eq('period_start', formatDateForDatabase(selectedDate));

      if (deleteError) {
        console.error('Error deleting period data:', deleteError);
        setError(deleteError.message);
        return false;
      }

      // Reset data after deletion
      setData(null);
      return true;
    } catch (err) {
      console.error('Error in deleteData:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, periodType, selectedDate]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    saveData,
    deleteData,
  };
};
