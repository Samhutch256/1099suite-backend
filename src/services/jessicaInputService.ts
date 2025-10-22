import { useKPIStore } from '../state/kpiStore';
import { useMileageStore } from '../state/mileageStore';
import { useAuthStore } from '../state/authStore';
import { SupabaseService } from './supabaseService';

export interface JessicaInputResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class JessicaInputService {
  static async addDailyInput(inputData: {
    doorsKnocked?: number;
    appointments?: number;
    appointmentHolds?: number;
    closedDeals?: number;
    accountsServiced?: number;
    hoursWorked?: number;
    notes?: string;
    // Sub-inputs for breakdown of how activities were performed
    outreachDoorKnocks?: number;
    outreachTagsPut?: number;
    outreachCallsMade?: number;
    outreachReferrals?: number;
    outreachInbound?: number;
    appointmentsSetDoorKnocks?: number;
    appointmentsSetTagsPut?: number;
    appointmentsSetCallsMade?: number;
    appointmentsSetReferrals?: number;
    appointmentsSetInbound?: number;
    appointmentsHeldDoorKnocks?: number;
    appointmentsHeldTagsPut?: number;
    appointmentsHeldCallsMade?: number;
    appointmentsHeldReferrals?: number;
    appointmentsHeldInbound?: number;
    dealsClosedDoorKnocks?: number;
    dealsClosedTagsPut?: number;
    dealsClosedCallsMade?: number;
    dealsClosedReferrals?: number;
    dealsClosedInbound?: number;
    accountsServicedDoorKnocks?: number;
    accountsServicedTagsPut?: number;
    accountsServicedCallsMade?: number;
    accountsServicedReferrals?: number;
    accountsServicedInbound?: number;
  }): Promise<JessicaInputResult> {
    try {
      const kpiStore = useKPIStore.getState();
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add daily input.",
          error: "Not authenticated"
        };
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Check if today's input already exists
      const existingInput = kpiStore.getTodayInput();
      
      // Prepare complete input data with all fields
      const completeInputData = {
        date: today,
        doorsKnocked: inputData.doorsKnocked || 0,
        appointments: inputData.appointments || 0,
        appointmentHolds: inputData.appointmentHolds || 0,
        closedDeals: inputData.closedDeals || 0,
        accountsServiced: inputData.accountsServiced || 0,
        hoursWorked: inputData.hoursWorked || 0,
        notes: inputData.notes || '',
        // Sub-inputs with proper defaults
        outreachDoorKnocks: inputData.outreachDoorKnocks || 0,
        outreachTagsPut: inputData.outreachTagsPut || 0,
        outreachCallsMade: inputData.outreachCallsMade || 0,
        outreachReferrals: inputData.outreachReferrals || 0,
        outreachInbound: inputData.outreachInbound ?? 0,
        appointmentsSetDoorKnocks: inputData.appointmentsSetDoorKnocks || 0,
        appointmentsSetTagsPut: inputData.appointmentsSetTagsPut || 0,
        appointmentsSetCallsMade: inputData.appointmentsSetCallsMade || 0,
        appointmentsSetReferrals: inputData.appointmentsSetReferrals || 0,
        appointmentsSetInbound: inputData.appointmentsSetInbound || 0,
        appointmentsHeldDoorKnocks: inputData.appointmentsHeldDoorKnocks || 0,
        appointmentsHeldTagsPut: inputData.appointmentsHeldTagsPut || 0,
        appointmentsHeldCallsMade: inputData.appointmentsHeldCallsMade || 0,
        appointmentsHeldReferrals: inputData.appointmentsHeldReferrals || 0,
        appointmentsHeldInbound: inputData.appointmentsHeldInbound || 0,
        dealsClosedDoorKnocks: inputData.dealsClosedDoorKnocks || 0,
        dealsClosedTagsPut: inputData.dealsClosedTagsPut || 0,
        dealsClosedCallsMade: inputData.dealsClosedCallsMade || 0,
        dealsClosedReferrals: inputData.dealsClosedReferrals || 0,
        dealsClosedInbound: inputData.dealsClosedInbound || 0,
        accountsServicedDoorKnocks: inputData.accountsServicedDoorKnocks || 0,
        accountsServicedTagsPut: inputData.accountsServicedTagsPut || 0,
        accountsServicedCallsMade: inputData.accountsServicedCallsMade || 0,
        accountsServicedReferrals: inputData.accountsServicedReferrals || 0,
        accountsServicedInbound: inputData.accountsServicedInbound || 0,
      };
      
      if (existingInput) {
        // Update existing input with merged data
        const mergedData = { ...existingInput };
        
        // Merge main metrics
        Object.keys(completeInputData).forEach(key => {
          if (key !== 'date' && key !== 'notes' && completeInputData[key] > 0) {
            mergedData[key] = (mergedData[key] || 0) + completeInputData[key];
          }
        });
        
        // Update notes if provided
        if (inputData.notes) {
          mergedData.notes = mergedData.notes ? `${mergedData.notes}\n${inputData.notes}` : inputData.notes;
        }
        
        await kpiStore.updateDailyInput(existingInput.id, mergedData);
        
        // Force a sync to ensure data is updated everywhere
        await kpiStore.syncData();
        
        const activities = [];
        if (completeInputData.doorsKnocked > 0) activities.push(`${completeInputData.doorsKnocked} doors knocked`);
        if (completeInputData.appointments > 0) activities.push(`${completeInputData.appointments} appointments set`);
        if (completeInputData.appointmentHolds > 0) activities.push(`${completeInputData.appointmentHolds} appointments held`);
        if (completeInputData.closedDeals > 0) activities.push(`${completeInputData.closedDeals} deals closed`);
        if (completeInputData.accountsServiced > 0) activities.push(`${completeInputData.accountsServiced} accounts serviced`);
        if (completeInputData.hoursWorked > 0) activities.push(`${completeInputData.hoursWorked} hours worked`);
        
        return {
          success: true,
          message: `Updated today's input with: ${activities.join(', ')}`,
          data: mergedData
        };
      } else {
        // Create new input
        await kpiStore.addDailyInput(completeInputData);
        
        // Force a sync to ensure data is updated everywhere
        await kpiStore.syncData();
        
        const activities = [];
        if (completeInputData.doorsKnocked > 0) activities.push(`${completeInputData.doorsKnocked} doors knocked`);
        if (completeInputData.appointments > 0) activities.push(`${completeInputData.appointments} appointments set`);
        if (completeInputData.appointmentHolds > 0) activities.push(`${completeInputData.appointmentHolds} appointments held`);
        if (completeInputData.closedDeals > 0) activities.push(`${completeInputData.closedDeals} deals closed`);
        if (completeInputData.accountsServiced > 0) activities.push(`${completeInputData.accountsServiced} accounts serviced`);
        if (completeInputData.hoursWorked > 0) activities.push(`${completeInputData.hoursWorked} hours worked`);
        
        return {
          success: true,
          message: `Added today's input: ${activities.join(', ')}`,
          data: completeInputData
        };
      }
    } catch (error) {
      console.error('Error adding daily input:', error);
      return {
        success: false,
        message: "Failed to add daily input. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addMileageTrip(tripData: {
    startLocation: { latitude: number; longitude: number; address?: string };
    endLocation: { latitude: number; longitude: number; address?: string };
    distance: number;
    tripType: 'business' | 'personal' | 'medical' | 'charity';
    purpose: string;
    startTime: string;
    endTime?: string;
  }): Promise<JessicaInputResult> {
    try {
      const mileageStore = useMileageStore.getState();
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add mileage trips.",
          error: "Not authenticated"
        };
      }

      mileageStore.addManualTrip(tripData);
      
      return {
        success: true,
        message: `Added mileage trip: ${tripData.distance.toFixed(1)} miles for ${tripData.purpose} (${tripData.tripType})`,
        data: tripData
      };
    } catch (error) {
      console.error('Error adding mileage trip:', error);
      return {
        success: false,
        message: "Failed to add mileage trip. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addLead(leadData: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status?: string;
    notes?: string;
  }): Promise<JessicaInputResult> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add leads.",
          error: "Not authenticated"
        };
      }

      const supabaseService = new SupabaseService();
      const newLead = await supabaseService.createLead(authStore.user.id, {
        ...leadData,
        status: leadData.status || 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return {
        success: true,
        message: `Added new lead: ${leadData.name}${leadData.company ? ` from ${leadData.company}` : ''}`,
        data: newLead
      };
    } catch (error) {
      console.error('Error adding lead:', error);
      return {
        success: false,
        message: "Failed to add lead. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addExpense(expenseData: {
    amount: number;
    description: string;
    category?: string;
    date?: string;
    receiptUrl?: string;
  }): Promise<JessicaInputResult> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add expenses.",
          error: "Not authenticated"
        };
      }

      const supabaseService = new SupabaseService();
      const newExpense = await supabaseService.createExpense(authStore.user.id, {
        user_id: authStore.user.id,
        amount: expenseData.amount,
        category: expenseData.category || 'Other',
        vendor_name: expenseData.description,
        is_business: true,
        timestamp: expenseData.date || new Date().toISOString().split('T')[0],
        notes: expenseData.description,
      });
      
      return {
        success: true,
        message: `Added expense: $${expenseData.amount.toFixed(2)} for ${expenseData.description}`,
        data: newExpense
      };
    } catch (error) {
      console.error('Error adding expense:', error);
      return {
        success: false,
        message: "Failed to add expense. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addTeamMember(memberData: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    commissionRate?: number;
  }): Promise<JessicaInputResult> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add team members.",
          error: "Not authenticated"
        };
      }

      const supabaseService = new SupabaseService();
      const newMember = await supabaseService.createTeamMember(authStore.user.id, {
        ...memberData,
        role: memberData.role || 'Team Member',
        commissionRate: memberData.commissionRate || 0,
        joinedAt: new Date().toISOString(),
      });
      
      return {
        success: true,
        message: `Added team member: ${memberData.name}${memberData.role ? ` as ${memberData.role}` : ''}`,
        data: newMember
      };
    } catch (error) {
      console.error('Error adding team member:', error);
      return {
        success: false,
        message: "Failed to add team member. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addClient(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<JessicaInputResult> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.user?.id) {
        return {
          success: false,
          message: "You need to be logged in to add clients.",
          error: "Not authenticated"
        };
      }

      const supabaseService = new SupabaseService();
      const newClient = await supabaseService.createClient(authStore.user.id, {
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return {
        success: true,
        message: `Added client: ${clientData.name}`,
        data: newClient
      };
    } catch (error) {
      console.error('Error adding client:', error);
      return {
        success: false,
        message: "Failed to add client. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 
