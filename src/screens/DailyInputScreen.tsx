import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, Text, ScrollView, Pressable, TextInput, Platform, KeyboardAvoidingView, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useKPIStore } from '../state/kpiStore';
import { useContractorStore, Lead } from '../state/contractorStore';
import { useInputSettingsStore } from '../state/inputSettingsStore';
import { useAuthStore } from '../state/authStore';
import { useVisibilityStore } from '../state/visibilityStore';
import { cn } from '../utils/cn';
import { databaseService } from '../services/database';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { InputSettingsModal } from '../components/InputSettingsModal';
import { AppointmentLeadModal } from '../components/AppointmentLeadModal';
import { DatabaseDebug } from '../components/DatabaseDebug';
import { ErrorRecoveryModal } from '../components/ErrorRecoveryModal';
import { ScopeSelector } from '../components/ScopeSelector';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PeriodSaveConfirmationModal } from '../components/PeriodSaveConfirmationModal';
import { TallyModal } from '../components/TallyModal';
import { useInputsForRange, PeriodTotals } from '../hooks/useInputsForRange';
import { Scope, getPeriod, formatDateForDatabase } from '../utils/dateRangeUtils';
import { format, endOfWeek, startOfWeek, getWeek } from 'date-fns';

interface NumberInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  required?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  editable?: boolean;
}

// NumberInput component
const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  icon,
  color,
  editable = true,
}) => (
  <View className="mb-4">
    <View className="flex-row items-center mb-2">
      <View className={cn("w-6 h-6 rounded-full items-center justify-center mr-2", color)}>
        <Ionicons name={icon} size={14} color="white" />
      </View>
      <Text className="text-gray-900 font-medium">
        {label}
        {required && <Text className="text-red-500 ml-1">*</Text>}
      </Text>
    </View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType="numeric"
      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold"
      style={!editable ? { backgroundColor: '#F9FAFB', color: '#6B7280' } : {}}
      editable={editable}
      blurOnSubmit={false}
      returnKeyType="next"
    />
  </View>
);

interface SubInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// SubInput component
const SubInput: React.FC<SubInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  color,
}) => (
  <View className="ml-8 mb-3">
    <View className="flex-row items-center mb-2">
      <View className={cn("w-5 h-5 rounded-full items-center justify-center mr-2", color)}>
        <Ionicons name={icon} size={10} color="white" />
      </View>
      <Text className="text-gray-700 font-medium text-sm">
        {label}
      </Text>
    </View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType="numeric"
      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-medium"
      blurOnSubmit={false}
      returnKeyType="next"
    />
  </View>
);

export const DailyInputScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addDailyInput, updateDailyInput, getTodayInput, dailyInputs, loadUserData, syncData, isSyncing, setCurrentUser, forceReload } = useKPIStore();
  const { getKPIData, addLead, updateLead } = useContractorStore();
  const { settings } = useInputSettingsStore();
  const { user } = useAuthStore();
  const {
    showOutreach, setShowOutreach,
    showOutreachDoorKnocks, setShowOutreachDoorKnocks,
    showOutreachTagsPut, setShowOutreachTagsPut,
    showOutreachCallsMade, setShowOutreachCallsMade,
    showOutreachReferrals, setShowOutreachReferrals,
    showOutreachInbound, setShowOutreachInbound,
    showAppointmentsSet, setShowAppointmentsSet,
    showAppointmentsSetDoorKnocks, setShowAppointmentsSetDoorKnocks,
    showAppointmentsSetTagsPut, setShowAppointmentsSetTagsPut,
    showAppointmentsSetCallsMade, setShowAppointmentsSetCallsMade,
    showAppointmentsSetReferrals, setShowAppointmentsSetReferrals,
    showAppointmentsSetInbound, setShowAppointmentsSetInbound,
    showAppointmentsHeld, setShowAppointmentsHeld,
    showAppointmentsHeldDoorKnocks, setShowAppointmentsHeldDoorKnocks,
    showAppointmentsHeldTagsPut, setShowAppointmentsHeldTagsPut,
    showAppointmentsHeldCallsMade, setShowAppointmentsHeldCallsMade,
    showAppointmentsHeldReferrals, setShowAppointmentsHeldReferrals,
    showAppointmentsHeldInbound, setShowAppointmentsHeldInbound,
    showClosedDeals, setShowClosedDeals,
    showClosedDealsDoorKnocks, setShowClosedDealsDoorKnocks,
    showClosedDealsTagsPut, setShowClosedDealsTagsPut,
    showClosedDealsCallsMade, setShowClosedDealsCallsMade,
    showClosedDealsReferrals, setShowClosedDealsReferrals,
    showClosedDealsInbound, setShowClosedDealsInbound,
    showAccountsServiced, setShowAccountsServiced,
    showAccountsServicedDoorKnocks, setShowAccountsServicedDoorKnocks,
    showAccountsServicedTagsPut, setShowAccountsServicedTagsPut,
    showAccountsServicedCallsMade, setShowAccountsServicedCallsMade,
    showAccountsServicedReferrals, setShowAccountsServicedReferrals,
    showAccountsServicedInbound, setShowAccountsServicedInbound,
  } = useVisibilityStore();
  
  const terminology = user?.industry ? user.industry : 'Sales';

  const toInputString = (value?: number | null) => {
    return value === null || value === undefined ? '' : value.toString();
  };
  const deriveOutreachInbound = (
    storedValue: number | null | undefined,
    mainValue: number | null | undefined,
    components: Array<number | null | undefined>
  ) => {
    const fallback =
      Math.max((mainValue ?? 0) - components.reduce((acc, val) => acc + (val ?? 0), 0), 0);
    if (storedValue === null || storedValue === undefined) {
      return fallback;
    }
    if (storedValue === 0 && fallback > 0) {
      return fallback;
    }
    return storedValue;
  };
  
  // Utility function to format date without timezone issues
  const formatDateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Utility function to validate and sanitize dates
  const getValidDate = (date: Date): Date => {
    if (date.getFullYear() >= 1970 && date.getFullYear() <= 2100 && !isNaN(date.getTime())) {
      return date;
    }
    console.warn('Invalid date detected, using current date as fallback:', date);
    return new Date();
  };
  
  const [date, setDate] = useState(() => {
    const initialDate = new Date();
    // Ensure we have a valid date (not Unix epoch)
    if (initialDate.getFullYear() < 1970) {
      console.warn('DailyInputScreen: Invalid initial date detected, using current date');
      return new Date();
    }
    console.log('DailyInputScreen: Initializing date with:', initialDate);
    return initialDate;
  });
  const [tempDate, setTempDate] = useState(() => {
    const initialDate = new Date();
    // Ensure we have a valid date (not Unix epoch)
    if (initialDate.getFullYear() < 1970) {
      console.warn('DailyInputScreen: Invalid initial tempDate detected, using current date');
      return new Date();
    }
    console.log('DailyInputScreen: Initializing tempDate with:', initialDate);
    return initialDate;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'month' | 'year'>('date');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentModalType, setAppointmentModalType] = useState<'set' | 'held'>('set');
  const [pendingAppointmentCount, setPendingAppointmentCount] = useState(0);
  const [selectedSource, setSelectedSource] = useState<'door_knocks' | 'tags_put' | 'calls_made' | 'referrals' | 'inbound' | 'other'>('door_knocks');
  const [appointmentLeadAssociations, setAppointmentLeadAssociations] = useState<{ [key: string]: string[] }>({});

  // Multi-scope functionality
  const [scope, setScope] = useState<Scope>('day');
  const [period, setPeriod] = useState(getPeriod(date, 'day'));
  const [showPeriodConfirmation, setShowPeriodConfirmation] = useState(false);
  const [pendingPeriodSave, setPendingPeriodSave] = useState<PeriodTotals | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingInput, setExistingInput] = useState<any>(null);
  const [tallyCounts, setTallyCounts] = useState<{ [key: string]: number }>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDatabaseDebug, setShowDatabaseDebug] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentError, setCurrentError] = useState<string>('');

  // Period totals hook
  const { totals: periodTotals, loading: periodLoading, savePeriodTotals, refetch } = useInputsForRange(
    user?.id || '',
    formatDateForDatabase(period.start),
    formatDateForDatabase(period.end)
  );

  // Add validation function for outreach attempts
  function validateOutreachAttempts(mainInput: number, subInputs: Record<string, string | number>): string | null {
    const total = Object.values(subInputs).reduce((acc: number, val) => {
      const num = typeof val === 'number' ? val : parseInt(val as string, 10);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    
    // Only validate if any sub-field has a value
    const hasAnySubInput = Object.values(subInputs).some(val => {
      const num = typeof val === 'number' ? val : parseInt(val as string, 10);
      return !isNaN(num) && num > 0;
    });
    
    if (!hasAnySubInput) {
      return null;
    }
    
    return total === mainInput
      ? null
      : `Sub-inputs total (${total}) does not match main input (${mainInput})`;
  }

  // Update getSubInputSum and validateSubInputs for other sections
  const getSubInputSum = (prefix: string) => {
    return getSubInputSumWithData(prefix, formData);
  };

  const validateSubInputs = (mainField: string, prefix: string, formDataToUse: any = formData) => {
    const mainValue = parseInt(formDataToUse[mainField as keyof typeof formDataToUse] as string) || 0;
    const subSum = getSubInputSumWithData(prefix, formDataToUse);
    
    // Check if any sub-field has a value
    const hasAnySubInput = subSum > 0;
    
    // Only validate if any sub-field has a value
    if (!hasAnySubInput) {
      return { isValid: true, mainValue, subSum };
    }
    
    const isValid = mainValue === subSum;
    return { isValid, mainValue, subSum };
  };

  const getSubInputSumWithData = (prefix: string, formDataToUse: any) => {
    if (prefix === 'outreach') {
      return (parseInt(formDataToUse.outreachDoorKnocks) || 0) +
        (parseInt(formDataToUse.outreachTagsPut) || 0) +
        (parseInt(formDataToUse.outreachCallsMade) || 0) +
        (parseInt(formDataToUse.outreachReferrals) || 0) +
        (parseInt(formDataToUse.outreachInbound) || 0);
    }
    if (prefix === 'appointmentsSet') {
      return (parseInt(formDataToUse.appointmentsSetDoorKnocks) || 0) +
        (parseInt(formDataToUse.appointmentsSetTagsPut) || 0) +
        (parseInt(formDataToUse.appointmentsSetCallsMade) || 0) +
        (parseInt(formDataToUse.appointmentsSetReferrals) || 0) +
        (parseInt(formDataToUse.appointmentsSetInbound) || 0);
    }
    if (prefix === 'appointmentsHeld') {
      return (parseInt(formDataToUse.appointmentsHeldDoorKnocks) || 0) +
        (parseInt(formDataToUse.appointmentsHeldTagsPut) || 0) +
        (parseInt(formDataToUse.appointmentsHeldCallsMade) || 0) +
        (parseInt(formDataToUse.appointmentsHeldReferrals) || 0) +
        (parseInt(formDataToUse.appointmentsHeldInbound) || 0);
    }
    if (prefix === 'dealsClosed') {
      return (parseInt(formDataToUse.dealsClosedDoorKnocks) || 0) +
        (parseInt(formDataToUse.dealsClosedTagsPut) || 0) +
        (parseInt(formDataToUse.dealsClosedCallsMade) || 0) +
        (parseInt(formDataToUse.dealsClosedReferrals) || 0) +
        (parseInt(formDataToUse.dealsClosedInbound) || 0);
    }
    if (prefix === 'accountsServiced') {
      return (parseInt(formDataToUse.accountsServicedDoorKnocks) || 0) +
        (parseInt(formDataToUse.accountsServicedTagsPut) || 0) +
        (parseInt(formDataToUse.accountsServicedCallsMade) || 0) +
        (parseInt(formDataToUse.accountsServicedReferrals) || 0) +
        (parseInt(formDataToUse.accountsServicedInbound) || 0);
    }
    return 0;
  };

  // Add a ref to debounce auto-save
  const autoSaveTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Add a separate debounce for notes autosave
  const notesAutoSaveTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-save function
  const autoSave = React.useCallback(async (newFormData: any) => {
    // Validate sub-inputs before submission
    const validations = [
      { field: 'doorsKnocked', prefix: 'outreach', label: 'Outreach Attempts' },
      { field: 'appointments', prefix: 'appointmentsSet', label: 'Appointments Set' },
      { field: 'appointmentHolds', prefix: 'appointmentsHeld', label: 'Appointments Held' }
    ];
    const errors = [];
    for (const validation of validations) {
      if (validation.field === 'doorsKnocked') {
        const error = validateOutreachAttempts(
          parseInt(newFormData.doorsKnocked) || 0,
          {
            outreachDoorKnocks: newFormData.outreachDoorKnocks,
            outreachTagsPut: newFormData.outreachTagsPut,
            outreachCallsMade: newFormData.outreachCallsMade,
            outreachReferrals: newFormData.outreachReferrals,
            outreachInbound: newFormData.outreachInbound,
          }
        );
        if (error) errors.push(error);
      } else {
        const validationResult = validateSubInputs(validation.field, validation.prefix, newFormData);
        if (!validationResult.isValid) {
          errors.push(`${validation.label}: Sub-inputs (${validationResult.subSum}) don't match main input (${validationResult.mainValue})`);
        }
      }
    }
    if (errors.length > 0) {
      setSaveMessage({ type: 'error', text: `Please fix the following validation errors:\n${errors.join('\n')}` });
      return;
    }
    const inputData = {
      date: formatDateString(date),
      doorsKnocked: parseInt(newFormData.doorsKnocked) || 0,
      appointments: parseInt(newFormData.appointments) || 0,
      appointmentHolds: parseInt(newFormData.appointmentHolds) || 0,
      closedDeals: parseInt(newFormData.closedDeals) || 0,
      accountsServiced: parseInt(newFormData.accountsServiced) || 0,
      hoursWorked: parseFloat(newFormData.hoursWorked) || 0,
      notes: newFormData.notes.trim(),
      outreachDoorKnocks: parseInt(newFormData.outreachDoorKnocks) || 0,
      outreachTagsPut: parseInt(newFormData.outreachTagsPut) || 0,
      outreachCallsMade: parseInt(newFormData.outreachCallsMade) || 0,
      outreachReferrals: parseInt(newFormData.outreachReferrals) || 0,
      outreachInbound: parseInt(newFormData.outreachInbound) || 0,
      appointmentsSetDoorKnocks: parseInt(newFormData.appointmentsSetDoorKnocks) || 0,
      appointmentsSetTagsPut: parseInt(newFormData.appointmentsSetTagsPut) || 0,
      appointmentsSetCallsMade: parseInt(newFormData.appointmentsSetCallsMade) || 0,
      appointmentsSetReferrals: parseInt(newFormData.appointmentsSetReferrals) || 0,
      appointmentsSetInbound: parseInt(newFormData.appointmentsSetInbound) || 0,
      appointmentsHeldDoorKnocks: parseInt(newFormData.appointmentsHeldDoorKnocks) || 0,
      appointmentsHeldTagsPut: parseInt(newFormData.appointmentsHeldTagsPut) || 0,
      appointmentsHeldCallsMade: parseInt(newFormData.appointmentsHeldCallsMade) || 0,
      appointmentsHeldReferrals: parseInt(newFormData.appointmentsHeldReferrals) || 0,
      appointmentsHeldInbound: parseInt(newFormData.appointmentsHeldInbound) || 0,
      dealsClosedDoorKnocks: parseInt(newFormData.dealsClosedDoorKnocks) || 0,
      dealsClosedTagsPut: parseInt(newFormData.dealsClosedTagsPut) || 0,
      dealsClosedCallsMade: parseInt(newFormData.dealsClosedCallsMade) || 0,
      dealsClosedReferrals: parseInt(newFormData.dealsClosedReferrals) || 0,
      dealsClosedInbound: parseInt(newFormData.dealsClosedInbound) || 0,
      accountsServicedDoorKnocks: parseInt(newFormData.accountsServicedDoorKnocks) || 0,
      accountsServicedTagsPut: parseInt(newFormData.accountsServicedTagsPut) || 0,
      accountsServicedCallsMade: parseInt(newFormData.accountsServicedCallsMade) || 0,
      accountsServicedReferrals: parseInt(newFormData.accountsServicedReferrals) || 0,
      accountsServicedInbound: parseInt(newFormData.accountsServicedInbound) || 0,
      tallyCounts: tallyCounts,
    };
    try {
      if (existingInput) {
        await updateDailyInput(existingInput.id, inputData);
      } else {
        await addDailyInput(inputData);
      }
      setSaveMessage({ type: 'success', text: 'Saved' });
      setTimeout(() => setSaveMessage(null), 1500);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Auto-save failed' });
    }
  }, [date, existingInput, tallyCounts, addDailyInput, updateDailyInput, getSubInputSum, validateOutreachAttempts]);

  // Update formData and auto-save on every change
  const updateFormData = (key: string, value: string) => {
    if (saveMessage?.type === 'error') {
      setSaveMessage(null);
    }
    if (key !== 'notes') {
      if (key === 'hoursWorked') {
        if (value && !/^\d*\.?\d*$/.test(value)) {
          return;
        }
      } else {
        if (value && !/^\d+$/.test(value)) {
          return;
        }
      }
      setFormData(prev => {
        let newFormData = { ...prev, [key]: value };
        
        // Auto-calculate main fields from sub-fields
        const isOutreachSubField = ['outreachDoorKnocks', 'outreachTagsPut', 'outreachCallsMade', 'outreachReferrals', 'outreachInbound'].includes(key);
        const isAppointmentsSetSubField = ['appointmentsSetDoorKnocks', 'appointmentsSetTagsPut', 'appointmentsSetCallsMade', 'appointmentsSetReferrals', 'appointmentsSetInbound'].includes(key);
        const isAppointmentsHeldSubField = ['appointmentsHeldDoorKnocks', 'appointmentsHeldTagsPut', 'appointmentsHeldCallsMade', 'appointmentsHeldReferrals', 'appointmentsHeldInbound'].includes(key);
        const isDealsClosedSubField = ['dealsClosedDoorKnocks', 'dealsClosedTagsPut', 'dealsClosedCallsMade', 'dealsClosedReferrals', 'dealsClosedInbound'].includes(key);
        const isAccountsServicedSubField = ['accountsServicedDoorKnocks', 'accountsServicedTagsPut', 'accountsServicedCallsMade', 'accountsServicedReferrals', 'accountsServicedInbound'].includes(key);
        
        if (isOutreachSubField) {
          const total = (parseInt(newFormData.outreachDoorKnocks) || 0) +
                       (parseInt(newFormData.outreachTagsPut) || 0) +
                       (parseInt(newFormData.outreachCallsMade) || 0) +
                       (parseInt(newFormData.outreachReferrals) || 0) +
                       (parseInt(newFormData.outreachInbound) || 0);
          newFormData.doorsKnocked = total > 0 ? total.toString() : '';
        }
        
        if (isAppointmentsSetSubField) {
          const total = (parseInt(newFormData.appointmentsSetDoorKnocks) || 0) +
                       (parseInt(newFormData.appointmentsSetTagsPut) || 0) +
                       (parseInt(newFormData.appointmentsSetCallsMade) || 0) +
                       (parseInt(newFormData.appointmentsSetReferrals) || 0) +
                       (parseInt(newFormData.appointmentsSetInbound) || 0);
          newFormData.appointments = total > 0 ? total.toString() : '';
        }
        
        if (isAppointmentsHeldSubField) {
          const total = (parseInt(newFormData.appointmentsHeldDoorKnocks) || 0) +
                       (parseInt(newFormData.appointmentsHeldTagsPut) || 0) +
                       (parseInt(newFormData.appointmentsHeldCallsMade) || 0) +
                       (parseInt(newFormData.appointmentsHeldReferrals) || 0) +
                       (parseInt(newFormData.appointmentsHeldInbound) || 0);
          newFormData.appointmentHolds = total > 0 ? total.toString() : '';
        }
        
        if (isDealsClosedSubField) {
          const total = (parseInt(newFormData.dealsClosedDoorKnocks) || 0) +
                       (parseInt(newFormData.dealsClosedTagsPut) || 0) +
                       (parseInt(newFormData.dealsClosedCallsMade) || 0) +
                       (parseInt(newFormData.dealsClosedReferrals) || 0) +
                       (parseInt(newFormData.dealsClosedInbound) || 0);
          newFormData.closedDeals = total > 0 ? total.toString() : '';
        }
        
        if (isAccountsServicedSubField) {
          const total = (parseInt(newFormData.accountsServicedDoorKnocks) || 0) +
                       (parseInt(newFormData.accountsServicedTagsPut) || 0) +
                       (parseInt(newFormData.accountsServicedCallsMade) || 0) +
                       (parseInt(newFormData.accountsServicedReferrals) || 0) +
                       (parseInt(newFormData.accountsServicedInbound) || 0);
          newFormData.accountsServiced = total > 0 ? total.toString() : '';
        }
        
        // Debounce auto-save for non-notes fields
        if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
        autoSaveTimeout.current = setTimeout(() => autoSave(newFormData), 500);
        
        return newFormData;
      });
    } else {
      // For notes, use a separate debounce to avoid excessive saves
      setFormData(prev => {
        const newFormData = { ...prev, [key]: value };
        if (notesAutoSaveTimeout.current) clearTimeout(notesAutoSaveTimeout.current);
        notesAutoSaveTimeout.current = setTimeout(() => autoSave(newFormData), 1000);
        return newFormData;
      });
    }
  };

  const [formData, setFormData] = useState({
    doorsKnocked: '',
    appointments: '',
    appointmentHolds: '',
    closedDeals: '',
    accountsServiced: '',
    hoursWorked: '',
    notes: '',
    // Sub-inputs that appear when main inputs are filled
    outreachDoorKnocks: '',
    outreachTagsPut: '',
    outreachCallsMade: '',
    outreachReferrals: '',
    outreachInbound: '',
    appointmentsSetDoorKnocks: '',
    appointmentsSetTagsPut: '',
    appointmentsSetCallsMade: '',
    appointmentsSetReferrals: '',
    appointmentsSetInbound: '',
    appointmentsHeldDoorKnocks: '',
    appointmentsHeldTagsPut: '',
    appointmentsHeldCallsMade: '',
    appointmentsHeldReferrals: '',
    appointmentsHeldInbound: '',
    dealsClosedDoorKnocks: '',
    dealsClosedTagsPut: '',
    dealsClosedCallsMade: '',
    dealsClosedReferrals: '',
    dealsClosedInbound: '',
    accountsServicedDoorKnocks: '',
    accountsServicedTagsPut: '',
    accountsServicedCallsMade: '',
    accountsServicedReferrals: '',
    accountsServicedInbound: '',
  });

  // Update period when scope or date changes
  useEffect(() => {
    const newPeriod = getPeriod(date, scope);
    setPeriod(newPeriod);
  }, [date, scope]);

  // Check if there's existing input for the selected date (only in day scope)
  useEffect(() => {
    if (scope !== 'day') return;
    
    const selectedDateString = formatDateString(date);
    const existingInput = dailyInputs.find(input => input.date === selectedDateString);
    
    if (existingInput) {
      setExistingInput(existingInput);
      setFormData({
        doorsKnocked: toInputString(existingInput.doorsKnocked),
        appointments: toInputString(existingInput.appointments),
        appointmentHolds: toInputString(existingInput.appointmentHolds),
        closedDeals: toInputString(existingInput.closedDeals),
        accountsServiced: toInputString(existingInput.accountsServiced),
        hoursWorked: toInputString(existingInput.hoursWorked),
        notes: existingInput.notes || '',
        // Sub-inputs - show zero values rather than hiding them
        outreachDoorKnocks: toInputString(existingInput.outreachDoorKnocks),
        outreachTagsPut: toInputString(existingInput.outreachTagsPut),
        outreachCallsMade: toInputString(existingInput.outreachCallsMade),
        outreachReferrals: toInputString(existingInput.outreachReferrals),
        outreachInbound: toInputString(
          deriveOutreachInbound(
            existingInput.outreachInbound,
            existingInput.doorsKnocked,
            [
              existingInput.outreachDoorKnocks,
              existingInput.outreachTagsPut,
              existingInput.outreachCallsMade,
              existingInput.outreachReferrals,
            ]
          )
        ),
        appointmentsSetDoorKnocks: toInputString(existingInput.appointmentsSetDoorKnocks),
        appointmentsSetTagsPut: toInputString(existingInput.appointmentsSetTagsPut),
        appointmentsSetCallsMade: toInputString(existingInput.appointmentsSetCallsMade),
        appointmentsSetReferrals: toInputString(existingInput.appointmentsSetReferrals),
        appointmentsSetInbound: toInputString(existingInput.appointmentsSetInbound),
        appointmentsHeldDoorKnocks: toInputString(existingInput.appointmentsHeldDoorKnocks),
        appointmentsHeldTagsPut: toInputString(existingInput.appointmentsHeldTagsPut),
        appointmentsHeldCallsMade: toInputString(existingInput.appointmentsHeldCallsMade),
        appointmentsHeldReferrals: toInputString(existingInput.appointmentsHeldReferrals),
        appointmentsHeldInbound: toInputString(existingInput.appointmentsHeldInbound),
        dealsClosedDoorKnocks: toInputString(existingInput.dealsClosedDoorKnocks),
        dealsClosedTagsPut: toInputString(existingInput.dealsClosedTagsPut),
        dealsClosedCallsMade: toInputString(existingInput.dealsClosedCallsMade),
        dealsClosedReferrals: toInputString(existingInput.dealsClosedReferrals),
        dealsClosedInbound: toInputString(existingInput.dealsClosedInbound),
        accountsServicedDoorKnocks: toInputString(existingInput.accountsServicedDoorKnocks),
        accountsServicedTagsPut: toInputString(existingInput.accountsServicedTagsPut),
        accountsServicedCallsMade: toInputString(existingInput.accountsServicedCallsMade),
        accountsServicedReferrals: toInputString(existingInput.accountsServicedReferrals),
        accountsServicedInbound: toInputString(existingInput.accountsServicedInbound),
      });
      
      // Load tally counts if they exist
      if (existingInput.tallyCounts) {
        setTallyCounts(existingInput.tallyCounts);
      } else {
        setTallyCounts({});
      }
    } else {
      setExistingInput(null);
      // Reset form when switching to a date with no existing data
      setFormData({
        doorsKnocked: '',
        appointments: '',
        appointmentHolds: '',
        closedDeals: '',
        accountsServiced: '',
        hoursWorked: '',
        notes: '',
        outreachDoorKnocks: '',
        outreachTagsPut: '',
        outreachCallsMade: '',
        outreachReferrals: '',
        outreachInbound: '',
        appointmentsSetDoorKnocks: '',
        appointmentsSetTagsPut: '',
        appointmentsSetCallsMade: '',
        appointmentsSetReferrals: '',
        appointmentsSetInbound: '',
        appointmentsHeldDoorKnocks: '',
        appointmentsHeldTagsPut: '',
        appointmentsHeldCallsMade: '',
        appointmentsHeldReferrals: '',
        appointmentsHeldInbound: '',
        dealsClosedDoorKnocks: '',
        dealsClosedTagsPut: '',
        dealsClosedCallsMade: '',
        dealsClosedReferrals: '',
        dealsClosedInbound: '',
        accountsServicedDoorKnocks: '',
        accountsServicedTagsPut: '',
        accountsServicedCallsMade: '',
        accountsServicedReferrals: '',
        accountsServicedInbound: '',
      });
      setTallyCounts({});
    }
  }, [date, dailyInputs, scope]);

  // Prefill form data with period totals when scope is not 'day'
  useEffect(() => {
    if (scope !== 'day' && !periodLoading && periodTotals) {
      console.log('📊 Loading period totals into form:', {
        doors_knocked: periodTotals.doors_knocked,
        outreach_inbound: periodTotals.outreach_inbound,
        fullPeriodTotals: periodTotals
      });
      
      setFormData(prev => ({
        ...prev,
        // Main fields
        doorsKnocked: toInputString(periodTotals.doors_knocked),
        appointments: toInputString(periodTotals.appointments_set),
        appointmentHolds: toInputString(periodTotals.appointments_held),
        closedDeals: toInputString(periodTotals.closed_deals),
        accountsServiced: toInputString(periodTotals.accounts_serviced),
        hoursWorked: toInputString(periodTotals.hours_worked),
        // Sub-inputs for outreach
        outreachDoorKnocks: toInputString(periodTotals.outreach_door_knocks),
        outreachTagsPut: toInputString(periodTotals.outreach_tags_put),
        outreachCallsMade: toInputString(periodTotals.outreach_calls_made),
        outreachReferrals: toInputString(periodTotals.outreach_referrals),
        outreachInbound: toInputString(
          deriveOutreachInbound(
            periodTotals.outreach_inbound,
            periodTotals.doors_knocked,
            [
              periodTotals.outreach_door_knocks,
              periodTotals.outreach_tags_put,
              periodTotals.outreach_calls_made,
              periodTotals.outreach_referrals,
            ]
          )
        ),
        // Sub-inputs for appointments set
        appointmentsSetDoorKnocks: toInputString(periodTotals.appointments_set_door_knocks),
        appointmentsSetTagsPut: toInputString(periodTotals.appointments_set_tags_put),
        appointmentsSetCallsMade: toInputString(periodTotals.appointments_set_calls_made),
        appointmentsSetReferrals: toInputString(periodTotals.appointments_set_referrals),
        appointmentsSetInbound: toInputString(periodTotals.appointments_set_inbound),
        // Sub-inputs for appointments held
        appointmentsHeldDoorKnocks: toInputString(periodTotals.appointments_held_door_knocks),
        appointmentsHeldTagsPut: toInputString(periodTotals.appointments_held_tags_put),
        appointmentsHeldCallsMade: toInputString(periodTotals.appointments_held_calls_made),
        appointmentsHeldReferrals: toInputString(periodTotals.appointments_held_referrals),
        appointmentsHeldInbound: toInputString(periodTotals.appointments_held_inbound),
        // Sub-inputs for deals closed
        dealsClosedDoorKnocks: toInputString(periodTotals.deals_closed_door_knocks),
        dealsClosedTagsPut: toInputString(periodTotals.deals_closed_tags_put),
        dealsClosedCallsMade: toInputString(periodTotals.deals_closed_calls_made),
        dealsClosedReferrals: toInputString(periodTotals.deals_closed_referrals),
        dealsClosedInbound: toInputString(periodTotals.deals_closed_inbound),
        // Sub-inputs for accounts serviced
        accountsServicedDoorKnocks: toInputString(periodTotals.accounts_serviced_door_knocks),
        accountsServicedTagsPut: toInputString(periodTotals.accounts_serviced_tags_put),
        accountsServicedCallsMade: toInputString(periodTotals.accounts_serviced_calls_made),
        accountsServicedReferrals: toInputString(periodTotals.accounts_serviced_referrals),
        accountsServicedInbound: toInputString(periodTotals.accounts_serviced_inbound),
      }));
    }
  }, [scope, periodTotals, periodLoading]);

  // Refresh form data when screen comes into focus (after returning from TallyOutreach)
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        // Force reload of daily inputs to get latest data and sync
        if (user?.id) {
          try {
            console.log('📱 DailyInput screen focused, syncing data...');
            await syncData(); // This will sync from cloud and reload data
            
            // Force reload the form data after sync
            const selectedDateString = formatDateString(date);
            const updatedDailyInputs = await databaseService.getDailyInputs(user.id);
            const existingInput = updatedDailyInputs.find(input => input.date === selectedDateString);
            
            if (existingInput) {
              console.log('🔄 Reloading form data after sync:', existingInput);
              setExistingInput(existingInput);
              setFormData({
                doorsKnocked: toInputString(existingInput.doorsKnocked),
                appointments: toInputString(existingInput.appointments),
                appointmentHolds: toInputString(existingInput.appointmentHolds),
                closedDeals: toInputString(existingInput.closedDeals),
                accountsServiced: toInputString(existingInput.accountsServiced),
                hoursWorked: toInputString(existingInput.hoursWorked),
                notes: existingInput.notes || '',
                outreachDoorKnocks: toInputString(existingInput.outreachDoorKnocks),
                outreachTagsPut: toInputString(existingInput.outreachTagsPut),
                outreachCallsMade: toInputString(existingInput.outreachCallsMade),
                outreachReferrals: toInputString(existingInput.outreachReferrals),
                outreachInbound: toInputString(existingInput.outreachInbound),
                appointmentsSetDoorKnocks: toInputString(existingInput.appointmentsSetDoorKnocks),
                appointmentsSetTagsPut: toInputString(existingInput.appointmentsSetTagsPut),
                appointmentsSetCallsMade: toInputString(existingInput.appointmentsSetCallsMade),
                appointmentsSetReferrals: toInputString(existingInput.appointmentsSetReferrals),
                appointmentsSetInbound: toInputString(existingInput.appointmentsSetInbound),
                appointmentsHeldDoorKnocks: toInputString(existingInput.appointmentsHeldDoorKnocks),
                appointmentsHeldTagsPut: toInputString(existingInput.appointmentsHeldTagsPut),
                appointmentsHeldCallsMade: toInputString(existingInput.appointmentsHeldCallsMade),
                appointmentsHeldReferrals: toInputString(existingInput.appointmentsHeldReferrals),
                appointmentsHeldInbound: toInputString(existingInput.appointmentsHeldInbound),
                dealsClosedDoorKnocks: toInputString(existingInput.dealsClosedDoorKnocks),
                dealsClosedTagsPut: toInputString(existingInput.dealsClosedTagsPut),
                dealsClosedCallsMade: toInputString(existingInput.dealsClosedCallsMade),
                dealsClosedReferrals: toInputString(existingInput.dealsClosedReferrals),
                dealsClosedInbound: toInputString(existingInput.dealsClosedInbound),
                accountsServicedDoorKnocks: toInputString(existingInput.accountsServicedDoorKnocks),
                accountsServicedTagsPut: toInputString(existingInput.accountsServicedTagsPut),
                accountsServicedCallsMade: toInputString(existingInput.accountsServicedCallsMade),
                accountsServicedReferrals: toInputString(existingInput.accountsServicedReferrals),
                accountsServicedInbound: toInputString(existingInput.accountsServicedInbound),
              });
              
              // Load tally counts if they exist
              if (existingInput.tallyCounts) {
                setTallyCounts(existingInput.tallyCounts);
              } else {
                setTallyCounts({});
              }
            }
          } catch (error) {
            console.error('Failed to sync data on focus:', error);
            // Fallback to just loading local data
            try {
              await loadUserData(user.id);
            } catch (loadError) {
              console.error('Failed to load user data on focus:', loadError);
            }
          }
        }
      };
      
      refreshData();
    }, [user?.id, loadUserData, syncData, date])
  );

  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id]);

  // Test database connection and table structure
  useEffect(() => {
    const testDatabaseConnection = async () => {
      try {
        console.log('[DailyInputScreen] Testing database connection...');
        const dbInfo = await databaseService.getDatabaseInfo();
        console.log('[DailyInputScreen] Database info:', dbInfo);
        
        // Test Supabase connection
        if (user?.id) {
          console.log('[DailyInputScreen] Testing Supabase connection...');
          const supabaseInputs = await databaseService.getDailyInputsSupabaseFirst(user.id);
          console.log('[DailyInputScreen] Supabase daily inputs count:', supabaseInputs.length);
          
          // Test Supabase schema
          const { supabaseService } = await import('../services/supabaseService');
          const schemaCheck = await supabaseService.verifyDailyInputsTableSchema();
          console.log('[DailyInputScreen] Supabase schema check:', schemaCheck);
        }
      } catch (error) {
        console.error('[DailyInputScreen] Database connection test failed:', error);
      }
    };

    testDatabaseConnection();
  }, [user?.id]);

  const handleTallySave = (counts: { [key: string]: number }) => {
    setTallyCounts(counts);
    // Update the total doors knocked based on tally
    const totalOutreach = Object.values(counts).reduce((sum, count) => sum + count, 0);
    updateFormData('doorsKnocked', totalOutreach.toString());
  };

  // Fix navigation.navigate type error
  const openTallyCounter = () => {
    const dateString = formatDateString(date);
    (navigation.navigate as unknown as any)('TallyOutreach', { date: dateString });
  };

  const handleAssignLead = (leadId: string) => {
    const field = appointmentModalType === 'set' ? 'appointments' : 'appointmentHolds';
    const key = `${field}_${formatDateString(date)}`;
    
    setAppointmentLeadAssociations(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), leadId]
    }));
    
    // Update the lead with appointment information
    const dateString = formatDateString(date);
    console.log('🔍 Assigning lead with dateString:', dateString, 'from date:', date);
    updateLead(leadId, {
      appointmentStatus: appointmentModalType === 'held' ? 'held' : 'scheduled',
      appointmentCreatedFrom: `daily_input_${dateString}`,
      appointmentSetOnDate: dateString, // The date when the appointment was actually set
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCreateLead = async (leadData: Partial<Lead>) => {
    const newLead = await addLead(leadData as any); // Use correct type if possible
    if (newLead && newLead.id) {
      handleAssignLead(newLead.id);
    }
  };

  const handleDatabaseReset = async () => {
    try {
      setIsSubmitting(true);
      setSaveMessage({ type: 'error', text: 'Database reset is not supported.' });
    } catch (error) {
      console.error('Database reset failed:', error);
      setSaveMessage({ type: 'error', text: 'Failed to reset database. Please restart the app.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    handleSubmit();
  };

  const handleScopeChange = (newScope: Scope) => {
    setScope(newScope);
    
    // Adjust the date based on the new scope
    let adjustedDate = date;
    switch (newScope) {
      case 'day':
        setDatePickerMode('date');
        // Keep the current date as is
        break;
      case 'week':
        setDatePickerMode('date');
        // Adjust to the start of the week (Monday)
        adjustedDate = startOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'month':
        setDatePickerMode('month');
        // Adjust to the first day of the month
        adjustedDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      case 'year':
        setDatePickerMode('year');
        // Adjust to the first day of the year
        adjustedDate = new Date(date.getFullYear(), 0, 1);
        break;
    }
    
    // Update the date if it changed
    if (adjustedDate.getTime() !== date.getTime()) {
      setDate(adjustedDate);
    }
  };

  const handlePeriodSave = async (totals: PeriodTotals) => {
    if (scope === 'day') {
      // For day scope, use the existing save logic
      await handleSubmit();
      return;
    }

    // For other scopes, show confirmation modal
    setPendingPeriodSave(totals);
    setShowPeriodConfirmation(true);
  };

  const confirmPeriodSave = async () => {
    if (!pendingPeriodSave) return;

    try {
      const success = await savePeriodTotals(pendingPeriodSave);
      if (success) {
        setSaveMessage({ type: 'success', text: `Period totals saved successfully!` });
        setTimeout(() => setSaveMessage(null), 3000);
        
        await forceReload();
        await refetch();
        console.log('✅ Data reloaded and period totals refetched');
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save period totals' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error saving period totals' });
    }

    setShowPeriodConfirmation(false);
    setPendingPeriodSave(null);
  };

  const handleSubmit = async () => {
    setSaveMessage(null);

    // Check if user is authenticated
    if (!user?.id) {
      const errorMessage = 'User not authenticated. Please log in and try again.';
      console.error('[handleSubmit] ❌ User not authenticated');
      setCurrentError(errorMessage);
      setShowErrorModal(true);
      setSaveMessage({ type: 'error', text: errorMessage });
      return;
    }

    // For non-day scopes, use period save logic
    if (scope !== 'day') {
      const totals: PeriodTotals = {
        doors_knocked: parseInt(formData.doorsKnocked) || 0,
        appointments_set: parseInt(formData.appointments) || 0,
        appointments_held: parseInt(formData.appointmentHolds) || 0,
        closed_deals: parseInt(formData.closedDeals) || 0,
        accounts_serviced: parseInt(formData.accountsServiced) || 0,
        hours_worked: parseFloat(formData.hoursWorked) || 0,
        // Sub-inputs for outreach
        outreach_door_knocks: parseInt(formData.outreachDoorKnocks) || 0,
        outreach_tags_put: parseInt(formData.outreachTagsPut) || 0,
        outreach_calls_made: parseInt(formData.outreachCallsMade) || 0,
        outreach_referrals: parseInt(formData.outreachReferrals) || 0,
        outreach_inbound: parseInt(formData.outreachInbound) || 0,
        // Sub-inputs for appointments set
        appointments_set_door_knocks: parseInt(formData.appointmentsSetDoorKnocks) || 0,
        appointments_set_tags_put: parseInt(formData.appointmentsSetTagsPut) || 0,
        appointments_set_calls_made: parseInt(formData.appointmentsSetCallsMade) || 0,
        appointments_set_referrals: parseInt(formData.appointmentsSetReferrals) || 0,
        appointments_set_inbound: parseInt(formData.appointmentsSetInbound) || 0,
        // Sub-inputs for appointments held
        appointments_held_door_knocks: parseInt(formData.appointmentsHeldDoorKnocks) || 0,
        appointments_held_tags_put: parseInt(formData.appointmentsHeldTagsPut) || 0,
        appointments_held_calls_made: parseInt(formData.appointmentsHeldCallsMade) || 0,
        appointments_held_referrals: parseInt(formData.appointmentsHeldReferrals) || 0,
        appointments_held_inbound: parseInt(formData.appointmentsHeldInbound) || 0,
        // Sub-inputs for deals closed
        deals_closed_door_knocks: parseInt(formData.dealsClosedDoorKnocks) || 0,
        deals_closed_tags_put: parseInt(formData.dealsClosedTagsPut) || 0,
        deals_closed_calls_made: parseInt(formData.dealsClosedCallsMade) || 0,
        deals_closed_referrals: parseInt(formData.dealsClosedReferrals) || 0,
        deals_closed_inbound: parseInt(formData.dealsClosedInbound) || 0,
        // Sub-inputs for accounts serviced
        accounts_serviced_door_knocks: parseInt(formData.accountsServicedDoorKnocks) || 0,
        accounts_serviced_tags_put: parseInt(formData.accountsServicedTagsPut) || 0,
        accounts_serviced_calls_made: parseInt(formData.accountsServicedCallsMade) || 0,
        accounts_serviced_referrals: parseInt(formData.accountsServicedReferrals) || 0,
        accounts_serviced_inbound: parseInt(formData.accountsServicedInbound) || 0,
      };
      await handlePeriodSave(totals);
      return;
    }

    // Validate sub-inputs before submission
    const validations = [
      { field: 'doorsKnocked', prefix: 'outreach', label: 'Outreach Attempts' },
      { field: 'appointments', prefix: 'appointmentsSet', label: 'Appointments Set' },
      { field: 'appointmentHolds', prefix: 'appointmentsHeld', label: 'Appointments Held' }
    ];

    const errors = [];
    for (const validation of validations) {
      if (validation.field === 'doorsKnocked') {
        const error = validateOutreachAttempts(
          parseInt(formData.doorsKnocked) || 0,
          {
            outreachDoorKnocks: formData.outreachDoorKnocks,
            outreachTagsPut: formData.outreachTagsPut,
            outreachCallsMade: formData.outreachCallsMade,
            outreachReferrals: formData.outreachReferrals,
            outreachInbound: formData.outreachInbound,
          }
        );
        if (error) errors.push(error);
      } else {
        const validationResult = validateSubInputs(validation.field, validation.prefix, formData);
        if (!validationResult.isValid) {
          errors.push(`${validation.label}: Sub-inputs (${validationResult.subSum}) don't match main input (${validationResult.mainValue})`);
        }
      }
    }

    if (errors.length > 0) {
      setSaveMessage({ 
        type: 'error', 
        text: `Please fix the following validation errors:\n${errors.join('\n')}` 
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const inputData = {
        date: formatDateString(date),
        doorsKnocked: parseInt(formData.doorsKnocked) || 0,
        appointments: parseInt(formData.appointments) || 0,
        appointmentHolds: parseInt(formData.appointmentHolds) || 0,
        closedDeals: parseInt(formData.closedDeals) || 0,
        accountsServiced: parseInt(formData.accountsServiced) || 0,
        hoursWorked: parseFloat(formData.hoursWorked) || 0,
        notes: formData.notes.trim(),
        // Sub-inputs
        outreachDoorKnocks: parseInt(formData.outreachDoorKnocks) || 0,
        outreachTagsPut: parseInt(formData.outreachTagsPut) || 0,
        outreachCallsMade: parseInt(formData.outreachCallsMade) || 0,
        outreachReferrals: parseInt(formData.outreachReferrals) || 0,
        outreachInbound: parseInt(formData.outreachInbound) || 0,
        appointmentsSetDoorKnocks: parseInt(formData.appointmentsSetDoorKnocks) || 0,
        appointmentsSetTagsPut: parseInt(formData.appointmentsSetTagsPut) || 0,
        appointmentsSetCallsMade: parseInt(formData.appointmentsSetCallsMade) || 0,
        appointmentsSetReferrals: parseInt(formData.appointmentsSetReferrals) || 0,
        appointmentsSetInbound: parseInt(formData.appointmentsSetInbound) || 0,
        appointmentsHeldDoorKnocks: parseInt(formData.appointmentsHeldDoorKnocks) || 0,
        appointmentsHeldTagsPut: parseInt(formData.appointmentsHeldTagsPut) || 0,
        appointmentsHeldCallsMade: parseInt(formData.appointmentsHeldCallsMade) || 0,
        appointmentsHeldReferrals: parseInt(formData.appointmentsHeldReferrals) || 0,
        appointmentsHeldInbound: parseInt(formData.appointmentsHeldInbound) || 0,
        dealsClosedDoorKnocks: parseInt(formData.dealsClosedDoorKnocks) || 0,
        dealsClosedTagsPut: parseInt(formData.dealsClosedTagsPut) || 0,
        dealsClosedCallsMade: parseInt(formData.dealsClosedCallsMade) || 0,
        dealsClosedReferrals: parseInt(formData.dealsClosedReferrals) || 0,
        dealsClosedInbound: parseInt(formData.dealsClosedInbound) || 0,
        accountsServicedDoorKnocks: parseInt(formData.accountsServicedDoorKnocks) || 0,
        accountsServicedTagsPut: parseInt(formData.accountsServicedTagsPut) || 0,
        accountsServicedCallsMade: parseInt(formData.accountsServicedCallsMade) || 0,
        accountsServicedReferrals: parseInt(formData.accountsServicedReferrals) || 0,
        accountsServicedInbound: parseInt(formData.accountsServicedInbound) || 0,
        // Tally counts
        tallyCounts: tallyCounts,
      };

      console.log('[handleSubmit] Saving daily input with data:', JSON.stringify(inputData, null, 2));
      console.log('[handleSubmit] User ID:', user?.id);
      console.log('[handleSubmit] Existing input:', existingInput);
      console.log('[handleSubmit] Formatted date:', formatDateString(date));

      if (existingInput) {
        console.log('[handleSubmit] Updating existing input with ID:', existingInput.id);
        await updateDailyInput(existingInput.id, inputData);
        setSaveMessage({ type: 'success', text: 'Daily input updated successfully!' });
        console.log('[handleSubmit] ✅ Update completed successfully');
      } else {
        console.log('[handleSubmit] Creating new daily input');
        await addDailyInput(inputData);
        setSaveMessage({ type: 'success', text: 'Daily input saved successfully!' });
        console.log('[handleSubmit] ✅ Create completed successfully');
      }
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch (error) {
      console.error('[handleSubmit] ❌ Save error:', error);
      console.error('[handleSubmit] ❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to save daily input. Please try again.';
      
      // Show error modal for better user experience
      setCurrentError(errorMessage);
      setShowErrorModal(true);
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log data for debugging
  console.log('user:', user, 'settings:', settings, 'formData:', formData);

  const getInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fallback UI if data is missing
  if (!user || !settings) {
    return (
      <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main visible content
  const calendarButtonRef = useRef(null);
  const [calendarButtonY, setCalendarButtonY] = useState(0);

  // Visibility toggles
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  
  // Tally modal state
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [lastUsedSubInput, setLastUsedSubInput] = useState<'door_knocks' | 'tags_put' | 'calls_made' | 'referrals' | 'inbound'>('door_knocks');

  return (
    <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
                 {/* Header with Visibility Settings button */}
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 }}>
                       <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginLeft: 16 }}>Daily Input</Text>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => {
                  console.log('Tally button pressed!');
                  setShowTallyModal(true);
                }}
                style={{
                  backgroundColor: '#FF9900',
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  shadowColor: '#FF9900',
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontWeight: '600', 
                  fontSize: 12,
                }}>
                  Tally
                </Text>
              </Pressable>
              <Pressable 
                onPress={async () => {
                  try {
                    console.log('🔄 Manual refresh triggered...');
                    await syncData();
                    
                    // Force reload the form data after sync
                    if (user?.id) {
                      const selectedDateString = formatDateString(date);
                      const updatedDailyInputs = await databaseService.getDailyInputs(user.id);
                      const existingInput = updatedDailyInputs.find(input => input.date === selectedDateString);
                      
                      if (existingInput) {
                        console.log('🔄 Reloading form data after manual refresh:', existingInput);
                        setExistingInput(existingInput);
                        setFormData({
                          doorsKnocked: toInputString(existingInput.doorsKnocked),
                          appointments: toInputString(existingInput.appointments),
                          appointmentHolds: toInputString(existingInput.appointmentHolds),
                          closedDeals: toInputString(existingInput.closedDeals),
                          accountsServiced: toInputString(existingInput.accountsServiced),
                          hoursWorked: toInputString(existingInput.hoursWorked),
                          notes: existingInput.notes || '',
                          // Sub-inputs - show stored zero values instead of hiding them
                          outreachDoorKnocks: toInputString(existingInput.outreachDoorKnocks),
                          outreachTagsPut: toInputString(existingInput.outreachTagsPut),
                          outreachCallsMade: toInputString(existingInput.outreachCallsMade),
                          outreachReferrals: toInputString(existingInput.outreachReferrals),
                          outreachInbound: toInputString(
                            deriveOutreachInbound(
                              existingInput.outreachInbound,
                              existingInput.doorsKnocked,
                              [
                                existingInput.outreachDoorKnocks,
                                existingInput.outreachTagsPut,
                                existingInput.outreachCallsMade,
                                existingInput.outreachReferrals,
                              ]
                            )
                          ),
                          appointmentsSetDoorKnocks: toInputString(existingInput.appointmentsSetDoorKnocks),
                          appointmentsSetTagsPut: toInputString(existingInput.appointmentsSetTagsPut),
                          appointmentsSetCallsMade: toInputString(existingInput.appointmentsSetCallsMade),
                          appointmentsSetReferrals: toInputString(existingInput.appointmentsSetReferrals),
                          appointmentsSetInbound: toInputString(existingInput.appointmentsSetInbound),
                          appointmentsHeldDoorKnocks: toInputString(existingInput.appointmentsHeldDoorKnocks),
                          appointmentsHeldTagsPut: toInputString(existingInput.appointmentsHeldTagsPut),
                          appointmentsHeldCallsMade: toInputString(existingInput.appointmentsHeldCallsMade),
                          appointmentsHeldReferrals: toInputString(existingInput.appointmentsHeldReferrals),
                          appointmentsHeldInbound: toInputString(existingInput.appointmentsHeldInbound),
                          dealsClosedDoorKnocks: toInputString(existingInput.dealsClosedDoorKnocks),
                          dealsClosedTagsPut: toInputString(existingInput.dealsClosedTagsPut),
                          dealsClosedCallsMade: toInputString(existingInput.dealsClosedCallsMade),
                          dealsClosedReferrals: toInputString(existingInput.dealsClosedReferrals),
                          dealsClosedInbound: toInputString(existingInput.dealsClosedInbound),
                          accountsServicedDoorKnocks: toInputString(existingInput.accountsServicedDoorKnocks),
                          accountsServicedTagsPut: toInputString(existingInput.accountsServicedTagsPut),
                          accountsServicedCallsMade: toInputString(existingInput.accountsServicedCallsMade),
                          accountsServicedReferrals: toInputString(existingInput.accountsServicedReferrals),
                          accountsServicedInbound: toInputString(existingInput.accountsServicedInbound),
                        });
                        
                        // Load tally counts if they exist
                        if (existingInput.tallyCounts) {
                          setTallyCounts(existingInput.tallyCounts);
                        } else {
                          setTallyCounts({});
                        }
                      }
                    }
                    console.log('✅ Manual refresh completed');
                  } catch (error) {
                    console.error('❌ Manual refresh failed:', error);
                  }
                }} 
                style={{ padding: 8 }}
              >
                <Ionicons name="refresh" size={24} color="#FF9900" />
              </Pressable>
              <Pressable onPress={() => setShowVisibilityModal(true)} style={{ padding: 8 }}>
                <Ionicons name="eye" size={26} color="#FF9900" />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Profile')}
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'white',
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                }}
              >
                {user?.photoURL ? (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb' }} />
                ) : (
                  <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 14 }}>
                    {user ? getInitials(user.name) : 'U'}
                  </Text>
                )}
              </Pressable>
            </View>
         </View>

        {/* Visibility Settings Modal */}
        <Modal
          visible={showVisibilityModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowVisibilityModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 24, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Visibility Settings</Text>
                <Pressable onPress={() => setShowVisibilityModal(false)}>
                  <Ionicons name="close" size={26} color="#22223B" />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Outreach Attempts */}
                <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 8 }}>Outreach Attempts</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1 }}>Show Card</Text>
                  <Switch value={showOutreach} onValueChange={setShowOutreach} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Door Knocks</Text>
                    <Switch value={showOutreachDoorKnocks} onValueChange={setShowOutreachDoorKnocks} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Tags Put</Text>
                    <Switch value={showOutreachTagsPut} onValueChange={setShowOutreachTagsPut} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Calls Made</Text>
                    <Switch value={showOutreachCallsMade} onValueChange={setShowOutreachCallsMade} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Referrals</Text>
                    <Switch value={showOutreachReferrals} onValueChange={setShowOutreachReferrals} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Inbound</Text>
                    <Switch value={showOutreachInbound} onValueChange={setShowOutreachInbound} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
                {/* Appointments Set */}
                <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 8 }}>Appointments Set</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1 }}>Show Card</Text>
                  <Switch value={showAppointmentsSet} onValueChange={setShowAppointmentsSet} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Door Knocks</Text>
                    <Switch value={showAppointmentsSetDoorKnocks} onValueChange={setShowAppointmentsSetDoorKnocks} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Tags Put</Text>
                    <Switch value={showAppointmentsSetTagsPut} onValueChange={setShowAppointmentsSetTagsPut} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Calls Made</Text>
                    <Switch value={showAppointmentsSetCallsMade} onValueChange={setShowAppointmentsSetCallsMade} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Referrals</Text>
                    <Switch value={showAppointmentsSetReferrals} onValueChange={setShowAppointmentsSetReferrals} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Inbound</Text>
                    <Switch value={showAppointmentsSetInbound} onValueChange={setShowAppointmentsSetInbound} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
                {/* Appointments Held */}
                <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 8 }}>Appointments Held</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1 }}>Show Card</Text>
                  <Switch value={showAppointmentsHeld} onValueChange={setShowAppointmentsHeld} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Door Knocks</Text>
                    <Switch value={showAppointmentsHeldDoorKnocks} onValueChange={setShowAppointmentsHeldDoorKnocks} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Tags Put</Text>
                    <Switch value={showAppointmentsHeldTagsPut} onValueChange={setShowAppointmentsHeldTagsPut} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Calls Made</Text>
                    <Switch value={showAppointmentsHeldCallsMade} onValueChange={setShowAppointmentsHeldCallsMade} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Referrals</Text>
                    <Switch value={showAppointmentsHeldReferrals} onValueChange={setShowAppointmentsHeldReferrals} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Inbound</Text>
                    <Switch value={showAppointmentsHeldInbound} onValueChange={setShowAppointmentsHeldInbound} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
                {/* Closed Deals */}
                <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 8 }}>Closed Deals</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1 }}>Show Card</Text>
                  <Switch value={showClosedDeals} onValueChange={setShowClosedDeals} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Door Knocks</Text>
                    <Switch value={showClosedDealsDoorKnocks} onValueChange={setShowClosedDealsDoorKnocks} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Tags Put</Text>
                    <Switch value={showClosedDealsTagsPut} onValueChange={setShowClosedDealsTagsPut} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Calls Made</Text>
                    <Switch value={showClosedDealsCallsMade} onValueChange={setShowClosedDealsCallsMade} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Referrals</Text>
                    <Switch value={showClosedDealsReferrals} onValueChange={setShowClosedDealsReferrals} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Inbound</Text>
                    <Switch value={showClosedDealsInbound} onValueChange={setShowClosedDealsInbound} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
                {/* Accounts Serviced */}
                <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 8 }}>Accounts Serviced</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ flex: 1 }}>Show Card</Text>
                  <Switch value={showAccountsServiced} onValueChange={setShowAccountsServiced} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Door Knocks</Text>
                    <Switch value={showAccountsServicedDoorKnocks} onValueChange={setShowAccountsServicedDoorKnocks} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Tags Put</Text>
                    <Switch value={showAccountsServicedTagsPut} onValueChange={setShowAccountsServicedTagsPut} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Calls Made</Text>
                    <Switch value={showAccountsServicedCallsMade} onValueChange={setShowAccountsServicedCallsMade} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Referrals</Text>
                    <Switch value={showAccountsServicedReferrals} onValueChange={setShowAccountsServicedReferrals} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>Inbound</Text>
                    <Switch value={showAccountsServicedInbound} onValueChange={setShowAccountsServicedInbound} />
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: showDatePicker ? 340 : 48 }}
          keyboardShouldPersistTaps="handled"
        >
                     {/* Scope Selector */}
           <ScopeSelector
             selectedScope={scope}
             onScopeChange={handleScopeChange}
           />

          {/* Period Header */}
          <View style={{ marginBottom: 16, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '500', textAlign: 'center' }}>
              Viewing: {period.title}
            </Text>
            {scope !== 'day' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="information-circle" size={16} color="#FFB84D" />
                <Text style={{ color: '#FFB84D', fontSize: 12, marginLeft: 4 }}>
                  Period entries are saved as daily records
                </Text>
              </View>
            )}
          </View>

          {/* Calendar Date Picker */}
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
            <Pressable
              ref={calendarButtonRef}
              onLayout={event => {
                const { y, height } = event.nativeEvent.layout;
                setCalendarButtonY(y + height);
              }}
              onPress={() => {
                // Ensure we're setting a valid date to tempDate
                const validDate = getValidDate(date);
                setTempDate(validDate);
                console.log('Opening date picker with tempDate:', validDate);
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
                 {scope === 'day' ? date.toLocaleDateString() : 
                  scope === 'week' ? `${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'MMM d, yyyy')}` :
                  scope === 'month' ? format(date, 'MMMM yyyy') :
                  format(date, 'yyyy')}
               </Text>
            </Pressable>
            {showDatePicker && (
              <>
                {/* Overlay for dismiss */}
                <Pressable
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                  onPress={() => setShowDatePicker(false)}
                  accessibilityLabel="Dismiss date picker"
                />
                {/* Popover below the button */}
                <View
                  style={{
                    position: 'absolute',
                    top: calendarButtonY + 8, // 8px below the button
                    left: 0,
                    right: 0,
                    marginHorizontal: 16,
                    backgroundColor: 'white',
                    borderRadius: 20,
                    shadowColor: '#000',
                    shadowOpacity: 0.12,
                    shadowRadius: 12,
                    alignItems: 'center',
                    zIndex: 100,
                    padding: 16,
                  }}
                >
                                                                           {datePickerMode === 'date' && scope !== 'week' ? (
                      <DateTimePicker
                        key={`date-picker-${tempDate.getTime()}`}
                        value={tempDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, selectedDate) => {
                          console.log('DateTimePicker onChange:', { selectedDate, tempDate });
                          if (selectedDate) {
                            const validDate = getValidDate(selectedDate);
                            console.log('Setting tempDate to:', validDate);
                            setTempDate(validDate);
                          }
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
                                         ) : scope === 'week' ? (
                       <View style={{ alignItems: 'center', width: 320 }}>
                         <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Select Week</Text>
                         <Text style={{ fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' }}>
                           Tap any day to select that week
                         </Text>
                         
                         {/* Week Navigation */}
                         <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 280, marginBottom: 12 }}>
                           <Pressable
                             onPress={() => {
                               const newDate = new Date(tempDate);
                               newDate.setDate(tempDate.getDate() - 7);
                               setTempDate(newDate);
                             }}
                             style={{
                               width: 40,
                               height: 40,
                               borderRadius: 20,
                               backgroundColor: '#F3F4F6',
                               justifyContent: 'center',
                               alignItems: 'center',
                             }}
                           >
                             <Ionicons name="chevron-back" size={20} color="#374151" />
                           </Pressable>
                           
                           <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                             {format(startOfWeek(tempDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(tempDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                           </Text>
                           
                           <Pressable
                             onPress={() => {
                               const newDate = new Date(tempDate);
                               newDate.setDate(tempDate.getDate() + 7);
                               setTempDate(newDate);
                             }}
                             style={{
                               width: 40,
                               height: 40,
                               borderRadius: 20,
                               backgroundColor: '#F3F4F6',
                               justifyContent: 'center',
                               alignItems: 'center',
                             }}
                           >
                             <Ionicons name="chevron-forward" size={20} color="#374151" />
                           </Pressable>
                         </View>
                         
                         <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 280 }}>
                          {Array.from({ length: 7 }, (_, i) => {
                            const weekStart = startOfWeek(tempDate, { weekStartsOn: 1 });
                            const dayDate = new Date(weekStart);
                            dayDate.setDate(weekStart.getDate() + i);
                            const isSelected = tempDate.getDate() === dayDate.getDate() && 
                                             tempDate.getMonth() === dayDate.getMonth() && 
                                             tempDate.getFullYear() === dayDate.getFullYear();
                            const isCurrentWeek = tempDate.getTime() >= weekStart.getTime() && 
                                                tempDate.getTime() <= endOfWeek(tempDate, { weekStartsOn: 1 }).getTime();
                            return (
                              <Pressable
                                key={i}
                                onPress={() => {
                                  setTempDate(dayDate);
                                }}
                                style={{
                                  width: 35,
                                  height: 35,
                                  margin: 2,
                                  borderRadius: 8,
                                  backgroundColor: isSelected ? '#FF9900' : 
                                                 isCurrentWeek ? '#FFF3E0' : '#F3F4F6',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderWidth: isCurrentWeek ? 1 : 0,
                                  borderColor: '#FFB84D',
                                }}
                              >
                                <Text style={{ 
                                  color: isSelected ? 'white' : '#374151',
                                  fontWeight: isSelected ? '600' : '500',
                                  fontSize: 12
                                }}>
                                  {dayDate.getDate()}
                                </Text>
                                <Text style={{ 
                                  color: isSelected ? 'white' : '#666',
                                  fontSize: 8,
                                  marginTop: -2
                                }}>
                                  {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                </Text>
                              </Pressable>
                            );
                          })}
                                                 </View>
                         <View style={{ marginTop: 12, padding: 8, backgroundColor: '#F8F9FA', borderRadius: 8, width: '100%' }}>
                           <Text style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>
                             Week {getWeek(tempDate, { weekStartsOn: 1 })}
                           </Text>
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
                                     <Pressable
                     onPress={() => {
                       // Ensure tempDate is valid before proceeding
                       const validTempDate = getValidDate(tempDate);
                       
                       // For week scope, ensure the date represents the start of the week
                       let finalDate = validTempDate;
                       if (scope === 'week') {
                         finalDate = startOfWeek(validTempDate, { weekStartsOn: 1 });
                       }
                       
                       console.log('Setting final date to:', finalDate);
                       setDate(finalDate);
                       setShowDatePicker(false);
                     }}
                    style={{
                      backgroundColor: '#FF9900',
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginTop: 12,
                      width: 240,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Done</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* Validation and Save Messages */}
          {saveMessage && saveMessage.type === 'success' && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 16,
              right: 16,
              zIndex: 1000,
              backgroundColor: '#10B981',
              borderRadius: 12,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 5,
            }}>
              <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{saveMessage.text}</Text>
            </View>
          )}
          {saveMessage && saveMessage.type === 'error' && (
            <View style={{
              backgroundColor: '#FFF5F5',
              borderColor: '#D32F2F',
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <Ionicons name="alert-circle" size={24} color="#D32F2F" style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={{ color: '#D32F2F', fontWeight: '500', fontSize: 15, flex: 1 }}>
                {saveMessage.text.split('\n').filter(line => line.trim() && !line.toLowerCase().includes('please fix'))[0] || saveMessage.text}
              </Text>
            </View>
          )}

          {/* OUTREACH SECTION */}
          {showOutreach && (
            <View style={{ marginBottom: 28, marginTop: showDatePicker ? 32 : 0 }}>
              <Text style={{ color: '#FF9900', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>Outreach</Text>
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, marginBottom: 8 }}>
                <NumberInput
                  label="Outreach Attempts"
                  value={formData.doorsKnocked}
                  onChangeText={text => updateFormData('doorsKnocked', text)}
                  placeholder="Auto-calculated from sub-inputs"
                  required
                  icon="walk"
                  color="bg-blue-500"
                  editable={false}
                />
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, marginTop: 4 }}>
                  {showOutreachDoorKnocks && <SubInput label="Door Knocks" value={formData.outreachDoorKnocks} onChangeText={text => updateFormData('outreachDoorKnocks', text)} placeholder="" icon="walk" color="bg-blue-400" />}
                  {showOutreachTagsPut && <SubInput label="Tags Put" value={formData.outreachTagsPut} onChangeText={text => updateFormData('outreachTagsPut', text)} placeholder="" icon="pricetag" color="bg-yellow-400" />}
                  {showOutreachCallsMade && <SubInput label="Calls Made" value={formData.outreachCallsMade} onChangeText={text => updateFormData('outreachCallsMade', text)} placeholder="" icon="call" color="bg-green-400" />}
                  {showOutreachReferrals && <SubInput label="Referrals" value={formData.outreachReferrals} onChangeText={text => updateFormData('outreachReferrals', text)} placeholder="" icon="people" color="bg-purple-400" />}
                  {showOutreachInbound && <SubInput label="Inbound" value={formData.outreachInbound} onChangeText={text => updateFormData('outreachInbound', text)} placeholder="" icon="download" color="bg-pink-400" />}
                </View>
              </View>
            </View>
          )}

          {/* APPOINTMENTS SECTION */}
          {showAppointmentsSet && (
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#FF9900', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>Appointments</Text>
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, marginBottom: 8 }}>
                <NumberInput
                  label="Appointments Set"
                  value={formData.appointments}
                  onChangeText={text => updateFormData('appointments', text)}
                  placeholder="Auto-calculated from sub-inputs"
                  required
                  icon="calendar"
                  color="bg-green-500"
                  editable={false}
                />
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, marginTop: 4 }}>
                  {showAppointmentsSetDoorKnocks && <SubInput label="Door Knocks" value={formData.appointmentsSetDoorKnocks} onChangeText={text => updateFormData('appointmentsSetDoorKnocks', text)} placeholder="" icon="walk" color="bg-blue-400" />}
                  {showAppointmentsSetTagsPut && <SubInput label="Tags Put" value={formData.appointmentsSetTagsPut} onChangeText={text => updateFormData('appointmentsSetTagsPut', text)} placeholder="" icon="pricetag" color="bg-yellow-400" />}
                  {showAppointmentsSetCallsMade && <SubInput label="Calls Made" value={formData.appointmentsSetCallsMade} onChangeText={text => updateFormData('appointmentsSetCallsMade', text)} placeholder="" icon="call" color="bg-green-400" />}
                  {showAppointmentsSetReferrals && <SubInput label="Referrals" value={formData.appointmentsSetReferrals} onChangeText={text => updateFormData('appointmentsSetReferrals', text)} placeholder="" icon="people" color="bg-purple-400" />}
                  {showAppointmentsSetInbound && <SubInput label="Inbound" value={formData.appointmentsSetInbound} onChangeText={text => updateFormData('appointmentsSetInbound', text)} placeholder="" icon="download" color="bg-pink-400" />}
                </View>
                <NumberInput
                  label="Appointments Held"
                  value={formData.appointmentHolds}
                  onChangeText={text => updateFormData('appointmentHolds', text)}
                  placeholder="Auto-calculated from sub-inputs"
                  required
                  icon="hand-left"
                  color="bg-orange-500"
                  editable={false}
                />
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, marginTop: 4 }}>
                  {showAppointmentsHeldDoorKnocks && <SubInput label="Door Knocks" value={formData.appointmentsHeldDoorKnocks} onChangeText={text => updateFormData('appointmentsHeldDoorKnocks', text)} placeholder="" icon="walk" color="bg-blue-400" />}
                  {showAppointmentsHeldTagsPut && <SubInput label="Tags Put" value={formData.appointmentsHeldTagsPut} onChangeText={text => updateFormData('appointmentsHeldTagsPut', text)} placeholder="" icon="pricetag" color="bg-yellow-400" />}
                  {showAppointmentsHeldCallsMade && <SubInput label="Calls Made" value={formData.appointmentsHeldCallsMade} onChangeText={text => updateFormData('appointmentsHeldCallsMade', text)} placeholder="" icon="call" color="bg-green-400" />}
                  {showAppointmentsHeldReferrals && <SubInput label="Referrals" value={formData.appointmentsHeldReferrals} onChangeText={text => updateFormData('appointmentsHeldReferrals', text)} placeholder="" icon="people" color="bg-purple-400" />}
                  {showAppointmentsHeldInbound && <SubInput label="Inbound" value={formData.appointmentsHeldInbound} onChangeText={text => updateFormData('appointmentsHeldInbound', text)} placeholder="" icon="download" color="bg-pink-400" />}
                </View>
              </View>
            </View>
          )}

          {/* RESULTS SECTION */}
          {(showClosedDeals || showAccountsServiced) && (
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#FF9900', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>Results</Text>
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, marginBottom: 8 }}>
                {showClosedDeals && (
                  <>
                    <NumberInput
                      label="Closed Deals"
                      value={formData.closedDeals}
                      onChangeText={text => updateFormData('closedDeals', text)}
                      placeholder="Auto-calculated from sub-inputs"
                      icon="checkmark-circle"
                      color="bg-indigo-500"
                      editable={false}
                    />
                    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, marginTop: 4 }}>
                      {showClosedDealsDoorKnocks && <SubInput label="Door Knocks" value={formData.dealsClosedDoorKnocks} onChangeText={text => updateFormData('dealsClosedDoorKnocks', text)} placeholder="" icon="walk" color="bg-blue-400" />}
                      {showClosedDealsTagsPut && <SubInput label="Tags Put" value={formData.dealsClosedTagsPut} onChangeText={text => updateFormData('dealsClosedTagsPut', text)} placeholder="" icon="pricetag" color="bg-yellow-400" />}
                      {showClosedDealsCallsMade && <SubInput label="Calls Made" value={formData.dealsClosedCallsMade} onChangeText={text => updateFormData('dealsClosedCallsMade', text)} placeholder="" icon="call" color="bg-green-400" />}
                      {showClosedDealsReferrals && <SubInput label="Referrals" value={formData.dealsClosedReferrals} onChangeText={text => updateFormData('dealsClosedReferrals', text)} placeholder="" icon="people" color="bg-purple-400" />}
                      {showClosedDealsInbound && <SubInput label="Inbound" value={formData.dealsClosedInbound} onChangeText={text => updateFormData('dealsClosedInbound', text)} placeholder="" icon="download" color="bg-pink-400" />}
                    </View>
                  </>
                )}
                {showAccountsServiced && (
                  <>
                    <NumberInput
                      label="Accounts Serviced"
                      value={formData.accountsServiced}
                      onChangeText={text => updateFormData('accountsServiced', text)}
                      placeholder="Auto-calculated from sub-inputs"
                      icon="briefcase"
                      color="bg-teal-500"
                      editable={false}
                    />
                    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, marginTop: 4 }}>
                      {showAccountsServicedDoorKnocks && <SubInput label="Door Knocks" value={formData.accountsServicedDoorKnocks} onChangeText={text => updateFormData('accountsServicedDoorKnocks', text)} placeholder="" icon="walk" color="bg-blue-400" />}
                      {showAccountsServicedTagsPut && <SubInput label="Tags Put" value={formData.accountsServicedTagsPut} onChangeText={text => updateFormData('accountsServicedTagsPut', text)} placeholder="" icon="pricetag" color="bg-yellow-400" />}
                      {showAccountsServicedCallsMade && <SubInput label="Calls Made" value={formData.accountsServicedCallsMade} onChangeText={text => updateFormData('accountsServicedCallsMade', text)} placeholder="" icon="call" color="bg-green-400" />}
                      {showAccountsServicedReferrals && <SubInput label="Referrals" value={formData.accountsServicedReferrals} onChangeText={text => updateFormData('accountsServicedReferrals', text)} placeholder="" icon="people" color="bg-purple-400" />}
                      {showAccountsServicedInbound && <SubInput label="Inbound" value={formData.accountsServicedInbound} onChangeText={text => updateFormData('accountsServicedInbound', text)} placeholder="" icon="download" color="bg-pink-400" />}
                    </View>
                  </>
                )}
                <NumberInput
                  label="Hours Worked"
                  value={formData.hoursWorked}
                  onChangeText={text => updateFormData('hoursWorked', text)}
                  placeholder="Enter hours worked"
                  icon="time"
                  color="bg-gray-500"
                />
              </View>
            </View>
          )}

          {/* NOTES SECTION */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: '#FF9900', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>Notes</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
              <TextInput
                value={formData.notes}
                onChangeText={text => updateFormData('notes', text)}
                placeholder="Add any notes..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base font-normal"
                style={{ minHeight: 60, textAlignVertical: 'top' }}
              />
            </View>
          </View>

          {/* SAVE BUTTON */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || periodLoading}
            style={{ backgroundColor: (isSubmitting || periodLoading) ? '#FFB84D' : '#FF9900', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8, shadowColor: '#FF9900', shadowOpacity: 0.2, shadowRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>
              {isSubmitting || periodLoading ? 'Saving...' : scope === 'day' ? 'Save' : 'Save Period'}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Period Save Confirmation Modal */}
        <PeriodSaveConfirmationModal
          visible={showPeriodConfirmation}
          onConfirm={confirmPeriodSave}
          onCancel={() => {
            setShowPeriodConfirmation(false);
            setPendingPeriodSave(null);
          }}
          periodTitle={period.title}
          scope={scope}
        />

        {/* Tally Modal */}
        <TallyModal
          visible={showTallyModal}
          onClose={() => setShowTallyModal(false)}
          userId={user?.id || ''}
          inputDate={date}
          lastUsedSubInput={lastUsedSubInput}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};
