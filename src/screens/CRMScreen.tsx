import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Linking, Alert, FlatList, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useContractorStore, Lead } from '../state/contractorStore';
import { useAuthStore } from '../state/authStore';
import { FollowUpReminderModal } from '../components/FollowUpReminder';
import { FollowUpDashboard } from '../components/FollowUpDashboard';
import { LeadFilterSettingsModal } from '../components/LeadFilterSettingsModal';
import { useLeadFilterStore } from '../state/leadFilterStore';
import { getVisibleStatusOptions } from '../utils/stageVisibility';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { supabase } from '../config/supabase';
import { supabaseService } from '../services/supabaseService';
import { WorkingSimpleLeadsFilterSheet } from '../components/WorkingSimpleLeadsFilterSheet';
import { useWorkingSimpleLeadsFilters } from '../hooks/useWorkingSimpleLeadsFilters';
import { fetchWorkingSimpleFilteredLeads } from '../services/workingSimpleLeadsFilterService';

import { LeadStage, ProgressionStage, getOrderedStages, getStageByKey } from '../types/pipeline';

type PipelineStage = ProgressionStage;

// Communication functions
const handleCall = (phone: string) => {
  if (!phone || phone.trim() === '') {
    Alert.alert('No Phone Number', 'This lead does not have a phone number.');
    return;
  }
  const phoneNumber = phone.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${phoneNumber}`);
};

const handleText = (phone: string) => {
  if (!phone || phone.trim() === '') {
    Alert.alert('No Phone Number', 'This lead does not have a phone number.');
    return;
  }
  const phoneNumber = phone.replace(/[^\d+]/g, '');
  Linking.openURL(`sms:${phoneNumber}`);
};

const handleEmail = (email: string) => {
  if (!email || email.trim() === '') {
    Alert.alert('No Email', 'This lead does not have an email address.');
    return;
  }
  Linking.openURL(`mailto:${email}`);
};

const handleDirections = async (address: string) => {
  if (!address || address.trim() === '') {
    Alert.alert('No Address', 'This lead does not have an address.');
    return;
  }
  
  const encodedAddress = encodeURIComponent(address.trim());
  
  // Try Apple Maps first (iOS)
  const appleMapsUrl = `maps://?q=${encodedAddress}`;
  const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);
  
  if (canOpenAppleMaps) {
    Linking.openURL(appleMapsUrl);
  } else {
    // Fallback to Google Maps web
    const googleMapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
    Linking.openURL(googleMapsUrl);
  }
};

interface LeadCardProps {
  lead: Lead;
  onPress: () => void;
  onStatusChange: (leadId: string, newStatus: Lead['highestStageReached']) => Promise<void>;
  onFollowUpPress: (lead: Lead) => void;
  onCancellationChange?: (leadId: string, cancellationStatus: string | null, isCancelled: boolean) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onPress, onStatusChange, onFollowUpPress, onCancellationChange, updateLead }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { settings: filterSettings } = useLeadFilterStore();

  const getStatusConfig = (status: Lead['status']) => {
    const configs = {
      new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'person-add' as const },
      contacted: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'call' as const },
      appointment_set: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'calendar' as const },
      appointment_held: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'checkmark-circle' as const },
      negotiation: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'chatbubbles' as const },
      signed_deal: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'document-text' as const },
      site_survey_scheduled: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'location' as const },
      site_survey_completed: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'clipboard' as const },
      change_order_required: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'construct' as const },
      submitted_for_permits: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'document-text' as const },
      permits_approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'checkmark-done-circle' as const },
      install_scheduled: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'calendar' as const },
      installed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'trophy' as const },
      lost: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'close-circle' as const },
      held_not_interested: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'close-outline' as const },
      cancelled_appointment: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'calendar-outline' as const },
      unqualified: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: 'ban' as const },
      cancelled_contract: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'close-circle' as const },
    };
    return configs[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Use cancellation status for display if the lead is cancelled, otherwise use pipeline status
  const displayStatus = lead.isCancelled && lead.cancellationStatus ? lead.cancellationStatus : lead.status;
  const statusConfig = getStatusConfig(displayStatus);
  // Organized status groups for the modal
  // Get visible pipeline statuses based on filter settings
  const visibleStatusOptions = getVisibleStatusOptions(filterSettings);
  const pipelineStatuses: PipelineStage[] = visibleStatusOptions.progressionStages.map(stage => stage.key as PipelineStage);
  const pipelineStageSet = new Set<PipelineStage>([
    'new',
    'contacted',
    'appointment_set',
    'appointment_held',
    'negotiation',
    'signed_deal',
    'site_survey_scheduled',
    'site_survey_completed',
    'change_order_required',
    'submitted_for_permits',
    'permits_approved',
    'install_scheduled',
    'installed',
  ]);
  // Defensive: if pipelineStageSet is undefined, default to empty Set
  const safePipelineStageSet = pipelineStageSet || new Set<PipelineStage>();
  const filteredPipelineStatuses = pipelineStatuses.filter(s => safePipelineStageSet.has(s as PipelineStage));
  const filteredPreCompletedStages = (lead.selectedPipelineStages || []).filter(s => safePipelineStageSet.has(s as PipelineStage));

  // Move these definitions just before filteredPipelineStatuses and filteredPreCompletedStages:
  const allCancellationOptions = [
    { key: 'cancelled_appointment', title: 'Cancelled Appointment', icon: 'calendar-outline' },
    { key: 'held_not_interested', title: 'Held But Not Interested', icon: 'close-outline' },
    { key: 'unqualified', title: 'Unqualified Lead', icon: 'ban' },
    { key: 'cancelled_contract', title: 'Cancelled Contract', icon: 'close-circle' },
  ];
  const cancellationOptions = allCancellationOptions.filter(option =>
    visibleStatusOptions.lostReasons.some(lostReason => lostReason.key === option.key)
  );

  // Update getStageIndex and getPreCompletedIndex to use PipelineStage
  const getStageIndex = (status: PipelineStage) => {
    return pipelineStatuses.indexOf(status);
  };
  const getPreCompletedIndex = (stage: PipelineStage) => {
    const preCompletedIndices = filteredPreCompletedStages.map((s: PipelineStage) => getStageIndex(s)).filter((i: number) => i !== -1);
    return Math.max(-1, ...preCompletedIndices);
  };

  return (
    <>
      <Pressable
        onPress={onPress}
        className="bg-white rounded-xl p-3 mb-2 shadow-sm border border-gray-100 active:scale-98"
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-gray-900 mb-0.5" numberOfLines={1}>{lead.name}</Text>
            <Text className="text-sm text-gray-600 mb-0.5" numberOfLines={1}>{lead.company}</Text>
            
            {/* Contact Details */}
            {lead.email && (
              <View className="flex-row items-center mb-0.5">
                <Ionicons name="mail-outline" size={12} color="#6b7280" />
                <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>{lead.email}</Text>
              </View>
            )}
            
            {lead.phone && (
              <View className="flex-row items-center mb-0.5">
                <Ionicons name="call-outline" size={12} color="#6b7280" />
                <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>{lead.phone}</Text>
              </View>
            )}
            
            {/* Address Information */}
            {(() => {
              let address = lead.address;
              // If no direct address, try to extract from notes
              if (!address && lead.notes.includes('Address:')) {
                const addressMatch = lead.notes.match(/Address: ([^\n]+)/);
                address = addressMatch ? addressMatch[1] : undefined;
              }
              
              if (address && address !== 'Not provided' && address !== 'Not specified') {
                return (
                  <View className="flex-row items-center mb-0.5">
                    <Ionicons name="location-outline" size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>{address}</Text>
                  </View>
                );
              }
              return null;
            })()}
            
            
            
            {/* Appointment Status */}
            {lead.appointmentDate && (() => {
              const appointmentDate = new Date(lead.appointmentDate);
              const isValidDate = !isNaN(appointmentDate.getTime());
              
              return (
                <View className="flex-row items-center mt-1">
                  <Ionicons 
                    name={lead.appointmentStatus === 'held' ? 'checkmark-circle' : 
                          lead.appointmentStatus === 'scheduled' ? 'calendar' : 
                          lead.appointmentStatus === 'signed' ? 'document-text' :
                          lead.appointmentStatus === 'cancelled' ? 'close-circle' : 'time'} 
                    size={12} 
                    color={lead.appointmentStatus === 'held' ? '#10b981' : 
                           lead.appointmentStatus === 'scheduled' ? '#3b82f6' : 
                           lead.appointmentStatus === 'signed' ? '#059669' :
                           lead.appointmentStatus === 'cancelled' ? '#ef4444' : '#f59e0b'} 
                  />
                  <Text className="text-xs text-gray-600 ml-1">
                    {lead.appointmentStatus === 'scheduled' ? 'Apt: ' : 
                     lead.appointmentStatus === 'held' ? 'Held: ' : 
                     lead.appointmentStatus === 'signed' ? 'Signed: ' :
                     lead.appointmentStatus === 'cancelled' ? 'Cancelled: ' : 'Apt: '}
                    {isValidDate ? appointmentDate.toLocaleDateString() : 'No Date Inputted'}
                    {lead.appointmentTime ? ` at ${lead.appointmentTime}` : ' (no time)'}
                  </Text>
                </View>
              );
            })()}
            
            {/* Pipeline Progress Indicator */}
            {(lead.selectedPipelineStages && lead.selectedPipelineStages.length > 0) && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="trending-up" size={12} color="#10b981" />
                <Text className="text-xs text-gray-600 ml-1">
                  Pipeline: {lead.selectedPipelineStages.map(stage => {
                    switch(stage) {
                      case 'new': return 'New';
                      case 'contacted': return 'Contacted';
                      case 'appointment_set': return 'Apt Set';
                      case 'appointment_held': return 'Apt Held';
                      case 'negotiation': return 'Negotiation';
                      default: return stage;
                    }
                  }).join(' → ')}
                </Text>
              </View>
            )}
          </View>
          <View className="items-end">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {formatCurrency((lead.revenue?.guaranteedRevenue || 0) + (lead.revenue?.pipelineRevenue || 0) || lead.value)}
            </Text>
            {lead.revenue && (
              <View className="flex-row space-x-2 mb-1">
                {lead.revenue.guaranteedRevenue > 0 && (
                  <Pressable
                    onPress={async (e) => {
                      e.stopPropagation();
                      // Toggle guaranteed paid out status
                      const newGuaranteedPaidOut = !lead.revenue!.guaranteedPaidOut;
                      const newPaidOutRevenue = (newGuaranteedPaidOut ? lead.revenue!.guaranteedRevenue : 0) + 
                                              (lead.revenue!.pipelinePaidOut ? lead.revenue!.pipelineRevenue : 0);
                      
                      // Update in store
                      await updateLead(lead.id, {
                        revenue: {
                          ...lead.revenue!,
                          guaranteedPaidOut: newGuaranteedPaidOut,
                          paidOutRevenue: newPaidOutRevenue
                        }
                      });
                    }}
                    className="bg-green-50 px-2 py-0.5 rounded flex-row items-center"
                  >
                    <Text className="text-xs text-green-700 font-medium">
                      G: {formatCurrency(lead.revenue.guaranteedRevenue)}
                    </Text>
                    <View className={cn(
                      "w-3 h-3 rounded border ml-1 items-center justify-center",
                      lead.revenue.guaranteedPaidOut ? "bg-green-500 border-green-500" : "border-green-300"
                    )}>
                      {lead.revenue.guaranteedPaidOut && (
                        <Ionicons name="checkmark" size={8} color="white" />
                      )}
                    </View>
                  </Pressable>
                )}
                {lead.revenue.pipelineRevenue > 0 && (
                  <Pressable
                    onPress={async (e) => {
                      e.stopPropagation();
                      // Toggle pipeline paid out status
                      const newPipelinePaidOut = !lead.revenue!.pipelinePaidOut;
                      const newPaidOutRevenue = (lead.revenue!.guaranteedPaidOut ? lead.revenue!.guaranteedRevenue : 0) + 
                                              (newPipelinePaidOut ? lead.revenue!.pipelineRevenue : 0);
                      
                      // Update in store
                      await updateLead(lead.id, {
                        revenue: {
                          ...lead.revenue!,
                          pipelinePaidOut: newPipelinePaidOut,
                          paidOutRevenue: newPaidOutRevenue
                        }
                      });
                    }}
                    className="bg-blue-50 px-2 py-0.5 rounded flex-row items-center"
                  >
                    <Text className="text-xs text-blue-700 font-medium">
                      P: {formatCurrency(lead.revenue.pipelineRevenue)}
                    </Text>
                    <View className={cn(
                      "w-3 h-3 rounded border ml-1 items-center justify-center",
                      lead.revenue.pipelinePaidOut ? "bg-blue-500 border-blue-500" : "border-blue-300"
                    )}>
                      {lead.revenue.pipelinePaidOut && (
                        <Ionicons name="checkmark" size={8} color="white" />
                      )}
                    </View>
                  </Pressable>
                )}
                {lead.revenue.paidOutRevenue > 0 && (
                  <View className="bg-emerald-50 px-2 py-0.5 rounded">
                    <Text className="text-xs text-emerald-700 font-medium">
                      $: {formatCurrency(lead.revenue.paidOutRevenue)}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setShowStatusMenu(true);
              }}
              className={cn("px-2 py-1 rounded-full border flex-row items-center", statusConfig.bg, statusConfig.border)}
            >
              <Ionicons name={statusConfig.icon} size={10} color="#374151" />
              <Text className={cn("text-xs font-medium ml-1", statusConfig.text)}>
                {displayStatus === 'new' ? 'New Lead' : 
                 displayStatus === 'contacted' ? 'Contacted' :
                 displayStatus === 'appointment_set' ? 'Appointment Set' :
                 displayStatus === 'appointment_held' ? 'Appointment Held' :
                 displayStatus === 'negotiation' ? 'In Negotiation' :
                 displayStatus === 'signed_deal' ? 'Signed Deal' :
                 displayStatus === 'site_survey_scheduled' ? 'Site Survey Scheduled' :
                 displayStatus === 'site_survey_completed' ? 'Site Survey Completed' :
                 displayStatus === 'change_order_required' ? 'Change Order Required' :
                 displayStatus === 'submitted_for_permits' ? 'Submitted for Permits' :
                 displayStatus === 'permits_approved' ? 'Permits Approved' :
                 displayStatus === 'install_scheduled' ? 'Install Scheduled' :
                 displayStatus === 'installed' ? 'Install Completed' :
                 displayStatus === 'cancelled_appointment' ? 'Cancelled Appointment' :
                 displayStatus === 'held_not_interested' ? 'Held Not Interested' :
                 displayStatus === 'unqualified' ? 'Unqualified' :
                 displayStatus === 'cancelled_contract' ? 'Cancelled Contract' :
                 typeof displayStatus === 'string'
                   ? (displayStatus as string).replace(/_/g, ' ').split(' ').map(word => 
                       word.charAt(0).toUpperCase() + word.slice(1)
                     ).join(' ')
                   : ''}
              </Text>
              <Ionicons name="chevron-down" size={10} color="#374151" className="ml-0.5" />
            </Pressable>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="flex-row flex-wrap items-center justify-center pt-3 pb-1 gap-2">
          {lead.phone && (
            <>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleCall(lead.phone);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="flex-row items-center px-2 py-1.5 bg-green-50 rounded-lg border border-green-200 active:bg-green-100"
              >
                <Ionicons name="call" size={10} color="#059669" />
                <Text className="text-xs text-green-700 ml-0.5 font-medium">Call</Text>
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleText(lead.phone);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="flex-row items-center px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-200 active:bg-blue-100"
              >
                <Ionicons name="chatbubble" size={10} color="#2563eb" />
                <Text className="text-xs text-blue-700 ml-0.5 font-medium">Text</Text>
              </Pressable>
            </>
          )}
          {lead.email && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleEmail(lead.email);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="flex-row items-center px-2 py-1.5 bg-purple-50 rounded-lg border border-purple-200 active:bg-purple-100"
            >
              <Ionicons name="mail" size={10} color="#7c3aed" />
              <Text className="text-xs text-purple-700 ml-0.5 font-medium">Email</Text>
            </Pressable>
          )}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              // Add haptic feedback on iOS
              if (Platform.OS === 'ios') {
                // Use Haptics API for iOS
                import('expo-haptics').then((Haptics) => {
                  Haptics.default.impactAsync(Haptics.default.ImpactFeedbackStyle.Light);
                }).catch(() => {
                  // Fallback if haptics not available
                });
              }
              onFollowUpPress(lead);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="flex-row items-center px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-300 active:bg-yellow-100 active:scale-95"
          >
            <Ionicons name="alarm" size={12} color="#d97706" />
            <Text className="text-xs text-yellow-700 ml-1 font-semibold">
              Follow-up ({(lead.followUpReminders || []).filter(r => !r.completed).length})
            </Text>
          </Pressable>
          {(lead.address || lead.company) && (
            <Pressable
              onPress={async (e) => {
                e.stopPropagation();
                const addressToUse = lead.address || lead.company;
                // If company field contains address info, extract it from notes
                if (!lead.address && lead.notes.includes('Address:')) {
                  const addressMatch = lead.notes.match(/Address: ([^\n]+)/);
                  const extractedAddress = addressMatch ? addressMatch[1] : lead.company;
                  await handleDirections(extractedAddress !== 'Not provided' ? extractedAddress : lead.company);
                } else {
                  await handleDirections(addressToUse);
                }
              }}
              className="flex-row items-center px-1.5 py-1 bg-orange-50 rounded border border-orange-200"
            >
              <Ionicons name="navigate" size={10} color="#ea580c" />
              <Text className="text-xs text-orange-700 ml-0.5 font-medium">Directions</Text>
            </Pressable>
          )}
        </View>
        
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <View className="flex-row items-center px-2 py-1 bg-gray-50 rounded-md border border-gray-200">
              <Text className="text-xs">
                {lead.source === 'door_knocks' ? '🚪' :
                 lead.source === 'tags_put' ? '🏷️' :
                 lead.source === 'calls_made' ? '📞' :
                 lead.source === 'referrals' ? '👥' :
                 lead.source === 'inbound' ? '🌐' : '📋'}
              </Text>
              <Text className="text-xs text-gray-600 ml-1 font-medium">
                {lead.source === 'door_knocks' ? 'Door Knocks' :
                 lead.source === 'tags_put' ? 'Marketing Tags' :
                 lead.source === 'calls_made' ? 'Cold Calls' :
                 lead.source === 'referrals' ? 'Referrals' :
                 lead.source === 'inbound' ? 'Inbound' : 'Other'}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500">
              {(() => {
                // Use actual database fields first, fallback to parsing from notes
                const dateSet = lead.dateSet || (() => {
                  const dateSetMatch = lead.notes.match(/Date Set: ([^\n]+)/);
                  return dateSetMatch ? dateSetMatch[1] : null;
                })();
                
                const dateSetFor = lead.dateSetFor || (() => {
                  const dateSetForMatch = lead.notes.match(/Date Set For: ([^\n]+)/);
                  return dateSetForMatch ? dateSetForMatch[1] : null;
                })();
                
                // Helper function to format date safely
                const formatDateSafely = (dateString: string | null) => {
                  if (!dateString) return null;
                  try {
                    // Handle different date formats
                    let date: Date;
                    
                    // If it's already in YYYY-MM-DD format, create date directly
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                      // Create date in local timezone to avoid timezone issues
                      const [year, month, day] = dateString.split('-').map(Number);
                      date = new Date(year, month - 1, day); // month is 0-indexed
                    } else {
                      date = new Date(dateString);
                    }
                    
                    if (isNaN(date.getTime())) {
                      console.error('Invalid date:', dateString);
                      return null;
                    }
                    
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                  } catch (error) {
                    console.error('Error formatting date:', dateString, error);
                    return null;
                  }
                };
                
                const formattedDateSet = formatDateSafely(dateSet);
                const formattedDateSetFor = formatDateSafely(dateSetFor);
                
                // If both dates are null, show "No Date"
                if (!formattedDateSet && !formattedDateSetFor) {
                  return 'No Date';
                }
                
                // Build the display string
                let displayText = '';
                if (formattedDateSet) {
                  displayText += `Date Set: ${formattedDateSet}`;
                }
                if (formattedDateSetFor) {
                  if (displayText) displayText += '\n';
                  displayText += `Date Set For: ${formattedDateSetFor}`;
                }
                
                return displayText;
              })()}
            </Text>
          </View>
        </View>
        
        {/* Additional Notes Display */}
        {(() => {
          // Extract non-system notes (not Date Set, Date Set For, Address)
          const notesLines = lead.notes.split('\n').filter(line => 
            line.trim() && 
            !line.startsWith('Address:') && 
            !line.startsWith('Date Set:') && 
            !line.startsWith('Date Set For:')
          );
          
          if (notesLines.length > 0) {
            return (
              <View className="pt-2 border-t border-gray-50">
                <View className="flex-row items-start">
                  <Ionicons name="document-text-outline" size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-600 ml-1 flex-1" numberOfLines={2}>
                    {notesLines.join(' ').trim()}
                  </Text>
                </View>
              </View>
            );
          }
          return null;
        })()}

        {/* Next Follow-up Indicator */}
        {lead.nextFollowUp && (() => {
          const followUpDate = new Date(lead.nextFollowUp);
          const isValidDate = !isNaN(followUpDate.getTime());
          
          return (
            <View className="flex-row items-center pt-2">
              <Ionicons name="alarm" size={12} color="#f59e0b" />
              <Text className="text-xs text-gray-600 ml-1">
                Next follow-up: {isValidDate ? followUpDate.toLocaleDateString() : 'No Date Inputted'} at{' '}
                {isValidDate ? followUpDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Time Inputted'}
              </Text>
            </View>
          );
        })()}
      </Pressable>

      {/* Status Change Modal */}
      <Modal
        key={`modal-${lead.id}`}
        visible={showStatusMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusMenu(false)}
      >
        <Pressable 
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowStatusMenu(false)}
        >
          <Animated.View 
            entering={FadeInDown}
            exiting={FadeOutUp}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Update Lead Status
            </Text>
            <Text className="text-sm text-gray-600 mb-4 text-center">
              {lead.name} - {lead.company}
            </Text>
            
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {/* Pipeline Progress Section */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 mb-3 px-1">Pipeline Progress (KPI Tracking)</Text>
                
                {visibleStatusOptions.progressionStages.length === 0 ? (
                  <View className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="warning" size={16} color="#d97706" />
                      <Text className="text-amber-800 font-medium ml-2 text-sm">No Pipeline Stages Available</Text>
                    </View>
                    <Text className="text-amber-700 text-xs">
                      All pipeline stages are currently hidden in your Filter Settings. Please enable at least one stage to update this lead's status.
                    </Text>
                  </View>
                ) : (() => {
                  const getStageIndex = (status: PipelineStage) => {
                    return pipelineStatuses.indexOf(status);
                  };
                  
                  // Always provide a fallback value for status
                  const safeStatus: PipelineStage = (lead.status as PipelineStage) || 'new';
                  // Use safeStatus everywhere status is used in function calls or array lookups
                  const currentStageIndex = getStageIndex(safeStatus);
                  const highestReachedIndex = lead.highestStageReached ? getStageIndex(lead.highestStageReached as PipelineStage) : currentStageIndex;
                  
                  // Consider stages completed if they were pre-selected during lead creation
                  const preCompletedStages = lead.selectedPipelineStages || [];
                  const getPreCompletedIndex = (stage: PipelineStage) => {
                    const preCompletedIndices = filteredPreCompletedStages.map((s: PipelineStage) => getStageIndex(s)).filter((i: number) => i !== -1);
                    return Math.max(-1, ...preCompletedIndices);
                  };
                  const preCompletedHighestIndex = getPreCompletedIndex(safeStatus);
                  
                  return visibleStatusOptions.progressionStages.map((statusObj, index) => {
                    const status = statusObj.key as PipelineStage;
                    const config = getStatusConfig(status);
                    const stageIndex = getStageIndex(status);
                    // A stage is completed if it's been reached, was pre-completed, or is before the current stage
                    const maxReachedIndex = Math.max(currentStageIndex, highestReachedIndex, preCompletedHighestIndex);
                    const isCompleted = stageIndex <= maxReachedIndex && stageIndex < currentStageIndex;
                    const isCurrent = status === lead.status;
                    const isUpcoming = stageIndex > maxReachedIndex;
                    const wasPreCompleted = filteredPreCompletedStages.includes(status);
                    
                    return (
                      <Pressable
                        key={`stage-${lead.id}-${status}`}
                        onPress={async () => {
                          // Update both current status and highest stage reached
                          await onStatusChange(lead.id, status);
                          // Don't close modal - let user continue updating
                        }}
                        className={cn(
                          "flex-row items-center p-4 rounded-xl border mb-3",
                          isCompleted && !isCurrent ? "bg-green-50 border-green-200" :
                          isCurrent ? `${config.bg} ${config.border}` :
                          "bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Progress Indicator */}
                        <View className={cn(
                          "w-6 h-6 rounded-full items-center justify-center mr-3",
                          isCompleted && !isCurrent ? "bg-green-500" :
                          isCurrent ? "bg-blue-500" :
                          "bg-gray-300"
                        )}>
                          {isCompleted && !isCurrent ? (
                            <Ionicons name="checkmark" size={14} color="white" />
                          ) : isCurrent ? (
                            <Ionicons name="radio-button-on" size={14} color="white" />
                          ) : (
                            <Text className="text-xs font-bold text-white">{index + 1}</Text>
                          )}
                        </View>
                        
                        <View className="flex-1">
                          <Text className={cn(
                            "font-medium text-sm",
                            isCompleted && !isCurrent ? "text-green-700" :
                            isCurrent ? config.text :
                            "text-gray-700"
                          )}>
                            {status === 'new' ? 'New Lead' : 
                             status === 'contacted' ? 'Contacted' :
                             status === 'appointment_set' ? 'Appointment Set' :
                             status === 'appointment_held' ? 'Appointment Held' :
                             status === 'negotiation' ? 'In Negotiation' :
                             status === 'signed_deal' ? 'Signed Deal' :
                             status === 'site_survey_scheduled' ? 'Site Survey Scheduled' :
                             status === 'site_survey_completed' ? 'Site Survey Completed' :
                             status === 'change_order_required' ? 'Change Order Required' :
                             status === 'submitted_for_permits' ? 'Submitted for Permits' :
                             status === 'permits_approved' ? 'Permits Approved' :
                             status === 'install_scheduled' ? 'Install Scheduled' :
                             status === 'installed' ? 'Install Completed' :
                             (String(status).replace(/_/g, ' ').split(' ').map(word => 
                               word.charAt(0).toUpperCase() + word.slice(1)
                             ).join(' '))}
                          </Text>
                          {isCompleted && !isCurrent && (
                            <Text className="text-xs text-green-600">
                              ✓ {wasPreCompleted ? 'Pre-completed' : 'Completed'}
                            </Text>
                          )}
                          {isCurrent && (
                            <Text className="text-xs text-blue-600">● Current Stage</Text>
                          )}
                          {isUpcoming && (
                            <Text className="text-xs text-gray-500">○ Upcoming</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  });
                })()}
              </View>

              {/* Cancellation Status Section */}
              {(visibleStatusOptions.progressionStages.length > 0 || cancellationOptions.length > 0) && (
                <View className="border-t border-gray-200 pt-4">
                  <Text className="text-sm font-semibold text-gray-500 mb-3 px-1">Cancellation Status (Optional)</Text>
                  <Text className="text-xs text-gray-400 mb-3 px-1">Mark as cancelled while preserving pipeline progress for KPI tracking</Text>
                  
                  {cancellationOptions.length === 0 ? (
                    <View className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <Text className="text-gray-600 text-xs text-center">
                        No cancellation options available (all hidden in Filter Settings)
                      </Text>
                    </View>
                  ) : (() => {
                  return cancellationOptions.map((option, index) => {
                    const isSelected = lead.cancellationStatus === option.key;
                    
                    return (
                      <Pressable
                        key={`cancellation-${lead.id}-${option.key}`}
                        onPress={async () => {
                          if (onCancellationChange) {
                            await onCancellationChange(
                              lead.id, 
                              isSelected ? null : option.key, 
                              !isSelected
                            );
                          }
                          setShowStatusMenu(false);
                        }}
                        className={cn(
                          "flex-row items-center p-3 rounded-xl border mb-2",
                          isSelected ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Progress Indicator matching in-process design */}
                        <View className={cn(
                          "w-6 h-6 rounded-full items-center justify-center mr-3",
                          isSelected ? "bg-red-500" : "bg-gray-300"
                        )}>
                          {isSelected ? (
                            <Ionicons name="checkmark" size={14} color="white" />
                          ) : (
                            <Text className="text-xs font-bold text-white">{index + 1}</Text>
                          )}
                        </View>
                        
                        <View className="flex-1">
                          <Text className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-red-700" : "text-gray-700"
                          )}>
                            {option.title}
                          </Text>
                          {isSelected && (
                            <Text className="text-xs text-red-600">● Cancelled Reason</Text>
                          )}
                          {!isSelected && (
                            <Text className="text-xs text-gray-500">○ Available</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  });
                })()}
                </View>
              )}
            </ScrollView>
            
            <Pressable
              onPress={() => setShowStatusMenu(false)}
              className="mt-4 bg-gray-100 px-4 py-3 rounded-xl"
            >
              <Text className="text-gray-700 font-medium text-center">Cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

interface FilterTabProps {
  title: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ title, count, isActive, onPress }) => (
  <Pressable
    onPress={onPress}
    className={cn(
      "px-3 py-2 rounded-lg mr-2 border items-center justify-center",
      isActive ? "bg-blue-500 border-blue-500" : "bg-white border-gray-200"
    )}
    style={{ width: 90, minHeight: 56 }}
  >
    <Text className={cn(
      "text-xs font-semibold text-center",
      isActive ? "text-white" : "text-gray-700"
    )} numberOfLines={2}>
      {title}
    </Text>
    <Text className={cn(
      "text-xs mt-0.5 text-center",
      isActive ? "text-blue-100" : "text-gray-500"
    )}>
      {count}
    </Text>
  </Pressable>
);

export const CRMScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leads, getLeadsByStatus, updateLead, syncWithSupabase, currentUserId } = useContractorStore();
  const { user } = useAuthStore();
  const { settings: filterSettings } = useLeadFilterStore();
  const [activeFilter, setActiveFilter] = useState<Lead['status'] | 'all' | 'follow-ups' | 'cancelled_appointment' | 'held_not_interested' | 'unqualified' | 'cancelled_contract' | 'in_process_divider' | 'cancelled_divider'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline' | 'follow-ups'>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'dateAdded' | 'name' | 'revenue'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const { filters: workingSimpleFilters, hasActiveFilters, getActiveFilterCount, updateFilter } = useWorkingSimpleLeadsFilters();
  
  // Use searchQuery from filters instead of local state
  const searchQuery = workingSimpleFilters.searchQuery;
  const setSearchQuery = (query: string) => {
    updateFilter('searchQuery', query);
  };
  const [serverFilteredLeads, setServerFilteredLeads] = useState<Lead[]>([]);
  const [serverFilteredRevenue, setServerFilteredRevenue] = useState({
    guaranteed: 0,
    pipeline: 0,
    paidOut: 0,
    total: 0,
  });

  // Debug logs for leads and filters
  console.log('[CRM] currentUserId from store:', currentUserId);
  console.log('[CRM] leads from state:', leads);
  console.log('[CRM] getLeadsByStatus("new"):', getLeadsByStatus('new'));
  console.log('[CRM] getLeadsByStatus("contacted"):', getLeadsByStatus('contacted'));
  console.log('[CRM] getLeadsByStatus("appointment_set"):', getLeadsByStatus('appointment_set'));
  console.log('[CRM] getLeadsByStatus("appointment_held"):', getLeadsByStatus('appointment_held'));
  console.log('[CRM] getLeadsByStatus("negotiation"):', getLeadsByStatus('negotiation'));
  console.log('[CRM] getLeadsByStatus("signed_deal"):', getLeadsByStatus('signed_deal'));
  console.log('[CRM] getLeadsByStatus("installed"):', getLeadsByStatus('installed'));
  console.log('[CRM] getLeadsByStatus("cancelled_appointment"):', getLeadsByStatus('cancelled_appointment'));
  console.log('[CRM] getLeadsByStatus("held_not_interested"):', getLeadsByStatus('held_not_interested'));
  console.log('[CRM] getLeadsByStatus("unqualified"):', getLeadsByStatus('unqualified'));
  console.log('[CRM] getLeadsByStatus("cancelled_contract"):', getLeadsByStatus('cancelled_contract'));
  console.log('[CRM] activeFilter:', activeFilter);
  


  // Move fetchLeads out so it can be reused
  const fetchLeads = async () => {
    // Always use the real user ID from store or auth
    let userId = useContractorStore.getState().currentUserId || user?.id;

    console.log('[CRM] fetchLeads called. userId:', userId);
    console.log('[CRM] currentUserId from store:', useContractorStore.getState().currentUserId);
    console.log('[CRM] user?.id from auth store:', user?.id);
    console.log('[CRM] user?.email:', user?.email);

    if (!userId) {
      console.log('[CRM] fetchLeads aborted: userId is null or undefined');
      return;
    }
    
    try {
      console.log('[CRM] Fetching leads using supabaseService for user_id:', userId);
      const leads = await supabaseService.getLeads(userId);
      
      console.log('[CRM] Leads fetched from supabaseService:', leads.length, 'leads');
      if (leads.length > 0) {
        console.log('[CRM] First lead sample:', leads[0]);
        console.log('[CRM] First lead dateSet:', leads[0].dateSet);
        console.log('[CRM] First lead dateSetFor:', leads[0].dateSetFor);
        

      }
      
      // Update the store properly through the loadUserData method
      await useContractorStore.getState().loadUserData(userId);
      console.log('[CRM] Leads loaded in store successfully');
    } catch (error) {
      console.error('[CRM] Exception in fetchLeads:', error);
    }
  };

  // Add this useEffect to always fetch leads when currentUserId changes (after login)
  useEffect(() => {
    const userId = currentUserId || user?.id;
    console.log('[CRM] useEffect triggered. currentUserId:', currentUserId, 'user?.id:', user?.id, 'final userId:', userId);
    if (userId) {
      console.log('[CRM] Fetching leads for user:', userId);
      fetchLeads();
    } else {
      console.log('[CRM] Not fetching leads: no userId available');
    }
  }, [currentUserId, user?.id]);

  // Add useFocusEffect to ensure data is fetched when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const userId = currentUserId || user?.id;
      console.log('[CRM] useFocusEffect triggered. currentUserId:', currentUserId, 'user?.id:', user?.id, 'final userId:', userId);
      if (userId) {
        console.log('[CRM] Fetching leads on screen focus for user:', userId);
        fetchLeads();
      }
    }, [currentUserId, user?.id])
  );

  // Manual trigger to fetch leads on component mount if not already triggered
  useEffect(() => {
    const timer = setTimeout(() => {
      const userId = currentUserId || user?.id;
      if (userId && leads.length === 0) {
        console.log('[CRM] Manual trigger: fetching leads after delay for user:', userId);
        fetchLeads();
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [currentUserId, user?.id, leads.length]);

  // Immediate trigger when currentUserId is available
  useEffect(() => {
    if (currentUserId && leads.length === 0) {
      console.log('[CRM] Immediate trigger: currentUserId available, fetching leads for:', currentUserId);
      fetchLeads();
    }
  }, [currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  // Function to fetch filtered leads from server
  const fetchFilteredLeadsFromServer = async () => {
    const userId = currentUserId || user?.id;
    if (!userId) {
      console.log('[CRM] No userId available for server filtering');
      return;
    }

    console.log('[CRM] Fetching server filtered leads with filters:', workingSimpleFilters);
    try {
      const result = await fetchWorkingSimpleFilteredLeads(userId, workingSimpleFilters);
      console.log('[CRM] Server filtering result:', result.leads.length, 'leads');
      setServerFilteredLeads(result.leads);
      setServerFilteredRevenue(result.kpis);
    } catch (error) {
      console.error('[CRM] Error fetching filtered leads:', error);
    }
  };

  // Fetch filtered leads when filters change (including search query)
  useEffect(() => {
    if (hasActiveFilters()) {
      fetchFilteredLeadsFromServer();
    } else {
      // Reset to show all leads when no filters are active
      setServerFilteredLeads([]);
      setServerFilteredRevenue({
        guaranteed: 0,
        pipeline: 0,
        paidOut: 0,
        total: 0,
      });
    }
  }, [workingSimpleFilters, currentUserId, user?.id]);

  // Refresh server filtered leads when leads are updated (for real-time updates during search)
  useEffect(() => {
    if (hasActiveFilters() && leads.length > 0) {
      fetchFilteredLeadsFromServer();
    }
  }, [leads]);

  const handleApplyFilters = (newFilters: any) => {
    console.log('[CRM] Applying filters:', newFilters);
    console.log('[CRM] Current filters before update:', workingSimpleFilters);
    
    // Update the filter state with the new filters
    updateFilter('searchQuery', newFilters.searchQuery);
    updateFilter('timePeriod', newFilters.timePeriod);
    updateFilter('customStartDate', newFilters.customStartDate);
    updateFilter('customEndDate', newFilters.customEndDate);
    updateFilter('dateField', newFilters.dateField);
    updateFilter('sources', newFilters.sources);
    updateFilter('status', newFilters.status);
    updateFilter('sortBy', newFilters.sortBy);
    updateFilter('sortOrder', newFilters.sortOrder);
    
    console.log('[CRM] Filters updated, triggering refetch...');
    
    // Trigger a refetch with the new filters
    fetchFilteredLeadsFromServer();
  };

  const inProcessStages = [
    { key: 'new' as const, title: 'New Leads', color: 'blue' },
    { key: 'contacted' as const, title: 'Contacted', color: 'yellow' },
    { key: 'appointment_set' as const, title: 'Set', color: 'green' },
    { key: 'appointment_held' as const, title: 'Held', color: 'purple' },
    { key: 'negotiation' as const, title: 'Negotiation', color: 'indigo' },
    { key: 'signed_deal' as const, title: 'Signed Deal', color: 'emerald' },
    { key: 'site_survey_scheduled' as const, title: 'Survey Scheduled', color: 'teal' },
    { key: 'site_survey_completed' as const, title: 'Survey', color: 'cyan' },
    { key: 'change_order_required' as const, title: 'Change Order', color: 'amber' },
    { key: 'submitted_for_permits' as const, title: 'Permits Submitted', color: 'blue' },
    { key: 'permits_approved' as const, title: 'Permits Approved', color: 'green' },
    { key: 'install_scheduled' as const, title: 'Install Scheduled', color: 'orange' },
    { key: 'installed' as const, title: 'Serviced', color: 'green' },
  ];

  const cancelledStages = [
    { key: 'cancelled_appointment' as const, title: 'Cancelled Appt.', color: 'orange' },
    { key: 'held_not_interested' as const, title: 'Held Not Interested', color: 'orange' },
    { key: 'unqualified' as const, title: 'Unqualified', color: 'gray' },
    { key: 'cancelled_contract' as const, title: 'Cancelled Contract', color: 'red' },
  ];

  const visibleInProcessStages = inProcessStages.filter(stage => filterSettings[stage.key]);
  const visibleCancelledStages = cancelledStages.filter(stage => filterSettings[stage.key]);

  const filters = [
    { key: 'all' as const, title: 'All Leads', count: leads.length },
    ...(visibleInProcessStages.length > 0 ? [
      { key: 'in_process_divider' as const, title: '—————', count: 0 },
      ...visibleInProcessStages.map(stage => ({
        key: stage.key,
        title: stage.title,
        count: getLeadsByStatus(stage.key as Lead['status']).length
      }))
    ] : []),
    ...(visibleCancelledStages.length > 0 ? [
      { key: 'cancelled_divider' as const, title: '—————', count: 0 },
      ...visibleCancelledStages.map(stage => ({
        key: stage.key,
        title: stage.title,
        count: getLeadsByStatus(stage.key as Lead['status']).length
      }))
    ] : []),
  ];

  // Get the leads to display - use server filtered leads if filters are active, otherwise use client-side filtering
  const getDisplayLeads = () => {
    if (hasActiveFilters()) {
      console.log('[CRM] Using server filtered leads:', serverFilteredLeads.length);
      return serverFilteredLeads;
    }

    // When no filters are active, use the original client-side filtering logic
    console.log('[CRM] Using client-side filtering with activeFilter:', activeFilter);
    return leads.filter(lead => {
      let matchesFilter = false;
      // Defensive: handle missing status/isCancelled/cancellationStatus
      const status = (lead.status as Lead['status']) || 'new';
      const isCancelled = !!lead.isCancelled;
      const cancellationStatus = lead.cancellationStatus as Lead['cancellationStatus'] | undefined;
      let effectiveStatus: Lead['status'] = status;
      if (isCancelled && cancellationStatus) {
        effectiveStatus = cancellationStatus as Lead['status'];
      }
      if (activeFilter === 'all') {
        matchesFilter = true;
      } else if (activeFilter !== 'in_process_divider' && activeFilter !== 'cancelled_divider') {
        matchesFilter = effectiveStatus === activeFilter;
      }
      return matchesFilter;
    });
  };

  const filteredLeads = getDisplayLeads();
  console.log('[CRM] filteredLeads:', filteredLeads);

  // Sort the filtered leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any, bValue: any;
    
    // Use the filter system's sort settings when filters are active
    const currentSortBy = hasActiveFilters() ? workingSimpleFilters.sortBy : sortBy;
    const currentSortOrder = hasActiveFilters() ? workingSimpleFilters.sortOrder : sortOrder;
    
    console.log('[CRM] Sorting with:', { currentSortBy, currentSortOrder, hasActiveFilters: hasActiveFilters() });
    
    switch (currentSortBy) {
      case 'date':
      case 'dateAdded':
        aValue = new Date(a.dateSet || a.createdAt || 0);
        bValue = new Date(b.dateSet || b.createdAt || 0);
        break;
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'revenue':
        aValue = (a.revenue?.guaranteedRevenue || 0) + (a.revenue?.pipelineRevenue || 0);
        bValue = (b.revenue?.guaranteedRevenue || 0) + (b.revenue?.pipelineRevenue || 0);
        console.log('[CRM] Revenue comparison:', { 
          aName: a.name, 
          aValue, 
          bName: b.name, 
          bValue,
          aRevenue: a.revenue,
          bRevenue: b.revenue
        });
        break;

      default:
        aValue = new Date(a.dateSet || a.createdAt || 0);
        bValue = new Date(b.dateSet || b.createdAt || 0);
    }
    
    if (currentSortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const handleLeadPress = (lead: Lead) => {
    navigation.navigate('LeadDetail', { leadId: lead.id });
  };

  // Use centralized pipeline stages with correct order
  const allStageOrder: PipelineStage[] = getOrderedStages()
    .filter(stage => stage.isProgression)
    .map(stage => stage.key as PipelineStage);
  // Update any function signatures or usages that expect a more limited union to accept PipelineStage
  const handleStatusChange = async (leadId: string, newStatus: PipelineStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const currentStatus: PipelineStage = (lead.status as PipelineStage) || 'new';
      const currentIndex = allStageOrder.indexOf(currentStatus);
      const newIndex = allStageOrder.indexOf(newStatus);
      const highestReachedIndex = lead.highestStageReached ? allStageOrder.indexOf(lead.highestStageReached as PipelineStage) : currentIndex;
      let updatedHighestStage = allStageOrder[Math.max(newIndex, highestReachedIndex)] || 'new';
      if (!allStageOrder.includes(updatedHighestStage)) {
        updatedHighestStage = 'new';
      }
      const updatedLead: Partial<Lead> = {
        status: newStatus,
        highestStageReached: updatedHighestStage,
        updatedAt: new Date().toISOString(),
      };
      await updateLead(leadId, updatedLead);
    }
  };

  const handleCancellationChange = async (leadId: string, cancellationStatus: string | null, isCancelled: boolean) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const updatedLead = {
        ...lead,
        cancellationStatus: cancellationStatus as Lead['cancellationStatus'],
        isCancelled,
        updatedAt: new Date().toISOString()
      };
      
      await updateLead(leadId, updatedLead);
    }
  };
  


  const getTotalValue = () => {
    return filteredLeads.reduce((total, lead) => {
      return total + ((lead.revenue?.guaranteedRevenue || 0) + (lead.revenue?.pipelineRevenue || 0) || lead.value);
    }, 0);
  };

  const getRevenueBreakdown = () => {
    // Use filtered revenue if filters are active, otherwise use all leads
    if (hasActiveFilters() || searchQuery.trim()) {
      return serverFilteredRevenue;
    }

    // Include guaranteed revenue from all leads (even cancelled ones)
    const guaranteed = leads
      .reduce((sum, lead) => sum + (lead.revenue?.guaranteedRevenue || 0), 0);
    
    // Pipeline revenue should only include active leads (exclude cancelled)
    const pipeline = leads
      .filter(lead => !lead.isCancelled && 
                     !['cancelled_appointment', 'held_not_interested', 'unqualified', 'cancelled_contract'].includes(lead.status))
      .reduce((sum, lead) => sum + (lead.revenue?.pipelineRevenue || 0), 0);
    
    // Include paid out revenue from all leads (even cancelled ones)
    const paidOut = leads
      .reduce((sum, lead) => sum + (lead.revenue?.paidOutRevenue || 0), 0);
    
    const total = guaranteed + pipeline;

    return { guaranteed, pipeline, paidOut, total };
  };

  const handleFollowUpPress = (lead: Lead) => {
    setSelectedLead(lead);
    setShowFollowUpModal(true);
  };

  const handleFollowUpDashboardLeadPress = (lead: Lead) => {
    navigation.navigate('LeadDetail', { leadId: lead.id });
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



  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-600">
        <View className="flex-row items-center justify-between mb-3">
            <Text className="text-2xl font-bold text-white">Leads</Text>
          <View className="flex-row items-center space-x-4">
            <Pressable
              onPress={() => setShowFilterSettings(true)}
              className="bg-gray-600 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="options" size={16} color="white" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('AddLead')}
              className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-white font-medium text-sm ml-1">Add</Text>
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

        {/* Stats Row */}
        <View className="mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-xs text-gray-400 mb-0.5">Total Leads</Text>
                <Text className="text-lg font-bold text-white">{leads.length}</Text>
              </View>
              <View className="flex-1 ml-8">
                <Text className="text-xs text-gray-400 mb-0.5">Filtered Value</Text>
                <Text className="text-lg font-bold text-green-600">
                  ${getTotalValue().toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Revenue Breakdown */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-xs text-gray-400 mb-0.5">Guaranteed</Text>
              <Text className="text-sm font-bold text-green-400">
                ${getRevenueBreakdown().guaranteed.toLocaleString()}
              </Text>
            </View>
            <View className="flex-1 mr-3">
              <Text className="text-xs text-gray-400 mb-0.5">Pipeline</Text>
              <Text className="text-sm font-bold text-blue-400">
                ${getRevenueBreakdown().pipeline.toLocaleString()}
              </Text>
            </View>
            <View className="flex-1 mr-3">
              <Text className="text-xs text-gray-400 mb-0.5">Paid Out</Text>
              <Text className="text-sm font-bold text-emerald-400">
                ${getRevenueBreakdown().paidOut.toLocaleString()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">Total</Text>
              <Text className="text-sm font-bold text-yellow-400">
                ${getRevenueBreakdown().total.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Search and Filter */}
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center bg-gray-50 rounded-lg px-3 py-2.5">
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              placeholder="Search leads..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-gray-900 text-sm"
              placeholderTextColor="#9ca3af"
            />
            {searchQuery !== '' && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </Pressable>
            )}
          </View>
          
          {/* Filter Button */}
          <Pressable
            onPress={() => setShowFilterSheet(true)}
            className="bg-gray-800 px-3 py-2.5 rounded-xl flex-row items-center space-x-2"
          >
            <Ionicons name="funnel" size={16} color="#60a5fa" />
            {hasActiveFilters() && (
              <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">{getActiveFilterCount()}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-gray-100 px-4 py-2">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          bounces={true}
          alwaysBounceHorizontal={false}
          keyboardShouldPersistTaps="handled"
        >
          {filters.map((filter, index) => {
            if (filter.key === 'in_process_divider') {
              return (
                <View key={`divider-${index}`} className="px-2 py-4 items-center justify-center">
                  <Text className="text-xs text-gray-400">In Process</Text>
                </View>
              );
            }
            if (filter.key === 'cancelled_divider') {
              return (
                <View key={`divider-${index}`} className="px-2 py-4 items-center justify-center">
                  <Text className="text-xs text-gray-400">Cancelled</Text>
                </View>
              );
            }
            return (
              <FilterTab
                key={`filter-tab-${filter.key}`}
                title={filter.title}
                count={filter.count}
                isActive={activeFilter === filter.key}
                onPress={() => setActiveFilter(filter.key)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }} className="px-4 py-3" pointerEvents="box-none">
        {/* Results Header */}
        {(searchQuery || activeFilter !== 'all' || hasActiveFilters()) && (
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-gray-900">
              {sortedLeads.length} leads found
            </Text>
            {(searchQuery || activeFilter !== 'all' || hasActiveFilters()) && (
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  // Note: Clearing server filters would need to be handled by the hook
                }}
                className="bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-xs text-gray-600">Clear filters</Text>
              </Pressable>
            )}
          </View>
        )}
        
        {/* Leads List */}
        <FlatList
          data={sortedLeads}
          keyExtractor={(item) => item.id}
          renderItem={({ item: lead, index }) => (
            <LeadCard
              key={`lead-${lead.id}-${index}`}
              lead={lead}
              onPress={() => handleLeadPress(lead)}
                              onStatusChange={handleStatusChange as (leadId: string, newStatus: Lead['highestStageReached']) => Promise<void>}
              onFollowUpPress={handleFollowUpPress}
              onCancellationChange={handleCancellationChange}
              updateLead={updateLead}
            />
          )}
          ListEmptyComponent={
            sortedLeads.length === 0 ? (
              <View className="items-center justify-center py-12">
                <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                  <Ionicons name="people-outline" size={28} color="#9ca3af" />
                </View>
                <Text className="text-base font-semibold text-gray-900 mb-2">No leads found</Text>
                <Text className="text-sm text-gray-500 text-center mb-6 px-6">
                  {searchQuery 
                    ? 'Try adjusting your search criteria or browse all leads' 
                    : 'Add your first lead to start building your pipeline'
                  }
                </Text>
                {!searchQuery && (
                  <Pressable
                    onPress={() => navigation.navigate('AddLead' as never)}
                    className="bg-blue-500 px-5 py-2.5 rounded-lg flex-row items-center"
                  >
                    <Ionicons name="add" size={18} color="white" />
                    <Text className="text-white font-medium ml-2">Add Your First Lead</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 80, paddingTop: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          getItemLayout={(data, index) => ({
            length: 120, // Approximate height of each lead card
            offset: 120 * index,
            index,
          })}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          updateCellsBatchingPeriod={50}
        />
      </View>

      {/* Follow-up Reminder Modal */}
      {selectedLead && (
        <FollowUpReminderModal
          visible={showFollowUpModal}
          lead={selectedLead}
          onClose={() => {
            setShowFollowUpModal(false);
            setSelectedLead(null);
          }}
        />
      )}

      {/* Filter Settings Modal */}
      <LeadFilterSettingsModal
        visible={showFilterSettings}
        onClose={() => setShowFilterSettings(false)}
      />

      {/* Working Simple Leads Filter Sheet */}
      <WorkingSimpleLeadsFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={handleApplyFilters}
        currentFilters={workingSimpleFilters}
      />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setShowSortModal(false)}
        >
          <View className="flex-1 justify-end">
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-gray-900 rounded-t-2xl mx-0 mb-0">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
                  <Text className="text-lg font-semibold text-white">Sort Leads</Text>
                  <Pressable 
                    onPress={() => setShowSortModal(false)}
                    className="w-8 h-8 items-center justify-center rounded-full bg-gray-800"
                  >
                    <Ionicons name="close" size={20} color="#9ca3af" />
                  </Pressable>
                </View>
                
                <View className="p-4 space-y-6">
                  {/* Sort By Options */}
                  <View>
                    <Text className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Sort By</Text>
                    <View className="space-y-2">
                      {[
                        { key: 'dateAdded', label: 'Date Added', icon: 'calendar' },
                        { key: 'name', label: 'Name', icon: 'person' },
                        { key: 'revenue', label: 'Revenue', icon: 'cash' }
                      ].map((option) => (
                        <Pressable
                          key={option.key}
                          onPress={() => setSortBy(option.key as any)}
                          className={`flex-row items-center p-4 rounded-xl ${
                            sortBy === option.key ? 'bg-blue-900/50 border border-blue-500/30' : 'bg-gray-800'
                          }`}
                        >
                          <View className={`w-8 h-8 rounded-lg items-center justify-center ${
                            sortBy === option.key ? 'bg-blue-500/20' : 'bg-gray-700'
                          }`}>
                            <Ionicons 
                              name={option.icon as any} 
                              size={16} 
                              color={sortBy === option.key ? '#60a5fa' : '#9ca3af'} 
                            />
                          </View>
                          <Text className={`ml-3 flex-1 ${
                            sortBy === option.key ? 'text-blue-400 font-medium' : 'text-gray-300'
                          }`}>
                            {option.label}
                          </Text>
                          {sortBy === option.key && (
                            <View className="w-6 h-6 rounded-full bg-blue-500/20 items-center justify-center">
                              <Ionicons name="checkmark" size={14} color="#60a5fa" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  
                  {/* Sort Order */}
                  <View>
                    <Text className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Order</Text>
                    <View className="flex-row space-x-2">
                      <Pressable
                        onPress={() => setSortOrder('desc')}
                        className={`flex-1 flex-row items-center justify-center p-4 rounded-xl ${
                          sortOrder === 'desc' ? 'bg-blue-900/50 border border-blue-500/30' : 'bg-gray-800'
                        }`}
                      >
                        <View className={`w-8 h-8 rounded-lg items-center justify-center ${
                          sortOrder === 'desc' ? 'bg-blue-500/20' : 'bg-gray-700'
                        }`}>
                          <Ionicons 
                            name="arrow-down" 
                            size={16} 
                            color={sortOrder === 'desc' ? '#60a5fa' : '#9ca3af'} 
                          />
                        </View>
                        <Text className={`ml-2 ${
                          sortOrder === 'desc' ? 'text-blue-400 font-medium' : 'text-gray-300'
                        }`}>
                          Descending
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setSortOrder('asc')}
                        className={`flex-1 flex-row items-center justify-center p-4 rounded-xl ${
                          sortOrder === 'asc' ? 'bg-blue-900/50 border border-blue-500/30' : 'bg-gray-800'
                        }`}
                      >
                        <View className={`w-8 h-8 rounded-lg items-center justify-center ${
                          sortOrder === 'asc' ? 'bg-blue-500/20' : 'bg-gray-700'
                        }`}>
                          <Ionicons 
                            name="arrow-up" 
                            size={16} 
                            color={sortOrder === 'asc' ? '#60a5fa' : '#9ca3af'} 
                          />
                        </View>
                        <Text className={`ml-2 ${
                          sortOrder === 'asc' ? 'text-blue-400 font-medium' : 'text-gray-300'
                        }`}>
                          Ascending
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  </LinearGradient>
  );
}