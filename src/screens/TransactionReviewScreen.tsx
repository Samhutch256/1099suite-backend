import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { useContractorStore } from '../state/contractorStore';
import { cn } from '../utils/cn';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3;

interface TransactionReviewScreenProps {
  navigation: any;
}

const TransactionCard: React.FC<{
  transaction: any;
  onSwipe: (direction: 'left' | 'right') => void;
  onTap: () => void;
}> = ({ transaction, onSwipe, onTap }) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      scale.value = withTiming(0.95);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: (event) => {
      scale.value = withTiming(1);
      
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        // Complete the swipe animation
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          direction === 'right' ? screenWidth : -screenWidth,
          { duration: 300 }
        );
        opacity.value = withTiming(0, { duration: 300 });
        
        // Trigger the callback
        runOnJS(onSwipe)(direction);
      } else {
        // Snap back to center
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      ['#ef4444', '#1f2937', '#10b981']
    );

    return {
      transform: [
        { translateX: translateX },
        { scale: scale }
      ],
      opacity: opacity,
      backgroundColor,
    };
  });

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX < -50 ? 1 : 0,
    transform: [{ scale: translateX < -50 ? 1 : 0.8 }],
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX > 50 ? 1 : 0,
    transform: [{ scale: translateX > 50 ? 1 : 0.8 }],
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'Transportation': 'car',
      'Materials & Supplies': 'construct',
      'Office Expenses': 'briefcase',
      'Communication': 'call',
      'Insurance': 'shield-checkmark',
      'Business Meals': 'restaurant',
      'Other': 'ellipsis-horizontal',
    };
    return iconMap[category] || 'ellipsis-horizontal';
  };

  return (
    <View className="mb-4 relative">
      {/* Background Actions */}
      <View className="absolute inset-0 flex-row items-center justify-between px-6 rounded-xl overflow-hidden">
        <Animated.View
          style={leftActionStyle}
          className="flex-row items-center"
        >
          <Ionicons name="close-circle" size={24} color="#ef4444" />
          <Text className="text-red-500 font-semibold ml-2">Personal</Text>
        </Animated.View>
        
        <Animated.View
          style={rightActionStyle}
          className="flex-row items-center"
        >
          <Text className="text-green-500 font-semibold mr-2">Business</Text>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        </Animated.View>
      </View>

      {/* Main Card */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={onTap}
            className="p-4 rounded-xl border border-gray-600"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-start flex-1">
                <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
                  <Ionicons 
                    name={getCategoryIcon(transaction.category)} 
                    size={20} 
                    color="#9ca3af" 
                  />
                </View>
                
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-1">
                    {transaction.description}
                  </Text>
                  <Text className="text-gray-400 text-sm mb-1">
                    {transaction.category}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {formatDate(transaction.date)}
                  </Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className="text-white font-bold text-lg">
                  {formatCurrency(transaction.amount)}
                </Text>
                {transaction.confidence > 0 && (
                  <View className="flex-row items-center mt-1">
                    <View className={cn(
                      "w-2 h-2 rounded-full mr-1",
                      transaction.confidence > 0.7 ? "bg-green-500" : 
                      transaction.confidence > 0.4 ? "bg-yellow-500" : "bg-red-500"
                    )} />
                    <Text className="text-xs text-gray-400">
                      {Math.round(transaction.confidence * 100)}% confidence
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export const TransactionReviewScreen: React.FC<TransactionReviewScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { addExpense } = useContractorStore();
  const { 
    syncedTransactions, 
    getUnreviewedTransactions, 
    classifyTransaction,
    syncTransactions,
    connectedAccounts,
    syncInProgress,
    lastSyncTime,
    getBusinessTotal,
    getPersonalTotal,
    getIncomeTotal,
    plaidLinked,
  } = usePlaidStore();

  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [businessCount, setBusinessCount] = useState(0);
  const [personalCount, setPersonalCount] = useState(0);

  const unreviewedTransactions = getUnreviewedTransactions();
  const currentTransaction = unreviewedTransactions[currentTransactionIndex];

  useEffect(() => {
    // Auto-sync transactions when screen loads if plaidLinked is true
    if (user && plaidLinked && connectedAccounts.length > 0) {
      console.log('📱 Auto-syncing transactions for connected accounts...');
      syncTransactions(user.id, 365).then(result => {
        if (!result.success && result.error) {
          console.warn('Transaction sync failed:', result.error);
        }
      });
    }
  }, [user, plaidLinked, connectedAccounts.length]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentTransaction) return;

    if (direction === 'right') {
      // Swipe right = Business (green)
      classifyTransaction(currentTransaction.id, 'business');
      
      // Add to contractor store as expense
      addExpense({
        user_id: user?.id || '',
        amount: currentTransaction.amount,
        category: currentTransaction.category,
        vendor_name: currentTransaction.merchantName || currentTransaction.description,
        is_business: true,
        timestamp: currentTransaction.date,
        notes: currentTransaction.description,
      });
      
      setBusinessCount(prev => prev + 1);
    } else {
      // Swipe left = Personal (red)
      classifyTransaction(currentTransaction.id, 'personal');
      setPersonalCount(prev => prev + 1);
    }

    setReviewedCount(prev => prev + 1);
    
    // Move to next transaction
    if (currentTransactionIndex < unreviewedTransactions.length - 1) {
      setCurrentTransactionIndex(prev => prev + 1);
    } else {
      // All transactions reviewed - show summary
      console.log('📊 Review Summary:', {
        totalReviewed: reviewedCount + 1,
        businessTransactions: businessCount + (direction === 'right' ? 1 : 0),
        personalTransactions: personalCount + (direction === 'left' ? 1 : 0),
        businessTotal: getBusinessTotal(),
        personalTotal: getPersonalTotal(),
        incomeTotal: getIncomeTotal(),
      });
      navigation.goBack();
    }
  };

  const handleTransactionTap = () => {
    // Could open a detail modal here
    console.log('Transaction tapped:', currentTransaction);
  };

  const handleSkip = () => {
    if (currentTransactionIndex < unreviewedTransactions.length - 1) {
      setCurrentTransactionIndex(prev => prev + 1);
    }
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!plaidLinked || connectedAccounts.length === 0) {
    return (
      <LinearGradient
        colors={['#1a1f2e', '#2d3748', '#4a5568']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <View className="px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                className="mr-4"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <Text className="text-xl font-bold text-white">Transaction Review</Text>
            </View>
          </View>

          <View className="flex-1 justify-center items-center px-6">
            <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="card" size={32} color="white" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-4">
              {!plaidLinked ? 'Connect Your Bank Account' : 'No Connected Accounts'}
            </Text>
            <Text className="text-gray-300 text-center mb-8 leading-6">
              Connect your bank accounts and credit cards to automatically import and review business expenses with swipeable cards.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('PlaidReview')}
              className="bg-blue-500 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold text-lg">
                {!plaidLinked ? 'Connect Bank Account' : 'Go to Accounts'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (unreviewedTransactions.length === 0) {
    return (
      <LinearGradient
        colors={['#1a1f2e', '#2d3748', '#4a5568']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <View className="px-6 py-4 border-b border-gray-600">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => navigation.goBack()}
                  className="mr-4"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <Text className="text-xl font-bold text-white">Transaction Review</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (user) {
                    syncTransactions(user.id, 30).then(result => {
                      if (!result.success && result.error) {
                        Alert.alert('Sync Failed', result.error);
                      }
                    });
                  }
                }}
                disabled={syncInProgress}
                className="flex-row items-center"
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={syncInProgress ? "#6b7280" : "#3b82f6"} 
                />
                <Text className="text-blue-400 ml-1">Sync</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 justify-center items-center px-6">
            <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark" size={32} color="white" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-4">
              All Caught Up!
            </Text>
            <Text className="text-gray-300 text-center mb-2">
              No new transactions to review.
            </Text>
            <Text className="text-gray-400 text-center text-sm">
              Last sync: {formatLastSync(lastSyncTime)}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-600">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                className="mr-4"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <Text className="text-xl font-bold text-white">Review Transactions</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-sm mr-3">
                {currentTransactionIndex + 1} of {unreviewedTransactions.length}
              </Text>
              <Pressable
                onPress={() => {
                  if (user) {
                    syncTransactions(user.id, 30).then(result => {
                      if (!result.success && result.error) {
                        Alert.alert('Sync Failed', result.error);
                      }
                    });
                  }
                }}
                disabled={syncInProgress}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={syncInProgress ? "#6b7280" : "#3b82f6"} 
                />
              </Pressable>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <View 
              className="bg-blue-500 h-2 rounded-full"
              style={{ 
                width: `${((currentTransactionIndex) / unreviewedTransactions.length) * 100}%` 
              }}
            />
          </View>

          {/* Stats */}
          <View className="flex-row justify-between mb-3">
            <View>
              <Text className="text-gray-400 text-xs">Reviewed</Text>
              <Text className="text-white font-semibold">{reviewedCount}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Business</Text>
              <Text className="text-green-400 font-semibold">{businessCount}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Personal</Text>
              <Text className="text-red-400 font-semibold">{personalCount}</Text>
            </View>
          </View>

          {/* Running Totals */}
          <View className="flex-row justify-between pt-2 border-t border-gray-600">
            <View>
              <Text className="text-green-400 text-xs">Business Total</Text>
              <Text className="text-green-400 font-semibold">
                ${getBusinessTotal().toFixed(2)}
              </Text>
            </View>
            <View>
              <Text className="text-blue-400 text-xs">Income Total</Text>
              <Text className="text-blue-400 font-semibold">
                ${getIncomeTotal().toFixed(2)}
              </Text>
            </View>
            <View>
              <Text className="text-red-400 text-xs">Personal Total</Text>
              <Text className="text-red-400 font-semibold">
                ${getPersonalTotal().toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View className="px-6 py-4 bg-gray-800/30">
          <View className="flex-row items-center justify-center">
            <View className="flex-row items-center mr-6">
              <Ionicons name="arrow-back" size={16} color="#ef4444" />
              <Text className="text-red-400 text-sm ml-1">Personal</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-400 text-sm mr-1">Business</Text>
              <Ionicons name="arrow-forward" size={16} color="#10b981" />
            </View>
          </View>
          <Text className="text-gray-400 text-xs text-center mt-1">
            Swipe to categorize expenses
          </Text>
        </View>

        {/* Transaction Card */}
        <View className="flex-1 px-6 py-6">
          {currentTransaction && (
            <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
              <TransactionCard
                transaction={currentTransaction}
                onSwipe={handleSwipe}
                onTap={handleTransactionTap}
              />
            </Animated.View>
          )}
        </View>

        {/* Bottom Actions */}
        <View className="px-6 py-4 border-t border-gray-600">
          <View className="flex-row justify-between items-center">
            <Pressable
              onPress={() => handleSwipe('left')}
              className="bg-red-500 rounded-xl py-3 px-6 flex-row items-center"
            >
              <Ionicons name="close" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Personal</Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              className="bg-gray-600 rounded-xl py-3 px-4"
            >
              <Text className="text-white font-medium">Skip</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSwipe('right')}
              className="bg-green-500 rounded-xl py-3 px-6 flex-row items-center"
            >
              <Text className="text-white font-semibold mr-2">Business</Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};