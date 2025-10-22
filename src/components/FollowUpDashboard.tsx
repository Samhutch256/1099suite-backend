import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContractorStore, Lead, FollowUpReminder } from '../state/contractorStore';
import { cn } from '../utils/cn';

interface FollowUpDashboardProps {
  onLeadPress?: (lead: Lead) => void;
}

const FollowUpItem: React.FC<{
  lead: Lead;
  reminder: FollowUpReminder;
  onPress: () => void;
  isOverdue?: boolean;
}> = ({ lead, reminder, onPress, isOverdue = false }) => {
  const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
  const now = new Date();
  const isToday = reminderDateTime.toDateString() === now.toDateString();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return 'call';
      case 'email': return 'mail';
      case 'meeting': return 'people';
      default: return 'checkmark-circle';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-500';
      case 'email': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDateTime = () => {
    const date = reminderDateTime.toLocaleDateString();
    const time = reminderDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return `Today at ${time}`;
    }
    
    const diffDays = Math.ceil((reminderDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return `Tomorrow at ${time}`;
    } else if (diffDays > 1 && diffDays <= 7) {
      return `${reminderDateTime.toLocaleDateString([], { weekday: 'long' })} at ${time}`;
    }
    
    return `${date} at ${time}`;
  };

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "bg-white rounded-xl p-4 mb-3 border shadow-sm active:scale-98",
        isOverdue ? "border-red-200 bg-red-50" :
        isToday ? "border-orange-200 bg-orange-50" :
        "border-gray-200"
      )}
    >
      <View className="flex-row items-start">
        <View className={cn("w-10 h-10 rounded-full items-center justify-center mr-3", getTypeColor(reminder.type))}>
          <Ionicons name={getTypeIcon(reminder.type) as any} size={18} color="white" />
        </View>
        
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-lg font-semibold text-gray-900">{lead.name}</Text>
            {(isOverdue || isToday) && (
              <View className={cn(
                "px-2 py-1 rounded-full",
                isOverdue ? "bg-red-100" : "bg-orange-100"
              )}>
                <Text className={cn(
                  "text-xs font-medium",
                  isOverdue ? "text-red-700" : "text-orange-700"
                )}>
                  {isOverdue ? "Overdue" : "Today"}
                </Text>
              </View>
            )}
          </View>
          
          <Text className="text-sm text-gray-600 mb-1">{lead.company}</Text>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="time" size={14} color="#9ca3af" />
            <Text className={cn(
              "text-sm ml-1",
              isOverdue ? "text-red-600" : isToday ? "text-orange-600" : "text-gray-600"
            )}>
              {formatDateTime()}
            </Text>
          </View>
          
          <Text className="text-sm font-medium text-gray-800 capitalize mb-2">
            {reminder.type} Follow-up
          </Text>
          
          {reminder.notes && (
            <Text className="text-sm text-gray-600" numberOfLines={2}>
              {reminder.notes}
            </Text>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </Pressable>
  );
};

export const FollowUpDashboard: React.FC<FollowUpDashboardProps> = ({ onLeadPress }) => {
  const { getUpcomingFollowUps, getOverdueFollowUps } = useContractorStore();
  
  const overdueFollowUps = getOverdueFollowUps();
  const upcomingFollowUps = getUpcomingFollowUps(7); // Next 7 days

  const totalPending = overdueFollowUps.length + upcomingFollowUps.length;

  if (totalPending === 0) {
    return (
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <View className="items-center">
          <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
          </View>
          <Text className="text-lg font-medium text-gray-900 mb-2">All caught up!</Text>
          <Text className="text-gray-600 text-center">
            No pending follow-ups. Great job staying on top of your leads!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {/* Summary Stats */}
      <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <Text className="text-lg font-semibold text-gray-900 mb-3">Follow-up Summary</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">{overdueFollowUps.length}</Text>
            <Text className="text-sm text-gray-600">Overdue</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-orange-600">
              {upcomingFollowUps.filter(item => {
                const reminderDate = new Date(`${item.reminder.date}T${item.reminder.time}`);
                const today = new Date();
                return reminderDate.toDateString() === today.toDateString();
              }).length}
            </Text>
            <Text className="text-sm text-gray-600">Due Today</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">{upcomingFollowUps.length}</Text>
            <Text className="text-sm text-gray-600">This Week</Text>
          </View>
        </View>
      </View>

      {/* Overdue Follow-ups */}
      {overdueFollowUps.length > 0 && (
        <View className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
          <View className="flex-row items-center mb-4">
            <Ionicons name="warning" size={20} color="#dc2626" />
            <Text className="text-lg font-semibold text-red-700 ml-2">
              Overdue Follow-ups ({overdueFollowUps.length})
            </Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {overdueFollowUps.slice(0, 5).map((item) => (
                <View key={`${item.lead.id}-${item.reminder.id}`} className="w-72">
                  <FollowUpItem
                    lead={item.lead}
                    reminder={item.reminder}
                    onPress={() => onLeadPress?.(item.lead)}
                    isOverdue={true}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          
          {overdueFollowUps.length > 5 && (
            <Text className="text-sm text-red-600 text-center mt-2">
              +{overdueFollowUps.length - 5} more overdue follow-ups
            </Text>
          )}
        </View>
      )}

      {/* Upcoming Follow-ups */}
      {upcomingFollowUps.length > 0 && (
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Upcoming Follow-ups ({upcomingFollowUps.length})
            </Text>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
            {upcomingFollowUps.map((item) => (
              <FollowUpItem
                key={`${item.lead.id}-${item.reminder.id}`}
                lead={item.lead}
                reminder={item.reminder}
                onPress={() => onLeadPress?.(item.lead)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};