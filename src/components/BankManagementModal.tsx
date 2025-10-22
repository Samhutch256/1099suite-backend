import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { cn } from '../utils/cn';
import Animated, { FadeInDown, FadeOutUp, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import PlaidLinkWebView from './PlaidLinkWebView';
import { plaidService } from '../services/plaidService';
import { WebView } from 'react-native-webview';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <Animated.View 
          entering={FadeInDown}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        >
          <View className="items-center">
            <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-4 shadow-lg">
              <Ionicons name="checkmark" size={32} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Account Linked!
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Syncing transactions…
            </Text>
            <View className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <View className="bg-green-500 h-2 rounded-full w-full" />
            </View>
            <Pressable
              onPress={onClose}
              className="bg-green-500 rounded-xl py-3 px-6 w-full shadow-lg"
            >
              <Text className="text-white font-semibold text-center">Continue</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ visible, onClose, onRetry }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <Animated.View 
          entering={FadeInDown}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        >
          <View className="items-center">
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-4 shadow-lg">
              <Ionicons name="close" size={32} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Connection Failed
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Unable to connect your bank account. Please try again.
            </Text>
            <View className="flex-row space-x-3 w-full">
              <Pressable
                onPress={onClose}
                className="flex-1 bg-gray-200 rounded-xl py-3 px-4 shadow-sm"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onRetry}
                className="flex-1 bg-red-500 rounded-xl py-3 px-4 shadow-sm"
              >
                <Text className="text-white font-semibold text-center">Retry</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface BankManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BankManagementModal: React.FC<BankManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const { user } = useAuthStore();
  const {
    connectedAccounts,
    disconnectAccount,
    connectAccount,
    syncAllAccounts,
    syncInProgress,
    lastSyncTime,
    getBusinessTotal,
    getPersonalTotal,
    getIncomeTotal,
    getUnreviewedTransactions,
    plaidLinked,
    clearAll,
    lastError,
    refreshAccountBalances,
  } = usePlaidStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [isTestingSuccess, setIsTestingSuccess] = useState(false);
  const [isTestingFailure, setIsTestingFailure] = useState(false);
  const [showPlaidLink, setShowPlaidLink] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showPlaidWebView, setShowPlaidWebView] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidError, setPlaidError] = useState<string | null>(null);

  // Add debugging for plaidLinked state changes
  useEffect(() => {
    console.log('[BankManagementModal] plaidLinked changed:', plaidLinked);
  }, [plaidLinked]);

  // Auto-refresh account balances on app launch if plaidLinked is true
  useEffect(() => {
    if (visible && plaidLinked) {
      refreshAccountBalances();
    }
  }, [visible, plaidLinked]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountTypeDisplay = (type: string, subtype: string) => {
    const typeMap: { [key: string]: string } = {
      'depository': 'Bank',
      'credit': 'Credit',
      'loan': 'Loan',
      'investment': 'Investment',
    };
    
    const subtypeMap: { [key: string]: string } = {
      'checking': 'Checking',
      'savings': 'Savings',
      'cd': 'CD',
      'money market': 'Money Market',
      'credit card': 'Credit Card',
      'paypal': 'PayPal',
    };

    const typeLabel = typeMap[type.toLowerCase()] || type;
    const subtypeLabel = subtypeMap[subtype.toLowerCase()] || subtype;
    
    if (type.toLowerCase() === 'credit' && subtype.toLowerCase() === 'credit card') {
      return 'Credit Card';
    }
    
    return subtypeLabel || typeLabel;
  };

  const handleConnectNewAccount = async (shouldFail: boolean = false) => {
    if (!user) return;
    
    setIsConnecting(true);
    setConnectionError(false);
    setShowErrorBanner(false);
    
    // Simulate network delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Use real connection for front-end
      const result = await connectAccount(user.id);
      
      if (result.success) {
        if (result.linkToken) {
          setPlaidLinkToken(result.linkToken);
          setShowPlaidLink(true);
        } else {
          setShowSuccessModal(true);
        }
      } else {
        setConnectionError(true);
        setShowErrorBanner(true);
      }
    } catch (error) {
      setConnectionError(true);
      setShowErrorBanner(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestSuccess = async () => {
    setIsTestingSuccess(true);
    await handleConnectNewAccount(false);
    setIsTestingSuccess(false);
  };

  const handleTestFailure = async () => {
    setIsTestingFailure(true);
    await handleConnectNewAccount(true);
    setIsTestingFailure(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Modal will automatically show updated connection status
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setConnectionError(false);
  };

  const handleRetryConnection = () => {
    setShowErrorModal(false);
    handleConnectNewAccount(false); // Retry without forcing failure
  };

  const handleDisconnectAccount = (accountId: string, institutionName: string) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect ${institutionName}? This will remove all associated transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            try {
              disconnectAccount(accountId);
              
              // If this was the last account, reset plaidLinked status
              if (connectedAccounts.length === 1) {
                console.log('🔌 Last account disconnected - resetting plaidLinked status');
              }
              
              // Don't show another alert immediately - let the UI update naturally
              console.log(`✅ ${institutionName} has been disconnected`);
            } catch (error) {
              console.error('Error disconnecting account:', error);
              Alert.alert('Error', 'Failed to disconnect account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSyncAllAccounts = async () => {
    if (!user) return;
    
    try {
      const result = await syncAllAccounts(user.id);
      if (result.success) {
        Alert.alert('Success', 'All accounts synced successfully!');
      } else {
        // Error is already stored in state, will be displayed in modal
        Alert.alert('Sync Failed', result.error || 'Failed to sync accounts. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to sync accounts: ${errorMessage}`);
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all connected accounts and transaction data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: () => {
            clearAll();
            Alert.alert('Reset Complete', 'All bank data has been cleared.');
            onClose();
          },
        },
      ]
    );
  };

  const unreviewedTransactions = getUnreviewedTransactions();

  const handlePlaidSuccess = () => {
    console.log('[Plaid] handlePlaidSuccess called - Link success, closing Plaid modal and syncing.');
    setShowPlaidLink(false);
    setPlaidLinkToken(null);
    if (user) {
      console.log('[Plaid] Starting sync for user:', user.id);
      setTimeout(async () => {
        try {
          // First, check if we have stored tokens
          console.log('[Plaid] Checking stored tokens...');
          const tokenInfo = await plaidService.checkStoredTokens(user.id);
          console.log('[Plaid] Token info:', tokenInfo);
          
          if (tokenInfo.hasTokens) {
            console.log('[Plaid] Found stored tokens, calling syncAllAccounts...');
            const result = await syncAllAccounts(user.id);
            console.log('[Plaid] Sync result:', result);
            if (result.success) {
              console.log('[Plaid] Sync successful!');
            } else {
              console.error('[Plaid] Sync failed:', result.error);
            }
          } else {
            console.error('[Plaid] No stored tokens found after connection');
          }
        } catch (error) {
          console.error('[Plaid] Sync error:', error);
        }
      }, 500);
    }
  };

  const handlePlaidError = (error: string) => {
    console.error('[Plaid] Link error:', error);
    setError(error);
    setShowPlaidLink(false);
    setPlaidLinkToken(null);
  };

  const handleConnectBank = async () => {
    console.log('[BankManagement] Starting bank connection...');
    console.log('[BankManagement] Current user ID:', user?.id);
    
    if (!user?.id) {
      setError('User not authenticated. Please sign in again.');
      return;
    }

    setPlaidLoading(true);
    setPlaidError(null);

    try {
      console.log('[BankManagement] Creating link token for user:', user.id);

      const result = await connectAccount(user.id);
      if (result.success && result.linkToken) {
        setPlaidLinkToken(result.linkToken);
        setShowPlaidLink(true);
        console.log('[BankManagement] Link token created, showing Plaid Link');
      } else if (result.success) {
        console.log('[BankManagement] Existing Plaid connection detected, triggering sync');
        await syncAllAccounts(user.id);
        setShowSuccessModal(true);
      } else {
        throw new Error(result.error || 'Failed to create link token');
      }
    } catch (error) {
      console.error('[BankManagement] Error creating link token:', error);
      setPlaidError('Failed to connect bank. Please try again.');
    } finally {
      setPlaidLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-900">
        {/* Header */}
        <View className="bg-gray-800 border-b border-gray-700 px-6 py-4 shadow-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Bank Management</Text>
              <Text className="text-sm text-gray-400 mt-1">
                Manage your connected accounts and transactions
              </Text>
            </View>
            
            {/* Connection Status Badge */}
            <View className="flex-row items-center space-x-3">
              <View className={cn(
                "px-3 py-1.5 rounded-full flex-row items-center shadow-sm",
                plaidLinked ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"
              )}>
                <View className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  plaidLinked ? "bg-green-400" : "bg-red-400"
                )} />
                <Text className={cn(
                  "text-xs font-medium",
                  plaidLinked ? "text-green-300" : "text-red-300"
                )}>
                  {plaidLinked ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              
              <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center bg-gray-700/50">
                <Ionicons name="close" size={20} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={true}
          alwaysBounceVertical={false}
        >
          {/* Error Banner */}
          {showErrorBanner && (
            <Animated.View 
              entering={FadeInDown}
              exiting={FadeOutUp}
              className="mx-6 mt-4 mb-3 bg-red-500/20 border border-red-500/40 rounded-xl p-3 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text className="text-red-300 text-sm font-medium ml-2">
                    Connection failed – simulated error
                  </Text>
                </View>
                <Pressable onPress={() => setShowErrorBanner(false)}>
                  <Ionicons name="close" size={16} color="#ef4444" />
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Financial Summary */}
          {plaidLinked && (
            <View className="px-6 pb-6">
              <Text className="text-lg font-semibold text-white mb-4">Financial Summary</Text>
              <View className="flex-row space-x-3">
                <View className="flex-1 bg-green-900/20 border border-green-500/30 rounded-xl p-4 shadow-lg">
                  <Text className="text-green-300 text-xs font-medium mb-1">Business</Text>
                  <Text className="text-white text-lg font-bold">{formatCurrency(getBusinessTotal())}</Text>
                </View>
                <View className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 shadow-lg">
                  <Text className="text-blue-300 text-xs font-medium mb-1">Income</Text>
                  <Text className="text-white text-lg font-bold">{formatCurrency(getIncomeTotal())}</Text>
                </View>
                <View className="flex-1 bg-red-900/20 border border-red-500/30 rounded-xl p-4 shadow-lg">
                  <Text className="text-red-300 text-xs font-medium mb-1">Personal</Text>
                  <Text className="text-white text-lg font-bold">{formatCurrency(getPersonalTotal())}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Connected Accounts */}
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-white mb-4">Connected Accounts</Text>
            
            {/* Modern Add Account Button */}
            <Pressable
              onPress={handleConnectBank}
              disabled={plaidLoading}
              className={cn(
                "bg-blue-500 rounded-xl p-3 flex-row items-center justify-center mb-4 shadow-lg",
                plaidLoading ? "opacity-50" : "active:scale-95"
              )}
            >
              {plaidLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add-circle-outline" size={20} color="white" />
              )}
              <Text className="text-white font-semibold text-base ml-2">
                {plaidLoading ? 'Connecting...' : 'Add Bank Account'}
              </Text>
            </Pressable>
            {plaidError && (
              <Text className="text-red-400 text-sm text-center mb-3">{plaidError}</Text>
            )}

            {connectedAccounts.length === 0 ? (
              <View className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-lg">
                <View className="items-center">
                  <View className="w-16 h-16 bg-gray-700/50 rounded-full items-center justify-center mb-4 shadow-sm">
                    <Ionicons name="card-outline" size={32} color="#9ca3af" />
                  </View>
                  <Text className="text-gray-200 text-center font-semibold text-lg mb-2">
                    No accounts connected yet
                  </Text>
                  <Text className="text-gray-400 text-center text-sm leading-5">
                    Link a bank account to begin tracking your expenses.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="space-y-3">
                {connectedAccounts.map((account, index) => (
                  <Animated.View
                    key={account.id || `account-${index}`}
                    entering={FadeInDown}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-3">
                          <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3 shadow-sm">
                            <Ionicons name="card" size={20} color="white" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-semibold text-base">{account.institutionName}</Text>
                            <Text className="text-gray-400 text-sm">
                              {account.accounts.length} account{account.accounts.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Account Details */}
                        <View className="ml-13 space-y-2">
                          {account.accounts.map((acc, accIndex) => (
                            <View key={acc.id || `acc-${accIndex}`} className="bg-gray-700/30 rounded-lg p-3 shadow-sm">
                              <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-1">
                                  <Text className="text-white font-medium text-sm">{acc.name}</Text>
                                  <View className="flex-row items-center mt-1">
                                    <Text className="text-gray-400 text-xs">
                                      {getAccountTypeDisplay(acc.type, acc.subtype)}
                                    </Text>
                                    <Text className="text-gray-500 text-xs ml-2">****{acc.mask}</Text>
                                  </View>
                                </View>
                                {acc.balances?.current !== null && acc.balances?.current !== undefined && (
                                  <View className="items-end">
                                    <Text className={cn(
                                      "font-semibold text-sm",
                                      acc.balances.current >= 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                      {formatCurrency(acc.balances.current)}
                                    </Text>
                                    {acc.balances.available !== null && acc.balances.available !== acc.balances.current && (
                                      <Text className="text-gray-400 text-xs">
                                        Available: {formatCurrency(acc.balances.available)}
                                      </Text>
                                    )}
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>

                        <View className="ml-13 mt-3 pt-2 border-t border-gray-700">
                          <Text className="text-gray-500 text-xs">
                            Last synced {formatLastSync(account.lastSync)}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleDisconnectAccount(account.id, account.institutionName)}
                        className="ml-3 p-2 rounded-lg bg-red-500/10"
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          {plaidLinked && (
            <View className="px-6 pb-6">
              <Text className="text-lg font-semibold text-white mb-4">Actions</Text>
              <View className="space-y-3">
                <Pressable
                  onPress={handleSyncAllAccounts}
                  disabled={syncInProgress}
                  className={cn(
                    "bg-purple-500 rounded-xl p-3 flex-row items-center justify-center shadow-lg",
                    syncInProgress ? "opacity-50" : "active:scale-95"
                  )}
                >
                  <Ionicons name="refresh" size={18} color="white" />
                  <Text className="text-white font-semibold text-base ml-2">
                    {syncInProgress ? 'Syncing...' : 'Sync All Accounts'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleResetAllData}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex-row items-center justify-center shadow-sm active:scale-95"
                >
                  <Ionicons name="warning" size={18} color="#ef4444" />
                  <Text className="text-red-400 font-semibold text-base ml-2">Reset All Data</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Demo Actions */}
          {!plaidLinked && (
            <View className="px-6 pb-6">
              <Text className="text-sm font-semibold text-gray-300 mb-3">Demo Actions</Text>
              <View className="space-y-3">
                <Pressable
                  onPress={handleTestSuccess}
                  disabled={isTestingSuccess || isTestingFailure}
                  className={cn(
                    "bg-green-500 rounded-xl p-3 flex-row items-center justify-center shadow-lg",
                    (isTestingSuccess || isTestingFailure) ? "opacity-50" : "active:scale-95"
                  )}
                >
                  {isTestingSuccess ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                  )}
                  <Text className="text-white font-semibold text-base ml-2">
                    {isTestingSuccess ? 'Testing...' : 'Test Success Flow'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleTestFailure}
                  disabled={isTestingSuccess || isTestingFailure}
                  className={cn(
                    "bg-red-500 rounded-xl p-3 flex-row items-center justify-center shadow-lg",
                    (isTestingSuccess || isTestingFailure) ? "opacity-50" : "active:scale-95"
                  )}
                >
                  {isTestingFailure ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="close-circle" size={18} color="white" />
                  )}
                  <Text className="text-white font-semibold text-base ml-2">
                    {isTestingFailure ? 'Testing...' : 'Test Failure Flow'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-6" />
        </ScrollView>

        {/* Success Modal */}
        <SuccessModal
          visible={showSuccessModal}
          onClose={handleSuccessModalClose}
        />

        {/* Error Modal */}
        <ErrorModal
          visible={showErrorModal}
          onClose={handleErrorModalClose}
          onRetry={handleRetryConnection}
        />

        {/* Render Plaid Link WebView */}
        {showPlaidLink && plaidLinkToken && (
          <PlaidLinkWebView
            visible={showPlaidLink}
            onSuccess={handlePlaidSuccess}
            onClose={() => {
              setShowPlaidLink(false);
              setPlaidLinkToken(null);
            }}
            userId={user?.id || ''}
            linkToken={plaidLinkToken}
          />
        )}

        {/* Render WebView */}
        {showPlaidWebView && linkToken && (
          <WebView
            source={{ uri: `https://cdn.plaid.com/link/v2/stable/link.html?isWebview=true&token=${linkToken}` }}
            onMessage={event => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.public_token) {
                  // Save public_token and metadata to Supabase or locally here
                  setShowPlaidWebView(false);
                  setLinkToken(null);
                  // Optionally trigger a sync or show a success modal
                  if (user) {
                    setTimeout(() => {
                      syncAllAccounts(user.id);
                    }, 500);
                  }
                }
              } catch (e) {
                // Ignore non-JSON messages
              }
            }}
            startInLoadingState
            style={{ flex: 1, height: 500 }}
          />
        )}

        {/* Error Message */}
        {error && (
          <View className="px-6 py-4">
            <Text className="text-red-500 text-center">{error}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};
