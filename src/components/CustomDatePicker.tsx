import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  initialDate?: Date;
  title?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  visible,
  onClose,
  onDateSelect,
  initialDate = new Date(),
  title = "Select Date"
}) => {
  // Ensure we have a valid date
  const safeInitialDate = initialDate && !isNaN(initialDate.getTime()) ? initialDate : new Date();
  
  const [selectedDate, setSelectedDate] = useState(safeInitialDate);
  const [tempDate, setTempDate] = useState(safeInitialDate);

  useEffect(() => {
    if (visible) {
      console.log('CustomDatePicker: Setting tempDate to:', selectedDate);
      setTempDate(selectedDate);
    }
  }, [visible, selectedDate]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Generate days for the selected month/year
  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    setSelectedDate(tempDate);
    onDateSelect(tempDate);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(selectedDate);
    onClose();
  };

  const updateDate = (type: 'year' | 'month' | 'day', value: number) => {
    console.log(`CustomDatePicker: Updating ${type} to ${value}, current tempDate:`, tempDate);
    const newDate = new Date(tempDate);
    switch (type) {
      case 'year':
        newDate.setFullYear(value);
        break;
      case 'month':
        newDate.setMonth(value);
        break;
      case 'day':
        newDate.setDate(value);
        break;
    }
    console.log('CustomDatePicker: New date after update:', newDate);
    setTempDate(newDate);
  };

  const getItemStyle = (isSelected: boolean) => ({
    backgroundColor: isSelected ? '#FF9900' : 'transparent',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  const getTextStyle = (isSelected: boolean) => ({
    color: isSelected ? 'white' : '#374151',
    fontWeight: isSelected ? '600' : '500',
    fontSize: 16,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          maxHeight: '80%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1F2937',
            }}>
              {title}
            </Text>
            <Pressable
              onPress={handleCancel}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Three Column Date Picker */}
          <View style={{
            flexDirection: 'row',
            height: 200,
            marginBottom: 20,
          }}>
            {/* Months Column */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Month
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {months.map((month, index) => {
                  const isSelected = tempDate.getMonth() === index;
                  return (
                    <Pressable
                      key={index}
                      onPress={() => updateDate('month', index)}
                      style={getItemStyle(isSelected)}
                    >
                      <Text style={getTextStyle(isSelected)}>
                        {month.substring(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Days Column */}
            <View style={{ flex: 1, marginHorizontal: 4 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Day
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {days.map((day) => {
                  const isSelected = tempDate.getDate() === day;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => updateDate('day', day)}
                      style={getItemStyle(isSelected)}
                    >
                      <Text style={getTextStyle(isSelected)}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Years Column */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Year
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {years.map((year) => {
                  const isSelected = tempDate.getFullYear() === year;
                  return (
                    <Pressable
                      key={year}
                      onPress={() => updateDate('year', year)}
                      style={getItemStyle(isSelected)}
                    >
                      <Text style={getTextStyle(isSelected)}>
                        {year}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Selected Date Display */}
          <View style={{
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
            }}>
              {tempDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <Pressable
              onPress={handleCancel}
              style={{
                flex: 1,
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#374151',
                fontWeight: '600',
                fontSize: 16,
              }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={{
                flex: 1,
                backgroundColor: '#FF9900',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: 'white',
                fontWeight: '600',
                fontSize: 16,
              }}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
