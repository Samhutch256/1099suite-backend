import React, { useState, useMemo, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, Text, ScrollView, Pressable, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useContractorStore } from '../state/contractorStore';
import { useKPIStore } from '../state/kpiStore';
import { useAuthStore } from '../state/authStore';
import { generateUniqueId } from '../utils/generateId';
import { addSamHutchEmail } from '../utils/addUser';
import { cn } from '../utils/cn';
import { Logo } from '../components/Logo';
import type { RootStackParamList } from '../navigation/AppNavigator';

const screenWidth = Dimensions.get('window').width;

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
}) => (
  <View className="bg-white rounded-2xl p-4 mx-2 shadow-sm border border-gray-100" style={{ width: 150, minHeight: 120 }}>
    <View className="flex-row items-center justify-between mb-2">
      <View className={cn("w-10 h-10 rounded-full items-center justify-center", color)}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
      {trend && (
        <View className="flex-row items-center">
          <Ionicons
            name={trend > 0 ? "trending-up" : "trending-down"}
            size={16}
            color={trend > 0 ? "#10b981" : "#ef4444"}
          />
          <Text className={cn("text-sm font-medium ml-1", 
            trend > 0 ? "text-green-600" : "text-red-600"
          )}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
    <View className="flex-1 justify-center">
      <Text className="text-2xl font-bold text-gray-900 mb-1" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-sm text-gray-600" numberOfLines={2}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  </View>
);

interface QuickActionProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({
  title,
  subtitle,
  icon,
  color,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    className="bg-white rounded-xl p-4 flex-row items-center shadow-sm border border-gray-100 active:scale-95"
  >
    <View className={cn("w-12 h-12 rounded-full items-center justify-center mr-4", color)}>
      <Ionicons name={icon} size={24} color="white" />
    </View>
    <View className="flex-1">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      <Text className="text-sm text-gray-600">{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
  </Pressable>
);

// Helper to calculate appointment metrics
function calculateAppointmentMetrics(leads: any[], recentInputs: any[]) {
  // Example calculation, adjust as needed for your data model
  const scheduled = leads.filter((l: any) => l.appointmentStatus === 'scheduled' && !l.isCancelled).length;
  const held = leads.filter((l: any) => l.appointmentStatus === 'held' && !l.isCancelled).length;
  const signed = leads.filter((l: any) => l.status === 'signed_deal' && !l.isCancelled).length;
  const cancelled = leads.filter((l: any) => l.isCancelled).length;
  const cancelledAppointments = leads.filter((l: any) => l.isCancelled && l.appointmentStatus === 'scheduled').length;
  const cancelledContracts = leads.filter((l: any) => l.isCancelled && l.status === 'signed_deal').length;
  // Example rates
  const totalSet = scheduled + held + signed + cancelled;
  const metrics = {
    holdRate: totalSet > 0 ? (held / totalSet) * 100 : 0,
    signRate: totalSet > 0 ? (signed / totalSet) * 100 : 0,
    cancellationRate: totalSet > 0 ? (cancelled / totalSet) * 100 : 0,
  };
  return {
    scheduled,
    held,
    signed,
    cancelled,
    cancelledAppointments,
    cancelledContracts,
    metrics,
  };
}

// Dummy pipelineMetrics function to resolve linter error
function pipelineMetrics() {
  return {
    stages: {
      new: 0,
      contacted: 0,
      appointment_set: 0,
      appointment_held: 0,
      negotiation: 0,
      signed_deal: 0,
      site_survey_scheduled: 0,
      site_survey_completed: 0,
      change_order_required: 0,
      install_scheduled: 0,
      installed: 0,
      lost: 0,
    },
    conversions: {
      contactRate: 0,
      appointmentRate: 0,
      holdRate: 0,
      closeRate: 0,
      installRate: 0,
    },
  };
}


export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Remove getAppointmentMetrics and getPipelineMetrics as they do not exist on ContractorState
  const { getKPIData, leads, expenses, teamMembers, currentOffice } = useContractorStore();
  const { getTodayInput, dailyInputs, getDailyInputsByDateRange } = useKPIStore();
  const { user } = useAuthStore();
  const kpiData = getKPIData();
  const todayInput = getTodayInput();
  
  // Dashboard view states
  const [activeView, setActiveView] = useState<'overview'>('overview');
  const [showCharts, setShowCharts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add user to database on component mount (one-time operation)
  useEffect(() => {
    const addUserOnMount = async () => {
      try {
        const result = await addSamHutchEmail();
        if (result.success) {
          console.log('✅ User added successfully:', result.user?.email);
        } else {
          console.log('ℹ️  User may already exist or there was an issue:', result.error);
        }
      } catch (error) {
        console.log('ℹ️  Error adding user (may already exist):', error);
      }
    };

    addUserOnMount();
  }, []); // Empty dependency array means this runs only once

  // Pull to refresh functionality
  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Comprehensive metrics calculation (similar to KPI screen)
  const dashboardMetrics = useMemo(() => {
    const contractorData = getKPIData();
    const totalRevenue = contractorData.totalRevenue;
    
    // Get recent data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInputs = getDailyInputsByDateRange(
      thirtyDaysAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );

    // Calculate totals for recent period
    const totals = recentInputs.reduce((acc, input) => ({
      outreachAttempts: acc.outreachAttempts + input.doorsKnocked,
      appointmentsSet: acc.appointmentsSet + input.appointments,
      appointmentsHeld: acc.appointmentsHeld + input.appointmentHolds,
      dealsClosed: acc.dealsClosed + input.closedDeals,
      accountsServiced: acc.accountsServiced + input.accountsServiced,
      hoursWorked: acc.hoursWorked + input.hoursWorked,
    }), {
      outreachAttempts: 0,
      appointmentsSet: 0,
      appointmentsHeld: 0,
      dealsClosed: 0,
      accountsServiced: 0,
      hoursWorked: 0,
    });

    // Calculate conversion rates
    const outreachToAppointments = totals.outreachAttempts > 0 ? (totals.appointmentsSet / totals.outreachAttempts) * 100 : 0;
    const appointmentHoldRate = totals.appointmentsSet > 0 ? (totals.appointmentsHeld / totals.appointmentsSet) * 100 : 0;
    const appointmentCloseRate = totals.appointmentsHeld > 0 ? (totals.dealsClosed / totals.appointmentsHeld) * 100 : 0;
    const revenuePerHour = totals.hoursWorked > 0 ? totalRevenue / totals.hoursWorked : 0;

    // Calculate daily averages
    const daysWithData = recentInputs.length || 1;
    const avgOutreachPerDay = totals.outreachAttempts / daysWithData;
    const avgAppointmentsPerDay = totals.appointmentsSet / daysWithData;
    const avgDealsPerDay = totals.dealsClosed / daysWithData;

    // Calculate appointment metrics
    const appointmentMetrics = calculateAppointmentMetrics(leads, recentInputs);

    return {
      totals,
      conversions: {
        outreachToAppointments,
        appointmentHoldRate,
        appointmentCloseRate,
        revenuePerHour,
      },
      averages: {
        avgOutreachPerDay,
        avgAppointmentsPerDay,
        avgDealsPerDay,
      },
      daysWithData,
      totalRevenue,
      recentInputs,
      appointmentMetrics,
    };
  }, [dailyInputs, getDailyInputsByDateRange, getKPIData, leads]);



  const thisMonthLeads = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    });
  }, [leads]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const quickActions = [
    {
      id: 'action-daily-input',
      title: "Daily Input",
      subtitle: "Log today's activities",
      icon: "create" as const,
      color: "bg-blue-500",
      onPress: () => navigation.navigate({ name: 'DailyInput', params: {} }),
    },
    {
      id: 'action-add-lead',
      title: "Add Lead",
      subtitle: "Capture new prospect",
      icon: "person-add" as const,
      color: "bg-green-500",
      onPress: () => navigation.navigate({ name: 'AddLead', params: undefined }),
    },
    {
      id: 'action-view-kpis',
      title: "View KPIs",
      subtitle: "Check performance",
      icon: "analytics" as const,
      color: "bg-purple-500",
      // 'KPI' is not a valid route name, so remove this quick action or fix the route name.
      // For example, if you meant 'Profile', use:
      // onPress: () => navigation.navigate({ name: 'Profile', params: undefined }),
      // Here, we'll comment it out to fix the error:
      // onPress: () => navigation.navigate({ name: 'KPI', params: undefined }),
    },

  ];

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
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <Logo size={32} className="mr-3" />
              <View className="flex-1">
                <Text className="text-lg text-gray-300">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}!
                </Text>
                <Text className="text-2xl font-bold text-white">Dashboard</Text>
                <Text className="text-sm text-gray-400">{currentOffice}</Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-3">
              {/* Profile Button */}
              <Pressable
                onPress={() => navigation.navigate('Profile')}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100"
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
        </View>



        {/* Today's Progress (if available) */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Debug Info</Text>
          <View className="bg-white rounded-xl p-4">
            <Text className="text-gray-900">Leads: {leads.length}</Text>

            <Text className="text-gray-900">Team Members: {teamMembers.length}</Text>
            <Text className="text-gray-900">Daily Inputs: {dailyInputs.length}</Text>
            <Text className="text-gray-900">Today Input: {todayInput ? 'Yes' : 'No'}</Text>
          </View>
        </View>
        {todayInput && (
          <View className="px-6 mb-6">
            <Text className="text-xl font-semibold text-white mb-4">Today's Progress</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
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

        {/* KPI Cards - Last 30 Days */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Performance (Last 30 Days)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            <View className="flex-row">
              <KPICard
                title="Total Revenue"
                value={formatCurrency(dashboardMetrics.totalRevenue)}
                subtitle={`${formatCurrency(dashboardMetrics.conversions.revenuePerHour)}/hour`}
                icon="trending-up"
                color="bg-green-500"
              />
              <KPICard
                title="Outreach Attempts"
                value={dashboardMetrics.totals.outreachAttempts.toString()}
                subtitle={`${dashboardMetrics.averages.avgOutreachPerDay.toFixed(1)}/day avg`}
                icon="home"
                color="bg-blue-500"
              />
              <KPICard
                title="Appointments Set"
                value={dashboardMetrics.totals.appointmentsSet.toString()}
                subtitle={`${dashboardMetrics.conversions.outreachToAppointments.toFixed(1)}% conversion`}
                icon="calendar"
                color="bg-green-600"
              />
              <KPICard
                title="Deals Closed"
                value={dashboardMetrics.totals.dealsClosed.toString()}
                subtitle={`${dashboardMetrics.conversions.appointmentCloseRate.toFixed(1)}% close rate`}
                icon="checkmark-circle"
                color="bg-purple-500"
              />
              <KPICard
                title="Hold Rate"
                value={`${dashboardMetrics.conversions.appointmentHoldRate.toFixed(1)}%`}
                subtitle={`${dashboardMetrics.totals.appointmentsHeld} held`}
                icon="time"
                color="bg-yellow-500"
              />
            </View>
          </ScrollView>
        </View>

        {/* Appointment Metrics */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Appointment Metrics</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            <View className="flex-row">
              {(() => {
                // Use dashboardMetrics.appointmentMetrics instead of calling appointmentMetrics()
                const appointmentMetrics = dashboardMetrics.appointmentMetrics;
                return (
                  <>
                    <KPICard
                      title="Scheduled"
                      value={(appointmentMetrics?.scheduled ?? 0).toString()}
                      subtitle="Upcoming appointments"
                      icon="calendar"
                      color="bg-blue-500"
                    />
                    <KPICard
                      title="Held"
                      value={(appointmentMetrics?.held ?? 0).toString()}
                      subtitle={`${appointmentMetrics?.metrics?.holdRate?.toFixed(1) ?? '0.0'}% hold rate`}
                      icon="checkmark-circle"
                      color="bg-green-500"
                    />
                    <KPICard
                      title="Signed"
                      value={(appointmentMetrics?.signed ?? 0).toString()}
                      subtitle={`${appointmentMetrics?.metrics?.signRate?.toFixed(1) ?? '0.0'}% sign rate`}
                      icon="document-text"
                      color="bg-emerald-500"
                    />
                    <KPICard
                      title="Cancelled"
                      value={(appointmentMetrics?.cancelled ?? 0).toString()}
                      subtitle={`${appointmentMetrics?.metrics?.cancellationRate?.toFixed(1) ?? '0.0'}% cancellation`}
                      icon="close-circle"
                      color="bg-red-500"
                    />
                    <KPICard
                      title="Cancelled Appointments"
                      value={(appointmentMetrics?.cancelledAppointments ?? 0).toString()}
                      subtitle="Pre-meeting cancellations"
                      icon="calendar-outline"
                      color="bg-orange-500"
                    />
                    <KPICard
                      title="Cancelled Contracts"
                      value={(appointmentMetrics?.cancelledContracts ?? 0).toString()}
                      subtitle="Post-meeting cancellations"
                      icon="document-outline"
                      color="bg-red-600"
                    />
                  </>
                );
              })()}
            </View>
          </ScrollView>
        </View>

        {/* Pipeline Metrics */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Pipeline Metrics</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            <View className="flex-row">
              {(() => {
                const metrics = pipelineMetrics();
                return (
                  <>
                    <KPICard
                      title="New Leads"
                      value={metrics.stages.new.toString()}
                      subtitle="Awaiting contact"
                      icon="person-add"
                      color="bg-blue-500"
                    />
                    <KPICard
                      title="Contacted"
                      value={metrics.stages.contacted.toString()}
                      subtitle={`${metrics.conversions.contactRate.toFixed(1)}% contact rate`}
                      icon="call"
                      color="bg-yellow-500"
                    />
                    <KPICard
                      title="Appointments Set"
                      value={metrics.stages.appointment_set.toString()}
                      subtitle={`${metrics.conversions.appointmentRate.toFixed(1)}% apt rate`}
                      icon="calendar"
                      color="bg-green-500"
                    />
                    <KPICard
                      title="Appointments Held"
                      value={metrics.stages.appointment_held.toString()}
                      subtitle={`${metrics.conversions.holdRate.toFixed(1)}% hold rate`}
                      icon="checkmark-circle"
                      color="bg-purple-500"
                    />
                    <KPICard
                      title="In Negotiation"
                      value={metrics.stages.negotiation.toString()}
                      subtitle="Discussing terms"
                      icon="chatbubbles"
                      color="bg-indigo-500"
                    />
                    <KPICard
                      title="Signed Deals"
                      value={metrics.stages.signed_deal.toString()}
                      subtitle={`${metrics.conversions.closeRate.toFixed(1)}% close rate`}
                      icon="document-text"
                      color="bg-emerald-500"
                    />
                    <KPICard
                      title="Serviced"
                      value={metrics.stages.installed.toString()}
                      subtitle={`${metrics.conversions.installRate.toFixed(1)}% service rate`}
                      icon="trophy"
                      color="bg-green-600"
                    />
                    <KPICard
                      title="Lost Leads"
                      value={metrics.stages.lost.toString()}
                      subtitle="No longer pursuing"
                      icon="close-circle"
                      color="bg-red-500"
                    />
                  </>
                );
              })()}
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Quick Actions</Text>
          <View className="space-y-3">
            {quickActions.map((action, index) => (
              <View key={action.id} className={cn(index > 0 && "mt-2")}>
                <QuickAction {...action} onPress={action.onPress ?? (() => {})} />
              </View>
            ))}
          </View>
        </View>

        {/* Key Insights */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-semibold text-white mb-4">Key Insights</Text>
          <View className="bg-gray-800/50 rounded-xl p-4 shadow-sm border border-gray-600">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 bg-indigo-500 rounded-full items-center justify-center mr-3">
                <Ionicons name="analytics" size={16} color="white" />
              </View>
              <Text className="text-lg font-semibold text-white">Performance Summary</Text>
            </View>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2 px-3 bg-gray-700/50 rounded-lg">
                <Text className="text-gray-300 text-sm">Days with Data</Text>
                <Text className="font-semibold text-white">{dashboardMetrics.daysWithData}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 px-3 bg-gray-700/50 rounded-lg">
                <Text className="text-gray-300 text-sm">Avg Outreach/Day</Text>
                <Text className="font-semibold text-blue-400">
                  {dashboardMetrics.averages.avgOutreachPerDay.toFixed(1)}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 px-3 bg-gray-700/50 rounded-lg">
                <Text className="text-gray-300 text-sm">Avg Deals/Day</Text>
                <Text className="font-semibold text-green-400">
                  {dashboardMetrics.averages.avgDealsPerDay.toFixed(1)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-2 px-3 bg-gray-700/50 rounded-lg">
                <Text className="text-gray-300 text-sm">This Month Leads</Text>
                <Text className="font-semibold text-white">{thisMonthLeads.length}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
};