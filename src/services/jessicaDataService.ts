import { useKPIStore } from '../state/kpiStore';
import { useMileageStore } from '../state/mileageStore';
import { useAuthStore } from '../state/authStore';
import { SupabaseService } from './supabaseService';
import { JessicaInputService } from './jessicaInputService';

export interface UserDataSummary {
  kpiData: {
    totalDoors: number;
    totalAppointments: number;
    totalDeals: number;
    totalAccountsServiced: number;
    totalHoursWorked: number;
    doorsPerAppointment: number;
    appointmentHoldRate: number;
    appointmentToClosedRate: number;
    closeToAccountServicedRate: number;
    dollarsPerHour: number;
    totalRevenue: number;
    todayInput: any;
    recentInputs: any[];
  };
  mileageData: {
    totalMileage: number;
    totalDeduction: number;
    monthlyMileage: number;
    monthlyDeduction: number;
    recentTrips: any[];
    tripsByType: {
      business: number;
      personal: number;
      medical: number;
      charity: number;
    };
  };
  supabaseData: {
    leads: any[];
    expenses: any[];
    teamMembers: any[];
    clients: any[];
    expenseCategories: any[];
    totalLeads: number;
    totalExpenses: number;
    totalTeamMembers: number;
    totalClients: number;
    totalExpenseAmount: number;
  };
  userInfo: {
    userId: string | null;
    isAuthenticated: boolean;
  };
}

export class JessicaDataService {
  static async getUserDataSummary(): Promise<UserDataSummary> {
    try {
      // Get data from stores
      const kpiStore = useKPIStore.getState();
      const mileageStore = useMileageStore.getState();
      const authStore = useAuthStore.getState();

      // Get KPI metrics
      const kpiMetrics = kpiStore.getKPIMetrics();
      const todayInput = kpiStore.getTodayInput();
      const recentInputs = kpiStore.dailyInputs.slice(-7); // Last 7 days

      // Get mileage data
      const totalMileage = mileageStore.getTotalMileage();
      const totalDeduction = mileageStore.getTotalDeduction();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyMileage = mileageStore.getMonthlyMileage(currentMonth, currentYear);
      const monthlyDeduction = mileageStore.getMonthlyDeduction(currentMonth, currentYear);
      const recentTrips = mileageStore.trips.slice(-10); // Last 10 trips

      // Get trips by type
      const tripsByType = {
        business: mileageStore.getTripsByType('business').length,
        personal: mileageStore.getTripsByType('personal').length,
        medical: mileageStore.getTripsByType('medical').length,
        charity: mileageStore.getTripsByType('charity').length,
      };

      // Get Supabase data
      let supabaseData = {
        leads: [],
        expenses: [],
        teamMembers: [],
        clients: [],
        expenseCategories: [],
        totalLeads: 0,
        totalExpenses: 0,
        totalTeamMembers: 0,
        totalClients: 0,
        totalExpenseAmount: 0,
      };

      if (authStore.user?.id) {
        try {
          const supabaseService = new SupabaseService();
          const userId = authStore.user.id;

          // Fetch Supabase data
          const [leads, expenses, teamMembers, clients, expenseCategories] = await Promise.all([
            supabaseService.getLeads(userId).catch(() => []),
            supabaseService.getExpenses(userId).catch(() => []),
            supabaseService.getTeamMembers(userId).catch(() => []),
            supabaseService.getClients(userId).catch(() => []),
            supabaseService.getExpenseCategories(userId).catch(() => []),
          ]);

          // Calculate totals
          const totalExpenseAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          supabaseData = {
            leads,
            expenses,
            teamMembers,
            clients,
            expenseCategories,
            totalLeads: leads.length,
            totalExpenses: expenses.length,
            totalTeamMembers: teamMembers.length,
            totalClients: clients.length,
            totalExpenseAmount,
          };
        } catch (error) {
          console.log('Could not fetch Supabase data for Jessica:', error);
        }
      }

      return {
        kpiData: {
          totalDoors: kpiMetrics.totalDoors,
          totalAppointments: kpiMetrics.totalAppointments,
          totalDeals: kpiMetrics.totalDeals,
          totalAccountsServiced: kpiMetrics.totalAccountsServiced,
          totalHoursWorked: kpiMetrics.totalHoursWorked,
          doorsPerAppointment: kpiMetrics.doorsPerAppointment,
          appointmentHoldRate: kpiMetrics.appointmentHoldRate,
          appointmentToClosedRate: kpiMetrics.appointmentToClosedRate,
          closeToAccountServicedRate: kpiMetrics.closeToAccountServicedRate,
          dollarsPerHour: kpiMetrics.dollarsPerHour,
          totalRevenue: kpiMetrics.totalRevenue,
          todayInput,
          recentInputs,
        },
        mileageData: {
          totalMileage,
          totalDeduction,
          monthlyMileage,
          monthlyDeduction,
          recentTrips,
          tripsByType,
        },
        supabaseData,
        userInfo: {
          userId: authStore.user?.id || null,
          isAuthenticated: authStore.isAuthenticated,
        },
      };
    } catch (error) {
      console.error('Error getting user data summary:', error);
      throw error;
    }
  }

  static async getKPISummary(): Promise<any> {
    const kpiStore = useKPIStore.getState();
    const metrics = kpiStore.getKPIMetrics();
    const todayInput = kpiStore.getTodayInput();
    
    return {
      metrics,
      todayInput,
      recentInputs: kpiStore.dailyInputs.slice(-7),
    };
  }

  static async getMileageSummary(): Promise<any> {
    const mileageStore = useMileageStore.getState();
    
    return {
      totalMileage: mileageStore.getTotalMileage(),
      totalDeduction: mileageStore.getTotalDeduction(),
      monthlyMileage: mileageStore.getMonthlyMileage(new Date().getMonth(), new Date().getFullYear()),
      monthlyDeduction: mileageStore.getMonthlyDeduction(new Date().getMonth(), new Date().getFullYear()),
      recentTrips: mileageStore.trips.slice(-10),
      tripsByType: {
        business: mileageStore.getTripsByType('business').length,
        personal: mileageStore.getTripsByType('personal').length,
        medical: mileageStore.getTripsByType('medical').length,
        charity: mileageStore.getTripsByType('charity').length,
      },
    };
  }
} 