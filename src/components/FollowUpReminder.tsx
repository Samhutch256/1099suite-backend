import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Alert, ScrollView, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useContractorStore, Lead, FollowUpReminder } from '../state/contractorStore';
import { cn } from '../utils/cn';

interface FollowUpReminderModalProps {
  lead: Lead;
  visible: boolean;
  onClose: () => void;
}

interface ReminderFormData {
  date: Date;
  time: Date;
  type: 'call' | 'email' | 'meeting' | 'other';
  notes: string;
}

const ReminderCard: React.FC<{
  reminder: FollowUpReminder;
  lead: Lead;
  onEdit: (reminder: FollowUpReminder) => void;
  onComplete: (reminder: FollowUpReminder) => void;
  onDelete: (reminder: FollowUpReminder) => void;
}> = ({ reminder, lead, onEdit, onComplete, onDelete }) => {
  const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
  const now = new Date();
  const isOverdue = !reminder.completed && reminderDateTime < now;
  const isToday = !reminder.completed && reminderDateTime.toDateString() === now.toDateString();
  const isUpcoming = !reminder.completed && reminderDateTime > now;

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
    return `${date} at ${time}`;
  };

  return (
    <Pressable
      onPress={() => onEdit(reminder)}
      className={cn(
        "bg-white rounded-xl p-4 mb-3 border active:bg-gray-50",
        reminder.completed ? "border-green-200 bg-green-50" :
        isOverdue ? "border-red-200 bg-red-50" :
        isToday ? "border-orange-200 bg-orange-50" :
        "border-gray-200"
      )}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className={cn("w-8 h-8 rounded-full items-center justify-center mr-3", getTypeColor(reminder.type))}>
              <Ionicons name={getTypeIcon(reminder.type) as any} size={16} color="white" />
            </View>
            <View className="flex-1">
              <Text className={cn(
                "text-lg font-semibold capitalize",
                reminder.completed ? "text-green-800" : "text-gray-900"
              )}>
                {reminder.type} Follow-up
              </Text>
              <Text className={cn(
                "text-sm",
                reminder.completed ? "text-green-600" :
                isOverdue ? "text-red-600" :
                isToday ? "text-orange-600" :
                "text-gray-600"
              )}>
                {formatDateTime()}
              </Text>
              <Text className="text-xs text-gray-400 mt-1">Tap to edit</Text>
            </View>
          </View>
          
          {reminder.notes && (
            <Text className="text-gray-700 mb-2">{reminder.notes}</Text>
          )}
          
          {reminder.completed && reminder.completedAt && (
            <View className="bg-green-100 p-2 rounded-lg">
              <Text className="text-sm text-green-800 font-medium">
                ✓ Completed on {new Date(reminder.completedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        
        {!reminder.completed && (
          <View className="flex-row space-x-2">
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onComplete(reminder);
              }}
              className="bg-green-500 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="checkmark" size={14} color="white" />
              <Text className="text-white text-sm font-medium ml-1">Done</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(reminder);
              }}
              className="bg-red-500 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="trash" size={14} color="white" />
            </Pressable>
          </View>
        )}
        
        {/* Click to edit indicator */}
        <View className="absolute top-2 right-2">
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </View>
      
      {!reminder.completed && (isOverdue || isToday) && (
        <View className={cn(
          "flex-row items-center p-2 rounded-lg",
          isOverdue ? "bg-red-100" : "bg-orange-100"
        )}>
          <Ionicons 
            name={isOverdue ? "warning" : "time"} 
            size={16} 
            color={isOverdue ? "#dc2626" : "#ea580c"} 
          />
          <Text className={cn(
            "text-sm font-medium ml-2",
            isOverdue ? "text-red-700" : "text-orange-700"
          )}>
            {isOverdue ? "Overdue" : "Due Today"}
          </Text>
        </View>
      )}
      
      {reminder.completed && (
        <View className="flex-row items-center justify-between pt-3 border-t border-green-200">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="text-sm text-green-600 font-medium ml-1">Completed</Text>
          </View>
          <View className="flex-row space-x-2">
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(reminder);
              }}
              className="bg-red-100 px-3 py-1 rounded-lg"
            >
              <Text className="text-sm text-red-600 font-medium">Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
};

export const FollowUpReminderModal: React.FC<FollowUpReminderModalProps> = ({
  lead: initialLead,
  visible,
  onClose,
}) => {
  const {
    addFollowUpReminder,
    updateFollowUpReminder,
    deleteFollowUpReminder,
    completeFollowUpReminder,
    leads,
  } = useContractorStore();

  // Get the current lead data from the store to ensure we have the latest state
  const lead = leads.find(l => l.id === initialLead.id) || initialLead;

  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<FollowUpReminder | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [formData, setFormData] = useState<ReminderFormData>({
    date: new Date(),
    time: new Date(),
    type: 'call',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      date: new Date(),
      time: new Date(),
      type: 'call',
      notes: '',
    });
    setEditingReminder(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    // Use default notes if empty
    const notes = formData.notes.trim() || 'Follow Up Reminder';

    const reminderData = {
      date: formData.date.toISOString().split('T')[0],
      time: formData.time.toTimeString().split(' ')[0],
      type: formData.type,
      notes: notes,
      completed: false,
    };

    console.log('Saving reminder:', reminderData);
    console.log('Current lead reminders before save:', lead.followUpReminders.length);

    try {
      if (editingReminder) {
        await updateFollowUpReminder(lead.id, editingReminder.id, reminderData);
        console.log('Updated reminder for lead:', lead.id);
      } else {
        await addFollowUpReminder(lead.id, reminderData);
        console.log('Added reminder for lead:', lead.id);
      }
      
      // Force a small delay to ensure state updates
      setTimeout(() => {
        console.log('After save - lead reminders count:', lead.followUpReminders.length);
        console.log('All reminders:', lead.followUpReminders);
      }, 100);
      
      resetForm();
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    }
  };

  const handleEdit = (reminder: FollowUpReminder) => {
    setEditingReminder(reminder);
    setFormData({
      date: new Date(reminder.date),
      time: new Date(`1970-01-01T${reminder.time}`),
      type: reminder.type,
      notes: reminder.notes,
    });
    setShowForm(true);
  };

  const handleComplete = (reminder: FollowUpReminder) => {
    Alert.alert(
      'Complete Follow-up',
      'Add completion notes (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => completeFollowUpReminder(lead.id, reminder.id),
        },
      ]
    );
  };

  const handleDelete = (reminder: FollowUpReminder) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this follow-up reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFollowUpReminder(lead.id, reminder.id),
        },
      ]
    );
  };

  // Separate reminders into upcoming and past
  const now = new Date();
  const upcomingReminders = lead.followUpReminders.filter(reminder => {
    if (reminder.completed) return false;
    const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
    return reminderDateTime > now;
  });

  const pastReminders = lead.followUpReminders.filter(reminder => {
    if (reminder.completed) return true;
    const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
    return reminderDateTime <= now;
  });

  // Debug logging
  console.log('🔍 FollowUpReminder Debug:');
  console.log('  - Lead ID:', lead.id);
  console.log('  - Total reminders in lead:', lead.followUpReminders.length);
  console.log('  - All reminders:', lead.followUpReminders);
  console.log('  - Upcoming reminders:', upcomingReminders.length);
  console.log('  - Past reminders:', pastReminders.length);
  console.log('  - Current time:', now.toISOString());
  
  // Additional debugging for each reminder
  lead.followUpReminders.forEach((reminder, index) => {
    const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
    const isUpcoming = !reminder.completed && reminderDateTime > now;
    const isPast = !reminder.completed && reminderDateTime <= now;
    const isCompleted = reminder.completed;
    
    console.log(`  - Reminder ${index + 1}:`, {
      id: reminder.id,
      date: reminder.date,
      time: reminder.time,
      type: reminder.type,
      completed: reminder.completed,
      reminderDateTime: reminderDateTime.toISOString(),
      isUpcoming,
      isPast,
      isCompleted
    });
  });

  // Sort reminders by date/time
  const sortReminders = (reminders: FollowUpReminder[]) => {
    return [...reminders].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const sortedUpcomingReminders = sortReminders(upcomingReminders);
  const sortedPastReminders = sortReminders(pastReminders);
  
  // Debug sorted arrays
  console.log('  - Sorted upcoming reminders:', sortedUpcomingReminders.length);
  console.log('  - Sorted past reminders:', sortedPastReminders.length);
  console.log('  - Show upcoming section:', sortedUpcomingReminders.length > 0);
  console.log('  - Show past section:', sortedPastReminders.length > 0);
  
  // Debug what will be rendered
  console.log('🎯 Will render upcoming reminders:', sortedUpcomingReminders);
  console.log('🎯 Will render past reminders:', sortedPastReminders);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-xl p-6 w-full max-h-[90%] shadow-lg">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Follow-up Reminders</Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center">
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <View className="bg-gray-50 rounded-lg p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-base font-medium text-gray-900">{lead.name}</Text>
                <Text className="text-sm text-gray-600">{lead.company}</Text>
                {lead.phone && (
                  <Text className="text-sm text-blue-600">{lead.phone}</Text>
                )}
              </View>
              <View className="flex-row space-x-2">
                {lead.phone && (
                  <Pressable 
                    className="bg-blue-500 p-2 rounded-lg"
                    onPress={() => {
                      const phoneNumber = lead.phone.replace(/[^\d+]/g, '');
                      Linking.openURL(`tel:${phoneNumber}`);
                    }}
                  >
                    <Ionicons name="call" size={16} color="white" />
                  </Pressable>
                )}
                {lead.email && (
                  <Pressable 
                    className="bg-green-500 p-2 rounded-lg"
                    onPress={() => {
                      Linking.openURL(`mailto:${lead.email}`);
                    }}
                  >
                    <Ionicons name="mail" size={16} color="white" />
                  </Pressable>
                )}
              </View>
            </View>
            
            {/* Quick Action Buttons */}
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  
                  setFormData({
                    date: tomorrow,
                    time: tomorrow,
                    type: 'call',
                    notes: 'Follow-up call',
                  });
                  setEditingReminder(null);
                  setShowForm(true);
                }}
                className="flex-1 bg-blue-100 px-2 py-1.5 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="call" size={12} color="#2563eb" />
                <Text className="text-blue-700 text-xs font-medium ml-1">Call</Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0, 0);
                  
                  setFormData({
                    date: tomorrow,
                    time: tomorrow,
                    type: 'email',
                    notes: 'Follow-up email',
                  });
                  setEditingReminder(null);
                  setShowForm(true);
                }}
                className="flex-1 bg-green-100 px-2 py-1.5 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="mail" size={12} color="#059669" />
                <Text className="text-green-700 text-xs font-medium ml-1">Email</Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  nextWeek.setHours(10, 0, 0, 0);
                  
                  setFormData({
                    date: nextWeek,
                    time: nextWeek,
                    type: 'meeting',
                    notes: 'Follow-up meeting',
                  });
                  setEditingReminder(null);
                  setShowForm(true);
                }}
                className="flex-1 bg-purple-100 px-2 py-1.5 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="people" size={12} color="#7c3aed" />
                <Text className="text-purple-700 text-xs font-medium ml-1">Meeting</Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  const nextDay = new Date();
                  nextDay.setDate(nextDay.getDate() + 2);
                  nextDay.setHours(14, 0, 0, 0);
                  
                  setFormData({
                    date: nextDay,
                    time: nextDay,
                    type: 'other',
                    notes: 'Follow-up reminder',
                  });
                  setEditingReminder(null);
                  setShowForm(true);
                }}
                className="flex-1 bg-gray-100 px-2 py-1.5 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="checkmark-circle" size={12} color="#6b7280" />
                <Text className="text-gray-700 text-xs font-medium ml-1">Other</Text>
              </Pressable>
            </View>
          </View>

          {!showForm ? (
            <>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-lg font-semibold text-gray-900">
                    Reminders ({lead.followUpReminders.length})
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowForm(true)}
                  className="bg-blue-500 px-4 py-2 rounded-xl flex-row items-center"
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="text-white font-medium ml-1">Add Reminder</Text>
                </Pressable>
              </View>

              {/* Main content area with proper height */}
              <View style={{ height: 350, backgroundColor: '#f8f9fa' }}>
                <ScrollView 
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ padding: 12 }}
                >
                  {lead.followUpReminders.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <View style={{ width: 56, height: 56, backgroundColor: '#e5e7eb', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Ionicons name="alarm-outline" size={20} color="#9ca3af" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 6 }}>
                        No reminders set
                      </Text>
                      <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 13 }}>
                        Add follow-up reminders to stay on top of your leads
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Upcoming Reminders */}
                      {sortedUpcomingReminders.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 6, height: 6, backgroundColor: '#10b981', borderRadius: 3, marginRight: 6 }}></View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                              Upcoming Reminders ({sortedUpcomingReminders.length})
                            </Text>
                          </View>
                          {sortedUpcomingReminders.map((reminder, index) => {
                            console.log(`🎯 Rendering upcoming reminder ${index}:`, reminder);
                            return (
                              <View key={`upcoming-${reminder.id}-${index}`} style={{ 
                                backgroundColor: 'white', 
                                marginBottom: 8, 
                                padding: 12, 
                                borderRadius: 8, 
                                borderWidth: 1, 
                                borderColor: '#e5e7eb',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 1,
                                elevation: 1
                              }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#111827' }}>
                                  {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} Follow-up
                                </Text>
                                <Text style={{ color: '#6b7280', marginBottom: 6, fontSize: 13 }}>
                                  {reminder.notes}
                                </Text>
                                <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 8 }}>
                                  {new Date(`${reminder.date}T${reminder.time}`).toLocaleDateString()} at {new Date(`${reminder.date}T${reminder.time}`).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <Pressable
                                    onPress={() => handleEdit(reminder)}
                                    style={{ 
                                      backgroundColor: '#3b82f6', 
                                      paddingHorizontal: 10, 
                                      paddingVertical: 6, 
                                      borderRadius: 4,
                                      flex: 1,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>Edit</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDelete(reminder)}
                                    style={{ 
                                      backgroundColor: '#ef4444', 
                                      paddingHorizontal: 10, 
                                      paddingVertical: 6, 
                                      borderRadius: 4,
                                      flex: 1,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>Delete</Text>
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Past Reminders */}
                      {sortedPastReminders.length > 0 && (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 6, height: 6, backgroundColor: '#9ca3af', borderRadius: 3, marginRight: 6 }}></View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                              Past Reminders ({sortedPastReminders.length})
                            </Text>
                          </View>
                          {sortedPastReminders.map((reminder, index) => {
                            console.log(`🎯 Rendering past reminder ${index}:`, reminder);
                            return (
                              <View key={`past-${reminder.id}-${index}`} style={{ 
                                backgroundColor: 'white', 
                                marginBottom: 8, 
                                padding: 12, 
                                borderRadius: 8, 
                                borderWidth: 1, 
                                borderColor: '#e5e7eb',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 1,
                                elevation: 1
                              }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#111827' }}>
                                  {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} Follow-up
                                </Text>
                                <Text style={{ color: '#6b7280', marginBottom: 6, fontSize: 13 }}>
                                  {reminder.notes}
                                </Text>
                                <Text style={{ color: '#9ca3af', fontSize: 11, marginBottom: 8 }}>
                                  {new Date(`${reminder.date}T${reminder.time}`).toLocaleDateString()} at {new Date(`${reminder.date}T${reminder.time}`).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <Pressable
                                    onPress={() => handleEdit(reminder)}
                                    style={{ 
                                      backgroundColor: '#3b82f6', 
                                      paddingHorizontal: 10, 
                                      paddingVertical: 6, 
                                      borderRadius: 4,
                                      flex: 1,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>Edit</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDelete(reminder)}
                                    style={{ 
                                      backgroundColor: '#ef4444', 
                                      paddingHorizontal: 10, 
                                      paddingVertical: 6, 
                                      borderRadius: 4,
                                      flex: 1,
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>Delete</Text>
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-gray-900">
                  {editingReminder ? 'Edit Reminder' : 'New Reminder'}
                </Text>
                <Pressable onPress={resetForm} className="w-8 h-8 items-center justify-center">
                  <Ionicons name="arrow-back" size={20} color="#6b7280" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Type Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
                <View className="flex-row mb-4">
                  {[
                    { key: 'call', label: 'Call', icon: 'call' },
                    { key: 'email', label: 'Email', icon: 'mail' },
                    { key: 'meeting', label: 'Meeting', icon: 'people' },
                    { key: 'other', label: 'Other', icon: 'checkmark-circle' },
                  ].map((type) => (
                    <Pressable
                      key={type.key}
                      onPress={() => setFormData(prev => ({ ...prev, type: type.key as any }))}
                      className={cn(
                        "flex-1 py-3 px-2 rounded-lg border mr-2",
                        formData.type === type.key
                          ? "bg-blue-500 border-blue-500"
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <View className="items-center">
                        <Ionicons
                          name={type.icon as any}
                          size={20}
                          color={formData.type === type.key ? "white" : "#6b7280"}
                        />
                        <Text className={cn(
                          "text-sm font-medium mt-1",
                          formData.type === type.key ? "text-white" : "text-gray-700"
                        )}>
                          {type.label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Date Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-2">Date</Text>
                <Pressable
                  onPress={() => {
                    console.log('Date picker pressed');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDatePicker(true);
                  }}
                  className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between active:bg-blue-100"
                >
                  <Text className="text-blue-900 text-base font-medium">
                    {formData.date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#1e40af" />
                </Pressable>

                {/* Time Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-2">Time</Text>
                <Pressable
                  onPress={() => {
                    console.log('Time picker pressed');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTimePicker(true);
                  }}
                  className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between active:bg-green-100"
                >
                  <Text className="text-green-900 text-base font-medium">
                    {formData.time.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#166534" />
                </Pressable>

                {/* Notes */}
                <Text className="text-sm font-medium text-gray-700 mb-2">Notes (Optional)</Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Add notes about this follow-up... (defaults to 'Follow Up Reminder')"
                  multiline
                  numberOfLines={4}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-6"
                  placeholderTextColor="#9ca3af"
                />

                {/* Action Buttons */}
                <View className="flex-row space-x-3">
                  <Pressable
                    onPress={resetForm}
                    className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 font-medium">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    className="flex-1 bg-blue-500 py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-medium">
                      {editingReminder ? 'Update' : 'Save'} Reminder
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent visible={showDatePicker} animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-xl p-6 mx-4 shadow-lg min-w-[300px]">
              <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">Select Date</Text>
              <View style={{ height: 200, backgroundColor: 'white' }}>
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  style={{ height: 200, backgroundColor: 'white' }}
                  textColor="#000000"
                  onChange={(event, selectedDate) => {
                    console.log('Date picker event:', event.type, selectedDate);
                    if (selectedDate) {
                      setFormData(prev => ({ ...prev, date: selectedDate }));
                    }
                  }}
                />
              </View>
              <View className="flex-row justify-end space-x-3 mt-4">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="px-4 py-2 bg-blue-500 rounded-lg"
                >
                  <Text className="text-white font-medium">Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Modal transparent visible={showTimePicker} animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-xl p-6 mx-4 shadow-lg min-w-[300px]">
              <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">Select Time</Text>
              <View style={{ height: 200, backgroundColor: 'white' }}>
                <DateTimePicker
                  value={formData.time}
                  mode="time"
                  display="spinner"
                  style={{ height: 200, backgroundColor: 'white' }}
                  textColor="#000000"
                  onChange={(event, selectedTime) => {
                    console.log('Time picker event:', event.type, selectedTime);
                    if (selectedTime) {
                      setFormData(prev => ({ ...prev, time: selectedTime }));
                    }
                  }}
                />
              </View>
              <View className="flex-row justify-end space-x-3 mt-4">
                <Pressable
                  onPress={() => setShowTimePicker(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(false)}
                  className="px-4 py-2 bg-blue-500 rounded-lg"
                >
                  <Text className="text-white font-medium">Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};