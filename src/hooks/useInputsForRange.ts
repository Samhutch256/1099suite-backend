import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../state/authStore';

export interface PeriodTotals {
  doors_knocked: number;
  appointments_set: number;
  appointments_held: number;
  closed_deals: number;
  accounts_serviced: number;
  hours_worked: number;
  // Sub-inputs for outreach
  outreach_door_knocks: number;
  outreach_tags_put: number;
  outreach_calls_made: number;
  outreach_referrals: number;
  outreach_inbound: number;
  // Sub-inputs for appointments set
  appointments_set_door_knocks: number;
  appointments_set_tags_put: number;
  appointments_set_calls_made: number;
  appointments_set_referrals: number;
  appointments_set_inbound: number;
  // Sub-inputs for appointments held
  appointments_held_door_knocks: number;
  appointments_held_tags_put: number;
  appointments_held_calls_made: number;
  appointments_held_referrals: number;
  appointments_held_inbound: number;
  // Sub-inputs for deals closed
  deals_closed_door_knocks: number;
  deals_closed_tags_put: number;
  deals_closed_calls_made: number;
  deals_closed_referrals: number;
  deals_closed_inbound: number;
  // Sub-inputs for accounts serviced
  accounts_serviced_door_knocks: number;
  accounts_serviced_tags_put: number;
  accounts_serviced_calls_made: number;
  accounts_serviced_referrals: number;
  accounts_serviced_inbound: number;
}

const deriveOutreachInbound = (
  storedValue: number,
  totalOutreach: number,
  components: number[]
) => {
  const fallback = Math.max(totalOutreach - components.reduce((acc, val) => acc + val, 0), 0);
  if (storedValue === null || storedValue === undefined) {
    return fallback;
  }
  if (storedValue === 0 && fallback > 0) {
    return fallback;
  }
  return storedValue;
};

export const useInputsForRange = (userId: string, startDate: string, endDate: string) => {
  const [totals, setTotals] = useState<PeriodTotals>({
    doors_knocked: 0,
    appointments_set: 0,
    appointments_held: 0,
    closed_deals: 0,
    accounts_serviced: 0,
    hours_worked: 0,
    // Sub-inputs for outreach
    outreach_door_knocks: 0,
    outreach_tags_put: 0,
    outreach_calls_made: 0,
    outreach_referrals: 0,
    outreach_inbound: 0,
    // Sub-inputs for appointments set
    appointments_set_door_knocks: 0,
    appointments_set_tags_put: 0,
    appointments_set_calls_made: 0,
    appointments_set_referrals: 0,
    appointments_set_inbound: 0,
    // Sub-inputs for appointments held
    appointments_held_door_knocks: 0,
    appointments_held_tags_put: 0,
    appointments_held_calls_made: 0,
    appointments_held_referrals: 0,
    appointments_held_inbound: 0,
    // Sub-inputs for deals closed
    deals_closed_door_knocks: 0,
    deals_closed_tags_put: 0,
    deals_closed_calls_made: 0,
    deals_closed_referrals: 0,
    deals_closed_inbound: 0,
    // Sub-inputs for accounts serviced
    accounts_serviced_door_knocks: 0,
    accounts_serviced_tags_put: 0,
    accounts_serviced_calls_made: 0,
    accounts_serviced_referrals: 0,
    accounts_serviced_inbound: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotals = async () => {
    if (!userId || !startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching period totals:', { userId, startDate, endDate });
      const { data, error: rpcError } = await supabase.rpc('daily_inputs_sum_range_with_subinputs', {
        p_user: userId,
        p_start: startDate,
        p_end: endDate,
      });

      if (rpcError) {
        console.error('Error fetching period totals:', rpcError);
        setError(rpcError.message);
        return;
      }

      if (data && data.length > 0) {
        console.log('📊 Raw period totals from database:', data[0]);
        
        const doorsKnocked = data[0].doors_knocked ?? 0;
        const outreachDoorKnocks = data[0].outreach_door_knocks ?? 0;
        const outreachTagsPut = data[0].outreach_tags_put ?? 0;
        const outreachCallsMade = data[0].outreach_calls_made ?? 0;
        const outreachReferrals = data[0].outreach_referrals ?? 0;
        const outreachInbound = deriveOutreachInbound(
          data[0].outreach_inbound,
          doorsKnocked,
          [outreachDoorKnocks, outreachTagsPut, outreachCallsMade, outreachReferrals]
        );
        
        setTotals({
          doors_knocked: doorsKnocked,
          appointments_set: data[0].appointments_set ?? 0,
          appointments_held: data[0].appointments_held ?? 0,
          closed_deals: data[0].closed_deals ?? 0,
          accounts_serviced: data[0].accounts_serviced ?? 0,
          hours_worked: data[0].hours_worked ?? 0,
          // Sub-inputs for outreach
          outreach_door_knocks: outreachDoorKnocks,
          outreach_tags_put: outreachTagsPut,
          outreach_calls_made: outreachCallsMade,
          outreach_referrals: outreachReferrals,
          outreach_inbound: outreachInbound,
          // Sub-inputs for appointments set
          appointments_set_door_knocks: data[0].appointments_set_door_knocks ?? 0,
          appointments_set_tags_put: data[0].appointments_set_tags_put ?? 0,
          appointments_set_calls_made: data[0].appointments_set_calls_made ?? 0,
          appointments_set_referrals: data[0].appointments_set_referrals ?? 0,
          appointments_set_inbound: data[0].appointments_set_inbound ?? 0,
          // Sub-inputs for appointments held
          appointments_held_door_knocks: data[0].appointments_held_door_knocks ?? 0,
          appointments_held_tags_put: data[0].appointments_held_tags_put ?? 0,
          appointments_held_calls_made: data[0].appointments_held_calls_made ?? 0,
          appointments_held_referrals: data[0].appointments_held_referrals ?? 0,
          appointments_held_inbound: data[0].appointments_held_inbound ?? 0,
          // Sub-inputs for deals closed
          deals_closed_door_knocks: data[0].deals_closed_door_knocks ?? 0,
          deals_closed_tags_put: data[0].deals_closed_tags_put ?? 0,
          deals_closed_calls_made: data[0].deals_closed_calls_made ?? 0,
          deals_closed_referrals: data[0].deals_closed_referrals ?? 0,
          deals_closed_inbound: data[0].deals_closed_inbound ?? 0,
          // Sub-inputs for accounts serviced
          accounts_serviced_door_knocks: data[0].accounts_serviced_door_knocks ?? 0,
          accounts_serviced_tags_put: data[0].accounts_serviced_tags_put ?? 0,
          accounts_serviced_calls_made: data[0].accounts_serviced_calls_made ?? 0,
          accounts_serviced_referrals: data[0].accounts_serviced_referrals ?? 0,
          accounts_serviced_inbound: data[0].accounts_serviced_inbound ?? 0,
        });
      } else {
        setTotals({
          doors_knocked: 0,
          appointments_set: 0,
          appointments_held: 0,
          closed_deals: 0,
          accounts_serviced: 0,
          hours_worked: 0,
          // Sub-inputs for outreach
          outreach_door_knocks: 0,
          outreach_tags_put: 0,
          outreach_calls_made: 0,
          outreach_referrals: 0,
          outreach_inbound: 0,
          // Sub-inputs for appointments set
          appointments_set_door_knocks: 0,
          appointments_set_tags_put: 0,
          appointments_set_calls_made: 0,
          appointments_set_referrals: 0,
          appointments_set_inbound: 0,
          // Sub-inputs for appointments held
          appointments_held_door_knocks: 0,
          appointments_held_tags_put: 0,
          appointments_held_calls_made: 0,
          appointments_held_referrals: 0,
          appointments_held_inbound: 0,
          // Sub-inputs for deals closed
          deals_closed_door_knocks: 0,
          deals_closed_tags_put: 0,
          deals_closed_calls_made: 0,
          deals_closed_referrals: 0,
          deals_closed_inbound: 0,
          // Sub-inputs for accounts serviced
          accounts_serviced_door_knocks: 0,
          accounts_serviced_tags_put: 0,
          accounts_serviced_calls_made: 0,
          accounts_serviced_referrals: 0,
          accounts_serviced_inbound: 0,
        });
      }
    } catch (err) {
      console.error('Error in useInputsForRange:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const savePeriodTotals = async (newTotals: PeriodTotals): Promise<boolean> => {
    if (!userId || !startDate || !endDate) return false;

    setLoading(true);
    setError(null);

    try {
      console.log('Saving period totals:', { userId, startDate, endDate, newTotals });
      const { error: rpcError } = await supabase.rpc('daily_inputs_overwrite_range_with_subinputs', {
        p_user: userId,
        p_start: startDate,
        p_end: endDate,
        p_appt_set: newTotals.appointments_set,
        p_appt_held: newTotals.appointments_held,
        p_closed: newTotals.closed_deals,
        p_serviced: newTotals.accounts_serviced,
        p_hours: newTotals.hours_worked,
        // Sub-inputs for outreach
        p_outreach_door_knocks: newTotals.outreach_door_knocks,
        p_outreach_tags_put: newTotals.outreach_tags_put,
        p_outreach_calls_made: newTotals.outreach_calls_made,
        p_outreach_referrals: newTotals.outreach_referrals,
        p_outreach_inbound: newTotals.outreach_inbound,
        // Sub-inputs for appointments set
        p_appointments_set_door_knocks: newTotals.appointments_set_door_knocks,
        p_appointments_set_tags_put: newTotals.appointments_set_tags_put,
        p_appointments_set_calls_made: newTotals.appointments_set_calls_made,
        p_appointments_set_referrals: newTotals.appointments_set_referrals,
        p_appointments_set_inbound: newTotals.appointments_set_inbound,
        // Sub-inputs for appointments held
        p_appointments_held_door_knocks: newTotals.appointments_held_door_knocks,
        p_appointments_held_tags_put: newTotals.appointments_held_tags_put,
        p_appointments_held_calls_made: newTotals.appointments_held_calls_made,
        p_appointments_held_referrals: newTotals.appointments_held_referrals,
        p_appointments_held_inbound: newTotals.appointments_held_inbound,
        // Sub-inputs for deals closed
        p_deals_closed_door_knocks: newTotals.deals_closed_door_knocks,
        p_deals_closed_tags_put: newTotals.deals_closed_tags_put,
        p_deals_closed_calls_made: newTotals.deals_closed_calls_made,
        p_deals_closed_referrals: newTotals.deals_closed_referrals,
        p_deals_closed_inbound: newTotals.deals_closed_inbound,
        // Sub-inputs for accounts serviced
        p_accounts_serviced_door_knocks: newTotals.accounts_serviced_door_knocks,
        p_accounts_serviced_tags_put: newTotals.accounts_serviced_tags_put,
        p_accounts_serviced_calls_made: newTotals.accounts_serviced_calls_made,
        p_accounts_serviced_referrals: newTotals.accounts_serviced_referrals,
        p_accounts_serviced_inbound: newTotals.accounts_serviced_inbound,
      });

      if (rpcError) {
        console.error('Error saving period totals:', rpcError);
        // Check if this is a double-counting prevention error
        if (rpcError.message.includes('Cannot overwrite existing daily data')) {
          setError('Cannot save period totals: Some dates in this period already have data. Please use daily view to edit individual days first.');
        } else {
          setError(rpcError.message);
        }
        return false;
      }

      console.log('✅ Period totals saved successfully, refreshing data...');
      await fetchTotals();
      console.log('✅ Period totals refreshed');
      return true;
    } catch (err) {
      console.error('Error in savePeriodTotals:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotals();
  }, [userId, startDate, endDate]);

  return {
    totals,
    loading,
    error,
    refetch: fetchTotals,
    savePeriodTotals,
  };
};
