import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { usePlaidTransactions } from '../hooks/usePlaidTransactions';
import { TransactionItem } from '../components/TransactionItem';
import TransactionEditorSheet from '../components/TransactionEditorSheet';
import type { Txn } from '../types/transactions';
import { Swipeable } from 'react-native-gesture-handler';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { plaidService } from '../services/plaidService';

const BACKEND_URL = plaidService.getBaseUrl();

function MonthHeader({ label }: { label: string }) {
  return <View className="bg-gray-50 px-4 py-2"><Text className="text-xs text-gray-500">{label}</Text></View>;
}

export default function DeductionsTransactionsScreen() {
  const { items, hasMore, loadMore, refresh, refreshing, loading } = usePlaidTransactions();
  const [selected, setSelected] = useState<Txn | null>(null);
  
  // Get Plaid store data for debugging
  const { currentUserId, connectedAccounts, plaidLinked } = usePlaidStore();
  const { user, isAuthenticated } = useAuthStore();

  // Debug logging
  useEffect(() => {
    console.log('[DeductionsTransactionsScreen] Component mounted');
    console.log('[DeductionsTransactionsScreen] Auth state:', {
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email
    });
    console.log('[DeductionsTransactionsScreen] Plaid state:', {
      currentUserId,
      connectedAccountsCount: connectedAccounts.length,
      plaidLinked,
      itemsCount: items.length,
      loading,
      refreshing
    });
    
    // Log connected accounts details
    if (connectedAccounts.length > 0) {
      console.log('[DeductionsTransactionsScreen] Connected accounts:', connectedAccounts.map(acc => ({
        id: acc.id,
        institutionName: acc.institutionName,
        isActive: acc.isActive,
      })));
    }
  }, [currentUserId, connectedAccounts.length, plaidLinked, items.length, loading, refreshing, isAuthenticated, user]);

  const grouped = useMemo(() => {
    const by: Record<string, Txn[]> = {};
    for (const t of items) {
      const d = new Date(t.date);
      const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      (by[key] ||= []).push(t);
    }
    return Object.entries(by);
  }, [items]);

  const classify = async (id: string, classification: 'business'|'personal') => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses/classify`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id, classification })
      });
      
      if (!response.ok) {
        console.error('[DeductionsTransactionsScreen] Classify failed:', response.status);
      } else {
        console.log('[DeductionsTransactionsScreen] Transaction classified successfully');
        // Refresh the transactions to remove the classified one from the list
        refresh();
      }
    } catch (error) {
      console.error('[DeductionsTransactionsScreen] Classify error:', error);
    }
  };

  // Show loading state
  if (loading && items.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Loading transactions...</Text>
      </View>
    );
  }

  // Show no accounts state
  if (!plaidLinked || connectedAccounts.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-white mb-2">No Connected Accounts</Text>
        <Text className="text-gray-300 text-center mb-8">
          Connect your bank account in the Expenses & Income tab to view transactions here.
        </Text>
        <Text className="text-gray-400 text-center text-sm">
          Debug: {isAuthenticated ? 'Authenticated' : 'Not authenticated'} | 
          User: {user?.id ? 'Set' : 'Not set'} | 
          Plaid: {plaidLinked ? 'Linked' : 'Not linked'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlashList
        data={grouped}
        keyExtractor={([month]) => month}
        renderItem={({ item: [month, txns] }) => (
          <>
            <MonthHeader label={month} />
            {txns.map((t) => (
              <Swipeable
                key={t.id}
                renderLeftActions={() => <View className="bg-green-500 w-24 items-center justify-center"><Text className="text-white">Business</Text></View>}
                renderRightActions={() => <View className="bg-gray-300 w-24 items-center justify-center"><Text>Personal</Text></View>}
                onSwipeableOpen={(dir) => classify(t.id, dir === 'left' ? 'personal' : 'business')}
              >
                <TransactionItem txn={t} onPress={() => setSelected(t)} />
              </Swipeable>
            ))}
          </>
        )}
        estimatedItemSize={72}
        onEndReachedThreshold={0.2}
        onEndReached={() => hasMore && loadMore()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <View className="p-8">
            <Text className="text-center text-gray-500">
              {loading ? 'Loading transactions...' : 'No transactions found. Pull to refresh.'}
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-2">
              Connected accounts: {connectedAccounts.length}
            </Text>
          </View>
        }
      />

      <TransactionEditorSheet
        visible={!!selected}
        txn={selected}
        onClose={() => setSelected(null)}
        onSaved={() => {}}
      />
    </>
  );
}
