import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { Scope } from '../utils/dateRangeUtils';

interface PeriodSelectorProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  date: Date;
  onDateChange: (date: Date) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  scope,
  onScopeChange,
  date,
  onDateChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'month' | 'year'>('date');

  const scopeOptions: { label: string; value: Scope }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
  ];

  const getPeriodTitle = (): string => {
    switch (scope) {
      case 'day':
        return format(date, 'MMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const weekNumber = getWeek(date, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')} (Week ${weekNumber})`;
      case 'month':
        return format(date, 'MMMM yyyy');
      case 'year':
        return format(date, 'yyyy');
      default:
        return format(date, 'MMM d, yyyy');
    }
  };

  const handleScopeChange = (newScope: Scope) => {
    onScopeChange(newScope);
    
    // Update date picker mode based on scope
    switch (newScope) {
      case 'day':
      case 'week':
        setDatePickerMode('date');
        break;
      case 'month':
        setDatePickerMode('month');
        break;
      case 'year':
        setDatePickerMode('year');
        break;
    }
  };

  const handleDateConfirm = () => {
    // For week scope, ensure the date represents the start of the week
    let finalDate = tempDate;
    if (scope === 'week') {
      finalDate = startOfWeek(tempDate, { weekStartsOn: 1 });
    }
    
    onDateChange(finalDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setTempDate(date);
    setShowDatePicker(false);
  };

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Segmented Control */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: '#374151', 
        borderRadius: 12, 
        padding: 4, 
        marginBottom: 16 
      }}>
        {scopeOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleScopeChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: scope === option.value ? '#FF9900' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: scope === option.value ? 'white' : '#9CA3AF',
              fontWeight: scope === option.value ? '600' : '500',
              fontSize: 14,
            }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period Header */}
      <View style={{ marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '500', textAlign: 'center' }}>
          {getPeriodTitle()}
        </Text>
        {scope !== 'day' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="information-circle" size={16} color="#FFB84D" />
            <Text style={{ color: '#FFB84D', fontSize: 12, marginLeft: 4 }}>
              Period entries are saved as {scope} records
            </Text>
          </View>
        )}
      </View>

      {/* Date Picker Button */}
      <View style={{ alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            setTempDate(date);
            setShowDatePicker(true);
          }}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="calendar" size={20} color="#FF9900" style={{ marginRight: 8 }} />
          <Text style={{ color: '#1a1f2e', fontWeight: '600', fontSize: 16 }}>
            {scope === 'day' ? format(date, 'MMM d, yyyy') : 
             scope === 'week' ? `${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'MMM d, yyyy')}` :
             scope === 'month' ? format(date, 'MMMM yyyy') :
             format(date, 'yyyy')}
          </Text>
        </Pressable>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDateCancel}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 20, 
            padding: 24, 
            width: '90%', 
            maxWidth: 400,
            alignItems: 'center'
          }}>
            {datePickerMode === 'date' ? (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                style={{ width: 320, backgroundColor: 'white' }}
              />
            ) : datePickerMode === 'month' ? (
              <View style={{ alignItems: 'center', width: 320 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Select Month</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 280 }}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(tempDate.getFullYear(), i, 1);
                    const isSelected = tempDate.getMonth() === i;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(i, 1);
                          setTempDate(newDate);
                        }}
                        style={{
                          width: 80,
                          height: 40,
                          margin: 4,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#FF9900' : '#F3F4F6',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ 
                          color: isSelected ? 'white' : '#374151',
                          fontWeight: isSelected ? '600' : '500',
                          fontSize: 14
                        }}>
                          {monthDate.toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', width: 320 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Select Year</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 280 }}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = tempDate.getFullYear() - 5 + i;
                    const isSelected = tempDate.getFullYear() === year;
                    return (
                      <Pressable
                        key={year}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(year, 0, 1);
                          setTempDate(newDate);
                        }}
                        style={{
                          width: 80,
                          height: 40,
                          margin: 4,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#FF9900' : '#F3F4F6',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ 
                          color: isSelected ? 'white' : '#374151',
                          fontWeight: isSelected ? '600' : '500',
                          fontSize: 14
                        }}>
                          {year}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
              <Pressable
                onPress={handleDateCancel}
                style={{
                  backgroundColor: '#6B7280',
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDateConfirm}
                style={{
                  backgroundColor: '#FF9900',
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
