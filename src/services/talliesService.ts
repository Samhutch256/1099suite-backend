import { supabase } from '../config/supabase';

export type SubInput = "door_knocks" | "tags_put" | "calls_made" | "referrals" | "inbound";
export type Outcome = "interested" | "not_interested" | "not_home" | "unqualified" | "already_has_product" | "appointment_set";

export interface TallyRecord {
  id: number;
  user_id: string;
  input_date: string;
  sub_input: SubInput;
  outcome: Outcome;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface TallyCounts {
  [outcome: string]: number;
}

export const SUB_INPUT_OPTIONS = [
  { label: 'Door Knocks', value: 'door_knocks' as SubInput },
  { label: 'Tags Put', value: 'tags_put' as SubInput },
  { label: 'Calls Made', value: 'calls_made' as SubInput },
  { label: 'Referrals', value: 'referrals' as SubInput },
  { label: 'Inbound', value: 'inbound' as SubInput },
];

export const OUTCOME_OPTIONS = [
  { label: 'Interested', value: 'interested' as Outcome },
  { label: 'Not Interested', value: 'not_interested' as Outcome },
  { label: 'Not Home / No Answer', value: 'not_home' as Outcome },
  { label: 'Unqualified', value: 'unqualified' as Outcome },
  { label: 'Already Has Product', value: 'already_has_product' as Outcome },
  { label: 'Appointment Set', value: 'appointment_set' as Outcome },
];

export async function getTodayTallies(
  userId: string, 
  subInput: SubInput, 
  inputDate: Date = new Date()
): Promise<{ data: TallyRecord[] | null; error: any }> {
  const dateStr = inputDate.toISOString().slice(0, 10);
  
  const { data, error } = await supabase
    .from('lead_input_tallies')
    .select('*')
    .eq('user_id', userId)
    .eq('input_date', dateStr)
    .eq('sub_input', subInput);

  return { data, error };
}

export async function getTodayTalliesForAllSubInputs(
  userId: string,
  inputDate: Date = new Date()
): Promise<{ data: TallyRecord[] | null; error: any }> {
  const dateStr = inputDate.toISOString().slice(0, 10);
  
  const { data, error } = await supabase
    .from('lead_input_tallies')
    .select('*')
    .eq('user_id', userId)
    .eq('input_date', dateStr);

  return { data, error };
}

export async function incrementTally(
  userId: string, 
  subInput: SubInput, 
  outcome: Outcome, 
  inputDate: Date = new Date()
): Promise<{ error: any }> {
  const dateStr = inputDate.toISOString().slice(0, 10);
  
  // Atomic UPSERT: INSERT 1 or bump existing
  const { error } = await supabase
    .from('lead_input_tallies')
    .upsert(
      { 
        user_id: userId, 
        input_date: dateStr, 
        sub_input: subInput, 
        outcome, 
        count: 1 
      },
      { onConflict: 'user_id,input_date,sub_input,outcome' }
    )
    .select(); // ensure the UPSERT runs

  if (!error) {
    // Follow-up: increment count with a single UPDATE to avoid race on concurrent UPSERT defaults
    const { error: rpcError } = await supabase.rpc('increment_tally_rpc', { 
      p_user_id: userId, 
      p_date: dateStr, 
      p_sub: subInput, 
      p_out: outcome 
    });
    
    if (rpcError) {
      return { error: rpcError };
    }
  }

  return { error };
}

export async function decrementTally(
  userId: string, 
  subInput: SubInput, 
  outcome: Outcome, 
  inputDate: Date = new Date()
): Promise<{ error: any }> {
  const dateStr = inputDate.toISOString().slice(0, 10);
  
  const { error } = await supabase.rpc('decrement_tally_rpc', { 
    p_user_id: userId, 
    p_date: dateStr, 
    p_sub: subInput, 
    p_out: outcome 
  });

  return { error };
}

export async function resetTalliesForSubInput(
  userId: string, 
  subInput: SubInput, 
  inputDate: Date = new Date()
): Promise<{ error: any }> {
  const dateStr = inputDate.toISOString().slice(0, 10);
  
  const { error } = await supabase.rpc('reset_tallies_for_sub_input', { 
    p_user_id: userId, 
    p_date: dateStr, 
    p_sub: subInput 
  });

  return { error };
}

export function formatTallyCounts(tallies: TallyRecord[] | null): TallyCounts {
  const counts: TallyCounts = {};
  
  // Initialize all outcomes to 0
  OUTCOME_OPTIONS.forEach(option => {
    counts[option.value] = 0;
  });
  
  // Set actual counts from database
  if (tallies) {
    tallies.forEach(tally => {
      counts[tally.outcome] = tally.count;
    });
  }
  
  return counts;
}

export function getSubInputLabel(value: SubInput): string {
  const option = SUB_INPUT_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
}

export function getOutcomeLabel(value: Outcome): string {
  const option = OUTCOME_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
}
