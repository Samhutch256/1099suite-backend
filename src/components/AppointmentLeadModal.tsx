import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContractorStore, Lead } from '../state/contractorStore';
import { cn } from '../utils/cn';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AppointmentLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onAssignLead: (leadId: string) => void;
  onCreateLead: (leadData: Partial<Lead>) => void;
  appointmentType: 'set' | 'held';
  inputDate: string; // The date from the daily input
  preSelectedSource: 'door_knocks' | 'tags_put' | 'calls_made' | 'referrals' | 'inbound' | 'other';
  count: number;
}

interface NewLeadForm {
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentNotes: string;
}

export const AppointmentLeadModal: React.FC<AppointmentLeadModalProps> = ({
  visible,
  onClose,
  onAssignLead,
  onCreateLead,
  appointmentType,
  inputDate,
  preSelectedSource,
  count,
}) => {
  const { leads } = useContractorStore();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [newLeadForm, setNewLeadForm] = useState<NewLeadForm>({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentNotes: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🔍 AppointmentLeadModal opened with inputDate:', inputDate);
      console.log('🔍 InputDate as Date object:', new Date(inputDate));
      console.log('🔍 InputDate formatted:', new Date(inputDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }));
      
      setNewLeadForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        address: '',
        appointmentDate: '', // Force user to explicitly select a date
        appointmentTime: '',
        appointmentNotes: '',
      });
      setSearchQuery('');
      setActiveTab('existing');
    }
  }, [visible, inputDate, appointmentType]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Optionally prioritize leads with the same source
    return matchesSearch;
  }).sort((a, b) => {
    // Prioritize leads with matching source
    if (a.source === preSelectedSource && b.source !== preSelectedSource) return -1;
    if (b.source === preSelectedSource && a.source !== preSelectedSource) return 1;
    return 0;
  });

  const handleCreateLead = () => {
    if (!newLeadForm.name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the lead.');
      return;
    }

    if (!newLeadForm.appointmentDate) {
      Alert.alert('Date Required', 'Please select a date for the appointment.');
      return;
    }

    console.log('✅ Creating lead with valid data:', {
      name: newLeadForm.name,
      appointmentDate: newLeadForm.appointmentDate,
      appointmentTime: newLeadForm.appointmentTime,
    });

    const leadData: Partial<Lead> = {
      name: newLeadForm.name.trim(),
      phone: newLeadForm.phone.trim(),
      email: newLeadForm.email.trim(),
      company: newLeadForm.company.trim(),
      address: newLeadForm.address.trim(),
      source: preSelectedSource,
      appointmentDate: newLeadForm.appointmentDate,
      appointmentTime: newLeadForm.appointmentTime.trim() || '',
      appointmentNotes: newLeadForm.appointmentNotes.trim(),
      appointmentStatus: appointmentType === 'held' ? 'held' : 'scheduled',
      appointmentSetOnDate: inputDate, // The date when this appointment activity was logged
      status: appointmentType === 'held' ? 'appointment_held' : 'appointment_set',
      value: 0,
      notes: `Created from ${appointmentType === 'held' ? 'held' : 'set'} appointment`,
    };
    
    console.log('🔍 Creating lead with data:', {
      appointmentDate: newLeadForm.appointmentDate,
      appointmentSetOnDate: inputDate,
      inputDate
    });

    onCreateLead(leadData);
    onClose();
  };

  const LeadSourceBadge = ({ source }: { source: string }) => {
    const getSourceConfig = (src: string) => {
      switch (src) {
        case 'door_knocks': return { label: '🏠 Door Knocks', color: 'bg-blue-100 text-blue-800' };
        case 'tags_put': return { label: '🏷️ Tags Put', color: 'bg-purple-100 text-purple-800' };
        case 'calls_made': return { label: '📞 Calls Made', color: 'bg-green-100 text-green-800' };
        case 'referrals': return { label: '👥 Referrals', color: 'bg-orange-100 text-orange-800' };
        case 'inbound': return { label: '📥 Inbound', color: 'bg-indigo-100 text-indigo-800' };
        default: return { label: '❓ Other', color: 'bg-gray-100 text-gray-800' };
      }
    };
    
    const config = getSourceConfig(source);
    return (
      <Text className={cn("text-xs font-medium px-2 py-1 rounded-full", config.color)}>
        {config.label}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {appointmentType === 'held' ? 'Appointment Held' : 'Appointment Set'}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {count} {preSelectedSource === 'door_knocks' ? 'door knock' :
                         preSelectedSource === 'tags_put' ? 'tag' :
                         preSelectedSource === 'calls_made' ? 'call' :
                         preSelectedSource === 'referrals' ? 'referral' :
                         preSelectedSource === 'inbound' ? 'inbound lead' : 'lead'} 
                appointment{count > 1 ? 's' : ''} • Associate with lead to track in pipeline
              </Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center">
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          <View className="mt-3 p-3 bg-green-50 rounded-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">
                  {preSelectedSource === 'door_knocks' ? '🏠' :
                   preSelectedSource === 'tags_put' ? '🏷️' :
                   preSelectedSource === 'calls_made' ? '📞' :
                   preSelectedSource === 'referrals' ? '👥' :
                   preSelectedSource === 'inbound' ? '📥' : '❓'}
                </Text>
                <View>
                  <Text className="text-sm font-medium text-green-800">
                    {preSelectedSource === 'other' ? 'Lead Source: Other' : 
                     `Auto-detected: ${preSelectedSource === 'door_knocks' ? 'Door Knocks' :
                                       preSelectedSource === 'tags_put' ? 'Tags Put' :
                                       preSelectedSource === 'calls_made' ? 'Calls Made' :
                                       preSelectedSource === 'referrals' ? 'Referrals' :
                                       preSelectedSource === 'inbound' ? 'Inbound' : 'Other'}`}
                  </Text>
                  <Text className="text-xs text-green-600">
                    {preSelectedSource === 'other' ? 
                     'No sub-input specified' : 
                     'Based on your sub-input breakdown'}
                  </Text>
                </View>
              </View>
              <View className="bg-green-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">{count}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row">
            <Pressable
              onPress={() => setActiveTab('existing')}
              className={cn(
                "flex-1 px-6 py-3 border-b-2",
                activeTab === 'existing' ? "border-blue-500" : "border-transparent"
              )}
            >
              <Text className={cn(
                "text-center font-medium",
                activeTab === 'existing' ? "text-blue-600" : "text-gray-600"
              )}>
                Existing Lead
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setActiveTab('new')}
              className={cn(
                "flex-1 px-6 py-3 border-b-2",
                activeTab === 'new' ? "border-blue-500" : "border-transparent"
              )}
            >
              <Text className={cn(
                "text-center font-medium",
                activeTab === 'new' ? "text-blue-600" : "text-gray-600"
              )}>
                New Lead
              </Text>
            </Pressable>
          </View>
        </View>

        {activeTab === 'existing' ? (
          <View className="flex-1">
            {/* Search */}
            <View className="bg-white px-6 py-4 border-b border-gray-200">
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#6b7280" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search leads..."
                  className="flex-1 ml-2 text-gray-900"
                />
              </View>
            </View>

            {/* Leads List */}
            <ScrollView className="flex-1 px-6 py-4">
              {filteredLeads.length === 0 ? (
                <View className="py-12 items-center">
                  <Ionicons name="person-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-center mt-4">
                    {searchQuery ? 'No leads found matching your search' : 'No leads available'}
                  </Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {filteredLeads.map((lead) => {
                    const isMatchingSource = lead.source === preSelectedSource;
                    return (
                      <Pressable
                        key={lead.id}
                        onPress={() => {
                          onAssignLead(lead.id);
                          onClose();
                        }}
                        className={cn(
                          "rounded-lg p-4 border",
                          isMatchingSource 
                            ? "bg-green-50 border-green-200" 
                            : "bg-white border-gray-200"
                        )}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text className="font-semibold text-gray-900">{lead.name}</Text>
                              {isMatchingSource && (
                                <View className="ml-2 bg-green-600 px-2 py-0.5 rounded-full">
                                  <Text className="text-xs font-bold text-white">MATCH</Text>
                                </View>
                              )}
                            </View>
                            {lead.company && (
                              <Text className="text-sm text-gray-600 mt-1">{lead.company}</Text>
                            )}
                            <View className="flex-row items-center mt-2">
                              <LeadSourceBadge source={lead.source} />
                              <Text className={cn(
                                "text-xs font-medium px-2 py-1 rounded-full ml-2",
                                lead.status === 'installed' ? 'bg-green-100 text-green-800' :
                                lead.status === 'signed_deal' ? 'bg-emerald-100 text-emerald-800' :
                                lead.status === 'cancelled_contract' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              )}>
                                {lead.status === 'appointment_set' ? 'Set' :
                                 lead.status === 'appointment_held' ? 'Held' :
                                 lead.status === 'signed_deal' ? 'Signed' :
                                 lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1 px-6 py-4">
              <View className="bg-white rounded-lg p-6 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person-add" size={16} color="#3b82f6" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900">
                    Create New Lead
                  </Text>
                </View>

                {/* Name */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </Text>
                  <TextInput
                    value={newLeadForm.name}
                    onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, name: text }))}
                    placeholder="Enter lead name"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 text-base"
                  />
                </View>

                {/* Phone */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
                  <TextInput
                    value={newLeadForm.phone}
                    onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 text-base"
                  />
                </View>

                {/* Email */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
                  <TextInput
                    value={newLeadForm.email}
                    onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, email: text }))}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 text-base"
                  />
                </View>

                {/* Company */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Company</Text>
                  <TextInput
                    value={newLeadForm.company}
                    onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, company: text }))}
                    placeholder="Enter company name"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 text-base"
                  />
                </View>

                {/* Address */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
                  <TextInput
                    value={newLeadForm.address}
                    onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, address: text }))}
                    placeholder="Enter address"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 text-base"
                  />
                </View>



                {/* Appointment Date */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Appointment Date: <Text className="text-gray-500 font-normal">(When will you meet with this lead?)</Text>
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={cn(
                      "border rounded-xl px-4 py-4 flex-row items-center justify-between shadow-sm active:opacity-70",
                      newLeadForm.appointmentDate 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <View className="flex-1">
                      <Text className={cn(
                        "text-base font-medium",
                        newLeadForm.appointmentDate ? "text-gray-900" : "text-red-600"
                      )}>
                        {newLeadForm.appointmentDate 
                          ? new Date(newLeadForm.appointmentDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Tap to select date'
                        }
                      </Text>
                      {newLeadForm.appointmentDate && (
                        <Text className="text-xs text-green-600 mt-1">
                          ✅ Appointment scheduled for {new Date(newLeadForm.appointmentDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                    <View className={cn(
                      "w-10 h-10 rounded-full items-center justify-center ml-3",
                      newLeadForm.appointmentDate ? "bg-blue-500" : "bg-gray-300"
                    )}>
                      <Ionicons 
                        name="calendar" 
                        size={20} 
                        color={newLeadForm.appointmentDate ? "#ffffff" : "#6b7280"} 
                      />
                    </View>
                  </Pressable>
                  {!newLeadForm.appointmentDate ? (
                    <View className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <View className="flex-row items-center">
                        <Ionicons name="alert-circle" size={14} color="#dc2626" />
                        <Text className="text-xs text-red-600 font-medium ml-1">
                          Appointment date is required
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 mt-1">
                        📋 Recording appointment activity for: {new Date(inputDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-blue-600 mt-2">
                      📋 Recording appointment activity for: {new Date(inputDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>

                {/* Appointment Time */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Appointment Time <Text className="text-gray-500 font-normal">(optional)</Text>
                  </Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-3">
                      <Ionicons name="time" size={16} color="#6b7280" />
                    </View>
                    <TextInput
                      value={newLeadForm.appointmentTime}
                      onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, appointmentTime: text }))}
                      placeholder="e.g., 2:00 PM, 10:30 AM"
                      className="flex-1 text-gray-900 text-base"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {/* Appointment Notes */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Appointment Notes <Text className="text-gray-500 font-normal">(optional)</Text>
                  </Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                    <View className="flex-row items-start px-4 py-3">
                      <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-3 mt-1">
                        <Ionicons name="document-text" size={16} color="#6b7280" />
                      </View>
                      <TextInput
                        value={newLeadForm.appointmentNotes}
                        onChangeText={(text) => setNewLeadForm(prev => ({ ...prev, appointmentNotes: text }))}
                        placeholder="Add notes about this appointment..."
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        className="flex-1 text-gray-900 text-base"
                        placeholderTextColor="#9ca3af"
                        style={{ minHeight: 80 }}
                      />
                    </View>
                  </View>
                </View>

                {/* Form Validation Status */}
                {(!newLeadForm.name.trim() || !newLeadForm.appointmentDate) && (
                  <View className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="alert-circle" size={16} color="#d97706" />
                      <Text className="text-amber-800 text-sm font-medium ml-2">
                        {!newLeadForm.name.trim() && !newLeadForm.appointmentDate
                          ? "Name and appointment date are required"
                          : !newLeadForm.name.trim()
                          ? "Name is required to create lead"
                          : "Appointment date is required"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Create Button */}
                <Pressable
                  onPress={handleCreateLead}
                  disabled={!newLeadForm.name.trim() || !newLeadForm.appointmentDate}
                  className={cn(
                    "rounded-xl py-4 items-center shadow-lg",
                    (newLeadForm.name.trim() && newLeadForm.appointmentDate)
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  )}
                >
                  {(newLeadForm.name.trim() && newLeadForm.appointmentDate) ? (
                    <View className="flex-row items-center">
                      <Ionicons name="person-add" size={20} color="white" />
                      <Text className="text-white font-semibold text-base ml-2">
                        Create Lead & Associate
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-gray-500 font-semibold text-base">
                      {!newLeadForm.name.trim() && !newLeadForm.appointmentDate 
                        ? "Enter Name & Select Date"
                        : !newLeadForm.name.trim()
                        ? "Enter Name to Continue"
                        : "Select Date to Continue"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View className="flex-1 bg-black/50 items-center justify-center">
              <View className="bg-white rounded-3xl shadow-2xl mx-6 overflow-hidden" style={{ minWidth: 320, maxWidth: 400 }}>
                {/* Header */}
                <View className="bg-blue-500 px-6 py-4">
                  <Text className="text-xl font-semibold text-white text-center">
                    Select Date
                  </Text>
                  <Text className="text-blue-100 text-center text-sm mt-1">
                    When is the appointment scheduled?
                  </Text>
                </View>
                
                {/* Date Picker */}
                <View className="px-4 py-6 bg-white">
                  <DateTimePicker
                    value={newLeadForm.appointmentDate ? new Date(newLeadForm.appointmentDate) : new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      console.log('📅 DateTimePicker onChange:', event.type, selectedDate);
                      if (selectedDate) {
                        const dateString = selectedDate.toISOString().split('T')[0];
                        console.log('📅 Setting date to:', dateString);
                        setNewLeadForm(prev => ({
                          ...prev,
                          appointmentDate: dateString
                        }));
                      }
                    }}
                    textColor="#000000"
                    style={{ 
                      backgroundColor: 'white',
                    }}
                  />
                </View>
                
                {/* Selected Date Preview */}
                <View className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                  <Text className="text-center text-sm text-gray-600">Selected Date:</Text>
                  <Text className="text-center font-semibold text-gray-900 text-lg">
                    {newLeadForm.appointmentDate 
                      ? new Date(newLeadForm.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : new Date().toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                    }
                  </Text>
                </View>
                
                {/* Action Buttons */}
                <View className="flex-row bg-white">
                  <Pressable
                    onPress={() => {
                      setShowDatePicker(false);
                    }}
                    className="flex-1 py-4 items-center border-r border-gray-200 active:bg-gray-50"
                  >
                    <Text className="text-gray-600 font-semibold text-base">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      // Ensure a date is set if none was selected
                      if (!newLeadForm.appointmentDate) {
                        const today = new Date().toISOString().split('T')[0];
                        console.log('📅 No date selected, setting to today:', today);
                        setNewLeadForm(prev => ({
                          ...prev,
                          appointmentDate: today
                        }));
                      }
                      setShowDatePicker(false);
                    }}
                    className="flex-1 py-4 items-center active:bg-blue-50"
                  >
                    <Text className="text-blue-500 font-semibold text-base">Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};