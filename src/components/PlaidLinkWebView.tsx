import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  EmbeddedLinkView,
  LinkSuccess,
  LinkExit,
  LinkError,
  LinkIOSPresentationStyle,
} from 'react-native-plaid-link-sdk';
import { usePlaidStore } from '../state/plaidStore';
import { plaidService } from '../services/plaidService';

const PLAID_LOGO = 'https://cdn.plaid.com/link/v2/assets/plaid-logo-blue.svg';

interface PlaidLinkWebViewProps {
  visible: boolean;
  onSuccess?: () => void;
  onClose: () => void;
  userId: string | null;
  linkToken?: string | null;
}

export default function PlaidLinkWebView({ visible, onSuccess, onClose, userId, linkToken: linkTokenProp }: PlaidLinkWebViewProps) {
  const [linkToken, setLinkToken] = useState<string | null>(linkTokenProp ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => {
        console.log('Loading timeout - forcing close');
        setLoading(false);
        setError('Request timed out. Please try again.');
      }, 30000); // 30 second timeout
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading]);

  // Fetch link token when modal opens
  useEffect(() => {
    if (linkTokenProp) {
      setLinkToken(linkTokenProp);
    }
  }, [linkTokenProp]);

  useEffect(() => {
    if (visible) {
      setError(null);
      if (linkTokenProp) {
        setLoading(false);
        setLinkToken(linkTokenProp);
        return;
      }

      setLoading(true);
      setLinkToken(null);
      (async () => {
        if (!userId) {
          setError('Missing user context');
          setLoading(false);
          return;
        }

        console.log('[Plaid] Attempting to fetch link token...');
        try {
          const data = await plaidService.createLinkToken(userId);
          console.log('[Plaid] Link token fetch response:', data);
          setLinkToken(data.linkToken);
        } catch (err) {
          setError('Failed to fetch link token.');
          console.error('[Plaid] Link token fetch exception:', err);
        }
        setLoading(false);
      })();
    } else {
      setLinkToken(null);
      setError(null);
    }
  }, [visible, userId, linkTokenProp]);

  // Handle Plaid Link success
  const handleSuccess = async (success: LinkSuccess) => {
    console.log('[Plaid] Link success:', success);
    setLoading(true);
    setError(null);

    try {
      console.log('[Plaid] Starting token exchange for user ID:', userId);
      if (!userId) {
        throw new Error('Missing user identifier');
      }

      const exchange = await plaidService.exchangePublicToken(
        userId,
        success.publicToken,
        success.metadata,
      );

      if (!exchange.success) {
        throw new Error(exchange.error || 'Token exchange failed');
      }

      console.log('[Plaid] Token exchange successful, fetching accounts...');
      const accounts = await plaidService.fetchAccounts(userId);

      console.log('[Plaid] Saving account information to store...');
      usePlaidStore.setState((state) => {
        const connectedAccount = {
          id: exchange.itemId || `connected_${Date.now()}`,
          accessToken: null,
          itemId: exchange.itemId || 'unknown_item',
          institutionName:
            exchange.institutionName ||
            success.metadata?.institution?.name ||
            'Unknown Institution',
          institutionId:
            success.metadata?.institution?.id ||
            success.metadata?.institution?.institutionId ||
            'unknown',
          accounts,
          lastSync: new Date().toISOString(),
          isActive: true,
        };

        return {
          ...state,
          plaidLinked: true,
          connectedAccounts: [...state.connectedAccounts, connectedAccount],
          lastSyncTime: new Date().toISOString(),
          tokenInfo: {
            hasTokens: true,
            itemIds: connectedAccount.itemId ? [connectedAccount.itemId] : [],
          },
        };
      });

      // Save user data
      setTimeout(() => usePlaidStore.getState().saveUserData(), 0);

      // Auto-fetch transactions after successful connection
      console.log('[Plaid] Auto-fetching transactions after successful connection...');
      setTimeout(async () => {
        try {
          const result = await usePlaidStore.getState().autoFetchTransactions();
          console.log('[Plaid] Auto-fetch result:', result);
        } catch (error) {
          console.error('[Plaid] Auto-fetch failed:', error);
        }
      }, 1000);

      setLoading(false);
      console.log('[Plaid] Token exchange successful, calling parent onSuccess');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      console.error('Token exchange error:', e);
      setLoading(false);
      setError('Failed to connect account. Please try again.');
    }
  };

  // Handle Plaid Link exit
  const handleExit = (exit: LinkExit) => {
    console.log('Plaid Link exited:', exit);
    setLoading(false);
    setError(null);
    onClose(); // Close the modal when user exits
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#e0e7ff", "#f0fdfa", "#f3f4f6"]} style={{ flex: 1 }}>
        {/* Close button */}
        <Pressable onPress={onClose} className="absolute right-6 top-10 z-10 w-10 h-10 items-center justify-center bg-white/80 rounded-full shadow">
          <Ionicons name="close" size={28} color="#374151" />
        </Pressable>
        <View className="flex-1 items-center justify-center px-6">
          {/* Plaid Logo */}
          <Image source={{ uri: PLAID_LOGO }} style={{ width: 80, height: 32, marginBottom: 18 }} resizeMode="contain" />
          {/* Title & Subtitle */}
          <Text className="text-2xl font-extrabold text-blue-900 mb-2 tracking-tight text-center">Connect Your Bank</Text>
          <Text className="text-base text-blue-700 mb-4 text-center">Securely link your account to import and categorize your transactions automatically.</Text>
          {/* Progress */}
          <View className="flex-row items-center justify-center mb-6">
            <View className="w-8 h-8 rounded-full items-center justify-center bg-blue-500">
              <Ionicons name="link" size={20} color="white" />
            </View>
            <View className="h-1 w-8 bg-blue-500 mx-1 rounded-full" />
            <View className="w-8 h-8 rounded-full items-center justify-center bg-blue-500">
              <Ionicons name="lock-closed" size={20} color="white" />
            </View>
            <View className="h-1 w-8 bg-blue-200 mx-1 rounded-full" />
            <View className="w-8 h-8 rounded-full items-center justify-center bg-blue-200">
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
          </View>
          {/* Plaid Link Native Component */}
          <View className="w-full max-w-md h-96 rounded-2xl overflow-hidden shadow-lg bg-white items-center justify-center">
            {loading && (
              <View className="absolute inset-0 bg-white/80 items-center justify-center z-10">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            )}
            {error && !loading && (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="alert-circle" size={48} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text className="text-lg font-bold text-red-700 mb-2">Something went wrong</Text>
                <Text className="text-base text-red-600 text-center mb-4">{error}</Text>
                <Pressable onPress={() => setError(null)} className="bg-blue-500 rounded-xl px-6 py-3 mt-2">
                  <Text className="text-white font-semibold">Try Again</Text>
                </Pressable>
              </View>
            )}
            {linkToken && !loading && !error && (
              <EmbeddedLinkView
                token={linkToken}
                iOSPresentationStyle={LinkIOSPresentationStyle.MODAL}
                onSuccess={handleSuccess}
                onExit={handleExit}
                onEvent={() => {}} // No-op to satisfy linter
                style={{ flex: 1, width: '100%', minHeight: 300 }}
              />
            )}
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
} 
