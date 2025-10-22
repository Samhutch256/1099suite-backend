/**
 * MileageScreen - Everlance-style Mileage Tracker
 * 
 * This screen displays a list of trips with swipe gestures for classification
 * and deletion, similar to the Everlance app interface.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { mileageService, MileageTrip } from '../services/mileageService';
import { TripClassification, IRS_RATES_CENTS, centsToDollars } from '../constants/mileageConstants';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';

interface TripCardProps {
  trip: MileageTrip;
  onPress: (trip: MileageTrip) => void;
  onSwipeLeft: (trip: MileageTrip) => void;
  onSwipeRight: (trip: MileageTrip) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onPress, onSwipeLeft, onSwipeRight }) => {
  const translateX = useSharedValue(0);
  const [isSwipeActionVisible, setIsSwipeActionVisible] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(centsToDollars(cents));
  };

  const formatDistance = (miles: number) => {
    return `${miles.toFixed(1)} mi`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getClassificationColor = (classification: TripClassification) => {
    switch (classification) {
      case 'business':
        return 'bg-blue-500';
      case 'medical':
        return 'bg-green-500';
      case 'charity':
        return 'bg-purple-500';
      case 'personal':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getClassificationIcon = (classification: TripClassification) => {
    switch (classification) {
      case 'business':
        return 'briefcase';
      case 'medical':
        return 'medical';
      case 'charity':
        return 'heart';
      case 'personal':
        return 'person';
      default:
        return 'person';
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      
      // Show swipe actions when swiping
      if (Math.abs(translateX.value) > 50) {
        runOnJS(setIsSwipeActionVisible)(true);
      } else {
        runOnJS(setIsSwipeActionVisible)(false);
      }
    },
    onEnd: (event) => {
      const threshold = 100;
      
      if (event.translationX > threshold) {
        // Swipe right - delete
        translateX.value = withSpring(300, {}, () => {
          runOnJS(onSwipeRight)(trip);
          runOnJS(() => {
            translateX.value = 0;
            setIsSwipeActionVisible(false);
          })();
        });
      } else if (event.translationX < -threshold) {
        // Swipe left - classify
        translateX.value = withSpring(-300, {}, () => {
          runOnJS(onSwipeLeft)(trip);
          runOnJS(() => {
            translateX.value = 0;
            setIsSwipeActionVisible(false);
          })();
        });
      } else {
        // Return to center
        translateX.value = withSpring(0);
        runOnJS(setIsSwipeActionVisible)(false);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, -translateX.value / 100));
    return {
      opacity,
    };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, translateX.value / 100));
    return {
      opacity,
    };
  });

  return (
    <View className="relative">
      {/* Swipe Actions */}
      <View className="absolute inset-0 flex-row items-center justify-between px-4">
        {/* Left Action - Classify */}
        <Animated.View style={leftActionStyle} className="flex-row items-center">
          <View className="bg-blue-500 rounded-full p-3 mr-2">
            <Ionicons name="pricetag" size={20} color="white" />
          </View>
          <Text className="text-blue-500 font-semibold">Classify</Text>
        </Animated.View>

        {/* Right Action - Delete */}
        <Animated.View style={rightActionStyle} className="flex-row items-center">
          <Text className="text-red-500 font-semibold mr-2">Delete</Text>
          <View className="bg-red-500 rounded-full p-3">
            <Ionicons name="trash" size={20} color="white" />
          </View>
        </Animated.View>
      </View>

      {/* Trip Card */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={() => onPress(trip)}
            className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm"
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-2">
                  <View className={cn('rounded-full p-2 mr-2', getClassificationColor(trip.classification))}>
                    <Ionicons name={getClassificationIcon(trip.classification)} size={16} color="white" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 capitalize">
                    {trip.classification} Trip
                  </Text>
                </View>
                
                <Text className="text-sm text-gray-600 mb-2">
                  {formatDate(trip.startedAt)} at {formatTime(trip.startedAt)}
                </Text>
                
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text className="text-xs text-gray-500 ml-1">
                    {trip.startLat.toFixed(4)}, {trip.startLng.toFixed(4)}
                    {trip.endLat && trip.endLng && (
                      <> → {trip.endLat.toFixed(4)}, {trip.endLng.toFixed(4)}</>
                    )}
                  </Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className="text-xl font-bold text-green-600 mb-1">
                  {formatCurrency(trip.deductionCents)}
                </Text>
                <Text className="text-sm text-gray-600 mb-1">
                  {formatDistance(trip.miles)}
                </Text>
                <Text className="text-xs text-gray-500">
                  @ {centsToDollars(trip.rateCents).toFixed(2)}/mi
                </Text>
              </View>
            </View>

            {/* Trip Details */}
            <View className="flex-row justify-between pt-3 border-t border-gray-100">
              <View className="items-center">
                <Text className="text-xs text-gray-500">Distance</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {formatDistance(trip.miles)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Classification</Text>
                <Text className="text-sm font-semibold text-gray-900 capitalize">
                  {trip.classification}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Deduction</Text>
                <Text className="text-sm font-semibold text-green-600">
                  {formatCurrency(trip.deductionCents)}
                </Text>
              </View>
            </View>

            {/* Notes */}
            {trip.notes && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-gray-600" numberOfLines={2}>
                  {trip.notes}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export const MileageScreen: React.FC = () => {
  console.log('🚗 [MileageScreen] Component rendered!');
  console.log('🚗 [MileageScreen] Component is being displayed!');
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<MileageTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMiles: 0,
    totalDeductionCents: 0,
    totalTrips: 0,
  });

  const loadTrips = useCallback(async () => {
    console.log('🚗 [MileageScreen] loadTrips called, user:', user?.id);
    if (!user?.id) {
      console.log('🚗 [MileageScreen] No user ID, skipping load');
      return;
    }

    try {
      console.log('🚗 [MileageScreen] Loading trips for user:', user.id);
      setLoading(true);
      const tripsData = await mileageService.getUserTrips(user.id);
      
      setTrips(tripsData);
      
      // Calculate stats from trips data
      const totalMiles = tripsData.reduce((sum, trip) => sum + trip.miles, 0);
      const totalDeductionCents = tripsData.reduce((sum, trip) => sum + trip.deductionCents, 0);
      const totalTrips = tripsData.length;
      
      setStats({
        totalMiles,
        totalDeductionCents,
        totalTrips,
      });
    } catch (error) {
      console.error('Failed to load trips:', error);
      Alert.alert('Error', 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

  useEffect(() => {
    console.log('🚗 [MileageScreen] useEffect triggered, calling loadTrips');
    loadTrips();
  }, [loadTrips]);

  const handleTripPress = useCallback((trip: MileageTrip) => {
    navigation.navigate('TripDetail' as never, { tripId: trip.id } as never);
  }, [navigation]);

  const handleSwipeLeft = useCallback((trip: MileageTrip) => {
    // Show classification picker
    Alert.alert(
      'Classify Trip',
      'Select the classification for this trip:',
      [
        { text: 'Business', onPress: () => updateTripClassification(trip, 'business') },
        { text: 'Medical', onPress: () => updateTripClassification(trip, 'medical') },
        { text: 'Charity', onPress: () => updateTripClassification(trip, 'charity') },
        { text: 'Personal', onPress: () => updateTripClassification(trip, 'personal') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleSwipeRight = useCallback((trip: MileageTrip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete this ${trip.classification} trip of ${trip.miles.toFixed(1)} miles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteTrip(trip.id)
        },
      ]
    );
  }, []);

  const updateTripClassification = useCallback(async (trip: MileageTrip, classification: TripClassification) => {
    try {
      const rateCents = IRS_RATES_CENTS[classification];
      const deductionCents = Math.round(trip.miles * rateCents);
      
      await mileageService.updateTrip(trip.id, {
        classification,
        rateCents,
        deductionCents,
      });
      
      // Update local state
      setTrips(prev => prev.map(t => 
        t.id === trip.id 
          ? { ...t, classification, rateCents, deductionCents }
          : t
      ));
      
      // Reload stats
      await loadTrips();
    } catch (error) {
      console.error('Failed to update trip classification:', error);
      Alert.alert('Error', 'Failed to update trip classification. Please try again.');
    }
  }, [loadTrips]);

  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      await mileageService.deleteTrip(tripId);
      
      // Update local state
      setTrips(prev => prev.filter(t => t.id !== tripId));
      
      // Reload stats
      await loadTrips();
    } catch (error) {
      console.error('Failed to delete trip:', error);
      Alert.alert('Error', 'Failed to delete trip. Please try again.');
    }
  }, [loadTrips]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(centsToDollars(cents));
  };

  const formatDistance = (miles: number) => {
    return miles.toFixed(1);
  };

  const renderTrip = useCallback(({ item }: { item: MileageTrip }) => (
    <TripCard
      trip={item}
      onPress={handleTripPress}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
    />
  ), [handleTripPress, handleSwipeLeft, handleSwipeRight]);

  const keyExtractor = useCallback((item: MileageTrip) => item.id, []);

  if (loading) {
    return (
      <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} className="items-center justify-center">
          <ActivityIndicator size="large" color="#ff8c00" />
          <Text className="text-white text-lg mt-4">Loading trips...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  console.log('🚗 [MileageScreen] Rendering with trips:', trips.length, 'loading:', loading);
  
  return (
    <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-600">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                className="mr-4 w-8 h-8 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <Text className="text-2xl font-bold text-white">Mileage Tracker</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('TripDetail' as never, {} as never)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="add" size={24} color="white" />
            </Pressable>
          </View>

          {/* IRS Rates Card */}
          <View className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <Text className="text-white text-lg font-semibold mb-3">IRS Deduction Rates 2024</Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2 pr-2 mb-2">
                <Text className="text-blue-300 text-sm">Business</Text>
                <Text className="text-white text-lg font-bold">$0.67/mi</Text>
              </View>
              <View className="w-1/2 pl-2 mb-2">
                <Text className="text-green-300 text-sm">Medical</Text>
                <Text className="text-white text-lg font-bold">$0.21/mi</Text>
              </View>
              <View className="w-1/2 pr-2">
                <Text className="text-purple-300 text-sm">Charity</Text>
                <Text className="text-white text-lg font-bold">$0.14/mi</Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className="text-gray-300 text-sm">Personal</Text>
                <Text className="text-white text-lg font-bold">$0.00/mi</Text>
              </View>
            </View>
          </View>

          {/* Summary Cards */}
          <View className="flex-row space-x-3">
            <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <Text className="text-green-300 text-sm">Total Miles</Text>
              <Text className="text-white text-xl font-bold">{formatDistance(stats.totalMiles)}</Text>
            </View>
            <View className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <Text className="text-blue-300 text-sm">Total Deduction</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(stats.totalDeductionCents)}</Text>
            </View>
            <View className="flex-1 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <Text className="text-purple-300 text-sm">Total Trips</Text>
              <Text className="text-white text-xl font-bold">{stats.totalTrips}</Text>
            </View>
          </View>
        </View>

        {/* Trips List */}
        {trips.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="car-outline" size={64} color="#9ca3af" />
            <Text className="text-2xl font-bold text-white mt-4 mb-2">No Trips Yet</Text>
            <Text className="text-gray-300 text-center mb-6">
              Your automatically detected trips will appear here. Swipe left to classify, swipe right to delete.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('TripDetail' as never, {} as never)}
              className="bg-orange-500 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">Add Manual Trip</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={trips}
            renderItem={renderTrip}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ff8c00"
                colors={['#ff8c00']}
              />
            }
            ListHeaderComponent={() => (
              <Text className="text-gray-300 text-sm mb-4">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} • Swipe to classify or delete
              </Text>
            )}
            ListFooterComponent={() => <View className="h-20" />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default MileageScreen;