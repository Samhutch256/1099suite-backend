import React from 'react';
import { View } from 'react-native';

export function TransactionSkeleton() {
  return (
    <View className="px-4 py-3 flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-gray-200 mr-3" />
      <View className="flex-1">
        <View className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        <View className="h-3 bg-gray-200 rounded w-1/2" />
      </View>
      <View className="items-end">
        <View className="h-4 bg-gray-200 rounded w-16 mb-1" />
      </View>
    </View>
  );
}

export function TransactionSkeletonList() {
  return (
    <View>
      {Array.from({ length: 10 }).map((_, index) => (
        <TransactionSkeleton key={index} />
      ))}
    </View>
  );
}
