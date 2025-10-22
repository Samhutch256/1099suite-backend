import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { plaidService, PlaidAccount, PlaidTransaction, PlaidTokenInfo } from '../services/plaidService';
import { databaseService } from '../services/database';

export interface TransactionFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  categories?: string[];
  classification?: 'business' | 'personal' | 'income' | 'unclassified';
  accountIds?: string[];
  pending?: boolean;
}

export interface ConnectedAccount {
  id: string;
  accessToken?: string | null;
  itemId: string;
  institutionName: string;
  institutionId: string;
  accounts: PlaidAccount[];
  lastSync: string | null;
  isActive: boolean;
}

export interface SyncedTransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  merchantName?: string;
  accountName: string;
  classification: 'business' | 'personal' | 'income' | 'unclassified';
  clientTag?: string;
  jobTag?: string;
  isBusinessExpense: boolean;
  confidence: number;
  source: 'plaid';
  isReviewed: boolean;
  isApproved: boolean;
  pending: boolean;
  originalTransaction: PlaidTransaction;
  createdAt: string;
  updatedAt: string;
}

interface PlaidState {
  currentUserId: string | null;
  connectedAccounts: ConnectedAccount[];
  syncedTransactions: SyncedTransaction[];
  isLoading: boolean;
  lastSyncTime: string | null;
  syncInProgress: boolean;
  plaidLinked: boolean;
  lastError: string | null;
  tokenInfo: PlaidTokenInfo | null;
  
  // User management
  setCurrentUser: (userId: string) => void;
  clearUserData: () => void;
  loadUserData: (userId: string) => Promise<void>;
  saveUserData: () => Promise<void>;
  
  // Token management
  checkStoredTokens: (userId: string) => Promise<void>;
  
  // Connection management
  connectAccount: (
    userId: string
  ) => Promise<{ success: boolean; linkToken?: string; error?: string }>;
  disconnectAccount: (accountId: string) => void;
  connectAccountReal: (
    userId: string
  ) => Promise<{ success: boolean; linkToken?: string; error?: string }>;
  
  // Transaction sync
  syncTransactions: (userId: string, days?: number) => Promise<{ success: boolean; error?: string }>;
  syncAllAccounts: (userId: string) => Promise<{ success: boolean; error?: string }>;
  autoFetchTransactions: () => Promise<{ success: boolean; error?: string }>;
  refreshAccountBalances: () => Promise<void>;
  initializeOnAppLaunch: (userId: string) => Promise<void>;
  
  // Error management
  clearError: () => void;
  
  // Transaction management
  approveTransaction: (transactionId: string) => void;
  rejectTransaction: (transactionId: string) => void;
  updateTransactionCategory: (transactionId: string, category: string) => void;
  markAsReviewed: (transactionId: string) => void;
  classifyTransaction: (transactionId: string, classification: 'business' | 'personal' | 'income') => void;
  tagTransaction: (transactionId: string, clientTag?: string, jobTag?: string) => void;
  
  // Getters
  getUnreviewedTransactions: () => SyncedTransaction[];
  getApprovedTransactions: () => SyncedTransaction[];
  getBusinessExpenses: () => SyncedTransaction[];
  getPersonalExpenses: () => SyncedTransaction[];
  getPendingTransactions: () => SyncedTransaction[];
  getAccountBalance: (accountId: string) => number;
  getBusinessTotal: () => number;
  getIncomeTotal: () => number;
  getPersonalTotal: () => number;
  getUnclassifiedTotal: () => number;
  getFilteredTransactions: (filters: TransactionFilters) => SyncedTransaction[];
  
  // Utils
  clearAll: () => void;
}

export const usePlaidStore = create<PlaidState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      connectedAccounts: [],
      syncedTransactions: [],
      isLoading: false,
      lastSyncTime: null,
      syncInProgress: false,
      plaidLinked: false,
      lastError: null,
      tokenInfo: null,
      
      setCurrentUser: (userId: string) => {
        const state = get();
        console.log('[Plaid Store] setCurrentUser called with:', { userId, currentUserId: state.currentUserId });
        if (state.currentUserId !== userId) {
          // Clear existing data when switching users
          set({
            currentUserId: userId,
            connectedAccounts: [],
            syncedTransactions: [],
            lastSyncTime: null,
            syncInProgress: false,
            plaidLinked: false,
            lastError: null,
            tokenInfo: null,
          });
          console.log('[Plaid Store] User data cleared and currentUserId set to:', userId);
        }
      },
      
      clearUserData: () => {
        set({
          currentUserId: null,
          connectedAccounts: [],
          syncedTransactions: [],
          lastSyncTime: null,
          syncInProgress: false,
          plaidLinked: false,
          lastError: null,
          tokenInfo: null,
        });
      },
      
      loadUserData: async (userId: string) => {
        try {
          // Load accounts and transactions from database
          const [accounts, transactions] = await Promise.all([
            databaseService.getPlaidAccounts(userId),
            databaseService.getPlaidTransactions(userId)
          ]);
          
          set({
            currentUserId: userId,
            connectedAccounts: accounts,
            syncedTransactions: transactions,
            lastSyncTime: accounts.length > 0 ? accounts[0].lastSync : null,
            plaidLinked: accounts.length > 0,
            syncInProgress: false,
            lastError: null,
          });
        } catch (error) {
          console.error('Failed to load user plaid data:', error);
          set({
            currentUserId: userId,
            connectedAccounts: [],
            syncedTransactions: [],
            lastSyncTime: null,
            syncInProgress: false,
            plaidLinked: false,
            lastError: null,
          });
        }
      },
      
      saveUserData: async () => {
        const state: PlaidState = get();
        if (!state.currentUserId) return;
        
        try {
          // Save accounts and transactions to database
          await Promise.all([
            ...state.connectedAccounts.map((account: ConnectedAccount) => 
              databaseService.savePlaidAccount(state.currentUserId!, account)
            ),
            ...state.syncedTransactions.map((transaction: SyncedTransaction) => 
              databaseService.savePlaidTransaction(state.currentUserId!, transaction)
            )
          ]);
        } catch (error) {
          console.error('Failed to save user plaid data:', error);
        }
      },

      checkStoredTokens: async (userId: string) => {
        console.log('[Plaid Store] checkStoredTokens called with userId:', userId);
        try {
          // Check if we're in demo mode
          const isDemoMode = plaidService.isDemoMode();
          
          if (isDemoMode) {
            console.log('[Plaid Store] Demo mode: Setting up mock tokens');
            set({
              plaidLinked: true,
              tokenInfo: { hasTokens: true, itemIds: ['demo-item'] },
            });
            // Auto-fetch mock transactions
            await get().autoFetchTransactions();
            return;
          }
          
          const tokenInfo = await plaidService.checkStoredTokens(userId);
          console.log('[Plaid Store] Token info result:', tokenInfo);
          set({ tokenInfo });
          
          if (tokenInfo.hasTokens) {
            console.log('✅ Found stored Plaid tokens for user');
            // Auto-fetch accounts and transactions if tokens exist
            await get().autoFetchTransactions();
          } else {
            console.log('❌ No stored Plaid tokens found for user');
          }
        } catch (error) {
          console.error('Failed to check stored tokens:', error);
          set({ tokenInfo: { hasTokens: false } });
        }
      },

      connectAccount: async (userId: string) => {
        return get().connectAccountReal(userId);
      },

      connectAccountReal: async (userId: string) => {
        try {
          set({ isLoading: true, lastError: null });

          const isDemoMode = plaidService.isDemoMode();
          if (isDemoMode) {
            console.log('[Plaid Store] Demo mode connect flow');
            set({
              isLoading: false,
              plaidLinked: true,
              lastError: null,
              tokenInfo: { hasTokens: true, itemIds: ['demo-item'] },
            });
            await get().autoFetchTransactions();
            return { success: true, linkToken: 'demo-link-token' };
          }

          // If tokens already exist, just mark as linked and sync
          const tokenInfo = await plaidService.checkStoredTokens(userId);
          if (tokenInfo.hasTokens) {
            console.log('✅ Existing Plaid items detected, refreshing data');
            set({ plaidLinked: true, tokenInfo, lastError: null, isLoading: false });
            await get().autoFetchTransactions();
          }

          const { linkToken } = await plaidService.createLinkToken(userId);
          set({ isLoading: false, lastError: null });
          return { success: true, linkToken };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const fullError = `Failed to connect account: ${errorMessage}`;
          console.error('Failed to connect account:', error);
          set({ isLoading: false, lastError: fullError });
          return { success: false, error: fullError };
        }
      },

      autoFetchTransactions: async () => {
        const state = get();
        console.log('[Plaid Store] autoFetchTransactions called with state:', {
          currentUserId: state.currentUserId,
          plaidLinked: state.plaidLinked,
          hasTokens: state.tokenInfo?.hasTokens,
          connectedAccounts: state.connectedAccounts.length
        });
        
        // Check if we're in demo mode
        const isDemoMode = plaidService.isDemoMode();
        
        if (isDemoMode) {
          console.log('[Plaid Store] Demo mode: Loading mock transactions');
          
          // Create mock connected accounts if none exist
          if (state.connectedAccounts.length === 0) {
            const mockAccounts: ConnectedAccount[] = [
              {
                id: 'demo-account-1',
                accessToken: null,
                itemId: 'demo-item',
                institutionName: 'Demo Bank',
                institutionId: 'demo-institution',
                accounts: [
                  {
                    id: 'acc_checking_demo',
                    accountId: 'acc_checking_demo',
                    name: 'Demo Checking Account',
                    type: 'depository',
                    subtype: 'checking',
                    mask: '1234',
                    currentBalance: 5000,
                    availableBalance: 5000,
                    isoCurrencyCode: 'USD',
                    institutionName: 'Demo Bank',
                    plaidItemId: 'demo-item',
                    balances: {
                      available: 5000,
                      current: 5000,
                      limit: null,
                    },
                  },
                  {
                    id: 'acc_credit_demo',
                    accountId: 'acc_credit_demo',
                    name: 'Demo Credit Card',
                    type: 'credit',
                    subtype: 'credit card',
                    mask: '5678',
                    currentBalance: -1250,
                    availableBalance: null,
                    isoCurrencyCode: 'USD',
                    institutionName: 'Demo Bank',
                    plaidItemId: 'demo-item',
                    balances: {
                      available: null,
                      current: -1250,
                      limit: 10000,
                    },
                  },
                ],
                lastSync: new Date().toISOString(),
                isActive: true,
              },
            ];

            set({ connectedAccounts: mockAccounts, plaidLinked: true });
          }
          
                       // Get mock transactions from plaidService
             const mockTransactions = plaidService.getMockTransactions();
             const processedTransactions: SyncedTransaction[] = mockTransactions.map((tx, index) => {
               const expense = plaidService.convertToExpense(tx);
               
               // Pre-classify some transactions for demo purposes
               let classification: 'business' | 'personal' | 'income' | 'unclassified' = 'unclassified';
               if (tx.name.includes('Client Payment') || tx.amount > 0) {
                 classification = 'income';
               } else if (tx.name.includes('Client Lunch')) {
                 classification = 'business';
               } else if (tx.business_hints?.is_likely_business) {
                 classification = 'business';
               }
               
               return {
                 id: expense.id,
                 accountId: expense.accountId,
                 amount: Math.abs(expense.amount), // Always positive for swipe categorization
                 date: expense.date,
                 description: expense.description,
                 category: expense.category,
                 merchantName: tx.merchant_name || undefined,
                 accountName: 'Demo Account',
                 classification: classification,
                 isBusinessExpense: expense.isBusinessExpense,
                 confidence: expense.confidence,
                 source: 'plaid' as const,
                 isReviewed: false,
                 isApproved: false,
                 pending: tx.pending || false,
                 originalTransaction: tx,
                 createdAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString(),
               };
             });
          
          set({
            syncedTransactions: processedTransactions,
            lastSyncTime: new Date().toISOString(),
            syncInProgress: false,
            lastError: null,
            plaidLinked: true,
          });
          
          return { success: true };
        }
        
        if (!state.plaidLinked && !state.tokenInfo?.hasTokens) {
          console.log('[Plaid Store] No accounts linked, returning early');
          return { success: false, error: 'No accounts linked' };
        }

        if (!state.currentUserId) {
          console.log('[Plaid Store] No currentUserId, returning early');
          return { success: false, error: 'No user ID set' };
        }

        try {
          set({ syncInProgress: true, lastError: null });

          // Step 4: Auto-fetch transactions from backend
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = '2024-01-01'; // Full year as requested
          
          console.log('[Plaid Store] Fetching transactions with params:', { startDate, endDate, userId: state.currentUserId });
          const result = await plaidService.fetchTransactionsFromBackend(startDate, endDate, state.currentUserId);
          
          if (!result.success) {
            const error = `Failed to fetch transactions: ${result.error}`;
            set({ syncInProgress: false, lastError: error });
            return { success: false, error };
          }

          // Convert transactions to app format
          const processedTransactions: SyncedTransaction[] = (result.transactions || [])
            .map(tx => plaidService.convertToExpense(tx))
            .map(tx => ({
              id: tx.id,
              accountId: tx.accountId,
              amount: Math.abs(tx.amount), // Always positive for swipe categorization
              date: tx.date,
              description: tx.description,
              category: tx.category,
              merchantName: tx.originalTransaction.merchant_name || undefined,
              accountName: 'Connected Account',
              classification: 'unclassified' as const,
              isBusinessExpense: false, // Will be set by swiping
              confidence: tx.confidence,
              source: 'plaid' as const,
              isReviewed: false,
              isApproved: false,
              pending: tx.pending,
              originalTransaction: tx.originalTransaction,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

          // Merge with existing transactions (avoid duplicates)
          const existingIds = new Set(state.syncedTransactions.map((tx: SyncedTransaction) => tx.id));
          const newTransactions = processedTransactions.filter((tx: SyncedTransaction) => !existingIds.has(tx.id));

          set((state: PlaidState) => ({
            syncedTransactions: [...state.syncedTransactions, ...newTransactions],
            lastSyncTime: new Date().toISOString(),
            syncInProgress: false,
            lastError: null,
          }));

          // Save updated data
          setTimeout(() => get().saveUserData(), 0);

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const fullError = `Failed to fetch transactions: ${errorMessage}`;
          console.error('Failed to auto-fetch transactions:', error);
          set({ syncInProgress: false, lastError: fullError });
          return { success: false, error: fullError };
        }
      },

      disconnectAccount: (accountId: string) => {
        try {
          const currentState = get();
          const accountToRemove = currentState.connectedAccounts.find((acc: ConnectedAccount) => acc.id === accountId);
          const accountIdsToRemove = accountToRemove?.accounts.map((acc: PlaidAccount) => acc.id) || [];
          
          // Check if this is the last account being disconnected
          const isLastAccount = currentState.connectedAccounts.length === 1;
          
          set((state: PlaidState) => {
            // Remove the account completely, and also remove any demo accounts
            const updatedAccounts = state.connectedAccounts.filter((acc: ConnectedAccount) => acc.id !== accountId && !acc.id.startsWith('demo_') && !acc.institutionName.includes('(Demo)'));
            
            // Remove transactions from this account and any demo transactions
            const updatedTransactions = state.syncedTransactions.filter((tx: SyncedTransaction) => 
              !accountIdsToRemove.includes(tx.accountId) && !tx.accountId.startsWith('demo_')
            );
            
            // Update plaidLinked status based on remaining accounts
            const plaidLinked = updatedAccounts.length > 0;
            
            return {
              connectedAccounts: updatedAccounts,
              syncedTransactions: updatedTransactions,
              plaidLinked,
              lastSyncTime: plaidLinked ? state.lastSyncTime : null,
              lastError: null,
              tokenInfo: plaidLinked ? state.tokenInfo : null,
            };
          });
          
          // If this was the last account, log it for debugging
          if (isLastAccount) {
            console.log('🔌 Last account disconnected - plaidLinked set to false');
          }
          
          // Save updated data asynchronously to avoid blocking the UI
          setTimeout(() => {
            try {
              get().saveUserData();
            } catch (error) {
              console.error('Error saving user data after disconnect:', error);
            }
          }, 100);
        } catch (error) {
          console.error('Error in disconnectAccount:', error);
        }
      },

      syncTransactions: async (userId: string, days = 30) => {
        const state = get();
        if (state.syncInProgress) {
          return { success: false, error: 'Sync already in progress' };
        }

        try {
          set({ syncInProgress: true, lastError: null });

          // Check if we're in demo mode
          const isDemoMode = plaidService.isDemoMode();

          if (isDemoMode) {
            console.log('[Plaid Store] Demo mode: Loading mock transactions');
            
            // Create mock connected accounts if none exist
            if (state.connectedAccounts.length === 0) {
              const mockAccounts: ConnectedAccount[] = [
                {
                  id: 'demo-account-1',
                  accessToken: null,
                  itemId: 'demo-item',
                  institutionName: 'Demo Bank',
                  institutionId: 'demo-institution',
                  accounts: [
                    {
                      id: 'acc_checking_demo',
                      accountId: 'acc_checking_demo',
                      name: 'Demo Checking Account',
                      type: 'depository',
                      subtype: 'checking',
                      mask: '1234',
                      currentBalance: 5000,
                      availableBalance: 5000,
                      isoCurrencyCode: 'USD',
                      institutionName: 'Demo Bank',
                      plaidItemId: 'demo-item',
                      balances: {
                        available: 5000,
                        current: 5000,
                        limit: null,
                      },
                    },
                    {
                      id: 'acc_credit_demo',
                      accountId: 'acc_credit_demo',
                      name: 'Demo Credit Card',
                      type: 'credit',
                      subtype: 'credit card',
                      mask: '5678',
                      currentBalance: -1250,
                      availableBalance: null,
                      isoCurrencyCode: 'USD',
                      institutionName: 'Demo Bank',
                      plaidItemId: 'demo-item',
                      balances: {
                        available: null,
                        current: -1250,
                        limit: 10000,
                      },
                    },
                  ],
                  lastSync: new Date().toISOString(),
                  isActive: true,
                }
              ];
              
              set({ connectedAccounts: mockAccounts, plaidLinked: true });
            }
            
            // Get mock transactions from plaidService
            const mockTransactions = plaidService.getMockTransactions();
            const processedTransactions: SyncedTransaction[] = mockTransactions.map(tx => {
              const expense = plaidService.convertToExpense(tx);
              return {
                id: expense.id,
                accountId: expense.accountId,
                amount: expense.amount,
                date: expense.date,
                description: expense.description,
                category: expense.category,
                merchantName: tx.merchant_name || undefined,
                accountName: 'Demo Account',
                classification: 'unclassified' as const,
                isBusinessExpense: expense.isBusinessExpense,
                confidence: expense.confidence,
                source: 'plaid' as const,
                isReviewed: false,
                isApproved: false,
                pending: tx.pending || false,
                originalTransaction: tx,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });
            
            set({
              syncedTransactions: processedTransactions,
              lastSyncTime: new Date().toISOString(),
              syncInProgress: false,
              lastError: null,
              plaidLinked: true,
            });
            
            return { success: true };
          }
          
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

          // Trigger backend sync for incremental updates
          try {
            await plaidService.syncTransactions(userId);
          } catch (error) {
            console.warn('[Plaid Store] transactions/sync call failed:', error);
          }

          const fetchResult = await plaidService.fetchTransactionsFromBackend(startDate, endDate, userId);
          if (!fetchResult.success || !fetchResult.transactions) {
            const fetchError = fetchResult.error || 'Failed to fetch transactions';
            set({ syncInProgress: false, lastError: fetchError });
            return { success: false, error: fetchError };
          }

          const processedTransactions: SyncedTransaction[] = fetchResult.transactions
            .map((tx) => plaidService.convertToExpense(tx))
            .map((expense) => {
              const account = state.connectedAccounts
                .flatMap((acc) => acc.accounts)
                .find((acc) => acc.accountId === expense.accountId);

              return {
                id: expense.id,
                accountId: expense.accountId,
                amount: expense.amount,
                date: expense.date,
                description: expense.description,
                category: expense.category,
                merchantName: expense.originalTransaction.merchant_name || undefined,
                accountName: account?.name || expense.accountName || 'Unknown Account',
                classification: 'unclassified',
                isBusinessExpense: expense.isBusinessExpense,
                confidence: expense.confidence,
                source: 'plaid',
                isReviewed: false,
                isApproved: false,
                pending: expense.pending,
                originalTransaction: expense.originalTransaction,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });

          set({
            syncedTransactions: processedTransactions,
            lastSyncTime: new Date().toISOString(),
            syncInProgress: false,
            lastError: null,
            connectedAccounts: state.connectedAccounts.map((acc) => ({
              ...acc,
              lastSync: new Date().toISOString(),
            })),
          });

          setTimeout(() => get().saveUserData(), 0);

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const fullError = `Failed to sync transactions: ${errorMessage}`;
          console.error('Failed to sync transactions:', error);
          set({ syncInProgress: false, lastError: fullError });
          return { success: false, error: fullError };
        }
      },

      syncAllAccounts: async (userId: string) => {
        return await get().syncTransactions(userId, 365);
      },

      refreshAccountBalances: async () => {
        const state = get();
        if (!state.plaidLinked || state.connectedAccounts.length === 0) return;

        try {
          // In demo mode, just update the last sync time and simulate balance updates
          const now = new Date().toISOString();
          
          set((state: { connectedAccounts: any[]; }) => ({
            connectedAccounts: state.connectedAccounts.map((acc: { accounts: any[]; }) => ({
              ...acc,
              lastSync: now,
              accounts: acc.accounts.map((account: { balances: { current: number | null; }; }) => ({
                ...account,
                // In demo mode, slightly randomize balances to simulate real updates
                balances: {
                  ...account.balances,
                  current: account.balances.current !== null 
                    ? account.balances.current + (Math.random() - 0.5) * 100 
                    : null,
                },
              })),
            })),
            lastSyncTime: now,
          }));

          // Save updated data
          setTimeout(() => get().saveUserData(), 0);
        } catch (error) {
          console.error('Failed to refresh account balances:', error);
        }
      },

      initializeOnAppLaunch: async (userId: string) => {
        const state = get();
        
        // Load user data first
        await get().loadUserData(userId);
        
        // Check for stored tokens
        await get().checkStoredTokens(userId);
        
        // If plaidLinked is true, auto-refresh balances
        const updatedState = get();
        if (updatedState.plaidLinked && updatedState.connectedAccounts.length > 0) {
          console.log('🏦 Auto-refreshing account balances on app launch...');
          await get().refreshAccountBalances();
        }
      },

      clearError: () => {
        set({ lastError: null });
      },

      approveTransaction: (transactionId: string) => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId 
              ? { ...tx, isApproved: true, isReviewed: true }
              : tx
          ),
        }));
      },

      rejectTransaction: (transactionId: string) => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId 
              ? { ...tx, isApproved: false, isReviewed: true }
              : tx
          ),
        }));
      },

      updateTransactionCategory: (transactionId: string, category: string) => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId ? { ...tx, category } : tx
          ),
        }));
      },

      markAsReviewed: (transactionId: string) => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId ? { ...tx, isReviewed: true, updatedAt: new Date().toISOString() } : tx
          ),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      classifyTransaction: (transactionId: string, classification: 'business' | 'personal' | 'income') => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId 
              ? { 
                  ...tx, 
                  classification, 
                  isBusinessExpense: classification === 'business',
                  isReviewed: true,
                  updatedAt: new Date().toISOString()
                } 
              : tx
          ),
        }));
        
        // Automatically update totals after classification
        setTimeout(() => {
          get().saveUserData();
          console.log('📊 Transaction classified:', {
            id: transactionId,
            classification,
            businessTotal: get().getBusinessTotal(),
            personalTotal: get().getPersonalTotal(),
            incomeTotal: get().getIncomeTotal(),
          });
        }, 0);
      },

      tagTransaction: (transactionId: string, clientTag?: string, jobTag?: string) => {
        set((state: { syncedTransactions: any[]; }) => ({
          syncedTransactions: state.syncedTransactions.map((tx: { id: string; }) =>
            tx.id === transactionId 
              ? { ...tx, clientTag, jobTag, updatedAt: new Date().toISOString() } 
              : tx
          ),
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      getUnreviewedTransactions: () => {
        const state = get();
        return state.syncedTransactions.filter((tx: { isReviewed: any; }) => !tx.isReviewed);
      },

      getApprovedTransactions: () => {
        const state = get();
        return state.syncedTransactions.filter((tx: { isApproved: any; }) => tx.isApproved);
      },

      getBusinessExpenses: () => {
        const state: PlaidState = get();
        return state.syncedTransactions.filter((tx: SyncedTransaction) => tx.classification === 'business');
      },

      getPersonalExpenses: () => {
        const state: PlaidState = get();
        return state.syncedTransactions.filter((tx: SyncedTransaction) => tx.classification === 'personal');
      },

      getPendingTransactions: () => {
        const state: PlaidState = get();
        return state.syncedTransactions.filter((tx: SyncedTransaction) => tx.pending);
      },

      getBusinessTotal: () => {
        const state: PlaidState = get();
        return state.syncedTransactions
          .filter((tx: SyncedTransaction) => tx.classification === 'business' && tx.amount < 0)
          .reduce((total: number, tx: SyncedTransaction) => total + Math.abs(tx.amount), 0);
      },

      getIncomeTotal: () => {
        const state: PlaidState = get();
        return state.syncedTransactions
          .filter((tx: SyncedTransaction) => tx.classification === 'income')
          .reduce((total: number, tx: SyncedTransaction) => total + Math.abs(tx.amount), 0);
      },

      getPersonalTotal: () => {
        const state: PlaidState = get();
        return state.syncedTransactions
          .filter((tx: SyncedTransaction) => tx.classification === 'personal' && tx.amount < 0)
          .reduce((total: number, tx: SyncedTransaction) => total + Math.abs(tx.amount), 0);
      },

      getUnclassifiedTotal: () => {
        const state: PlaidState = get();
        return state.syncedTransactions
          .filter((tx: SyncedTransaction) => tx.classification === 'unclassified' && tx.amount < 0)
          .reduce((total: number, tx: SyncedTransaction) => total + Math.abs(tx.amount), 0);
      },

      getFilteredTransactions: (filters: TransactionFilters) => {
        const state: PlaidState = get();
        let transactions: SyncedTransaction[] = [...state.syncedTransactions];

        if (filters.dateRange) {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          transactions = transactions.filter((tx: SyncedTransaction) => {
            const txDate = new Date(tx.date);
            return txDate >= start && txDate <= end;
          });
        }

        if (filters.amountRange) {
          transactions = transactions.filter((tx: SyncedTransaction) => {
            const absAmount = Math.abs(tx.amount);
            return absAmount >= filters.amountRange!.min && absAmount <= filters.amountRange!.max;
          });
        }

        if (filters.categories && filters.categories.length > 0) {
          transactions = transactions.filter((tx: SyncedTransaction) => 
            filters.categories!.includes(tx.category)
          );
        }

        if (filters.classification) {
          transactions = transactions.filter((tx: SyncedTransaction) => 
            tx.classification === filters.classification
          );
        }

        if (filters.accountIds && filters.accountIds.length > 0) {
          transactions = transactions.filter((tx: SyncedTransaction) => 
            filters.accountIds!.includes(tx.accountId)
          );
        }

        if (filters.pending !== undefined) {
          transactions = transactions.filter((tx: SyncedTransaction) => 
            tx.pending === filters.pending
          );
        }

        return transactions.sort((a: SyncedTransaction, b: SyncedTransaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getAccountBalance: (accountId: string) => {
        const state: PlaidState = get();
        const account = state.connectedAccounts
          .flatMap((ca: ConnectedAccount) => ca.accounts)
          .find((acc: PlaidAccount) => acc.id === accountId);
        return account?.balances?.current ?? 0;
      },

      clearAll: () => {
        set({
          currentUserId: null,
          connectedAccounts: [],
          syncedTransactions: [],
          isLoading: false,
          lastSyncTime: null,
          syncInProgress: false,
          plaidLinked: false,
          lastError: null,
          tokenInfo: null,
        });
        
        // Also clear AsyncStorage
        setTimeout(async () => {
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const keys = await AsyncStorage.getAllKeys();
            const plaidKeys = keys.filter(key => key.startsWith('plaid-data-'));
            if (plaidKeys.length > 0) {
              await AsyncStorage.multiRemove(plaidKeys);
            }
          } catch (error) {
            console.error('Failed to clear plaid data from AsyncStorage:', error);
          }
        }, 0);
      },
    }),
    {
      name: 'plaid-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: any) => ({
        currentUserId: state.currentUserId,
        // Don't persist user-specific data here - it's handled by loadUserData/saveUserData
      })
    }
  )
);
