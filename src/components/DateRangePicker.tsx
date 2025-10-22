import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type DateRangePickerProps = {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
};

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      onDateChange(selectedDate, endDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      onDateChange(startDate, selectedDate);
    }
  };

  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => setShowStartPicker(true)}
        className="bg-gray-100 px-3 py-1 rounded-full mr-2"
      >
        <Text className="text-sm text-gray-700">{formatDate(startDate)}</Text>
      </Pressable>
      
      <Text className="text-gray-500 mx-1">-</Text>
      
      <Pressable
        onPress={() => setShowEndPicker(true)}
        className="bg-gray-100 px-3 py-1 rounded-full"
      >
        <Text className="text-sm text-gray-700">{formatDate(endDate)}</Text>
      </Pressable>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={handleStartDateChange}
          maximumDate={endDate}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}
    </View>
  );
}
