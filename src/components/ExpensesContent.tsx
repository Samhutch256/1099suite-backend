import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainerRef } from '@react-navigation/native';
import { usePlaidStore, SyncedTransaction, TransactionFilters } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { useContractorStore, Expense } from '../state/contractorStore';
import { cn } from '../utils/cn';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS,
  useAnimatedGestureHandler,
  withTiming,
  interpolateColor,
  interpolate,
  FadeInUp,
  FadeOutDown,
  Layout
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import PlaidLinkWebView from './PlaidLinkWebView';

const screenWidth = Dimensions.get('window').width;

interface TransactionCardProps {
  transaction: SyncedTransaction;
  onClassify: (id: string, classification: 'business' | 'personal' | 'income') => void;
  onTag: (id: string) => void;
  onRemove: (id: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClassify, onTag, onRemove }) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [showClassificationOptions, setShowClassificationOptions] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Add haptic feedback when starting to swipe
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(1.02);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      const threshold = screenWidth * 0.25;
      const progress = Math.abs(event.translationX) / threshold;
      
      // Dynamic scale based on swipe progress
      scale.value = withTiming(1 + (progress * 0.05));
      
      // Slight rotation for more dynamic feel
      rotation.value = withTiming(event.translationX * 0.1);
      
      // Opacity feedback based on swipe progress
      if (Math.abs(event.translationX) > threshold) {
        opacity.value = withTiming(0.6);
        // Add stronger haptic feedback when crossing threshold
        if (Math.abs(event.translationX) > threshold && Math.abs(event.translationX) < threshold + 10) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        opacity.value = withTiming(1);
      }
    },
    onEnd: (event) => {
      const threshold = screenWidth * 0.25;
      
      if (event.translationX > threshold) {
        // Swipe right - Business
        translateX.value = withSpring(screenWidth, { damping: 15, stiffness: 150 });
        opacity.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
        rotation.value = withSpring(5, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(-50, { damping: 15, stiffness: 150 });
        
        // Success haptic feedback
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        
        // Trigger removal animation
        runOnJS(setIsRemoving)(true);
        
        // Use runOnJS to call the classification function from UI thread
        runOnJS(onClassify)(transaction.id, 'business');
        
      } else if (event.translationX < -threshold) {
        // Swipe left - Personal
        translateX.value = withSpring(-screenWidth, { damping: 15, stiffness: 150 });
        opacity.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
        rotation.value = withSpring(-5, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(-50, { damping: 15, stiffness: 150 });
        
        // Success haptic feedback
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        
        // Trigger removal animation
        runOnJS(setIsRemoving)(true);
        
        // Use runOnJS to call the classification function from UI thread
        runOnJS(onClassify)(transaction.id, 'personal');
        
      } else {
        // Return to center with bounce
        translateX.value = withSpring(0, { damping: 12, stiffness: 200 });
        opacity.value = withSpring(1, { damping: 12, stiffness: 200 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        rotation.value = withSpring(0, { damping: 12, stiffness: 200 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Color interpolation based on swipe direction
    const backgroundColor = interpolateColor(
      translateX.value,
      [-screenWidth * 0.25, 0, screenWidth * 0.25],
      ['#fef2f2', '#1f2937', '#f0fdf4'] // red, gray, green
    );

    const borderColor = interpolateColor(
      translateX.value,
      [-screenWidth * 0.25, 0, screenWidth * 0.25],
      ['#ef4444', '#374151', '#22c55e'] // red, gray, green
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ] as any,
      opacity: opacity.value,
      backgroundColor,
      borderColor,
    };
  });

  const getClassificationColor = () => {
    switch (transaction.classification) {
      case 'business':
        return 'border-blue-500 bg-blue-900/20';
      case 'personal':
        return 'border-red-500 bg-red-900/20';
      case 'income':
        return 'border-green-500 bg-green-900/20';
      default:
        return 'border-gray-600 bg-gray-800/50';
    }
  };

  const getClassificationLabel = () => {
    switch (transaction.classification) {
      case 'business':
        return 'Business';
      case 'personal':
        return 'Personal';
      case 'income':
        return 'Income';
      default:
        return 'Unclassified';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleClassification = (classification: 'business' | 'personal' | 'income') => {
    setShowClassificationOptions(false);
    onClassify(transaction.id, classification);
  };

  const handleCardPress = () => {
    setShowClassificationOptions(!showClassificationOptions);
  };

  // Swipe direction indicators
  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -50 ? interpolate(translateX.value, [-screenWidth * 0.25, -50], [1, 0]) : 0,
    transform: [{ scale: translateX.value < -50 ? interpolate(translateX.value, [-screenWidth * 0.25, -50], [1.2, 0.8]) : 0.8 }],
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 50 ? interpolate(translateX.value, [50, screenWidth * 0.25], [0, 1]) : 0,
    transform: [{ scale: translateX.value > 50 ? interpolate(translateX.value, [50, screenWidth * 0.25], [0.8, 1.2]) : 0.8 }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View
        style={animatedStyle}
        className="w-full rounded-xl p-4 shadow-lg border-2 mb-4 relative overflow-hidden"
        entering={FadeInUp.duration(400).springify().damping(15)}
        exiting={FadeOutDown.duration(300).springify().damping(20)}
        layout={Layout.springify().damping(15).stiffness(150)}
      >
        {/* Swipe Direction Indicators */}
        <Animated.View 
          style={leftIndicatorStyle}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-red-500 rounded-full p-2"
        >
          <Ionicons name="person" size={20} color="white" />
        </Animated.View>
        
        <Animated.View 
          style={rightIndicatorStyle}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-500 rounded-full p-2"
        >
          <Ionicons name="briefcase" size={20} color="white" />
        </Animated.View>
        <Pressable onPress={handleCardPress} className="flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {transaction.description}
              </Text>
              <Text className="text-gray-300 text-sm">
                {transaction.merchantName || transaction.accountName}
              </Text>
            </View>
            <View className="items-end">
              <Text className={cn(
                "text-lg font-bold",
                transaction.amount >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(Math.abs(transaction.amount))}
              </Text>
              <Text className="text-gray-400 text-xs">
                {formatDate(transaction.date)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <View className={cn(
                "px-2 py-1 rounded-full border",
                getClassificationColor()
              )}>
                <Text className={cn(
                  "text-xs font-medium",
                  transaction.classification === 'business' ? "text-blue-300" :
                  transaction.classification === 'personal' ? "text-red-300" :
                  transaction.classification === 'income' ? "text-green-300" :
                  "text-gray-300"
                )}>
                  {getClassificationLabel()}
                </Text>
              </View>
              
              {transaction.clientTag && (
                <View className="px-2 py-1 rounded-full bg-purple-900/20 border border-purple-500/30">
                  <Text className="text-purple-300 text-xs font-medium">
                    {transaction.clientTag}
                  </Text>
                </View>
              )}
              
              {transaction.jobTag && (
                <View className="px-2 py-1 rounded-full bg-orange-900/20 border border-orange-500/30">
                  <Text className="text-orange-300 text-xs font-medium">
                    {transaction.jobTag}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center space-x-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onTag(transaction.id);
                }}
                className="p-2 rounded-lg bg-gray-700/50"
              >
                <Ionicons name="create" size={16} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        </Pressable>

        {showClassificationOptions && (
          <View className="mt-3 pt-3 border-t border-gray-600">
            <Text className="text-gray-300 text-sm mb-2">Classify as:</Text>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => handleClassification('business')}
                className="flex-1 bg-blue-500 rounded-lg py-2"
              >
                <Text className="text-white text-center font-medium">Business</Text>
              </Pressable>
              <Pressable
                onPress={() => handleClassification('personal')}
                className="flex-1 bg-red-500 rounded-lg py-2"
              >
                <Text className="text-white text-center font-medium">Personal</Text>
              </Pressable>
              <Pressable
                onPress={() => handleClassification('income')}
                className="flex-1 bg-green-500 rounded-lg py-2"
              >
                <Text className="text-white text-center font-medium">Income</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>
    </PanGestureHandler>
  );
};

interface EditTransactionModalProps {
  visible: boolean;
  transaction: SyncedTransaction | null;
  onClose: () => void;
  onSave: (updates: any) => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  visible, 
  transaction, 
  onClose, 
  onSave 
}) => {
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isBusiness, setIsBusiness] = useState(true);
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { classifyTransaction, updateTransactionCategory, tagTransaction } = usePlaidStore();

  React.useEffect(() => {
    if (transaction) {
      setAmount(Math.abs(transaction.amount).toString());
      setVendor(transaction.merchantName || transaction.description || '');
      setCategory(transaction.category || '');
      setNotes(''); // SyncedTransaction doesn't have notes
      setIsBusiness(transaction.classification === 'business');
      setDate(transaction.date || '');
      setError('');
    }
  }, [transaction]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!vendor.trim()) {
      setError('Please enter a vendor name');
      return false;
    }
    if (!category.trim()) {
      setError('Please enter a category');
      return false;
    }
    if (!date.trim()) {
      setError('Please enter a date');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (transaction) {
        // Update transaction in plaid store
        const syncedTx = transaction;
        
        // Update classification
        classifyTransaction(syncedTx.id, isBusiness ? 'business' : 'personal');
        
        // Update category
        updateTransactionCategory(syncedTx.id, category);
        
        // Update merchant name/description
        if (vendor !== syncedTx.merchantName && vendor !== syncedTx.description) {
          // Note: We'll need to add a function to update merchant name
          // For now, we'll use the tagTransaction function to store vendor info
          tagTransaction(syncedTx.id, undefined, vendor);
        }
      }

      // Call the parent save function
      onSave({
        id: transaction!.id,
        amount: parseFloat(amount) || 0,
        vendor,
        category,
        notes,
        isBusiness,
        date
      });

    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  console.log('EditTransactionModal render - visible:', visible, 'transaction:', transaction?.id);
  if (!visible || !transaction) return null;

  return (
    <View className="absolute inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <View className="bg-white rounded-2xl mx-4 w-full max-w-md h-[85%]">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Pressable onPress={onClose} disabled={isLoading}>
            <Text className={cn("font-semibold", isLoading ? "text-gray-400" : "text-gray-600")}>
              CANCEL
            </Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Edit Expense</Text>
          <Pressable onPress={handleSave} disabled={isLoading}>
            <View className="flex-row items-center">
              {isLoading ? (
                <Text className="text-gray-400 font-semibold">SAVING...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  <Text className="text-blue-500 font-semibold ml-1">SAVE</Text>
                </>
              )}
            </View>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Error Message */}
          {error ? (
            <View className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Amount Section */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">AMOUNT</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              className="border border-gray-300 rounded-lg p-3 text-3xl font-bold text-gray-900 text-center"
              placeholder="0.00"
              keyboardType="numeric"
              editable={!isLoading}
            />
            <View className="flex-row justify-end mt-2">
              <Pressable className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg" disabled={isLoading}>
                <Ionicons name="camera" size={20} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-2">ATTACH RECEIPT</Text>
              </Pressable>
            </View>
          </View>

          {/* Transaction Source */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">TRANSACTION SOURCE</Text>
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-gray-900 font-semibold">AMERICAN EXPRESS</Text>
              <Text className="text-gray-600 text-sm">American Express Gold Card *1003</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {transaction.merchantName || transaction.description}
              </Text>
            </View>
          </View>

          {/* Vendor */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">VENDOR</Text>
            <TextInput
              value={vendor}
              onChangeText={setVendor}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Enter vendor name"
              editable={!isLoading}
            />
          </View>

          {/* Classification */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">CLASSIFICATION</Text>
            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setIsBusiness(true)}
                disabled={isLoading}
                className={cn(
                  "flex-1 flex-row items-center justify-center py-3 rounded-full border-2",
                  isBusiness 
                    ? "bg-blue-500 border-blue-500" 
                    : "bg-gray-100 border-gray-300"
                )}
              >
                <Ionicons 
                  name="briefcase" 
                  size={20} 
                  color={isBusiness ? "white" : "#6b7280"} 
                />
                <Text className={cn(
                  "font-semibold ml-2",
                  isBusiness ? "text-white" : "text-gray-600"
                )}>
                  BUSINESS
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsBusiness(false)}
                disabled={isLoading}
                className={cn(
                  "flex-1 flex-row items-center justify-center py-3 rounded-full border-2",
                  !isBusiness 
                    ? "bg-gray-600 border-gray-600" 
                    : "bg-gray-100 border-gray-300"
                )}
              >
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={!isBusiness ? "white" : "#6b7280"} 
                />
                <Text className={cn(
                  "font-semibold ml-2",
                  !isBusiness ? "text-white" : "text-gray-600"
                )}>
                  PERSONAL
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Divisions */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">DIVISIONS</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900">Split expense?</Text>
              <View className="w-12 h-6 bg-gray-300 rounded-full relative">
                <View className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
              </View>
            </View>
          </View>

          {/* Category */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">CATEGORY</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Enter category"
              editable={!isLoading}
            />
          </View>

          {/* Date */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">DATE</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Enter date"
              editable={!isLoading}
            />
          </View>

          {/* Business */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">BUSINESS</Text>
            <Pressable className="border border-gray-300 rounded-lg p-3" disabled={isLoading}>
              <Text className="text-gray-500">Choose your business</Text>
            </Pressable>
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="text-gray-500 text-sm mb-2">NOTES</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Add notes"
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

// Custom hook for safe navigation
const useSafeNavigation = () => {
  try {
    return useNavigation();
  } catch (error) {
    console.log('[ExpensesContent] Navigation context not available');
    return null;
  }
};

export const ExpensesContent: React.FC = () => {
  const navigation = useSafeNavigation();

  const { user } = useAuthStore();
  const {
    syncedTransactions,
    connectedAccounts,
    syncAllAccounts,
    classifyTransaction,
    tagTransaction,
    getBusinessTotal,
    getIncomeTotal,
    getPersonalTotal,
    getUnclassifiedTotal,
    syncInProgress,
    connectAccount,
    plaidLinked,
  } = usePlaidStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SyncedTransaction | null>(null);
  const [plaidVisible, setPlaidVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Show only unclassified transactions for swiping
  const unclassifiedTransactions = useMemo(() => {
    return syncedTransactions
      .filter(tx => !tx.classification || tx.classification === 'unclassified')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [syncedTransactions]);

  // Add debugging for plaidLinked state changes
  useEffect(() => {
    console.log('[ExpensesContent] plaidLinked changed:', plaidLinked);
  }, [plaidLinked]);

  const businessTotal = useMemo(() => getBusinessTotal(), [syncedTransactions]);
  const incomeTotal = useMemo(() => getIncomeTotal(), [syncedTransactions]);
  const personalTotal = useMemo(() => getPersonalTotal(), [syncedTransactions]);
  const unclassifiedTotal = useMemo(() => getUnclassifiedTotal(), [syncedTransactions]);

  useEffect(() => {
    if (user?.id && connectedAccounts.length > 0) {
      console.log('[ExpensesContent] Syncing accounts for user:', user.id);
      console.log('[ExpensesContent] Connected accounts:', connectedAccounts.length);
      syncAllAccounts(user.id);
    }
  }, [user?.id, connectedAccounts.length]);

  // Add debugging for transactions
  useEffect(() => {
    console.log('[ExpensesContent] syncedTransactions updated:', {
      count: syncedTransactions.length,
      transactions: syncedTransactions.slice(0, 3).map(tx => ({
        id: tx.id,
        name: tx.description,
        amount: tx.amount,
        date: tx.date
      }))
    });
  }, [syncedTransactions]);

  const handleClassifyTransaction = (id: string, classification: 'business' | 'personal' | 'income') => {
    classifyTransaction(id, classification);
    // The transaction will be automatically removed from the unclassified list
    // because we filter by classification in the useMemo
  };

  const handleRemoveTransaction = (id: string) => {
    // This is no longer needed since we filter by classification
    // The transaction will be removed from the list automatically
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    try {
      console.log('[ExpensesContent] Manual refresh triggered');
      await syncAllAccounts(user.id);
    } catch (error) {
      console.error('[ExpensesContent] Refresh failed:', error);
      Alert.alert('Refresh Error', 'Failed to refresh transactions. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditTransaction = (id: string) => {
    console.log('handleEditTransaction called with id:', id);
    const transaction = syncedTransactions.find(tx => tx.id === id);
    console.log('Found transaction:', transaction);
    if (transaction) {
      setSelectedTransaction(transaction);
      setEditModalVisible(true);
      console.log('Modal should now be visible');
    }
  };

  const handleSaveTransaction = (updates: any) => {
    console.log('Saving transaction updates:', updates);
    setEditModalVisible(false);
    setSelectedTransaction(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handle the case when there are no connected accounts more gracefully
  if (connectedAccounts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="card-outline" size={64} color="#9ca3af" />
        <Text className="text-2xl font-bold text-white mt-4 mb-2">Connect Your Bank</Text>
        <Text className="text-gray-300 text-center mb-8">
          Connect your bank account to automatically track your expenses and income.
        </Text>
        <Pressable
          onPress={() => setPlaidVisible(true)}
          className="bg-purple-500 px-8 py-4 rounded-xl"
        >
          <Text className="text-white font-semibold text-lg">Connect Account</Text>
        </Pressable>
        <PlaidLinkWebView
          visible={plaidVisible}
          onSuccess={() => {}}
          onClose={() => setPlaidVisible(false)}
          userId={user?.id || ''}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Summary Cards */}
      <View className="px-6 py-4">
        <View className="flex-row space-x-2 mb-2 mt-2 px-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-row space-x-2">
              <View className="w-36 h-20 bg-green-900/20 border border-green-500/30 rounded-lg p-2 justify-center">
                <Text className="text-green-300 text-xs">Income</Text>
                <Text className="text-green-400 text-base font-bold">{formatCurrency(incomeTotal)}</Text>
              </View>
              <View className="w-36 h-20 bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 justify-center">
                <Text className="text-blue-300 text-xs">Business</Text>
                <Text className="text-blue-400 text-base font-bold">{formatCurrency(businessTotal)}</Text>
              </View>
              <View className="w-36 h-20 bg-red-900/20 border border-red-500/30 rounded-lg p-2 justify-center">
                <Text className="text-red-300 text-xs">Personal</Text>
                <Text className="text-red-400 text-base font-bold">{formatCurrency(personalTotal)}</Text>
              </View>
              <View className="w-36 h-20 bg-green-900/20 border border-green-500/30 rounded-lg p-2 justify-center">
                <Text className="text-green-300 text-xs">Net Income</Text>
                <Text className="text-green-400 text-base font-bold">{formatCurrency(incomeTotal - businessTotal)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        
        {/* View Logged Expenses Button */}
        {navigation && plaidLinked && (
          <Pressable
            onPress={() => {
              try {
                navigation.navigate('LoggedExpenses' as never);
              } catch (error) {
                console.error('[ExpensesContent] Navigation error:', error);
              }
            }}
            className="bg-purple-500 rounded-xl py-2 flex-row items-center justify-center mb-2"
          >
            <Ionicons name="list" size={16} color="white" />
            <Text className="text-white font-semibold text-base ml-2">View Logged Expenses</Text>
          </Pressable>
        )}
      </View>

      {/* Transactions List */}
      <View style={{ flex: 1 }}>
        {syncInProgress && (
          <View className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-4 mx-6">
            <Text className="text-purple-300 text-center">Syncing transactions...</Text>
          </View>
        )}

        {connectedAccounts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="card-outline" size={64} color="#9ca3af" />
            <Text className="text-2xl font-bold text-white mt-4 mb-2">Connect Your Bank</Text>
            <Text className="text-gray-300 text-center mb-8">
              Connect your bank account to automatically track your expenses and income.
            </Text>
            <Pressable
              onPress={() => setPlaidVisible(true)}
              className="bg-purple-500 px-8 py-4 rounded-xl"
            >
              <Text className="text-white font-semibold text-lg">Connect Account</Text>
            </Pressable>
            <PlaidLinkWebView
              visible={plaidVisible}
              onSuccess={() => {}}
              onClose={() => setPlaidVisible(false)}
              userId={user?.id || ''}
            />
          </View>
        ) : unclassifiedTransactions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
            <Text className="text-gray-300 text-lg mt-4">All transactions classified!</Text>
            <Text className="text-gray-400 text-center mt-2">
              Great job! All your transactions have been categorized.
            </Text>
          </View>
        ) : (
          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <Text className="text-gray-300 text-sm mb-4">
              Swipe right for business, left for personal • Tap to edit
            </Text>
            {unclassifiedTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onClassify={handleClassifyTransaction}
                onTag={handleEditTransaction}
                onRemove={handleRemoveTransaction}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Edit Transaction Modal - Rendered at top level */}
      <EditTransactionModal
        visible={editModalVisible}
        transaction={selectedTransaction}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTransaction(null);
        }}
        onSave={handleSaveTransaction}
      />
    </View>
  );
};