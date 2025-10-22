import { useCallback, useEffect, useRef, useState } from 'react';
import { Txn } from '../types/transactions';
import { usePlaidStore } from '../state/plaidStore';
import { useAuthStore } from '../state/authStore';
import { plaidService } from '../services/plaidService';

type Filter = { q?: string; kind?: 'all'|'business'|'personal'|'unreviewed'; start?: string; end?: string; };

export function usePlaidTransactions(initial: Filter = { kind: 'all' }) {
  const [items, setItems] = useState<Txn[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const filterRef = useRef<Filter>(initial);

  // Get actual Plaid data from stores
  const { currentUserId, connectedAccounts } = usePlaidStore();
  const { user } = useAuthStore();

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    
    // Check if we have the required data
    if (!currentUserId) {
      console.log('[usePlaidTransactions] No currentUserId, skipping load');
      return;
    }

    setLoading(true);
    try {
      const filter = filterRef.current;
      const transactions = await plaidService.fetchTransactions(currentUserId, {
        startDate: filter.start,
        endDate: filter.end,
      });

      const mapped: Txn[] = transactions.map((txn) => ({
        id: txn.transactionId,
        account_id: txn.accountId,
        name: txn.name,
        merchant_name: txn.merchantName,
        amount: txn.amount,
        currency: 'USD',
        date: txn.date,
        pending: txn.pending,
        category: txn.category,
        account_name: txn.accountName ?? undefined,
        classification: 'unreviewed',
      }));

      setItems(mapped);
      setCursor(null);
      setHasMore(false);
    } catch (error) {
      console.error('[usePlaidTransactions] Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, currentUserId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setCursor(null);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const setFilter = (next: Partial<Filter>) => {
    filterRef.current = { ...filterRef.current, ...next };
    setCursor(null);
    load(true);
  };

  useEffect(() => { 
    if (currentUserId) {
      load(true); 
    }
  }, [currentUserId, load]);

  return { items, hasMore, loading, refreshing, loadMore: () => hasMore && load(false), refresh, setFilter };
}
