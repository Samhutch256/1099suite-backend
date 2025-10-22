import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';

interface TransactionListProps {
  onTransactionPress?: (transaction: any) => void;
  showFilters?: boolean;
  maxTransactions?: number;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onTransactionPress,
  showFilters = true,
  maxTransactions = 50,
}) => {
  const { user } = useAuthStore();
  const { 
    syncedTransactions, 
    getFilteredTransactions,
    syncTransactions,
    syncInProgress,
    lastSyncTime,
    getBusinessTotal,
    getPersonalTotal,
    getIncomeTotal,
    getPendingTransactions,
  } = usePlaidStore();

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'business' | 'personal' | 'income' | 'pending'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'business', label: 'Business', icon: 'briefcase', color: 'text-green-500' },
    { key: 'personal', label: 'Personal', icon: 'person', color: 'text-red-500' },
    { key: 'income', label: 'Income', icon: 'trending-up', color: 'text-blue-500' },
    { key: 'pending', label: 'Pending', icon: 'time', color: 'text-yellow-500' },
  ];

  const getFilteredData = () => {
    const baseFilters: any = {};
    
    if (selectedFilter === 'business') {
      baseFilters.classification = 'business';
    } else if (selectedFilter === 'personal') {
      baseFilters.classification = 'personal';
    } else if (selectedFilter === 'income') {
      baseFilters.classification = 'income';
    } else if (selectedFilter === 'pending') {
      baseFilters.pending = true;
    }

    return getFilteredTransactions(baseFilters).slice(0, maxTransactions);
  };

  const onRefresh = async () => {
    if (!user || syncInProgress) return;
    
    setRefreshing(true);
    try {
      await syncTransactions(user.id, 30);
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setRefreshing(false);
    }
  };

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
      'Professional Services': 'business',
      'Income': 'trending-up',
      'Other': 'ellipsis-horizontal',
    };
    return iconMap[category] || 'ellipsis-horizontal';
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'business':
        return 'text-green-500';
      case 'personal':
        return 'text-red-500';
      case 'income':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'business':
        return 'briefcase';
      case 'personal':
        return 'person';
      case 'income':
        return 'trending-up';
      default:
        return 'help-circle';
    }
  };

  const transactions = getFilteredData();
  const pendingCount = getPendingTransactions().length;

  return (
    <View className="flex-1">
      {/* Header with totals */}
      <View className="bg-gray-800 p-4 rounded-lg mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white font-semibold text-lg">Transaction Summary</Text>
          <Pressable
            onPress={onRefresh}
            disabled={syncInProgress}
            className="flex-row items-center"
          >
            <Ionicons 
              name="refresh" 
              size={16} 
              color={syncInProgress ? "#6b7280" : "#3b82f6"} 
            />
            <Text className="text-blue-400 ml-1 text-sm">Refresh</Text>
          </Pressable>
        </View>
        
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-green-400 text-xs">Business</Text>
            <Text className="text-green-400 font-bold">
              {formatCurrency(getBusinessTotal())}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-blue-400 text-xs">Income</Text>
            <Text className="text-blue-400 font-bold">
              {formatCurrency(getIncomeTotal())}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-red-400 text-xs">Personal</Text>
            <Text className="text-red-400 font-bold">
              {formatCurrency(getPersonalTotal())}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View className="items-center">
              <Text className="text-yellow-400 text-xs">Pending</Text>
              <Text className="text-yellow-400 font-bold">
                {pendingCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          <View className="flex-row space-x-2 px-4">
            {filters.map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key as any)}
                className={cn(
                  "px-4 py-2 rounded-full flex-row items-center",
                  selectedFilter === filter.key
                    ? "bg-blue-500"
                    : "bg-gray-700"
                )}
              >
                <Ionicons 
                  name={filter.icon as any} 
                  size={16} 
                  color={selectedFilter === filter.key ? "white" : "#9ca3af"} 
                />
                <Text className={cn(
                  "ml-2 text-sm font-medium",
                  selectedFilter === filter.key ? "text-white" : "text-gray-300"
                )}>
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Transaction List */}
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {transactions.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <Ionicons name="receipt-outline" size={48} color="#6b7280" />
            <Text className="text-gray-400 text-lg mt-4 font-medium">
              No transactions found
            </Text>
            <Text className="text-gray-500 text-center mt-2 px-8">
              {selectedFilter === 'all' 
                ? 'Connect your bank account to see transactions here'
                : `No ${selectedFilter} transactions found`
              }
            </Text>
          </View>
        ) : (
          <View className="space-y-3 px-4">
            {transactions.map((transaction) => (
              <Pressable
                key={transaction.id}
                onPress={() => onTransactionPress?.(transaction)}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start flex-1">
                    <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
                      <Ionicons 
                        name={getCategoryIcon(transaction.category)} 
                        size={18} 
                        color="#9ca3af" 
                      />
                    </View>
                    
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-white font-medium text-base flex-1">
                          {transaction.description}
                        </Text>
                        {transaction.pending && (
                          <View className="bg-yellow-500 rounded-full px-2 py-1 ml-2">
                            <Text className="text-yellow-900 text-xs font-medium">Pending</Text>
                          </View>
                        )}
                      </View>
                      
                      <View className="flex-row items-center mb-1">
                        <Text className="text-gray-400 text-sm">
                          {transaction.category}
                        </Text>
                        <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                        <Text className="text-gray-400 text-sm">
                          {formatDate(transaction.date)}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center">
                        <Ionicons 
                          name={getClassificationIcon(transaction.classification)} 
                          size={14} 
                          color={transaction.classification === 'business' ? '#10b981' : 
                                 transaction.classification === 'personal' ? '#ef4444' :
                                 transaction.classification === 'income' ? '#3b82f6' : '#6b7280'} 
                        />
                        <Text className={cn(
                          "text-xs ml-1 capitalize",
                          getClassificationColor(transaction.classification)
                        )}>
                          {transaction.classification}
                        </Text>
                        {transaction.confidence > 0 && (
                          <>
                            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                            <View className="flex-row items-center">
                              <View className={cn(
                                "w-2 h-2 rounded-full mr-1",
                                transaction.confidence > 0.7 ? "bg-green-500" : 
                                transaction.confidence > 0.4 ? "bg-yellow-500" : "bg-red-500"
                              )} />
                              <Text className="text-xs text-gray-400">
                                {Math.round(transaction.confidence * 100)}% confidence
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  <View className="items-end">
                    <Text className={cn(
                      "font-bold text-lg",
                      transaction.classification === 'income' ? "text-blue-400" : "text-white"
                    )}>
                      {transaction.classification === 'income' ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </Text>
                    {transaction.merchantName && transaction.merchantName !== transaction.description && (
                      <Text className="text-gray-400 text-xs mt-1">
                        {transaction.merchantName}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}; 