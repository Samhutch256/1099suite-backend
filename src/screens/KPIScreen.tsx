import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, AppState, Modal, AppStateStatus, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  endOfDay,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKPIStore } from '../state/kpiStore';
import { useContractorStore } from '../state/contractorStore';
import { useAuthStore } from '../state/authStore';
import { useVisibilityStore } from '../state/visibilityStore';
import { cn } from '../utils/cn';
import { getOrderedStages, getProgressionStages } from '../types/pipeline';
import { calculateAccurateKPIs, KPICalculationResult } from '../utils/kpiCalculationUtils';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { RootStackParamList } from '../navigation/AppNavigator';

interface KPICardProps {
  title: string;
  value: string;
  color: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: number;
  size?: 'small' | 'medium' | 'large';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  color,
  subtitle,
  icon,
  trend,
  size = 'medium',
}) => (
  <View className={cn(
    "bg-white rounded-xl p-3 shadow-sm border border-gray-100",
    size === 'small' ? "min-w-[120px]" : size === 'large' ? "min-w-[200px]" : "min-w-[160px]"
  )}>
    <View className="flex-row items-center justify-between mb-2">
      <View className={cn("rounded-full items-center justify-center", color,
        size === 'small' ? "w-6 h-6" : "w-8 h-8"
      )}>
        <Ionicons name={icon} size={size === 'small' ? 12 : 16} color="white" />
      </View>
      {trend !== undefined && (
        <View className="flex-row items-center">
          <Ionicons
            name={trend > 0 ? "trending-up" : trend < 0 ? "trending-down" : "remove"}
            size={10}
            color={trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#6b7280"}
          />
          <Text className={cn("text-xs font-medium ml-1", 
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-600"
          )}>
            {trend !== 0 ? `${Math.abs(trend)}%` : '0%'}
          </Text>
        </View>
      )}
    </View>
    <Text className={cn("font-bold text-gray-900 mb-1",
      size === 'small' ? "text-lg" : size === 'large' ? "text-3xl" : "text-2xl"
    )}>{value}</Text>
    <Text className={cn("font-semibold text-gray-900 mb-1",
      size === 'small' ? "text-xs" : "text-sm"
    )}>{title}</Text>
    {subtitle && (
      <Text className="text-xs text-gray-600">{subtitle}</Text>
    )}
  </View>
);

interface ConversionMetricProps {
  title: string;
  percentage: number;
  color: string;
  subtitle?: string;
}

interface ActivityMetricProps {
  title: string;
  value: number;
  color: string;
  subtitle?: string;
}

const ConversionMetric: React.FC<ConversionMetricProps> = ({
  title,
  percentage,
  color,
  subtitle,
}) => (
  <View className="flex-1 items-center p-3 bg-white rounded-xl mx-1 shadow-sm border border-gray-100">
    <Text className={cn("text-xl font-bold mb-1", color)}>
      {percentage.toFixed(1)}%
    </Text>
    <Text className="text-xs text-gray-900 font-semibold text-center leading-tight mb-1">
      {title}
    </Text>
    {subtitle && (
      <Text className="text-xs text-gray-500 text-center">{subtitle}</Text>
    )}
  </View>
);

const ActivityMetric: React.FC<ActivityMetricProps> = ({
  title,
  value,
  color,
  subtitle,
}) => (
  <View className="flex-1 items-center p-3 bg-white rounded-xl mx-1 shadow-sm border border-gray-100">
    <Text className={cn("text-xl font-bold mb-1", color)}>
      {value}
    </Text>
    <Text className="text-xs text-gray-900 font-semibold text-center leading-tight mb-1">
      {title}
    </Text>
    {subtitle && (
      <Text className="text-xs text-gray-500 text-center">{subtitle}</Text>
    )}
  </View>
);

interface QuickStatProps {
  label: string;
  value: number | string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  percentage?: number;
  total?: number;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon, color = "text-gray-900", percentage, total }) => (
  <View className="flex-row justify-between items-center py-2.5 px-3 bg-gray-50 rounded-lg mb-1.5">
    <View className="flex-row items-center flex-1 min-w-0">
      {icon && (
        <View className="w-5 h-5 bg-gray-300 rounded-full items-center justify-center mr-2.5 flex-shrink-0">
          <Ionicons name={icon} size={11} color="white" />
        </View>
      )}
      <Text className="text-gray-700 text-xs font-medium flex-1 flex-shrink-1" numberOfLines={2} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
    <View className="flex-row items-center flex-shrink-0 ml-2.5">
      <Text className={cn("font-bold text-sm", color)}>{value}</Text>
      {percentage !== undefined && total !== undefined && total > 0 && (
        <Text className="text-xs text-gray-500 min-w-[45px] text-right ml-1.5">
          ({percentage.toFixed(1)}%)
        </Text>
      )}
    </View>
  </View>
);

interface AnalysisSectionProps {
  title: string;
  icon: string;
  volumeMetrics: {
    total: number;
    appointmentsSet: number;
    appointmentsHeld: number;
    dealsClosed: number;
    accountsServiced: number;
  };
  analysisTotals: {
    perAppt: string;
    apptPerSit: string;
    sitPerDeal: string;
    dealPerInstall: string;
  };
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  title,
  icon,
  volumeMetrics,
  analysisTotals,
  colorScheme
}) => (
  <View className="mb-8">
    <View className="flex-row items-center mb-4">
      <Text className="text-2xl mr-3">{icon}</Text>
      <Text className="text-xl font-bold text-white">{title}</Text>
    </View>
    
    <View>
      {/* Volume Metrics Card */}
      <View className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-4">
        <View className="flex-row items-center mb-3">
          <View className={`w-1 h-5 ${colorScheme.primary} rounded-full mr-3`} />
          <Text className="text-base font-bold text-gray-900">Volume Metrics</Text>
        </View>
        
        <View className="space-y-2">
          <AnalysisMetricRow
            label="Total"
            value={volumeMetrics.total}
            icon="analytics"
            color="text-blue-600"
            isFirst={true}
          />
          <View className="h-px bg-gray-200 mx-3" />
          <AnalysisMetricRow
            label="Appointments Set"
            value={volumeMetrics.appointmentsSet}
            icon="calendar"
            color="text-green-600"
          />
          <AnalysisMetricRow
            label="Appointments Held"
            value={volumeMetrics.appointmentsHeld}
            icon="checkmark-circle"
            color="text-orange-600"
          />
          <AnalysisMetricRow
            label="Deals Closed"
            value={volumeMetrics.dealsClosed}
            icon="trophy"
            color="text-purple-600"
          />
          <AnalysisMetricRow
            label="Accounts Serviced"
            value={volumeMetrics.accountsServiced}
            icon="briefcase"
            color="text-teal-600"
            isLast={true}
          />
        </View>
      </View>

      {/* Analysis Totals Card */}
      <View className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
        <View className="flex-row items-center mb-3">
          <View className={`w-1 h-5 ${colorScheme.secondary} rounded-full mr-3`} />
          <Text className="text-base font-bold text-gray-900">Analysis Totals</Text>
        </View>
        
        <View className="space-y-2">
          <AnalysisMetricRow
            label="Per Appointment"
            value={analysisTotals.perAppt}
            icon="trending-up"
            color="text-blue-600"
            isFirst={true}
            isPercentage={true}
          />
          <AnalysisMetricRow
            label="Appointment Per Sit"
            value={analysisTotals.apptPerSit}
            icon="trending-up"
            color="text-purple-600"
            isPercentage={true}
          />
          <AnalysisMetricRow
            label="Sit Per Signed Deal"
            value={analysisTotals.sitPerDeal}
            icon="checkmark-done"
            color="text-teal-600"
            isPercentage={true}
          />
          <AnalysisMetricRow
            label="Signed Deal Per Install"
            value={analysisTotals.dealPerInstall}
            icon="checkmark-done"
            color="text-orange-600"
            isLast={true}
            isPercentage={true}
          />
        </View>
      </View>
    </View>
  </View>
);

interface AnalysisMetricRowProps {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
  isPercentage?: boolean;
}

const AnalysisMetricRow: React.FC<AnalysisMetricRowProps> = ({
  label,
  value,
  icon,
  color,
  isFirst = false,
  isLast = false,
  isPercentage = false
}) => (
  <View className={cn(
    "flex-row items-center justify-between py-2 px-3",
    isFirst && "pt-0",
    isLast && "pb-0"
  )}>
    <View className="flex-row items-center flex-1">
      <View className="w-7 h-7 bg-gray-100 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={14} color="#6b7280" />
      </View>
      <Text className="text-gray-700 text-xs font-medium flex-1">{label}</Text>
    </View>
    <Text className={cn("text-base font-bold", color)}>
      {typeof value === 'number' ? value.toLocaleString() : value}
      {isPercentage && typeof value === 'string' && !value.includes('%') && '%'}
    </Text>
  </View>
);

export const KPIScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { 
    getKPIMetrics, 
    getDailyInputsByDateRange, 
    getTodayInput, 
    dailyInputs, 
    syncData, 
    forceSyncFromCloud, 
    isSyncing, 
    loadUserData, 
    forceReload
  } = useKPIStore();
  
  const {
    showOutreach, setShowOutreach,
    showAppointmentsSet, setShowAppointmentsSet,
    showAppointmentsHeld, setShowAppointmentsHeld,
    showClosedDeals, setShowClosedDeals,
    showAccountsServiced, setShowAccountsServiced,
    showHoursWorked, setShowHoursWorked,
    showRevenueGuaranteed, setShowRevenueGuaranteed,
    showRevenuePipeline, setShowRevenuePipeline,
    showRevenuePaidOut, setShowRevenuePaidOut,
    showRevenueTotal, setShowRevenueTotal,
    showConversionRates, setShowConversionRates,
    showOutreachToAppointments, setShowOutreachToAppointments,
    showAppointmentsToHeld, setShowAppointmentsToHeld,
    showHeldToClosed, setShowHeldToClosed,
    showClosedToServiced, setShowClosedToServiced,
    showOverallCloseRate, setShowOverallCloseRate,
    showOverallServiceRate, setShowOverallServiceRate,
    showEfficiencyMetrics, setShowEfficiencyMetrics,
    showDoorKnocksAnalysis, setShowDoorKnocksAnalysis,
    showTagsAnalysis, setShowTagsAnalysis,
    showCallsAnalysis, setShowCallsAnalysis,
    showReferralsAnalysis, setShowReferralsAnalysis,
    showInboundAnalysis, setShowInboundAnalysis,
    showSourcePerformanceSummary, setShowSourcePerformanceSummary,
    showTodaysProgress, setShowTodaysProgress,
    resetAllVisibility
  } = useVisibilityStore();
  const leads = useContractorStore(state => state.leads);
  const { consolidateAccounts, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  type PeriodKey =
    | 'today'
    | 'this_week'
    | 'past_7_days'
    | 'past_30_days'
    | 'this_month'
    | 'last_month'
    | 'this_year'
    | 'last_year'
    | 'all_time'
    | 'custom';

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('this_month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  });
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastSyncTime = useRef(0);

  const periodOptions = useMemo<{ key: PeriodKey; label: string }[]>(
    () => [
      { key: 'today', label: 'Today' },
      { key: 'this_week', label: 'This Week' },
      { key: 'past_7_days', label: 'Past 7 Days' },
      { key: 'past_30_days', label: 'Past 30 Days' },
      { key: 'this_month', label: 'This Month' },
      { key: 'last_month', label: 'Last Month' },
      { key: 'this_year', label: 'This Year' },
      { key: 'last_year', label: 'Last Year' },
      { key: 'all_time', label: 'All Time' },
      { key: 'custom', label: 'Custom Range' },
    ],
    []
  );

  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const thisWeekStart = startOfWeek(todayStart, { weekStartsOn: 0 });
    const thisWeekEnd = endOfWeek(todayStart, { weekStartsOn: 0 });
    const past7Start = startOfDay(subDays(todayEnd, 6));
    const past30Start = startOfDay(subDays(todayEnd, 29));
    const thisMonthStart = startOfMonth(todayStart);
    const thisMonthEnd = endOfMonth(todayStart);
    const lastMonthDate = subMonths(todayStart, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);
    const thisYearStart = startOfYear(todayStart);
    const thisYearEnd = endOfYear(todayStart);
    const lastYearDate = subYears(todayStart, 1);
    const lastYearStart = startOfYear(lastYearDate);
    const lastYearEnd = endOfYear(lastYearDate);

    const customStart = startOfDay(customDateRange.startDate);
    const customEnd = endOfDay(customDateRange.endDate);

    return {
      today: { start: todayStart, end: todayEnd },
      this_week: { start: thisWeekStart, end: thisWeekEnd },
      past_7_days: { start: past7Start, end: todayEnd },
      past_30_days: { start: past30Start, end: todayEnd },
      this_month: { start: thisMonthStart, end: thisMonthEnd },
      last_month: { start: lastMonthStart, end: lastMonthEnd },
      this_year: { start: thisYearStart, end: thisYearEnd },
      last_year: { start: lastYearStart, end: lastYearEnd },
      all_time: undefined,
      custom: { start: customStart, end: customEnd },
    } as Record<PeriodKey, { start: Date; end: Date } | undefined>;
  }, [customDateRange]);

  const revenueTotals = useMemo(() => {
    const guaranteedRevenue = leads.reduce(
      (sum, lead) => sum + (lead.revenue?.guaranteedRevenue || 0),
      0
    );

    const pipelineRevenue = leads
      .filter(
        (lead) =>
          !lead.isCancelled &&
          !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(
            lead.status
          )
      )
      .reduce((sum, lead) => sum + (lead.revenue?.pipelineRevenue || 0), 0);

    const paidOutRevenue = leads.reduce(
      (sum, lead) => sum + (lead.revenue?.paidOutRevenue || 0),
      0
    );

    return {
      guaranteedRevenue,
      pipelineRevenue,
      paidOutRevenue,
      totalRevenue: guaranteedRevenue + pipelineRevenue,
    };
  }, [leads]);

  const selectedPeriodOption = useMemo(
    () => periodOptions.find(option => option.key === selectedPeriod),
    [periodOptions, selectedPeriod]
  );

  const selectedRangeSummary = useMemo(() => {
    if (selectedPeriod === 'all_time') {
      return 'All recorded data';
    }
    const range = dateRanges[selectedPeriod];
    if (!range) {
      return '';
    }
    const startLabel = format(range.start, 'MMM dd, yyyy');
    const endLabel = format(range.end, 'MMM dd, yyyy');
    if (selectedPeriod === 'custom') {
      return `Custom: ${startLabel} - ${endLabel}`;
    }
    return `${startLabel} - ${endLabel}`;
  }, [dateRanges, selectedPeriod]);

  // Determine view period for overrides (today/week/month only)
  const effectivePeriodType: 'day' | 'week' | 'month' | 'year' | null =
    selectedPeriod === 'today'
      ? 'day'
      : selectedPeriod === 'this_week' || selectedPeriod === 'past_7_days'
      ? 'week'
      : selectedPeriod === 'this_month' ||
        selectedPeriod === 'last_month' ||
        selectedPeriod === 'past_30_days'
      ? 'month'
      : selectedPeriod === 'this_year' || selectedPeriod === 'last_year'
      ? 'year'
      : null;

  const effectiveSelectedDate: Date = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'this_week' || selectedPeriod === 'past_7_days') {
      return startOfWeek(now, { weekStartsOn: 0 });
    }
    if (selectedPeriod === 'this_month' || selectedPeriod === 'past_30_days') {
      return startOfMonth(now);
    }
    if (selectedPeriod === 'last_month') {
      return startOfMonth(subMonths(now, 1));
    }
    if (selectedPeriod === 'this_year') {
      return startOfYear(now);
    }
    if (selectedPeriod === 'last_year') {
      return startOfYear(subYears(now, 1));
    }
    return now;
  }, [selectedPeriod]);

  // Note: Views don't exist yet, so we'll implement hierarchy logic in JavaScript
  // const { data: periodData } = useInputsForPeriod(
  //   useAuthStore.getState().user?.id || '',
  //   (effectivePeriodType || 'day'),
  //   effectiveSelectedDate
  // );



  // Calculate comprehensive metrics using accurate KPI calculation
  const metrics = useMemo(() => {
    const totalRevenue = revenueTotals.paidOutRevenue;
    
    // Get date range for filtering
    let dateRange: { start: string; end: string } | undefined;
    if (selectedPeriod !== 'all_time') {
      const range = dateRanges[selectedPeriod];
      if (range) {
        dateRange = {
          start: format(range.start, 'yyyy-MM-dd'),
          end: format(range.end, 'yyyy-MM-dd'),
        };
      }
    }
    
    // Get leads for accurate calculation
    const { leads } = useContractorStore.getState();
    
    // Use the new accurate KPI calculation system
    // For now, use the existing calculation without overrides since views don't exist
    const accurateMetrics = calculateAccurateKPIs(dailyInputs, leads, totalRevenue, dateRange);
    
    return accurateMetrics;
  }, [selectedPeriod, dailyInputs, getDailyInputsByDateRange, dateRanges, revenueTotals.paidOutRevenue, useContractorStore.getState().leads]);

  const todayInput = getTodayInput();

  // Force refresh data when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && appState.current !== 'active') {
        console.log('🔄 App became active, refreshing data...');
        try {
          await forceSyncFromCloud();
          lastSyncTime.current = Date.now();
        } catch (error) {
          console.error('❌ Failed to refresh data on app activation:', error);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [forceSyncFromCloud]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastSyncTime.current > 30000) { // Refresh every 30 seconds
        console.log('🔄 Periodic data refresh...');
        try {
          await syncData();
          lastSyncTime.current = now;
        } catch (error) {
          console.error('❌ Periodic refresh failed:', error);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [syncData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Pull-to-refresh triggered, syncing...');
      await forceSyncFromCloud();
      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('❌ Pull-to-refresh sync failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate && showDatePicker) {
      setCustomDateRange(prev => {
        const newRange = {
          ...prev,
          [showDatePicker === 'start' ? 'startDate' : 'endDate']: selectedDate,
        };
        
        // Ensure start date is not after end date
        if (isAfter(newRange.startDate, newRange.endDate)) {
          if (showDatePicker === 'start') {
            newRange.endDate = selectedDate;
          } else {
            newRange.startDate = selectedDate;
          }
        }
        
        return newRange;
      });
    }
  };

  const handleCustomDateSelect = (selectedDate: Date) => {
    if (showDatePicker) {
      setCustomDateRange(prev => {
        const newRange = {
          ...prev,
          [showDatePicker === 'start' ? 'startDate' : 'endDate']: selectedDate,
        };
        
        if (isAfter(newRange.startDate, newRange.endDate)) {
          if (showDatePicker === 'start') {
            newRange.endDate = selectedDate;
          } else {
            newRange.startDate = selectedDate;
          }
        }
        
        return newRange;
      });
    }
    setShowCustomDatePicker(false);
    setShowDatePicker(null);
  };

  const handlePeriodSelect = (period: PeriodKey) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    setShowCustomDatePicker(false);
    setShowDatePicker(null);
  };

  const isTodayInCustomRange = () => {
    if (selectedPeriod !== 'custom') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(customDateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customDateRange.endDate);
    end.setHours(0, 0, 0, 0);
    return today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
  };

  // Utility function to safely calculate ratios and prevent NaN/undefined
  const safeRatio = (numerator: number, denominator: number, decimalPlaces: number = 1): string => {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
      return "0.0";
    }
    return (numerator / denominator).toFixed(decimalPlaces);
  };

  // Utility function to safely calculate percentages
  const safePercentage = (numerator: number, denominator: number, decimalPlaces: number = 1): string => {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator) || !isFinite(numerator / denominator)) {
      return "0.0%";
    }
    const percentage = (numerator / denominator) * 100;
    return `${percentage.toFixed(decimalPlaces)}%`;
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sourcePerformanceTitle = useMemo(() => {
    switch (selectedPeriod) {
      case 'today':
        return "Today's Performance by Source";
      case 'this_week':
        return "This Week's Performance by Source";
      case 'past_7_days':
        return "Past 7 Days Performance by Source";
      case 'past_30_days':
        return "Past 30 Days Performance by Source";
      case 'this_month':
        return "This Month's Performance by Source";
      case 'last_month':
        return "Last Month's Performance by Source";
      case 'this_year':
        return "This Year's Performance by Source";
      case 'last_year':
        return "Last Year's Performance by Source";
      case 'all_time':
        return "All Time Performance by Source";
      case 'custom':
        return `Custom Range (${format(customDateRange.startDate, 'MMM dd')} - ${format(customDateRange.endDate, 'MMM dd, yyyy')}) Performance by Source`;
      default:
        return "Overall Performance by Source";
    }
  }, [customDateRange, selectedPeriod]);

  const todayInCustomRange = isTodayInCustomRange();
  const periodIncludesToday =
    selectedPeriod === 'today' ||
    selectedPeriod === 'this_week' ||
    selectedPeriod === 'past_7_days' ||
    selectedPeriod === 'past_30_days' ||
    selectedPeriod === 'this_month' ||
    selectedPeriod === 'this_year' ||
    todayInCustomRange;

  // Utility function to safely calculate ratios and display as percentages
  const safeRatioAsPercentage = (numerator: number, denominator: number, decimalPlaces: number = 1): string => {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator) || !isFinite(numerator / denominator)) {
      return "0.0%";
    }
    const ratio = numerator / denominator;
    return `${(ratio * 100).toFixed(decimalPlaces)}%`;
  };

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-600">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-2xl font-bold text-white">KPI Dashboard</Text>
            <View className="flex-row items-center space-x-6">
              <Pressable
                onPress={() => setShowVisibilityModal(true)}
                className="flex-row items-center px-4 py-2 rounded-lg bg-purple-600"
              >
                <Ionicons 
                  name="eye" 
                  size={18} 
                  color="white" 
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white text-sm font-semibold">
                  Manage Metrics
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Profile')}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mr-2"
              >
                {user?.photoURL ? (
                  <View className="w-10 h-10 rounded-full bg-gray-200" />
                ) : (
                  <Text className="text-blue-500 font-semibold text-sm">
                    {user ? getInitials(user.name) : 'U'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
          
          {/* Period Selector */}
          <View className="mt-2">
            <Text className="text-xs font-semibold text-gray-300 mb-1">Viewing</Text>
            <View className="relative">
              <Pressable
                onPress={() => setShowPeriodDropdown(prev => !prev)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-sm font-semibold text-gray-900">
                    {selectedPeriodOption?.label || 'Select Range'}
                  </Text>
                  {!!selectedRangeSummary && (
                    <Text className="text-xs text-gray-500">{selectedRangeSummary}</Text>
                  )}
                </View>
                <Ionicons
                  name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#4B5563"
                />
              </Pressable>
              {showPeriodDropdown && (
                <View
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                  style={{ elevation: 6 }}
                >
                  <ScrollView style={{ maxHeight: 260 }}>
                    {periodOptions.map((option, index) => (
                      <Pressable
                        key={option.key}
                        onPress={() => handlePeriodSelect(option.key)}
                        className={cn(
                          "px-3 py-2",
                          index !== periodOptions.length - 1 ? "border-b border-gray-100" : "",
                          selectedPeriod === option.key ? "bg-blue-50" : "bg-white"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm",
                            selectedPeriod === option.key
                              ? "text-blue-600 font-semibold"
                              : "text-gray-800"
                          )}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Custom Date Range Picker */}
          {selectedPeriod === 'custom' && (
            <View className="mt-2 bg-white rounded-lg p-2.5 border border-gray-200">
              <Text className="text-xs font-semibold text-gray-700 mb-2">Select Date Range</Text>
              
              {/* Quick Presets */}
              <View className="flex-row space-x-1.5 mb-2.5">
                <Pressable
                  onPress={() => {
                    const today = new Date();
                    const end = endOfDay(today);
                    const start = startOfDay(subDays(end, 6));
                    setCustomDateRange({ startDate: start, endDate: end });
                  }}
                  className="px-2 py-1 bg-blue-100 rounded-md"
                >
                  <Text className="text-xs text-blue-700 font-medium">7 Days</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const today = new Date();
                    const end = endOfDay(today);
                    const start = startOfDay(subDays(end, 29));
                    setCustomDateRange({ startDate: start, endDate: end });
                  }}
                  className="px-2 py-1 bg-green-100 rounded-md"
                >
                  <Text className="text-xs text-green-700 font-medium">30 Days</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const today = new Date();
                    const end = endOfDay(today);
                    const start = startOfDay(subDays(end, 89));
                    setCustomDateRange({ startDate: start, endDate: end });
                  }}
                  className="px-2 py-1 bg-purple-100 rounded-md"
                >
                  <Text className="text-xs text-purple-700 font-medium">90 Days</Text>
                </Pressable>
              </View>
              
              <View className="flex-row space-x-2">
                <Pressable
                  onPress={() => {
                    setShowCustomDatePicker(true);
                    setShowDatePicker('start');
                  }}
                  className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <Text className="text-xs text-gray-500 mb-0.5">Start Date</Text>
                  <Text className="text-xs font-medium text-gray-900">
                    {format(customDateRange.startDate, 'MMM dd, yyyy')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowCustomDatePicker(true);
                    setShowDatePicker('end');
                  }}
                  className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <Text className="text-xs text-gray-500 mb-0.5">End Date</Text>
                  <Text className="text-xs font-medium text-gray-900">
                    {format(customDateRange.endDate, 'MMM dd, yyyy')}
                  </Text>
                </Pressable>
              </View>
              {isAfter(customDateRange.startDate, customDateRange.endDate) && (
                <Text className="text-xs text-red-500 mt-1.5">
                  Start date cannot be after end date
                </Text>
              )}
            </View>
          )}
        </View>

        <View className="px-4 py-4">
          {/* Main Activity Totals */}
          <View className="mb-4">
            <Text className="text-base font-bold text-white mb-2">Activity Totals</Text>
            <View className="flex-row flex-wrap gap-2">
              {showOutreach && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Outreach Attempts"
                    value={metrics.totals.outreachAttempts}
                    color="text-blue-600"
                    subtitle={`${metrics.averages.avgOutreachPerDay.toFixed(1)}/day avg`}
                  />
                </View>
              )}
              {showAppointmentsSet && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Set"
                    value={metrics.totals.appointmentsSet}
                    color="text-green-600"
                    subtitle={`${metrics.conversions.outreachToAppointments.toFixed(1)}% from outreach`}
                  />
                </View>
              )}
              {showAppointmentsHeld && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Held"
                    value={metrics.totals.appointmentsHeld}
                    color="text-yellow-600"
                    subtitle={`${metrics.conversions.appointmentHoldRate.toFixed(1)}% show rate`}
                  />
                </View>
              )}
              {showClosedDeals && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Deals Closed"
                    value={metrics.totals.dealsClosed}
                    color="text-green-600"
                    subtitle={`${metrics.conversions.appointmentCloseRate.toFixed(1)}% close rate`}
                  />
                </View>
              )}
              {showAccountsServiced && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Accounts Serviced"
                    value={metrics.totals.accountsServiced}
                    color="text-purple-600"
                    subtitle={`${metrics.conversions.serviceRate.toFixed(1)}% service rate`}
                  />
                </View>
              )}
              {showHoursWorked && (
                <View className="w-[48%]">
                  <ActivityMetric
                    title="Hours Worked"
                    value={parseFloat(metrics.totals.hoursWorked.toFixed(1))}
                    color="text-emerald-600"
                    subtitle={`${metrics.averages.avgHoursPerDay.toFixed(1)} hrs/day avg`}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Conversion Rates */}
          {showConversionRates && (
          <View className="mb-4">
            <Text className="text-base font-bold text-white mb-2">Conversion Rates</Text>
            <View className="flex-row flex-wrap gap-2">
              {showOutreachToAppointments && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Outreach → Appointments"
                    percentage={metrics.conversions.outreachToAppointments}
                    color="text-blue-600"
                    subtitle="Lead Generation"
                  />
                </View>
              )}
              {showAppointmentsToHeld && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Appointments → Held"
                    percentage={metrics.conversions.appointmentHoldRate}
                    color="text-yellow-600"
                    subtitle="Show Rate"
                  />
                </View>
              )}
              {showHeldToClosed && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Held → Closed"
                    percentage={metrics.conversions.appointmentCloseRate}
                    color="text-green-600"
                    subtitle="Sales Conversion"
                  />
                </View>
              )}
              {showClosedToServiced && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Closed → Serviced"
                    percentage={metrics.conversions.serviceRate}
                    color="text-purple-600"
                    subtitle="Service Rate"
                  />
                </View>
              )}
              {showOverallCloseRate && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Overall Close Rate"
                    percentage={metrics.conversions.overallCloseRate}
                    color="text-red-600"
                    subtitle="End-to-End"
                  />
                </View>
              )}
              {showOverallServiceRate && (
                <View className="w-[48%]">
                  <ConversionMetric
                    title="Overall Service Rate"
                    percentage={metrics.conversions.overallServiceRate}
                    color="text-teal-600"
                    subtitle="Outreach to Service"
                  />
                </View>
              )}
            </View>
          </View>
          )}

          {/* Efficiency Metrics */}
          {showEfficiencyMetrics && (
          <View className="mb-4">
            <Text className="text-base font-bold text-white mb-2">Efficiency Metrics</Text>
            <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              {[
                {
                  key: 'outreachPerAppointment',
                  label: 'Outreach per Appointment',
                  value: metrics.efficiency.outreachPerAppointment.toFixed(1),
                  icon: 'arrow-forward',
                  color: 'text-blue-600',
                  visible: true,
                },
                {
                  key: 'appointmentsPerDeal',
                  label: 'Appointments per Deal',
                  value: metrics.efficiency.appointmentsPerDeal.toFixed(1),
                  icon: 'calendar',
                  color: 'text-green-600',
                  visible: true,
                },
                {
                  key: 'hoursPerDeal',
                  label: 'Hours per Deal',
                  value: metrics.efficiency.hoursPerDeal.toFixed(1),
                  icon: 'time',
                  color: 'text-yellow-600',
                  visible: true,
                },
                {
                  key: 'revenuePerHour',
                  label: 'Revenue per Hour',
                  value: formatCurrency(metrics.efficiency.revenuePerHour),
                  icon: 'cash',
                  color: 'text-purple-600',
                  visible: true,
                },
                {
                  key: 'guaranteedRevenue',
                  label: 'Guaranteed Revenue',
                  value: formatCurrency(revenueTotals.guaranteedRevenue),
                  icon: 'shield-checkmark',
                  color: 'text-emerald-600',
                  visible: showRevenueGuaranteed,
                },
                {
                  key: 'pipelineRevenue',
                  label: 'Pipeline Revenue',
                  value: formatCurrency(revenueTotals.pipelineRevenue),
                  icon: 'analytics',
                  color: 'text-sky-600',
                  visible: showRevenuePipeline,
                },
                {
                  key: 'paidOutRevenue',
                  label: 'Paid Out Revenue',
                  value: formatCurrency(revenueTotals.paidOutRevenue),
                  icon: 'wallet',
                  color: 'text-purple-600',
                  visible: showRevenuePaidOut,
                },
                {
                  key: 'totalRevenue',
                  label: 'Total Revenue',
                  value: formatCurrency(revenueTotals.totalRevenue),
                  icon: 'trophy',
                  color: 'text-green-600',
                  visible: showRevenueTotal,
                },
                {
                  key: 'daysWithData',
                  label: 'Days with Data',
                  value: metrics.daysWithData,
                  icon: 'calendar',
                  color: 'text-gray-600',
                  visible: true,
                },
              ]
                .filter(stat => stat.visible)
                .map(stat => (
                  <QuickStat
                    key={stat.key}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon as keyof typeof Ionicons.glyphMap}
                    color={stat.color}
                  />
                ))}
            </View>
          </View>
          )}

          {/* Door Knocks Analysis */}
          {showDoorKnocksAnalysis && (
            <AnalysisSection
              title="Door Knocks Analysis"
              icon="🏠"
              volumeMetrics={{
                total: metrics.totals.outreachDoorKnocks,
                appointmentsSet: metrics.totals.appointmentsSetDoorKnocks || 0,
                appointmentsHeld: metrics.totals.appointmentsHeldDoorKnocks || 0,
                dealsClosed: metrics.totals.dealsClosedDoorKnocks,
                accountsServiced: metrics.totals.accountsServicedDoorKnocks || 0,
              }}
              analysisTotals={{
                perAppt: safePercentage(metrics.totals.outreachDoorKnocks, metrics.totals.appointmentsSetDoorKnocks),
                apptPerSit: safePercentage(metrics.totals.appointmentsHeldDoorKnocks, metrics.totals.appointmentsSetDoorKnocks),
                sitPerDeal: safePercentage(metrics.totals.dealsClosedDoorKnocks, metrics.totals.appointmentsHeldDoorKnocks),
                dealPerInstall: metrics.totals.dealsClosedDoorKnocks === 0 ? "0.0%" : safePercentage(metrics.totals.accountsServicedDoorKnocks, metrics.totals.dealsClosedDoorKnocks),
              }}
              colorScheme={{
                primary: "bg-blue-500",
                secondary: "bg-purple-500",
                accent: "bg-blue-100"
              }}
            />
          )}

          {/* Divider */}
          {showDoorKnocksAnalysis && showTagsAnalysis && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Tags Analysis */}
          {showTagsAnalysis && (
            <AnalysisSection
              title="Tags Analysis"
              icon="🏷️"
              volumeMetrics={{
                total: metrics.totals.outreachTagsPut,
                appointmentsSet: metrics.totals.appointmentsSetTagsPut || 0,
                appointmentsHeld: metrics.totals.appointmentsHeldTagsPut || 0,
                dealsClosed: metrics.totals.dealsClosedTagsPut,
                accountsServiced: metrics.totals.accountsServicedTagsPut || 0,
              }}
              analysisTotals={{
                perAppt: safePercentage(metrics.totals.outreachTagsPut, metrics.totals.appointmentsSetTagsPut),
                apptPerSit: safePercentage(metrics.totals.appointmentsHeldTagsPut, metrics.totals.appointmentsSetTagsPut),
                sitPerDeal: safePercentage(metrics.totals.dealsClosedTagsPut, metrics.totals.appointmentsHeldTagsPut),
                dealPerInstall: metrics.totals.dealsClosedTagsPut === 0 ? "0.0%" : safePercentage(metrics.totals.accountsServicedTagsPut, metrics.totals.dealsClosedTagsPut),
              }}
              colorScheme={{
                primary: "bg-orange-500",
                secondary: "bg-purple-500",
                accent: "bg-orange-100"
              }}
            />
          )}

          {/* Divider */}
          {showTagsAnalysis && showCallsAnalysis && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Calls Analysis */}
          {showCallsAnalysis && (
            <AnalysisSection
              title="Calls Analysis"
              icon="📞"
              volumeMetrics={{
                total: metrics.totals.outreachCallsMade,
                appointmentsSet: metrics.totals.appointmentsSetCallsMade || 0,
                appointmentsHeld: metrics.totals.appointmentsHeldCallsMade || 0,
                dealsClosed: metrics.totals.dealsClosedCallsMade,
                accountsServiced: metrics.totals.accountsServicedCallsMade || 0,
              }}
              analysisTotals={{
                perAppt: safePercentage(metrics.totals.outreachCallsMade, metrics.totals.appointmentsSetCallsMade),
                apptPerSit: safePercentage(metrics.totals.appointmentsHeldCallsMade, metrics.totals.appointmentsSetCallsMade),
                sitPerDeal: safePercentage(metrics.totals.dealsClosedCallsMade, metrics.totals.appointmentsHeldCallsMade),
                dealPerInstall: metrics.totals.dealsClosedCallsMade === 0 ? "0.0%" : safePercentage(metrics.totals.accountsServicedCallsMade, metrics.totals.dealsClosedCallsMade),
              }}
              colorScheme={{
                primary: "bg-green-500",
                secondary: "bg-purple-500",
                accent: "bg-green-100"
              }}
            />
          )}

          {/* Divider */}
          {showCallsAnalysis && showReferralsAnalysis && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Referrals Analysis */}
          {showReferralsAnalysis && (
            <AnalysisSection
              title="Referrals Analysis"
              icon="👥"
              volumeMetrics={{
                total: metrics.totals.outreachReferrals,
                appointmentsSet: metrics.totals.appointmentsSetReferrals || 0,
                appointmentsHeld: metrics.totals.appointmentsHeldReferrals || 0,
                dealsClosed: metrics.totals.dealsClosedReferrals,
                accountsServiced: metrics.totals.accountsServicedReferrals || 0,
              }}
              analysisTotals={{
                perAppt: safePercentage(metrics.totals.outreachReferrals, metrics.totals.appointmentsSetReferrals),
                apptPerSit: safePercentage(metrics.totals.appointmentsHeldReferrals, metrics.totals.appointmentsSetReferrals),
                sitPerDeal: safePercentage(metrics.totals.dealsClosedReferrals, metrics.totals.appointmentsHeldReferrals),
                dealPerInstall: metrics.totals.dealsClosedReferrals === 0 ? "0.0%" : safePercentage(metrics.totals.accountsServicedReferrals, metrics.totals.dealsClosedReferrals),
              }}
              colorScheme={{
                primary: "bg-teal-500",
                secondary: "bg-purple-500",
                accent: "bg-teal-100"
              }}
            />
          )}

          {/* Divider */}
          {showReferralsAnalysis && showInboundAnalysis && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Inbound Analysis */}
          {showInboundAnalysis && (
            <AnalysisSection
              title="Inbound Analysis"
              icon="📥"
              volumeMetrics={{
                total: metrics.totals.outreachInbound,
                appointmentsSet: metrics.totals.appointmentsSetInbound || 0,
                appointmentsHeld: metrics.totals.appointmentsHeldInbound || 0,
                dealsClosed: metrics.totals.dealsClosedInbound,
                accountsServiced: metrics.totals.accountsServicedInbound || 0,
              }}
              analysisTotals={{
                perAppt: safePercentage(metrics.totals.outreachInbound, metrics.totals.appointmentsSetInbound),
                apptPerSit: safePercentage(metrics.totals.appointmentsHeldInbound, metrics.totals.appointmentsSetInbound),
                sitPerDeal: safePercentage(metrics.totals.dealsClosedInbound, metrics.totals.appointmentsHeldInbound),
                dealPerInstall: metrics.totals.dealsClosedInbound === 0 ? "0.0%" : safePercentage(metrics.totals.accountsServicedInbound, metrics.totals.dealsClosedInbound),
              }}
              colorScheme={{
                primary: "bg-blue-500",
                secondary: "bg-purple-500",
                accent: "bg-blue-100"
              }}
            />
          )}

          {/* Divider */}
          {(showDoorKnocksAnalysis || showTagsAnalysis || showCallsAnalysis || showReferralsAnalysis || showInboundAnalysis) && showSourcePerformanceSummary && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Source Performance Summary */}
          {showSourcePerformanceSummary && (
            (showDoorKnocksAnalysis && (metrics.totals.outreachDoorKnocks > 0 || metrics.totals.appointmentsSetDoorKnocks > 0 || metrics.totals.dealsClosedDoorKnocks > 0 || metrics.totals.accountsServicedDoorKnocks > 0)) ||
            (showTagsAnalysis && (metrics.totals.outreachTagsPut > 0 || metrics.totals.appointmentsSetTagsPut > 0 || metrics.totals.dealsClosedTagsPut > 0 || metrics.totals.accountsServicedTagsPut > 0)) ||
            (showCallsAnalysis && (metrics.totals.outreachCallsMade > 0 || metrics.totals.appointmentsSetCallsMade > 0 || metrics.totals.dealsClosedCallsMade > 0 || metrics.totals.accountsServicedCallsMade > 0)) ||
            (showReferralsAnalysis && (metrics.totals.appointmentsSetReferrals > 0 || metrics.totals.dealsClosedReferrals > 0 || metrics.totals.accountsServicedReferrals > 0)) ||
            (showInboundAnalysis && (metrics.totals.appointmentsSetInbound > 0 || metrics.totals.dealsClosedInbound > 0 || metrics.totals.accountsServicedInbound > 0))
          ) && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-white mb-3">📊 Source Performance Summary</Text>
            <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                {sourcePerformanceTitle}
              </Text>
              
              {/* Door Knocks Summary */}
              {showDoorKnocksAnalysis && (
              <View className="mb-3 p-3 bg-blue-50 rounded-lg">
                <Text className="text-sm font-semibold text-blue-800 mb-2">🏠 Door Knocks</Text>
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-blue-600">{metrics.totals.outreachDoorKnocks}</Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-green-600">{metrics.totals.appointmentsSetDoorKnocks}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-purple-600">{metrics.totals.dealsClosedDoorKnocks}</Text>
                    <Text className="text-xs text-gray-600">Deals</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-teal-600">{metrics.totals.accountsServicedDoorKnocks || 0}</Text>
                    <Text className="text-xs text-gray-600">Installs</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Tags Summary */}
              {showTagsAnalysis && (
              <View className="mb-3 p-3 bg-orange-50 rounded-lg">
                <Text className="text-sm font-semibold text-orange-800 mb-2">🏷️ Tags</Text>
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-blue-600">{metrics.totals.outreachTagsPut}</Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-green-600">{metrics.totals.appointmentsSetTagsPut}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-purple-600">{metrics.totals.dealsClosedTagsPut}</Text>
                    <Text className="text-xs text-gray-600">Deals</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-teal-600">{metrics.totals.accountsServicedTagsPut || 0}</Text>
                    <Text className="text-xs text-gray-600">Installs</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Calls Summary */}
              {showCallsAnalysis && (
              <View className="mb-3 p-3 bg-green-50 rounded-lg">
                <Text className="text-sm font-semibold text-green-800 mb-2">📞 Calls</Text>
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-blue-600">{metrics.totals.outreachCallsMade}</Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-green-600">{metrics.totals.appointmentsSetCallsMade}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-purple-600">{metrics.totals.dealsClosedCallsMade}</Text>
                    <Text className="text-xs text-gray-600">Deals</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-teal-600">{metrics.totals.accountsServicedCallsMade || 0}</Text>
                    <Text className="text-xs text-gray-600">Installs</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Referrals Summary */}
              {showReferralsAnalysis && (
              <View className="mb-3 p-3 bg-purple-50 rounded-lg">
                <Text className="text-sm font-semibold text-purple-800 mb-2">👥 Referrals</Text>
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-blue-600">{metrics.totals.outreachReferrals}</Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-green-600">{metrics.totals.appointmentsSetReferrals}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-purple-600">{metrics.totals.dealsClosedReferrals}</Text>
                    <Text className="text-xs text-gray-600">Deals</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-teal-600">{metrics.totals.accountsServicedReferrals || 0}</Text>
                    <Text className="text-xs text-gray-600">Installs</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Inbound Summary */}
              {showInboundAnalysis && (
              <View className="p-3 bg-teal-50 rounded-lg">
                <Text className="text-sm font-semibold text-teal-800 mb-2">📥 Inbound</Text>
                <View className="flex-row justify-between">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-blue-600">{metrics.totals.outreachInbound}</Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-green-600">{metrics.totals.appointmentsSetInbound}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-purple-600">{metrics.totals.dealsClosedInbound}</Text>
                    <Text className="text-xs text-gray-600">Deals</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-teal-600">{metrics.totals.accountsServicedInbound || 0}</Text>
                    <Text className="text-xs text-gray-600">Installs</Text>
                  </View>
                </View>
              </View>
              )}
            </View>
          </View>
          )}

          {/* Divider */}
          {showSourcePerformanceSummary && showTodaysProgress && periodIncludesToday && todayInput && (
            <View className="h-px bg-gray-600/30 my-6" />
          )}

          {/* Today's Progress (if viewing today or current period includes today) */}
          {showTodaysProgress && periodIncludesToday && todayInput && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-white mb-3">Today's Progress</Text>
              <View className="bg-white rounded-xl p-4 border border-gray-100">
                <View className="flex-row justify-between mb-2">
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-blue-600">{todayInput.doorsKnocked}</Text>
                    <Text className="text-xs text-gray-600">Outreach</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-green-600">{todayInput.appointments}</Text>
                    <Text className="text-xs text-gray-600">Appointments</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-yellow-600">{todayInput.appointmentHolds}</Text>
                    <Text className="text-xs text-gray-600">Held</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-purple-600">{todayInput.closedDeals}</Text>
                    <Text className="text-xs text-gray-600">Closed</Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-600 text-center">
                  {todayInput.hoursWorked} hours worked today
                </Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
      </SafeAreaView>

      {/* Visibility Management Modal */}
      <Modal
        visible={showVisibilityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <LinearGradient
          colors={['#1a1f2e', '#2d3748', '#4a5568']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View className="flex-1 px-4 py-4">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-2xl font-bold text-white">Manage Metrics</Text>
                <Pressable
                  onPress={() => setShowVisibilityModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-600 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Activity Totals Section */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-white mb-3">Activity Totals</Text>
                  <View className="bg-white rounded-xl p-4 space-y-2">
                    {[
                      { key: 'outreach', label: 'Outreach Attempts', icon: 'home', value: showOutreach, setter: setShowOutreach },
                      { key: 'appointments', label: 'Set', icon: 'calendar', value: showAppointmentsSet, setter: setShowAppointmentsSet },
                      { key: 'appointmentsHeld', label: 'Held', icon: 'time', value: showAppointmentsHeld, setter: setShowAppointmentsHeld },
                      { key: 'dealsClosed', label: 'Deals Closed', icon: 'checkmark-circle', value: showClosedDeals, setter: setShowClosedDeals },
                      { key: 'accountsServiced', label: 'Accounts Serviced', icon: 'briefcase', value: showAccountsServiced, setter: setShowAccountsServiced },
                      { key: 'hoursWorked', label: 'Hours Worked', icon: 'time', value: showHoursWorked, setter: setShowHoursWorked },
                    ].map((metric) => (
                      <Pressable
                        key={metric.key}
                        onPress={() => metric.setter(!metric.value)}
                        className="flex-row items-center justify-between py-3 px-2 rounded-lg bg-gray-50"
                      >
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={metric.icon as keyof typeof Ionicons.glyphMap} 
                            size={20} 
                            color="#6b7280" 
                            style={{ marginRight: 12 }}
                          />
                          <Text className="text-gray-900 font-medium">{metric.label}</Text>
                        </View>
                        <View className={cn(
                          "w-12 h-6 rounded-full flex-row items-center px-1",
                          metric.value ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                        )}>
                          <View className="w-4 h-4 rounded-full bg-white" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Conversion Rates Section */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-white mb-3">Conversion Rates</Text>
                  <View className="bg-white rounded-xl p-4 space-y-2">
                    {[
                      { key: 'conversionRates', label: 'Conversion Rates (Overall)', icon: 'trending-up', value: showConversionRates, setter: setShowConversionRates },
                      { key: 'outreachToAppointments', label: 'Outreach → Appointments', icon: 'arrow-forward', value: showOutreachToAppointments, setter: setShowOutreachToAppointments },
                      { key: 'appointmentsToHeld', label: 'Appointments → Held', icon: 'time', value: showAppointmentsToHeld, setter: setShowAppointmentsToHeld },
                      { key: 'heldToClosed', label: 'Held → Closed', icon: 'checkmark-circle', value: showHeldToClosed, setter: setShowHeldToClosed },
                      { key: 'closedToServiced', label: 'Closed → Serviced', icon: 'briefcase', value: showClosedToServiced, setter: setShowClosedToServiced },
                      { key: 'overallCloseRate', label: 'Overall Close Rate', icon: 'trophy', value: showOverallCloseRate, setter: setShowOverallCloseRate },
                      { key: 'overallServiceRate', label: 'Overall Service Rate', icon: 'stats-chart', value: showOverallServiceRate, setter: setShowOverallServiceRate },
                    ].map((metric) => (
                      <Pressable
                        key={metric.key}
                        onPress={() => metric.setter(!metric.value)}
                        className="flex-row items-center justify-between py-3 px-2 rounded-lg bg-gray-50"
                      >
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={metric.icon as keyof typeof Ionicons.glyphMap} 
                            size={20} 
                            color="#6b7280" 
                            style={{ marginRight: 12 }}
                          />
                          <Text className="text-gray-900 font-medium">{metric.label}</Text>
                        </View>
                        <View className={cn(
                          "w-12 h-6 rounded-full flex-row items-center px-1",
                          metric.value ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                        )}>
                          <View className="w-4 h-4 rounded-full bg-white" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Revenue Metrics */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-white mb-3">Revenue Metrics</Text>
                  <View className="bg-white rounded-xl p-4 space-y-2">
                    {[
                      { key: 'revenueGuaranteed', label: 'Guaranteed Revenue', icon: 'shield-checkmark', value: showRevenueGuaranteed, setter: setShowRevenueGuaranteed },
                      { key: 'revenuePipeline', label: 'Pipeline Revenue', icon: 'analytics', value: showRevenuePipeline, setter: setShowRevenuePipeline },
                      { key: 'revenuePaidOut', label: 'Paid Out Revenue', icon: 'wallet', value: showRevenuePaidOut, setter: setShowRevenuePaidOut },
                      { key: 'revenueTotal', label: 'Total Revenue', icon: 'trophy', value: showRevenueTotal, setter: setShowRevenueTotal },
                    ].map((metric) => (
                      <Pressable
                        key={metric.key}
                        onPress={() => metric.setter(!metric.value)}
                        className="flex-row items-center justify-between py-3 px-2 rounded-lg bg-gray-50"
                      >
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={metric.icon as keyof typeof Ionicons.glyphMap} 
                            size={20} 
                            color="#6b7280" 
                            style={{ marginRight: 12 }}
                          />
                          <Text className="text-gray-900 font-medium">{metric.label}</Text>
                        </View>
                        <View className={cn(
                          "w-12 h-6 rounded-full flex-row items-center px-1",
                          metric.value ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                        )}>
                          <View className="w-4 h-4 rounded-full bg-white" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Analysis Sections */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-white mb-3">Analysis Sections</Text>
                  <View className="bg-white rounded-xl p-4 space-y-2">
                    {[
                      { key: 'efficiencyMetrics', label: 'Efficiency Metrics', icon: 'speedometer', value: showEfficiencyMetrics, setter: setShowEfficiencyMetrics },
                      { key: 'doorKnocksAnalysis', label: '🏠 Door Knocks Analysis', icon: 'home', value: showDoorKnocksAnalysis, setter: setShowDoorKnocksAnalysis },
                      { key: 'tagsAnalysis', label: '🏷️ Tags Analysis', icon: 'pricetag', value: showTagsAnalysis, setter: setShowTagsAnalysis },
                      { key: 'callsAnalysis', label: '📞 Calls Analysis', icon: 'call', value: showCallsAnalysis, setter: setShowCallsAnalysis },
                      { key: 'referralsAnalysis', label: '👥 Referrals Analysis', icon: 'people', value: showReferralsAnalysis, setter: setShowReferralsAnalysis },
                      { key: 'inboundAnalysis', label: '📥 Inbound Analysis', icon: 'arrow-down-circle', value: showInboundAnalysis, setter: setShowInboundAnalysis },
                      { key: 'sourcePerformanceSummary', label: '📊 Source Performance Summary', icon: 'stats-chart', value: showSourcePerformanceSummary, setter: setShowSourcePerformanceSummary },
                      { key: 'todaysProgress', label: "📅 Today's Progress", icon: 'today', value: showTodaysProgress, setter: setShowTodaysProgress },
                    ].map((metric) => (
                      <Pressable
                        key={metric.key}
                        onPress={() => metric.setter(!metric.value)}
                        className="flex-row items-center justify-between py-3 px-2 rounded-lg bg-gray-50"
                      >
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={metric.icon as keyof typeof Ionicons.glyphMap} 
                            size={20} 
                            color="#6b7280" 
                            style={{ marginRight: 12 }}
                          />
                          <Text className="text-gray-900 font-medium">{metric.label}</Text>
                        </View>
                        <View className={cn(
                          "w-12 h-6 rounded-full flex-row items-center px-1",
                          metric.value ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                        )}>
                          <View className="w-4 h-4 rounded-full bg-white" />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3 mb-6">
                  <Pressable
                    onPress={resetAllVisibility}
                    className="flex-1 bg-orange-600 rounded-lg py-3 items-center"
                  >
                    <Text className="text-white font-semibold">Show All Metrics</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      // Hide all metrics
                      setShowOutreach(false);
                      setShowAppointmentsSet(false);
                      setShowAppointmentsHeld(false);
                      setShowClosedDeals(false);
                      setShowAccountsServiced(false);
                      setShowHoursWorked(false);
                      setShowRevenueGuaranteed(false);
                      setShowRevenuePipeline(false);
                      setShowRevenuePaidOut(false);
                      setShowRevenueTotal(false);
                      setShowConversionRates(false);
                      setShowEfficiencyMetrics(false);
                      setShowDoorKnocksAnalysis(false);
                      setShowTagsAnalysis(false);
                      setShowCallsAnalysis(false);
                      setShowReferralsAnalysis(false);
                      setShowInboundAnalysis(false);
                      setShowSourcePerformanceSummary(false);
                      setShowTodaysProgress(false);
                    }}
                    className="flex-1 bg-red-600 rounded-lg py-3 items-center"
                  >
                    <Text className="text-white font-semibold">Hide All Metrics</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'start' ? customDateRange.startDate : customDateRange.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={showDatePicker === 'start' ? customDateRange.endDate : new Date()}
          minimumDate={showDatePicker === 'end' ? customDateRange.startDate : undefined}
        />
      )}

      {/* Custom Date Picker Modal */}
      <CustomDatePicker
        visible={showCustomDatePicker}
        onClose={() => {
          setShowCustomDatePicker(false);
          setShowDatePicker(null);
        }}
        onDateSelect={handleCustomDateSelect}
        initialDate={showDatePicker === 'start' ? customDateRange.startDate : customDateRange.endDate}
        title={showDatePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
      />
    </LinearGradient>
  );
};
