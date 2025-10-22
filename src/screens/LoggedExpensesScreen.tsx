import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, FlatList, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlaidStore, SyncedTransaction } from '../state/plaidStore';
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
import { Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

interface LoggedTransactionCardProps {
  transaction: SyncedTransaction | Expense;
  isExpense?: boolean;
  onClassify?: (id: string, classification: 'business' | 'personal') => void;
  onTag?: (id: string) => void;
  onRemove?: (id: string) => void;
}

const LoggedTransactionCard: React.FC<LoggedTransactionCardProps> = ({ 
  transaction, 
  isExpense = false, 
  onClassify,
  onTag,
  onRemove 
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [isRemoving, setIsRemoving] = useState(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Add haptic feedback when starting to swipe
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(1.02);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      const threshold = screenWidth * 0.3;
      const progress = Math.abs(event.translationX) / threshold;
      
      // Dynamic scale based on swipe progress
      scale.value = withTiming(1 + (progress * 0.05));
      
      // Slight rotation for more dynamic feel
      rotation.value = withTiming(event.translationX * 0.08);
      
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
      const threshold = screenWidth * 0.3; // Require 30% of card width for logged expenses
      
      if (event.translationX > threshold && onClassify) {
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
      } else if (event.translationX < -threshold && onClassify) {
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
      [-screenWidth * 0.3, 0, screenWidth * 0.3],
      ['#fef2f2', '#1f2937', '#f0fdf4'] // red, gray, green
    );

    const borderColor = interpolateColor(
      translateX.value,
      [-screenWidth * 0.3, 0, screenWidth * 0.3],
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
    if (isExpense) {
      const expense = transaction as Expense;
      return expense.is_business ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
    }
    
    const syncedTx = transaction as SyncedTransaction;
    switch (syncedTx.classification) {
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
      year: 'numeric',
    });
  };

  const handleTap = () => {
    if (onTag) {
      onTag(transaction.id);
    }
  };

  const handleLongPress = () => {
    if (onClassify) {
      Alert.alert(
        'Change Classification',
        'How would you like to classify this transaction?',
        [
          {
            text: 'Business',
            onPress: () => onClassify(transaction.id, 'business'),
            style: 'default'
          },
          {
            text: 'Personal',
            onPress: () => onClassify(transaction.id, 'personal'),
            style: 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const cardContent = (
    <View className={cn("border rounded-xl p-4 mb-3 shadow-sm", getClassificationColor())}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {isExpense 
              ? (transaction as Expense).vendor_name || (transaction as Expense).notes 
              : (transaction as SyncedTransaction).merchantName || (transaction as SyncedTransaction).description
            }
          </Text>
          <Text className="text-sm text-gray-600 mb-1">
            {transaction.category}
          </Text>
          <Text className="text-xs text-gray-500">
            {isExpense 
              ? `Logged Expense • ${formatDate((transaction as Expense).timestamp)}` 
              : `${(transaction as SyncedTransaction).accountName} • ${formatDate((transaction as SyncedTransaction).date)}`
            }
          </Text>
        </View>
        
        <View className="items-end">
          <Text className={cn(
            "text-lg font-bold",
            isExpense ? "text-gray-900" : (transaction.amount > 0 ? "text-green-600" : "text-gray-900")
          )}>
            {isExpense ? formatCurrency(transaction.amount) : `${transaction.amount > 0 ? '+' : '-'}${formatCurrency(transaction.amount)}`}
          </Text>
          <View className={cn(
            "px-2 py-1 rounded-full mt-1",
            isExpense 
              ? ((transaction as Expense).is_business ? "bg-green-100" : "bg-red-100") 
              : ((transaction as SyncedTransaction).classification === 'business' ? "bg-green-100" : "bg-red-100")
          )}>
            <Text className={cn(
              "text-xs font-medium capitalize",
              isExpense 
                ? ((transaction as Expense).is_business ? "text-green-700" : "text-red-700") 
                : ((transaction as SyncedTransaction).classification === 'business' ? "text-green-700" : "text-red-700")
            )}>
              {isExpense 
                ? ((transaction as Expense).is_business ? 'Business' : 'Personal') 
                : (transaction as SyncedTransaction).classification
              }
            </Text>
          </View>
        </View>
      </View>
      
      {!isExpense && ((transaction as SyncedTransaction).clientTag || (transaction as SyncedTransaction).jobTag) && (
        <View className="flex-row mt-2">
          {(transaction as SyncedTransaction).clientTag && (
            <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-xs text-blue-700">Client: {(transaction as SyncedTransaction).clientTag}</Text>
            </View>
          )}
          {(transaction as SyncedTransaction).jobTag && (
            <View className="bg-purple-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-purple-700">Job: {(transaction as SyncedTransaction).jobTag}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // If we have classification functionality, wrap with gesture handler
  if (onClassify) {
    return (
      <View className="relative mb-3">
        {/* Background Actions - Only show during swipe */}
        <View className="absolute inset-0 flex-row opacity-0">
          <View className="flex-1 bg-green-500 rounded-xl flex-row items-center justify-start pl-6">
            <Ionicons name="briefcase" size={24} color="white" />
            <Text className="text-white font-semibold ml-2">Business</Text>
          </View>
          <View className="flex-1 bg-red-500 rounded-xl flex-row items-center justify-end pr-6">
            <Text className="text-white font-semibold mr-2">Personal</Text>
            <Ionicons name="person" size={24} color="white" />
          </View>
        </View>
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View 
            style={animatedStyle}
            entering={FadeInUp.duration(400).springify().damping(15)}
            exiting={FadeOutDown.duration(300).springify().damping(20)}
            layout={Layout.springify().damping(15).stiffness(150)}
          >
            <Pressable
              onPress={handleTap}
              onLongPress={handleLongPress}
            >
              {cardContent}
            </Pressable>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }

  // Otherwise, just return the card as pressable
  return (
    <Pressable onPress={handleTap} onLongPress={handleLongPress}>
      {cardContent}
    </Pressable>
  );
};

interface EditTransactionModalProps {
  visible: boolean;
  transaction: SyncedTransaction | Expense | null;
  isExpense?: boolean;
  onClose: () => void;
  onSave: (updates: any) => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  visible, 
  transaction, 
  isExpense = false,
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

  const { updateExpense } = useContractorStore();
  const { classifyTransaction, updateTransactionCategory, tagTransaction } = usePlaidStore();

  React.useEffect(() => {
    if (transaction) {
      setAmount(Math.abs(transaction.amount).toString());
      
      if (isExpense) {
        const expense = transaction as Expense;
        setVendor(expense.vendor_name || expense.notes || '');
        setCategory(expense.category || '');
        setNotes(expense.notes || '');
        setIsBusiness(expense.is_business);
        setDate(expense.timestamp || '');
      } else {
        const syncedTx = transaction as SyncedTransaction;
        setVendor(syncedTx.merchantName || syncedTx.description || '');
        setCategory(syncedTx.category || '');
        setNotes(''); // SyncedTransaction doesn't have notes
        setIsBusiness(syncedTx.classification === 'business');
        setDate(syncedTx.date || '');
      }
      setError('');
    }
  }, [transaction, isExpense]);

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
      if (isExpense) {
        // Update expense in contractor store
        const expense = transaction as Expense;
        await updateExpense(expense.id, {
          amount: parseFloat(amount),
          vendor_name: vendor,
          category: category,
          notes: notes,
          is_business: isBusiness,
          timestamp: date,
        });
      } else {
        // Update transaction in plaid store
        const syncedTx = transaction as SyncedTransaction;
        
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

  if (!visible || !transaction) return null;

  return (
    <View className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
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
                {isExpense 
                  ? (transaction as Expense).vendor_name || (transaction as Expense).notes
                  : (transaction as SyncedTransaction).merchantName || (transaction as SyncedTransaction).description
                }
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

export const LoggedExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    syncedTransactions, 
    getBusinessTotal, 
    getPersonalExpenses, 
    getBusinessExpenses,
    classifyTransaction,
    tagTransaction
  } = usePlaidStore();
  const { expenses } = useContractorStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SyncedTransaction | Expense | null>(null);

  const loggedTransactions = useMemo(() => {
    const classified = syncedTransactions.filter(tx => 
      tx.classification === 'business' || tx.classification === 'personal'
    );
    
    // Combine Plaid transactions and logged expenses
    const allTransactions = [
      ...classified.map(tx => ({ ...tx, isExpense: false })),
      ...expenses.map(expense => ({ ...expense, isExpense: true }))
    ];
    
    switch (activeFilter) {
      case 'business':
        return allTransactions.filter(tx => 
          tx.isExpense ? (tx as Expense).is_business : (tx as SyncedTransaction).classification === 'business'
        );
      case 'personal':
        return allTransactions.filter(tx => 
          tx.isExpense ? !(tx as Expense).is_business : (tx as SyncedTransaction).classification === 'personal'
        );
      default:
        return allTransactions.sort((a, b) => {
          const dateA = new Date(a.isExpense ? (a as Expense).timestamp : (a as SyncedTransaction).date).getTime();
          const dateB = new Date(b.isExpense ? (b as Expense).timestamp : (b as SyncedTransaction).date).getTime();
          return dateB - dateA;
        });
    }
  }, [syncedTransactions, expenses, activeFilter]);

  const businessTotal = useMemo(() => {
    const plaidBusiness = getBusinessTotal();
    const loggedBusiness = expenses
      .filter(expense => expense.is_business)
      .reduce((total, expense) => total + expense.amount, 0);
    return plaidBusiness + loggedBusiness;
  }, [syncedTransactions, expenses]);
  
  const personalTotal = useMemo(() => {
    const plaidPersonal = getPersonalExpenses()
      .filter(tx => tx.amount < 0)
      .reduce((total, tx) => total + Math.abs(tx.amount), 0);
    const loggedPersonal = expenses
      .filter(expense => !expense.is_business)
      .reduce((total, expense) => total + expense.amount, 0);
    return plaidPersonal + loggedPersonal;
  }, [syncedTransactions, expenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleClassifyTransaction = (id: string, classification: 'business' | 'personal') => {
    classifyTransaction(id, classification);
  };

  const handleEditTransaction = (id: string) => {
    const transaction = loggedTransactions.find(tx => tx.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
      setEditModalVisible(true);
    }
  };

  const handleSaveTransaction = (updates: any) => {
    // Here you would typically update the transaction in your store
    console.log('Saving transaction updates:', updates);
    
    // For now, just update the classification
    if (updates.isBusiness !== undefined) {
      classifyTransaction(updates.id, updates.isBusiness ? 'business' : 'personal');
    }
    
    setEditModalVisible(false);
    setSelectedTransaction(null);
  };

  const handleRemoveTransaction = (id: string) => {
    // Remove the transaction from the local state to update the UI immediately
    // The transaction is already classified in the store, so we just need to update the display
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <LoggedTransactionCard 
      transaction={item} 
      isExpense={item.isExpense}
      onClassify={handleClassifyTransaction}
      onTag={handleEditTransaction}
      onRemove={handleRemoveTransaction}
    />
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
              <Text className="text-2xl font-bold text-white">Logged Expenses</Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row bg-gray-800/50 rounded-xl p-1 mb-4">
            {[
              { id: 'all', label: 'All Logged', count: loggedTransactions.length },
              { id: 'business', label: 'Business', count: getBusinessExpenses().length + expenses.filter(e => e.is_business).length },
              { id: 'personal', label: 'Personal', count: getPersonalExpenses().length + expenses.filter(e => !e.is_business).length },
            ].map((filter) => (
              <Pressable
                key={filter.id}
                onPress={() => setActiveFilter(filter.id as any)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg items-center",
                  activeFilter === filter.id ? "bg-purple-500" : "transparent"
                )}
              >
                <Text className={cn(
                  "font-semibold text-sm",
                  activeFilter === filter.id ? "text-white" : "text-gray-300"
                )}>
                  {filter.label}
                </Text>
                <Text className={cn(
                  "text-xs",
                  activeFilter === filter.id ? "text-purple-100" : "text-gray-400"
                )}>
                  {filter.count} items
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Summary Cards */}
          <View className="flex-row space-x-3">
            <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <Text className="text-green-300 text-sm">Business Total</Text>
              <Text className="text-white text-lg font-bold">{formatCurrency(businessTotal)}</Text>
            </View>
            <View className="flex-1 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <Text className="text-red-300 text-sm">Personal Total</Text>
              <Text className="text-white text-lg font-bold">{formatCurrency(personalTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        {loggedTransactions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
            <Text className="text-2xl font-bold text-white mt-4 mb-2">No Logged Expenses</Text>
            <Text className="text-gray-300 text-center">
              Start classifying transactions by swiping on them in the main expenses view.
            </Text>
          </View>
        ) : (
          <FlatList
            data={loggedTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 120, // Approximate item height
              offset: 120 * index,
              index,
            })}
            ListHeaderComponent={() => (
              <View className="mb-4">
                <Text className="text-gray-300 text-sm mb-2">
                  {loggedTransactions.length} classified transaction{loggedTransactions.length !== 1 ? 's' : ''}
                </Text>
                <Text className="text-gray-400 text-xs">
                  💡 Tap to edit • Swipe to reclassify • Long press for options
                </Text>
              </View>
            )}
            ListFooterComponent={() => <View className="h-20" />}
          />
        )}

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          visible={editModalVisible}
          transaction={selectedTransaction}
          isExpense={selectedTransaction ? Boolean((selectedTransaction as any).isExpense) : false}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedTransaction(null);
          }}
          onSave={handleSaveTransaction}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};