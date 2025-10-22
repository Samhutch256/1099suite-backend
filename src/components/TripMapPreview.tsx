import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MileageTrip } from '../state/mileageStore';

interface TripMapPreviewProps {
  visible: boolean;
  onClose: () => void;
  trip: MileageTrip | null;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const TripMapPreview: React.FC<TripMapPreviewProps> = ({ visible, onClose, trip }) => {
  const formatDistance = (distance: number) => {
    return distance.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getTripTypeLabel = (tripType: string) => {
    switch (tripType) {
      case 'business': return 'Business';
      case 'medical': return 'Medical';
      case 'charity': return 'Charity';
      case 'personal': return 'Personal';
      default: return 'Unknown';
    }
  };

  const getTripTypeColor = (tripType: string) => {
    switch (tripType) {
      case 'business': return '#3b82f6';
      case 'medical': return '#10b981';
      case 'charity': return '#8b5cf6';
      case 'personal': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (!trip) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
          <Text className="text-xl font-bold text-gray-900">Trip Route</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </Pressable>
        </View>
        
        <View className="flex-1">
          {/* Map Placeholder - Enhanced with route visualization */}
          <View className="flex-1 bg-gray-100 relative">
            {/* Route Visualization */}
            {trip.route && trip.route.length > 1 && (
              <View className="absolute inset-0 p-4">
                <View className="flex-1 bg-white rounded-lg border border-gray-200 relative">
                  {/* Route Line */}
                  <View className="absolute inset-0 flex items-center justify-center">
                    <View className="w-full h-1 bg-blue-500 rounded-full opacity-50" />
                  </View>
                  
                  {/* Start Point */}
                  <View className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <View className="w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    <Text className="text-xs text-gray-600 mt-1">Start</Text>
                  </View>
                  
                  {/* End Point */}
                  <View className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <View className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                    <Text className="text-xs text-gray-600 mt-1">End</Text>
                  </View>
                  
                  {/* Route Info */}
                  <View className="absolute top-4 left-4 right-4">
                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Text className="text-blue-800 font-medium text-center">
                        Route Visualization
                      </Text>
                      <Text className="text-blue-600 text-xs text-center mt-1">
                        {trip.route.length} GPS points recorded
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {/* Fallback for no route data */}
            {(!trip.route || trip.route.length <= 1) && (
              <View className="flex-1 items-center justify-center p-4">
                <Ionicons name="map-outline" size={48} color="#6b7280" />
                <Text className="text-gray-600 mt-2 text-center">Route Map</Text>
                <Text className="text-gray-500 text-sm text-center mt-1">
                  Install react-native-maps for full map visualization
                </Text>
                <View className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Text className="text-blue-800 text-sm text-center">
                    Start: {trip.startLocation.latitude.toFixed(4)}, {trip.startLocation.longitude.toFixed(4)}
                  </Text>
                  {trip.endLocation && (
                    <Text className="text-blue-800 text-sm text-center mt-1">
                      End: {trip.endLocation.latitude.toFixed(4)}, {trip.endLocation.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Trip Details Overlay */}
          <View className="bg-white border-t border-gray-200">
            <View className="p-4">
              {/* Trip Summary */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getTripTypeColor(trip.tripType) }}
                  />
                  <Text className="font-semibold text-gray-900">
                    {getTripTypeLabel(trip.tripType)} Trip
                  </Text>
                  {trip.isAutoTracked && (
                    <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-xs text-green-700">Auto</Text>
                    </View>
                  )}
                </View>
                <Text className="text-lg font-bold text-gray-900">
                  {formatDistance(trip.distance)} mi
                </Text>
              </View>

              {/* Trip Details Grid */}
              <View className="flex-row flex-wrap">
                <View className="w-1/2 mb-2">
                  <Text className="text-xs text-gray-500">Date</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {formatDate(trip.startTime)}
                  </Text>
                </View>
                <View className="w-1/2 mb-2">
                  <Text className="text-xs text-gray-500">Duration</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {formatDuration(trip.startTime, trip.endTime || trip.startTime)}
                  </Text>
                </View>
                <View className="w-1/2 mb-2">
                  <Text className="text-xs text-gray-500">Start Time</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {formatTime(trip.startTime)}
                  </Text>
                </View>
                <View className="w-1/2 mb-2">
                  <Text className="text-xs text-gray-500">End Time</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {formatTime(trip.endTime || trip.startTime)}
                  </Text>
                </View>
              </View>

              {/* Purpose */}
              <View className="mt-2">
                <Text className="text-xs text-gray-500">Purpose</Text>
                <Text className="text-sm font-medium text-gray-900">{trip.purpose}</Text>
              </View>

              {/* Addresses */}
              <View className="mt-3 space-y-2">
                <View className="flex-row items-start">
                  <View className="w-3 h-3 bg-green-500 rounded-full mr-2 mt-1" />
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Start</Text>
                    <Text className="text-sm text-gray-900">
                      {trip.startLocation.address || `${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                </View>
                
                {trip.endLocation && (
                  <View className="flex-row items-start">
                    <View className="w-3 h-3 bg-red-500 rounded-full mr-2 mt-1" />
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">End</Text>
                      <Text className="text-sm text-gray-900">
                        {trip.endLocation.address || `${trip.endLocation.latitude.toFixed(4)}, ${trip.endLocation.longitude.toFixed(4)}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}; 