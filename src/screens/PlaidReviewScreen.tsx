import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { PlaidLinkModal } from '../components/PlaidLinkModal';
import { TransactionList } from '../components/TransactionList';
import { cn } from '../utils/cn';

interface PlaidReviewScreenProps {
  navigation: any;
}

export const PlaidReviewScreen: React.FC<PlaidReviewScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { 
    plaidLinked, 
    connectedAccounts, 
    connectAccount, 
    isLoading, 
    lastError,
    tokenInfo,
    initializeOnAppLaunch,
    getBusinessTotal,
    getPersonalTotal,
    getIncomeTotal,
    getPendingTransactions,
  } = usePlaidStore();

  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'accounts'>('overview');

  useEffect(() => {
    if (user) {
      initializeOnAppLaunch(user.id);
    }
  }, [user]);

  const handleConnectAccount = async () => {
    if (!user) {
      Alert.alert('Connection Error', 'User context not available.');
      return { success: false, error: 'Missing user' };
    }

    try {
      const result = await connectAccount(user.id);
      if (!result.success) {
        Alert.alert('Connection Failed', result.error || 'Failed to connect account');
      }
      return result;
    } catch (error) {
      Alert.alert('Connection Error', 'An unexpected error occurred');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleDisconnectAccount = (accountId: string) => {
    Alert.alert(
      'Disconnect Account',
      'Are you sure you want to disconnect this account? You will need to reconnect to see transactions again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: () => {
            // Disconnect logic handled by store
            console.log('Disconnecting account:', accountId);
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  const renderOverview = () => (
    <View className="flex-1">
      {/* Connection Status */}
      <View className="bg-gray-800 rounded-lg p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-semibold text-lg">Bank Connection</Text>
          <View className={cn(
            "px-3 py-1 rounded-full",
            plaidLinked ? "bg-green-500" : "bg-red-500"
          )}>
            <Text className="text-white text-xs font-medium">
              {plaidLinked ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>
        
        {plaidLinked ? (
          <View>
            <Text className="text-gray-300 text-sm mb-2">
              Connected to {connectedAccounts.length} account{connectedAccounts.length !== 1 ? 's' : ''}
            </Text>
            <Text className="text-gray-400 text-xs">
              Last sync: {formatLastSync(connectedAccounts[0]?.lastSync)}
            </Text>
          </View>
        ) : (
          <Text className="text-gray-300 text-sm">
            Connect your bank accounts to automatically import and categorize transactions
          </Text>
        )}
      </View>

      {/* Financial Summary */}
      {plaidLinked && (
        <View className="bg-gray-800 rounded-lg p-4 mb-4">
          <Text className="text-white font-semibold text-lg mb-3">Financial Summary</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="briefcase" size={16} color="#10b981" />
                <Text className="text-gray-300 ml-2">Business Expenses</Text>
              </View>
              <Text className="text-green-400 font-semibold">
                {formatCurrency(getBusinessTotal())}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="trending-up" size={16} color="#3b82f6" />
                <Text className="text-gray-300 ml-2">Income</Text>
              </View>
              <Text className="text-blue-400 font-semibold">
                {formatCurrency(getIncomeTotal())}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="person" size={16} color="#ef4444" />
                <Text className="text-gray-300 ml-2">Personal Expenses</Text>
              </View>
              <Text className="text-red-400 font-semibold">
                {formatCurrency(getPersonalTotal())}
              </Text>
            </View>
            {getPendingTransactions().length > 0 && (
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={16} color="#f59e0b" />
                  <Text className="text-gray-300 ml-2">Pending Transactions</Text>
                </View>
                <Text className="text-yellow-400 font-semibold">
                  {getPendingTransactions().length}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View className="bg-gray-800 rounded-lg p-4">
        <Text className="text-white font-semibold text-lg mb-3">Quick Actions</Text>
        <View className="space-y-3">
          {plaidLinked ? (
            <>
              <Pressable
                onPress={() => setActiveTab('transactions')}
                className="bg-blue-500 rounded-lg p-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="receipt" size={20} color="white" />
                  <Text className="text-white font-medium ml-3">View Transactions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </Pressable>
              
              <Pressable
                onPress={() => setActiveTab('accounts')}
                className="bg-gray-700 rounded-lg p-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="card" size={20} color="#9ca3af" />
                  <Text className="text-gray-300 font-medium ml-3">Manage Accounts</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
              
              <Pressable
                onPress={() => navigation.navigate('TransactionReview')}
                className="bg-green-500 rounded-lg p-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-medium ml-3">Review Transactions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setShowPlaidModal(true)}
              className="bg-blue-500 rounded-lg p-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="card" size={20} color="white" />
                <Text className="text-white font-medium ml-3">Connect Bank Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const renderTransactions = () => (
    <View className="flex-1">
      <TransactionList 
        onTransactionPress={(transaction) => {
          console.log('Transaction pressed:', transaction);
          // Could open transaction detail modal here
        }}
        maxTransactions={100}
      />
    </View>
  );

  const renderAccounts = () => (
    <View className="flex-1">
      {connectedAccounts.length === 0 ? (
        <View className="flex-1 justify-center items-center py-12">
          <Ionicons name="card-outline" size={48} color="#6b7280" />
          <Text className="text-gray-400 text-lg mt-4 font-medium">
            No Connected Accounts
          </Text>
          <Text className="text-gray-500 text-center mt-2 px-8">
            Connect your bank accounts to see them here
          </Text>
        </View>
      ) : (
        <View className="space-y-3 p-4">
          {connectedAccounts.map((account) => (
            <View key={account.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-white font-semibold text-lg">
                    {account.institutionName}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {account.accounts.length} account{account.accounts.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDisconnectAccount(account.id)}
                  className="bg-red-500 rounded-full p-2"
                >
                  <Ionicons name="close" size={16} color="white" />
                </Pressable>
              </View>
              
              <View className="space-y-2">
                {account.accounts.map((acc) => (
                  <View key={acc.id} className="flex-row items-center justify-between bg-gray-700 rounded p-3">
                    <View>
                      <Text className="text-white font-medium">{acc.name}</Text>
                      <Text className="text-gray-400 text-sm">
                        {acc.type} • {acc.subtype} • ****{acc.mask}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-semibold">
                        {formatCurrency(acc.balances?.current || 0)}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {acc.balances?.available !== null ? `Available: ${formatCurrency(acc.balances.available)}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              
              <View className="mt-3 pt-3 border-t border-gray-600">
                <Text className="text-gray-400 text-xs">
                  Last sync: {formatLastSync(account.lastSync)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-600">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable
                onPress={() => navigation.goBack()}
                className="mr-4"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <Text className="text-xl font-bold text-white">Bank & Transactions</Text>
            </View>
            {plaidLinked && (
              <Pressable
                onPress={() => setShowPlaidModal(true)}
                className="bg-blue-500 rounded-full p-2"
              >
                <Ionicons name="add" size={20} color="white" />
              </Pressable>
            )}
          </View>

          {/* Tab Navigation */}
          <View className="flex-row mt-4 space-x-1">
            {[
              { key: 'overview', label: 'Overview', icon: 'home' },
              { key: 'transactions', label: 'Transactions', icon: 'receipt' },
              { key: 'accounts', label: 'Accounts', icon: 'card' },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg flex-row items-center justify-center",
                  activeTab === tab.key ? "bg-blue-500" : "bg-gray-700"
                )}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.key ? "white" : "#9ca3af"} 
                />
                <Text className={cn(
                  "ml-2 text-sm font-medium",
                  activeTab === tab.key ? "text-white" : "text-gray-300"
                )}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-4">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'accounts' && renderAccounts()}
        </View>

        {/* Plaid Link Modal */}
        <PlaidLinkModal
          visible={showPlaidModal}
          onClose={() => setShowPlaidModal(false)}
          onConnect={handleConnectAccount}
          isLoading={isLoading}
          userId={user?.id ?? null}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};
