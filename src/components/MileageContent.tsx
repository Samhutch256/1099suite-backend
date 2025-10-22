import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMileageStore, MileageTrip, TripType, IRS_RATES } from '../state/mileageStore';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TripMapPreview } from './TripMapPreview';
import { 
  startAutomaticTripDetection, 
  stopAutomaticTripDetection, 
  isBackgroundLocationAvailable,
  requestComprehensivePermissions 
} from '../services/mileageTrackingService';

interface TripCardProps {
  trip: MileageTrip;
  onCategorize: (tripId: string, tripType: TripType) => void;
  onDelete: (tripId: string) => void;
  onViewMap: (trip: MileageTrip) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onCategorize, onDelete, onViewMap }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDistance = (distance: number) => {
    return distance.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTripTypeColor = (tripType: TripType) => {
    switch (tripType) {
      case 'business': return 'bg-blue-500';
      case 'medical': return 'bg-green-500';
      case 'charity': return 'bg-purple-500';
      case 'personal': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTripTypeLabel = (tripType: TripType) => {
    switch (tripType) {
      case 'business': return 'Business';
      case 'medical': return 'Medical';
      case 'charity': return 'Charity';
      case 'personal': return 'Personal';
      default: return 'Unknown';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutUp}
      className="bg-[#111827] rounded-2xl p-4 mb-4 border border-gray-800 shadow-sm"
    >
      {/* Trip Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className={cn("w-3 h-3 rounded-full mr-2", getTripTypeColor(trip.tripType))} />
          <Text className="text-sm font-medium text-gray-200">
            {getTripTypeLabel(trip.tripType)}
          </Text>
          {trip.isAutoTracked && (
            <View className="ml-2 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/40">
              <Text className="text-xs text-emerald-200">Auto</Text>
            </View>
          )}
        </View>
        <Text className="text-lg font-bold text-emerald-300">
          {formatCurrency(trip.value)}
        </Text>
      </View>

      {/* Trip Details */}
      <View className="mb-3">
        <Text className="text-sm text-gray-300 mb-1">{trip.purpose}</Text>
        <Text className="text-xs text-gray-500">
          {formatDate(trip.startTime)} • {formatTime(trip.startTime)} - {formatTime(trip.endTime || trip.startTime)}
        </Text>
      </View>

      {/* Distance and Rate */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm text-gray-300">
          {formatDistance(trip.distance)} miles
        </Text>
        <Text className="text-xs text-gray-500">
          @ ${trip.irsRate.toFixed(2)}/mile
        </Text>
      </View>

      {/* Map Preview Button */}
      {trip.startLocation && trip.endLocation && (
        <Pressable
          onPress={() => onViewMap(trip)}
          className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-3 mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="map-outline" size={16} color="#93c5fd" />
              <Text className="text-blue-200 font-medium ml-2">View Route</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#93c5fd" />
          </View>
        </Pressable>
      )}

      {/* Action Buttons */}
      <View className="flex-row justify-between pt-3 border-t border-gray-800">
        <Pressable
          onPress={() => {
            const types: TripType[] = ['business', 'medical', 'charity', 'personal'];
            const currentIndex = types.indexOf(trip.tripType);
            const nextType = types[(currentIndex + 1) % types.length];
            onCategorize(trip.id, nextType);
          }}
          className="flex-row items-center"
        >
          <Ionicons name="swap-horizontal-outline" size={16} color="#9ca3af" />
          <Text className="text-sm text-gray-300 ml-1">Reclassify</Text>
        </Pressable>
        
        <Pressable
          onPress={() => onDelete(trip.id)}
          className="flex-row items-center"
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text className="text-sm text-red-400 ml-1">Delete</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

interface ManualTripModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tripData: {
    startLocation: { latitude: number; longitude: number; address?: string };
    endLocation: { latitude: number; longitude: number; address?: string };
    distance: number;
    tripType: TripType;
    purpose: string;
    startTime: string;
    endTime: string;
  }) => void;
}

const ManualTripModal: React.FC<ManualTripModalProps> = ({ visible, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    startAddress: '',
    endAddress: '',
    distance: '',
    tripType: 'business' as TripType,
    purpose: '',
    startTime: new Date(),
    endTime: new Date(),
  });

  const handleSave = () => {
    if (!formData.startAddress || !formData.endAddress || !formData.distance || !formData.purpose) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const distance = parseFloat(formData.distance);
    if (isNaN(distance) || distance <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid distance.');
      return;
    }

    // For now, use placeholder coordinates - in a real app, you'd geocode the addresses
    const tripData = {
      startLocation: { latitude: 0, longitude: 0, address: formData.startAddress },
      endLocation: { latitude: 0, longitude: 0, address: formData.endAddress },
      distance,
      tripType: formData.tripType,
      purpose: formData.purpose,
      startTime: formData.startTime.toISOString(),
      endTime: formData.endTime.toISOString(),
    };

    onSave(tripData);
    onClose();
    
    // Reset form
    setFormData({
      startAddress: '',
      endAddress: '',
      distance: '',
      tripType: 'business',
      purpose: '',
      startTime: new Date(),
      endTime: new Date(),
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
          <Text className="text-xl font-bold text-gray-900">Add Manual Trip</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </Pressable>
        </View>
        
        <ScrollView className="flex-1 p-6">
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Start Address</Text>
              <TextInput
                value={formData.startAddress}
                onChangeText={(text) => setFormData(prev => ({ ...prev, startAddress: text }))}
                placeholder="Enter start address"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">End Address</Text>
              <TextInput
                value={formData.endAddress}
                onChangeText={(text) => setFormData(prev => ({ ...prev, endAddress: text }))}
                placeholder="Enter end address"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Distance (miles)</Text>
              <TextInput
                value={formData.distance}
                onChangeText={(text) => setFormData(prev => ({ ...prev, distance: text }))}
                placeholder="Enter distance"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Trip Type</Text>
              <View className="flex-row space-x-2">
                {(['business', 'medical', 'charity', 'personal'] as TripType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setFormData(prev => ({ ...prev, tripType: type }))}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border",
                      formData.tripType === type 
                        ? "bg-blue-500 border-blue-500" 
                        : "bg-white border-gray-300"
                    )}
                  >
                    <Text className={cn(
                      "text-center font-medium text-sm",
                      formData.tripType === type ? "text-white" : "text-gray-700"
                    )}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Purpose</Text>
              <TextInput
                value={formData.purpose}
                onChangeText={(text) => setFormData(prev => ({ ...prev, purpose: text }))}
                placeholder="Enter trip purpose"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Start Time</Text>
              <DateTimePicker
                value={formData.startTime}
                mode="datetime"
                onChange={(event, date) => {
                  if (date) setFormData(prev => ({ ...prev, startTime: date }));
                }}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">End Time</Text>
              <DateTimePicker
                value={formData.endTime}
                mode="datetime"
                onChange={(event, date) => {
                  if (date) setFormData(prev => ({ ...prev, endTime: date }));
                }}
              />
            </View>
          </View>

          <View className="flex-row space-x-3 mt-8">
            <Pressable
              onPress={onClose}
              className="flex-1 bg-gray-300 px-6 py-4 rounded-lg"
            >
              <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              className="flex-1 bg-blue-600 px-6 py-4 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Save Trip</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const MileageContent: React.FC = () => {
  // Safely get navigation with error handling
  let navigation;
  try {
    navigation = useNavigation();
  } catch (error) {
    // Navigation context not available (e.g., in modal)
    console.log('[MileageContent] Navigation context not available');
    navigation = null;
  }
  const { user } = useAuthStore();
  const {
    trips,
    currentTrip,
    isTracking,
    autoTrackingEnabled,
    startTrip,
    stopTrip,
    cancelTrip,
    addManualTrip,
    categorizeTrip,
    deleteTrip,
    toggleAutoTracking,
    startAutomaticTracking,
    stopAutomaticTracking,
    loadUserData,
  } = useMileageStore();

  const [showManualTripModal, setShowManualTripModal] = useState(false);
  const [showLocationGuide, setShowLocationGuide] = useState(false);
  const [showTripPurposeModal, setShowTripPurposeModal] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<MileageTrip | null>(null);
  const [tripPurpose, setTripPurpose] = useState('');
  const [selectedTripType, setSelectedTripType] = useState<TripType>('business');
  const [backgroundTrackingStatus, setBackgroundTrackingStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Animation for GPS tracking indicator
  const pulseAnimation = useSharedValue(1);
  
  useEffect(() => {
    if (isTracking) {
      pulseAnimation.value = withRepeat(withTiming(0.5, { duration: 1000 }), -1, true);
    } else {
      pulseAnimation.value = 1;
    }
  }, [isTracking]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnimation.value,
  }));

  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    }
  }, [user?.id]);

  // Check background location availability
  useEffect(() => {
    const checkBackgroundLocation = async () => {
      try {
        const isAvailable = await isBackgroundLocationAvailable();
        setBackgroundTrackingStatus(isAvailable ? 'available' : 'unavailable');
      } catch (error) {
        console.error('Failed to check background location availability:', error);
        setBackgroundTrackingStatus('unavailable');
      }
    };

    checkBackgroundLocation();
  }, []);

  const handleStartTrip = async () => {
    setShowTripPurposeModal(true);
  };

  const handleStartTripWithPurpose = async () => {
    if (!tripPurpose.trim()) {
      Alert.alert('Validation Error', 'Please enter a trip purpose.');
      return;
    }

    setShowTripPurposeModal(false);
    const result = await startTrip(tripPurpose.trim(), selectedTripType);
    
    if (!result.success) {
      if (result.showSettings) {
        setShowLocationGuide(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to start trip');
      }
    } else {
      Alert.alert('Trip Started', 'GPS tracking is now active. Your trip will be automatically logged.');
    }
    
    setTripPurpose('');
    setSelectedTripType('business');
  };

  const handleStopTrip = async () => {
    const success = await stopTrip();
    if (success) {
      Alert.alert('Trip Completed', 'Your trip has been saved successfully!');
    } else {
      Alert.alert('Error', 'Failed to stop trip');
    }
  };

  const handleCancelTrip = () => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel the current trip? This cannot be undone.',
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: () => {
            cancelTrip();
            Alert.alert('Trip Cancelled', 'Your current trip has been cancelled.');
          },
        },
      ]
    );
  };

  const handleCategorizeTrip = (tripId: string, tripType: TripType) => {
    categorizeTrip(tripId, tripType);
  };

  const handleDeleteTrip = (tripId: string) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrip(tripId),
        },
      ]
    );
  };

  const handleViewMap = (trip: MileageTrip) => {
    setSelectedTripForMap(trip);
    setShowMapPreview(true);
  };

  const handleSaveManualTrip = (tripData: any) => {
    addManualTrip(tripData);
    Alert.alert('Success', 'Manual trip has been added successfully!');
  };

  const handleAutoTrackingToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Check permissions first
        const permissionsGranted = await requestComprehensivePermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Permissions Required',
            'Background location access is required for automatic trip detection. Please enable "Always" location access in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // Note: In a real app, you'd use Linking.openSettings()
                Alert.alert('Settings', 'Please go to Settings > Privacy & Security > Location Services and enable "Always" for this app.');
              }},
            ]
          );
          return;
        }

        // Start automatic tracking
        const success = await startAutomaticTripDetection(user?.id || '');
        if (success) {
          toggleAutoTracking(true);
          Alert.alert(
            'Auto-Tracking Enabled',
            'Your trips will now be automatically detected and logged in the background, even when the app is closed.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Failed to Start Auto-Tracking',
            'Please check your location permissions and try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Stop automatic tracking
        await stopAutomaticTripDetection();
        toggleAutoTracking(false);
        Alert.alert(
          'Auto-Tracking Disabled',
          'Automatic trip detection has been turned off.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Auto-tracking toggle error:', error);
      Alert.alert(
        'Error',
        'Failed to update auto-tracking settings. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDistance = (distance: number) => {
    return distance.toFixed(1);
  };

  // Sort trips by most recent
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips]);

  const latestTrip = sortedTrips.length > 0 ? sortedTrips[0] : null;

  return (
    <View style={{ flex: 1 }}>
      <View className="px-6 pt-4 space-y-4">
        {currentTrip && (
          <View className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Animated.View style={pulseStyle} className="w-3 h-3 bg-emerald-400 rounded-full mr-3" />
                <View>
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">Current Trip</Text>
                  <Text className="text-white text-base font-semibold">{currentTrip.purpose}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Started {new Date(currentTrip.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <View className="flex-row space-x-2">
                <Pressable
                  onPress={handleCancelTrip}
                  className="px-3 py-2 bg-rose-500 rounded-xl"
                >
                  <Text className="text-white text-sm font-medium">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleStopTrip}
                  className="px-3 py-2 bg-emerald-500 rounded-xl"
                >
                  <Text className="text-white text-sm font-medium">Stop</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View className="flex-row space-x-3">
          <Pressable
            onPress={handleStartTrip}
            disabled={isTracking}
            className={cn(
              "flex-1 flex-row items-center justify-center py-3 rounded-2xl",
              isTracking ? "bg-gray-600" : "bg-purple-500"
            )}
          >
            <Ionicons name="play" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Start Trip</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowManualTripModal(true)}
            className="flex-1 flex-row items-center justify-center py-3 bg-emerald-500 rounded-2xl"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Add Manual</Text>
          </Pressable>
        </View>

        {navigation && (
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => navigation.navigate('Mileage' as never)}
              className="flex-1 flex-row items-center justify-center py-3 bg-[#141c2c] border border-gray-800 rounded-2xl"
            >
              <Ionicons name="car" size={18} color="#a5b4fc" />
              <Text className="text-indigo-200 font-semibold ml-2">Mileage Tracker</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Mileage' as never)}
              className="flex-1 flex-row items-center justify-center py-3 bg-[#141c2c] border border-gray-800 rounded-2xl"
            >
              <Ionicons name="list" size={18} color="#93c5fd" />
              <Text className="text-sky-200 font-semibold ml-2">View Logged</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View className="px-6 space-y-4 pb-4">
        <View className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white font-medium">Auto-Track Trips</Text>
              <Text className="text-gray-400 text-xs mt-1">
                Automatically detect and log trips in the background
              </Text>
              {backgroundTrackingStatus === 'checking' && (
                <Text className="text-indigo-300 text-xs mt-2">Checking permissions...</Text>
              )}
              {backgroundTrackingStatus === 'unavailable' && (
                <Text className="text-red-300 text-xs mt-2">
                  Background location access required
                </Text>
              )}
              {backgroundTrackingStatus === 'available' && autoTrackingEnabled && (
                <Text className="text-emerald-300 text-xs mt-2">Active in background</Text>
              )}
            </View>
            <Switch
              value={autoTrackingEnabled}
              onValueChange={handleAutoTrackingToggle}
              trackColor={{ false: '#1f2937', true: '#4338ca' }}
              thumbColor="#ffffff"
              disabled={backgroundTrackingStatus === 'checking'}
            />
          </View>
        </View>

        {latestTrip && (
          <View className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold capitalize">{latestTrip.tripType} Trip</Text>
              <Text className="text-emerald-300 font-semibold">
                {formatCurrency(latestTrip.value)}
              </Text>
            </View>
            <Text className="text-gray-400 text-xs mb-2">
              {new Date(latestTrip.startTime).toLocaleDateString()} •{' '}
              {new Date(latestTrip.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text className="text-gray-300 text-sm mb-3">
              {formatDistance(latestTrip.distance)} miles • ${latestTrip.irsRate.toFixed(2)}/mi
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-400 text-xs">{latestTrip.purpose}</Text>
              <Pressable
                onPress={() => handleViewMap(latestTrip)}
                className="px-3 py-1 bg-purple-600/30 border border-purple-500/40 rounded-full"
              >
                <Text className="text-purple-200 text-xs font-medium">View</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={16} color="#a5b4fc" />
            <Text className="text-indigo-200 font-semibold ml-2">IRS deduction rates</Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-300 text-sm">Business</Text>
              <Text className="text-purple-200 text-sm">${IRS_RATES.business}/mi</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-300 text-sm">Medical</Text>
              <Text className="text-purple-200 text-sm">${IRS_RATES.medical}/mi</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-300 text-sm">Charity</Text>
              <Text className="text-purple-200 text-sm">${IRS_RATES.charity}/mi</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-300 text-sm">Personal</Text>
              <Text className="text-purple-200 text-sm">${IRS_RATES.personal}/mi</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6" style={{ flex: 1 }}>
        {sortedTrips.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="car-outline" size={48} color="#6b7280" />
            <Text className="text-gray-300 text-lg mt-4">No trips recorded</Text>
            <Text className="text-gray-500 text-center mt-2">
              Start your first trip to begin tracking mileage
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-gray-400 text-xs uppercase tracking-widest mb-4">
              Recent Trips
            </Text>
            {sortedTrips.map((trip, index) => (
              <TripCard
                key={trip.id || `trip-${index}`}
                trip={trip}
                onCategorize={handleCategorizeTrip}
                onDelete={handleDeleteTrip}
                onViewMap={handleViewMap}
              />
            ))}
          </>
        )}

        <View className="h-20" />
      </View>

      {/* Trip Purpose Modal */}
      <Modal
        visible={showTripPurposeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTripPurposeModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Start Trip</Text>
            <Pressable
              onPress={() => setShowTripPurposeModal(false)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>
          
          <View className="p-6 space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Trip Purpose</Text>
              <TextInput
                value={tripPurpose}
                onChangeText={setTripPurpose}
                placeholder="Enter trip purpose (e.g., Client meeting, Site visit)"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Trip Type</Text>
              <View className="flex-row space-x-2">
                {(['business', 'medical', 'charity', 'personal'] as TripType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedTripType(type)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border",
                      selectedTripType === type 
                        ? "bg-blue-500 border-blue-500" 
                        : "bg-white border-gray-300"
                    )}
                  >
                    <Text className={cn(
                      "text-center font-medium text-sm",
                      selectedTripType === type ? "text-white" : "text-gray-700"
                    )}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <Pressable
                onPress={() => setShowTripPurposeModal(false)}
                className="flex-1 bg-gray-300 px-6 py-4 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleStartTripWithPurpose}
                className="flex-1 bg-blue-600 px-6 py-4 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Start Trip</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Manual Trip Modal */}
      <ManualTripModal
        visible={showManualTripModal}
        onClose={() => setShowManualTripModal(false)}
        onSave={handleSaveManualTrip}
      />

      {/* Location Permission Guide */}
      <Modal
        visible={showLocationGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationGuide(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Location Permission Required</Text>
            <Pressable
              onPress={() => setShowLocationGuide(false)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>
          
          <View className="p-6 space-y-4">
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text className="text-blue-800 font-medium mb-2">Background Location Access</Text>
              <Text className="text-blue-700 text-sm">
                To automatically track your trips, please enable "Always" location access in your device settings.
              </Text>
            </View>
            
            <Text className="text-gray-700">
              You can still manually log trips without location permissions, but automatic tracking requires background location access.
            </Text>

            <Pressable
              onPress={() => setShowLocationGuide(false)}
              className="bg-blue-600 px-6 py-4 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">I Understand</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Map Preview Modal */}
      {selectedTripForMap && (
        <TripMapPreview
          visible={showMapPreview}
          trip={selectedTripForMap}
          onClose={() => setShowMapPreview(false)}
        />
      )}
    </View>
  );
};
