import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlaidStore, SyncedTransaction, TransactionFilters } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
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

const screenWidth = Dimensions.get('window').width;

interface TransactionCardProps {
  transaction: SyncedTransaction;
  onClassify: (id: string, classification: 'business' | 'personal') => void;
  onTag: (id: string) => void;
  onRemove?: (id: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClassify, onTag, onRemove }) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [showActions, setShowActions] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Add haptic feedback when starting to swipe
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(1.02);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      const threshold = screenWidth * 0.5;
      const progress = Math.abs(event.translationX) / threshold;
      
      // Dynamic scale based on swipe progress
      scale.value = withTiming(1 + (progress * 0.05));
      
      // Slight rotation for more dynamic feel
      rotation.value = withTiming(event.translationX * 0.06);
      
      // Opacity feedback based on swipe progress
      if (Math.abs(event.translationX) > 50) {
        opacity.value = withTiming(0.7);
        // Add stronger haptic feedback when crossing threshold
        if (Math.abs(event.translationX) > threshold && Math.abs(event.translationX) < threshold + 10) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        opacity.value = withTiming(1);
      }
    },
    onEnd: (event) => {
      const threshold = screenWidth * 0.5; // Require 50% of card width
      
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
      [-screenWidth * 0.5, 0, screenWidth * 0.5],
      ['#fef2f2', '#1f2937', '#f0fdf4'] // red, gray, green
    );

    const borderColor = interpolateColor(
      translateX.value,
      [-screenWidth * 0.5, 0, screenWidth * 0.5],
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
        return 'border-green-500 bg-green-50';
      case 'personal':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View className="relative mb-3">
      {/* Background Actions */}
      <View className="absolute inset-0 flex-row">
        <View className="flex-1 bg-green-500 rounded-xl flex-row items-center justify-start pl-6">
          <Ionicons name="briefcase" size={24} color="white" />
          <Text className="text-white font-semibold ml-2">Business</Text>
        </View>
        <View className="flex-1 bg-red-500 rounded-xl flex-row items-center justify-end pr-6">
          <Text className="text-white font-semibold mr-2">Personal</Text>
          <Ionicons name="person" size={24} color="white" />
        </View>
      </View>
      
      {/* Main Card */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View 
          style={animatedStyle}
          entering={FadeInUp.duration(400).springify().damping(15)}
          exiting={FadeOutDown.duration(300).springify().damping(20)}
          layout={Layout.springify().damping(15).stiffness(150)}
        >
          <Pressable
            onPress={() => onTag(transaction.id)}
            className={cn(
              "border rounded-xl p-4 shadow-sm",
              getClassificationColor()
            )}
          >
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-lg font-semibold text-gray-900 mb-1">
                  {transaction.merchantName || transaction.description}
                </Text>
                <Text className="text-sm text-gray-600 mb-1">
                  {transaction.category}
                </Text>
                <Text className="text-xs text-gray-500">
                  {transaction.accountName} • {formatDate(transaction.date)}
                </Text>
              </View>
              
              <View className="items-end">
                <Text className={cn(
                  "text-lg font-bold",
                  transaction.amount > 0 ? "text-green-600" : "text-gray-900"
                )}>
                  {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
                {transaction.classification !== 'unclassified' && (
                  <View className={cn(
                    "px-2 py-1 rounded-full mt-1",
                    transaction.classification === 'business' ? "bg-green-100" : "bg-red-100"
                  )}>
                    <Text className={cn(
                      "text-xs font-medium",
                      transaction.classification === 'business' ? "text-green-700" : "text-red-700"
                    )}>
                      {transaction.classification}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {(transaction.clientTag || transaction.jobTag) && (
              <View className="flex-row mt-2">
                {transaction.clientTag && (
                  <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
                    <Text className="text-xs text-blue-700">Client: {transaction.clientTag}</Text>
                  </View>
                )}
                {transaction.jobTag && (
                  <View className="bg-purple-100 px-2 py-1 rounded-full">
                    <Text className="text-xs text-purple-700">Job: {transaction.jobTag}</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: TransactionFilters) => void;
  currentFilters: TransactionFilters;
}

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState<TransactionFilters>(currentFilters);

  if (!visible) return null;

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  return (
    <View className="absolute inset-0 bg-black/50 flex items-end justify-end z-50">
      <View className="bg-white rounded-t-3xl p-6 w-full max-h-[70%]">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-bold text-gray-900">Filter Transactions</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Date Range */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Date Range</Text>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">From</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={filters.dateRange?.start || ''}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: text, end: prev.dateRange?.end || '' }
                  }))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">To</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={filters.dateRange?.end || ''}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: prev.dateRange?.start || '', end: text }
                  }))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>
            </View>
          </View>

          {/* Amount Range */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Amount Range</Text>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">Min ($)</Text>
                <TextInput
                  placeholder="0"
                  value={filters.amountRange?.min?.toString() || ''}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    amountRange: { 
                      ...prev.amountRange, 
                      min: parseFloat(text) || 0, 
                      max: prev.amountRange?.max || 99999 
                    }
                  }))}
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">Max ($)</Text>
                <TextInput
                  placeholder="99999"
                  value={filters.amountRange?.max?.toString() || ''}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    amountRange: { 
                      ...prev.amountRange, 
                      min: prev.amountRange?.min || 0, 
                      max: parseFloat(text) || 99999 
                    }
                  }))}
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>
            </View>
          </View>

          {/* Classification */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Classification</Text>
            <View className="flex-row space-x-3">
              {['all', 'business', 'personal', 'unclassified'].map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    classification: type === 'all' ? undefined : type as any
                  }))}
                  className={cn(
                    "px-4 py-2 rounded-full border",
                    (type === 'all' && !filters.classification) || filters.classification === type
                      ? "bg-purple-500 border-purple-500"
                      : "bg-white border-gray-300"
                  )}
                >
                  <Text className={cn(
                    "text-sm font-medium capitalize",
                    (type === 'all' && !filters.classification) || filters.classification === type
                      ? "text-white"
                      : "text-gray-700"
                  )}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="flex-row space-x-3 mt-6">
          <Pressable
            onPress={() => setFilters({})}
            className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
          >
            <Text className="text-gray-700 font-semibold">Clear</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            className="flex-1 bg-purple-500 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Apply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    syncedTransactions,
    connectedAccounts,
    syncTransactions,
    syncAllAccounts,
    classifyTransaction,
    tagTransaction,
    getFilteredTransactions,
    getBusinessTotal,
    getIncomeTotal,
    isLoading: plaidLoading,
    syncInProgress,
    connectAccount,
    connectDemoAccount,
    plaidLinked,
  } = usePlaidStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SyncedTransaction | null>(null);
  const [clientTag, setClientTag] = useState('');
  const [jobTag, setJobTag] = useState('');

  const filteredTransactions = useMemo(() => {
    return getFilteredTransactions(filters);
  }, [syncedTransactions, filters]);

  const businessTotal = useMemo(() => getBusinessTotal(), [syncedTransactions]);
  const incomeTotal = useMemo(() => getIncomeTotal(), [syncedTransactions]);

  useEffect(() => {
    if (user?.id && connectedAccounts.length > 0) {
      syncAllAccounts(user.id);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    try {
      await syncAllAccounts(user.id);
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync transactions. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectAccount = async () => {
    if (!user?.id) return;
    
    try {
      const result = await connectDemoAccount(user.id);
      if (result.success) {
        Alert.alert('Success', 'Demo account connected successfully!');
        await syncAllAccounts(user.id);
      } else {
        Alert.alert('Connection Error', result.error || 'Failed to connect account. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Connection Error', `Failed to connect account: ${errorMessage}`);
    }
  };

  const handleClassifyTransaction = (id: string, classification: 'business' | 'personal') => {
    classifyTransaction(id, classification);
  };

  const handleTagTransaction = (id: string) => {
    const transaction = syncedTransactions.find(tx => tx.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
      setClientTag(transaction.clientTag || '');
      setJobTag(transaction.jobTag || '');
      setTagModalVisible(true);
    }
  };

  const saveTransactionTags = () => {
    if (selectedTransaction) {
      tagTransaction(selectedTransaction.id, clientTag.trim() || undefined, jobTag.trim() || undefined);
      setTagModalVisible(false);
      setSelectedTransaction(null);
      setClientTag('');
      setJobTag('');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!plaidLinked) {
    return (
      <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="card-outline" size={64} color="#9ca3af" />
            <Text className="text-2xl font-bold text-white mt-4 mb-2">Connect Your Bank</Text>
            <Text className="text-gray-300 text-center mb-8">
              Connect your bank account to automatically track your expenses and income.
            </Text>
            <Pressable
              onPress={handleConnectAccount}
              className="bg-purple-500 px-8 py-4 rounded-xl"
            >
              <Text className="text-white font-semibold text-lg">Connect Account</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1f2e', '#2d3748', '#4a5568']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-600">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-white">Expenses & Income</Text>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setShowFilters(true)}
                className="bg-purple-100 px-3 py-2 rounded-lg"
              >
                <Ionicons name="filter" size={18} color="#7c3aed" />
              </Pressable>
              {!plaidLinked && (
                <Pressable
                  onPress={handleConnectAccount}
                  className="bg-purple-500 px-4 py-2 rounded-xl flex-row items-center"
                >
                  <Ionicons name="add" size={18} color="white" />
                  <Text className="text-white font-medium ml-1">Connect</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Summary Cards */}
          <View className="flex-row space-x-3">
            <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <Text className="text-green-300 text-sm">Income</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(incomeTotal)}</Text>
            </View>
            <View className="flex-1 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <Text className="text-red-300 text-sm">Business Expenses</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(businessTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <ScrollView
          className="flex-1 px-6 py-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {syncInProgress && (
            <View className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-4">
              <Text className="text-purple-300 text-center">Syncing transactions...</Text>
            </View>
          )}

          {filteredTransactions.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-300 text-lg mt-4">No transactions found</Text>
              <Text className="text-gray-400 text-center mt-2">
                Pull to refresh or adjust your filters
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-gray-300 text-sm mb-4">
                Swipe right for business, left for personal
              </Text>
              {filteredTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onClassify={handleClassifyTransaction}
                  onTag={handleTagTransaction}
                  onRemove={() => {
                    // Remove the transaction from the local state to update the UI immediately
                    // The transaction is already classified in the store, so we just need to update the display
                  }}
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* Filter Modal */}
        <FilterModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={setFilters}
          currentFilters={filters}
        />

        {/* Tag Modal */}
        {tagModalVisible && (
          <View className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
              <Text className="text-xl font-bold text-gray-900 mb-4">Tag Transaction</Text>
              
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Client</Text>
                <TextInput
                  value={clientTag}
                  onChangeText={setClientTag}
                  placeholder="Enter client name"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm text-gray-600 mb-2">Job/Project</Text>
                <TextInput
                  value={jobTag}
                  onChangeText={setJobTag}
                  placeholder="Enter job or project name"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </View>

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setTagModalVisible(false)}
                  className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveTransactionTags}
                  className="flex-1 bg-purple-500 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};