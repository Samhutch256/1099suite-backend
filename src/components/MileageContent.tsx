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
      className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200"
    >
      {/* Trip Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className={cn("w-3 h-3 rounded-full mr-2", getTripTypeColor(trip.tripType))} />
          <Text className="text-sm font-medium text-gray-700">
            {getTripTypeLabel(trip.tripType)}
          </Text>
          {trip.isAutoTracked && (
            <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-green-700">Auto</Text>
            </View>
          )}
        </View>
        <Text className="text-lg font-bold text-gray-900">
          {formatCurrency(trip.value)}
        </Text>
      </View>

      {/* Trip Details */}
      <View className="mb-3">
        <Text className="text-sm text-gray-600 mb-1">{trip.purpose}</Text>
        <Text className="text-xs text-gray-500">
          {formatDate(trip.startTime)} • {formatTime(trip.startTime)} - {formatTime(trip.endTime || trip.startTime)}
        </Text>
      </View>

      {/* Distance and Rate */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm text-gray-700">
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
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="map-outline" size={16} color="#3b82f6" />
              <Text className="text-blue-700 font-medium ml-2">View Route</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </View>
        </Pressable>
      )}

      {/* Action Buttons */}
      <View className="flex-row justify-between pt-3 border-t border-gray-200">
        <Pressable
          onPress={() => {
            const types: TripType[] = ['business', 'medical', 'charity', 'personal'];
            const currentIndex = types.indexOf(trip.tripType);
            const nextType = types[(currentIndex + 1) % types.length];
            onCategorize(trip.id, nextType);
          }}
          className="flex-row items-center"
        >
          <Ionicons name="swap-horizontal-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-1">Reclassify</Text>
        </Pressable>
        
        <Pressable
          onPress={() => onDelete(trip.id)}
          className="flex-row items-center"
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text className="text-sm text-red-500 ml-1">Delete</Text>
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
    currentIrsRate,
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
      {/* Summary Cards */}
      <View className="px-6 py-4">
        <View className="flex-row space-x-3 mb-4">
          <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-3">
            <Text className="text-green-300 text-sm">Total Miles</Text>
            <Text className="text-white text-lg font-bold">{formatDistance(totalMileage)}</Text>
          </View>
          <View className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
            <Text className="text-blue-300 text-sm">Total Deduction</Text>
            <Text className="text-white text-lg font-bold">{formatCurrency(totalDeduction)}</Text>
          </View>
        </View>

        <View className="flex-row space-x-3">
          <View className="flex-1 bg-purple-900/20 border border-purple-500/30 rounded-xl p-3">
            <Text className="text-purple-300 text-sm">This Month</Text>
            <Text className="text-white text-lg font-bold">{formatDistance(monthlyMileage)} mi</Text>
          </View>
          <View className="flex-1 bg-orange-900/20 border border-orange-500/30 rounded-xl p-3">
            <Text className="text-orange-300 text-sm">Month Deduction</Text>
            <Text className="text-white text-lg font-bold">{formatCurrency(monthlyDeduction)}</Text>
          </View>
        </View>
      </View>

      {/* Current Trip Status */}
      {currentTrip && (
        <View className="px-6 py-4 bg-blue-900/20 border-b border-blue-500/30">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Animated.View style={pulseStyle} className="w-3 h-3 bg-green-500 rounded-full mr-3" />
              <View>
                <Text className="text-blue-300 text-sm">Current Trip</Text>
                <Text className="text-white font-semibold">{currentTrip.purpose}</Text>
                <Text className="text-blue-200 text-sm">
                  Started: {new Date(currentTrip.startTime).toLocaleTimeString()}
                </Text>
                <Text className="text-blue-200 text-xs mt-1">GPS tracking active</Text>
              </View>
            </View>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={handleCancelTrip}
                className="bg-red-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleStopTrip}
                className="bg-green-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Stop</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View className="px-6 py-4">
        <View className="flex-row space-x-3 mb-4">
          <Pressable
            onPress={handleStartTrip}
            disabled={isTracking}
            className={cn(
              "flex-1 flex-row items-center justify-center py-4 rounded-xl",
              isTracking ? "bg-gray-500" : "bg-purple-500"
            )}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Start Trip</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setShowManualTripModal(true)}
            className="flex-1 flex-row items-center justify-center py-4 bg-green-500 rounded-xl"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Add Manual</Text>
          </Pressable>
        </View>

        {navigation && (
          <View className="space-y-3">
            <Pressable
              onPress={() => {
                console.log('🚗 [MileageContent] Mileage Tracker button pressed');
                navigation.navigate('Mileage' as never);
              }}
              className="flex-row items-center justify-center py-4 bg-green-500 rounded-xl"
            >
              <Ionicons name="car" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Mileage Tracker</Text>
            </Pressable>
            
            <Pressable
              onPress={() => navigation.navigate('Mileage' as never)}
              className="flex-row items-center justify-center py-4 bg-blue-500 rounded-xl"
            >
              <Ionicons name="list" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">View Logged</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Auto-Tracking Toggle */}
      <View className="px-6 py-4 bg-gray-800/20 border-b border-gray-600">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white font-medium">Auto-Track Trips</Text>
            <Text className="text-gray-400 text-sm">
              Automatically detect and log trips in background
            </Text>
            {backgroundTrackingStatus === 'checking' && (
              <Text className="text-blue-400 text-xs mt-1">Checking permissions...</Text>
            )}
            {backgroundTrackingStatus === 'unavailable' && (
              <Text className="text-red-400 text-xs mt-1">Background location access required</Text>
            )}
            {backgroundTrackingStatus === 'available' && autoTrackingEnabled && (
              <Text className="text-green-400 text-xs mt-1">Active - tracking in background</Text>
            )}
          </View>
          <Switch
            value={autoTrackingEnabled}
            onValueChange={handleAutoTrackingToggle}
            trackColor={{ false: '#4b5563', true: '#3b82f6' }}
            thumbColor={autoTrackingEnabled ? '#ffffff' : '#ffffff'}
            disabled={backgroundTrackingStatus === 'checking'}
          />
        </View>
      </View>

      {/* IRS Rates Info */}
      <View className="px-6 py-4 bg-blue-900/10 border-b border-blue-500/20">
        <View className="flex-row items-center mb-2">
          <Ionicons name="information-circle" size={16} color="#3b82f6" />
          <Text className="text-blue-300 font-medium ml-2">IRS Deduction Rates</Text>
        </View>
        <View className="space-y-1">
          <Text className="text-blue-200 text-xs">Business: ${IRS_RATES.business}/mile</Text>
          <Text className="text-blue-200 text-xs">Medical: ${IRS_RATES.medical}/mile</Text>
          <Text className="text-blue-200 text-xs">Charity: ${IRS_RATES.charity}/mile</Text>
          <Text className="text-blue-200 text-xs">Personal: ${IRS_RATES.personal}/mile (no deduction)</Text>
        </View>
      </View>

      {/* Trip List */}
      <View className="px-6" style={{ flex: 1 }}>
        {sortedTrips.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="car-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-300 text-lg mt-4">No trips recorded</Text>
            <Text className="text-gray-400 text-center mt-2">
              Start your first trip to begin tracking mileage
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-gray-300 text-sm mb-4">
              {sortedTrips.length} trip{sortedTrips.length !== 1 ? 's' : ''} • Most recent first
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
