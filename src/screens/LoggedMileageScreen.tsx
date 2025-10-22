import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMileageStore, MileageTrip } from '../state/mileageStore';
import { cn } from '../utils/cn';

interface LoggedTripCardProps {
  trip: MileageTrip;
}

const LoggedTripCard: React.FC<LoggedTripCardProps> = ({ trip }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDistance = (distance: number) => {
    return `${distance.toFixed(1)} mi`;
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

  const getRouteDescription = () => {
    const start = trip.startLocation.address || 
      `${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}`;
    const end = trip.endLocation?.address || 
      (trip.endLocation ? `${trip.endLocation.latitude.toFixed(4)}, ${trip.endLocation.longitude.toFixed(4)}` : 'Unknown');
    
    return `${start} → ${end}`;
  };

  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {trip.purpose}
          </Text>
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {getRouteDescription()}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {formatDate(trip.startTime)} at {formatTime(trip.startTime)}
            </Text>
          </View>
        </View>
        
        <View className="items-end">
          <Text className="text-xl font-bold text-green-600 mb-1">
            {formatCurrency(trip.value)}
          </Text>
          <Text className="text-sm text-gray-600 mb-1">
            {formatDistance(trip.distance)}
          </Text>
          <Text className="text-xs text-gray-500">
            @ ${trip.irsRate.toFixed(3)}/mi
          </Text>
        </View>
      </View>

      {/* Trip Details */}
      <View className="flex-row justify-between pt-3 border-t border-gray-100">
        <View className="items-center">
          <Text className="text-xs text-gray-500">Distance</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {formatDistance(trip.distance)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-gray-500">Duration</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {trip.duration ? `${trip.duration}m` : 'N/A'}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-gray-500">Value</Text>
          <Text className="text-sm font-semibold text-green-600">
            {formatCurrency(trip.value)}
          </Text>
        </View>
      </View>

      {/* Tags */}
      {(trip.clientTag || trip.jobTag) && (
        <View className="flex-row mt-3 pt-3 border-t border-gray-100">
          {trip.clientTag && (
            <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-xs text-blue-700">Client: {trip.clientTag}</Text>
            </View>
          )}
          {trip.jobTag && (
            <View className="bg-purple-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-purple-700">Job: {trip.jobTag}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export const LoggedMileageScreen: React.FC = () => {
  const navigation = useNavigation();
  const { trips, getTotalMileage, getTotalDeduction } = useMileageStore();

  const completedTrips = useMemo(() => {
    return trips
      .filter(trip => trip.status === 'completed')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips]);

  const totalMileage = useMemo(() => getTotalMileage(), [trips]);
  const totalDeduction = useMemo(() => getTotalDeduction(), [trips]);

  // Monthly breakdowns
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyBreakdown: { [key: string]: { miles: number; value: number; trips: number } } = {};

    completedTrips.forEach(trip => {
      const tripDate = new Date(trip.startTime);
      if (tripDate.getFullYear() === currentYear) {
        const monthKey = tripDate.toLocaleString('default', { month: 'long' });
        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = { miles: 0, value: 0, trips: 0 };
        }
        monthlyBreakdown[monthKey].miles += trip.distance;
        monthlyBreakdown[monthKey].value += trip.value;
        monthlyBreakdown[monthKey].trips += 1;
      }
    });

    return Object.entries(monthlyBreakdown)
      .map(([month, data]) => ({ month, ...data }))
      .slice(0, 6); // Show last 6 months
  }, [completedTrips]);

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

  const renderTrip = ({ item }: { item: MileageTrip }) => (
    <LoggedTripCard trip={item} />
  );

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
              <Text className="text-2xl font-bold text-white">Logged Mileage</Text>
            </View>
          </View>

          {/* Summary Cards */}
          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <Text className="text-green-300 text-sm">Total Miles</Text>
              <Text className="text-white text-xl font-bold">{formatDistance(totalMileage)}</Text>
            </View>
            <View className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <Text className="text-blue-300 text-sm">Total Deduction</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(totalDeduction)}</Text>
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <Text className="text-purple-300 text-sm">Completed Trips</Text>
              <Text className="text-white text-xl font-bold">{completedTrips.length}</Text>
            </View>
            <View className="flex-1 bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
              <Text className="text-orange-300 text-sm">Avg Trip</Text>
              <Text className="text-white text-xl font-bold">
                {completedTrips.length > 0 ? formatDistance(totalMileage / completedTrips.length) : '0'} mi
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Breakdown */}
        {monthlyData.length > 0 && (
          <View className="px-6 py-4 border-b border-gray-600">
            <Text className="text-lg font-semibold text-white mb-3">Monthly Breakdown</Text>
            <View className="flex-row flex-wrap">
              {monthlyData.map((month) => (
                <View key={month.month} className="w-1/2 pr-2 mb-3">
                  <View className="bg-gray-800/50 rounded-lg p-3">
                    <Text className="text-gray-300 text-sm font-medium">{month.month}</Text>
                    <Text className="text-white text-lg font-bold">{formatDistance(month.miles)} mi</Text>
                    <Text className="text-gray-400 text-xs">{month.trips} trips • {formatCurrency(month.value)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trips List */}
        {completedTrips.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="car-outline" size={64} color="#9ca3af" />
            <Text className="text-2xl font-bold text-white mt-4 mb-2">No Logged Trips</Text>
            <Text className="text-gray-300 text-center">
              Start tracking your trips to see them here. Complete trips will automatically appear in this list.
            </Text>
          </View>
        ) : (
          <FlatList
            data={completedTrips}
            renderItem={renderTrip}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            initialNumToRender={8}
            windowSize={8}
            getItemLayout={(data, index) => ({
              length: 150, // Approximate item height
              offset: 150 * index,
              index,
            })}
            ListHeaderComponent={() => (
              <Text className="text-gray-300 text-sm mb-4">
                {completedTrips.length} completed trip{completedTrips.length !== 1 ? 's' : ''}
              </Text>
            )}
            ListFooterComponent={() => <View className="h-20" />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};