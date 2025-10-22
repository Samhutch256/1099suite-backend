import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveBackendUrl(): string {
  const explicit =
    process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (explicit) {
    return explicit;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoConfig?.extra?.expoGo?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.hostUri ??
    Constants.manifest?.hostUri ??
    Constants.manifest2?.hostUri ??
    null;

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;

  const hostCandidate =
    extractHost(hostUri) ||
    extractHost(scriptUrl) ||
    undefined;

  if (hostCandidate) {
    return `http://${hostCandidate}:5001`;
  }

  return Platform.select({
    ios: 'http://127.0.0.1:5001',
    android: 'http://10.0.2.2:5001',
    default: 'http://localhost:5001',
  })!;
}

function extractHost(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  const match = uri.match(/^[a-zA-Z]+:\/\/([^:/]+)(?::\d+)?/);
  if (match?.[1]) return match[1];
  const simple = uri.split(':')[0];
  return simple || undefined;
}

const DEFAULT_BACKEND_URL = resolveBackendUrl();

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export interface PlaidAccount {
  id: string;
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
  institutionName: string | null;
  plaidItemId: string;
  balances?: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
}

export interface PlaidTransaction {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number;
  name: string;
  merchantName: string | null;
  date: string;
  category: string[];
  pending: boolean;
  paymentChannel: string | null;
  accountName: string | null;
  accountMask: string | null;
  institutionName: string | null;
  businessHints?: {
    isLikelyBusiness: boolean;
    suggestedCategory: string;
    confidence: number;
  };
}

export interface LinkTokenResult {
  linkToken: string;
  expiration?: string;
}

export interface ExchangeResult {
  success: boolean;
  itemId?: string;
  institutionName?: string | null;
  accounts?: PlaidAccount[];
  error?: string;
}

export interface SyncResult {
  status: string;
  items: Array<{
    itemId: string;
    hasMore: boolean;
    nextCursor: string | null;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
  }>;
}

export interface PlaidTokenInfo {
  hasTokens: boolean;
  itemIds?: string[];
  error?: string;
}

class HttpError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errorMessage =
      parsed?.error ||
      parsed?.message ||
      text ||
      `Request failed with status ${response.status}`;
    throw new HttpError(response.status, errorMessage, parsed);
  }

  return parsed as T;
}

class PlaidService {
  private backendUrl: string;
  private demoMode: boolean;

  constructor() {
    this.backendUrl = DEFAULT_BACKEND_URL;
    this.demoMode = process.env.EXPO_PUBLIC_PLAID_DEMO === '1';
    if (__DEV__) {
      console.log('[PlaidService] Using backend', this.backendUrl);
    }
  }

  getBaseUrl() {
    return this.backendUrl;
  }

  isDemoMode() {
    return this.demoMode;
  }

  private async request<T>(
    path: string,
    options: RequestInit & { userId?: string } = {},
  ): Promise<T> {
    const { userId, ...rest } = options;
    const headers: Record<string, string> = {
      ...(rest.headers as Record<string, string> | undefined),
    };
    if (userId) {
      headers['x-user-id'] = userId;
    }
    if (rest.body && !headers['Content-Type']) {
      Object.assign(headers, JSON_HEADERS);
    }

    const response = await fetch(`${this.backendUrl}${path}`, {
      ...rest,
      headers,
    });

    return handleResponse<T>(response);
  }

  async createLinkToken(userId: string): Promise<LinkTokenResult> {
    const prepareBody = () =>
      JSON.stringify({ userId, platform: Platform.OS });

    const path = '/api/plaid/link-token/create';
    try {
      const data = await this.request<{ link_token: string; expiration?: string }>(
        path,
        {
          method: 'POST',
          body: prepareBody(),
          userId,
        },
      );

      return {
        linkToken: data.link_token,
        expiration: data.expiration,
      };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        const legacyData = await this.request<{ link_token: string; expiration?: string }>(
          '/api/create-link-token',
          {
            method: 'POST',
            body: prepareBody(),
            userId,
          },
        );

        return {
          linkToken: legacyData.link_token,
          expiration: legacyData.expiration,
        };
      }
      throw error;
    }
  }

  async exchangePublicToken(
    userId: string,
    publicToken: string,
    metadata?: Record<string, unknown>,
  ): Promise<ExchangeResult> {
    const args = {
      userId,
      public_token: publicToken,
      metadata,
    };

    const primaryPath = '/api/plaid/item/public_token/exchange';

    try {
      const payload = await this.request<{
        item_id: string;
        institution_name: string | null;
        accounts: PlaidAccount[];
      }>(primaryPath, {
        method: 'POST',
        body: JSON.stringify(args),
        userId,
      });

      return {
        success: true,
        itemId: payload.item_id,
        institutionName: payload.institution_name,
        accounts: payload.accounts ?? [],
      };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        // Fallback to legacy endpoint used by older backend builds
        try {
          const legacyPayload = await this.request<{
            access_token?: string;
            item_id: string;
            institution_name?: string | null;
          }>('/api/exchange-public-token', {
            method: 'POST',
            body: JSON.stringify({
              public_token: publicToken,
              user_id: userId,
              metadata,
            }),
            userId,
          });

          // Best effort: fetch account info after legacy exchange
          let accounts: PlaidAccount[] = [];
          try {
            accounts = await this.fetchAccounts(userId);
          } catch (fetchError) {
            console.warn('[PlaidService] Legacy exchange fallback: failed to load accounts', fetchError);
          }

          return {
            success: true,
            itemId: legacyPayload.item_id,
            institutionName: legacyPayload.institution_name ?? null,
            accounts,
          };
        } catch (legacyError) {
          return {
            success: false,
            error:
              legacyError instanceof Error
                ? legacyError.message
                : 'Token exchange failed',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  async fetchAccounts(userId: string): Promise<PlaidAccount[]> {
    const parse = (accounts: Array<{
      accountId: string;
      account_id?: string;
      name: string;
      type: string;
      subtype?: string | null;
      mask?: string | null;
      currentBalance?: number | null;
      current_balance?: number | null;
      availableBalance?: number | null;
      available_balance?: number | null;
      isoCurrencyCode?: string | null;
      iso_currency_code?: string | null;
      institutionName?: string | null;
      institution_name?: string | null;
      plaidItemId?: string;
      plaid_item_id?: string;
    }>): PlaidAccount[] =>
      (accounts ?? []).map((account) => ({
        id: account.accountId || account.account_id || '',
        accountId: account.accountId || account.account_id || '',
        name: account.name,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance:
          account.currentBalance ??
          account.current_balance ??
          null,
        availableBalance:
          account.availableBalance ??
          account.available_balance ??
          null,
        isoCurrencyCode:
          account.isoCurrencyCode ??
          account.iso_currency_code ??
          null,
        institutionName:
          account.institutionName ??
          account.institution_name ??
          null,
        plaidItemId:
          account.plaidItemId ??
          account.plaid_item_id ??
          'unknown',
        balances: {
          available:
            account.availableBalance ??
            account.available_balance ??
            null,
          current:
            account.currentBalance ??
            account.current_balance ??
            null,
          limit: null,
        },
      }));

    try {
      const data = await this.request<{
        accounts: Array<{
          accountId: string;
          name: string;
          type: string;
          subtype: string | null;
          mask: string | null;
          currentBalance: number | null;
          availableBalance: number | null;
          isoCurrencyCode: string | null;
          institutionName: string | null;
          plaidItemId: string;
        }>;
      }>(
        `/api/plaid/accounts`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          userId,
        },
      );
      return parse(data.accounts ?? []);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        const legacyData = await this.request<Array<{
          account_id: string;
          name: string;
          type: string;
          subtype: string | null;
          mask: string | null;
          balances?: {
            available?: number | null;
            current?: number | null;
            limit?: number | null;
            iso_currency_code?: string | null;
          };
          institution_name?: string | null;
          plaid_item_id?: string;
        }>>(`/api/accounts/${userId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          userId,
        });

        return parse(
          legacyData.map((item) => ({
            accountId: item.account_id,
            name: item.name,
            type: item.type,
            subtype: item.subtype,
            mask: item.mask,
            currentBalance: item.balances?.current ?? null,
            availableBalance: item.balances?.available ?? null,
            isoCurrencyCode: item.balances?.iso_currency_code ?? null,
            institutionName: item.institution_name ?? null,
            plaidItemId: item.plaid_item_id ?? 'legacy',
          })),
        );
      }
      throw error;
    }
  }

  async fetchTransactions(
    userId: string,
    options: { startDate?: string; endDate?: string } = {},
  ): Promise<PlaidTransaction[]> {
    const params = new URLSearchParams();
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    const mapped = (transactions: Array<{
      transactionId?: string;
      transaction_id?: string;
      accountId?: string;
      account_id?: string;
      amount: number;
      name: string;
      merchantName?: string | null;
      merchant_name?: string | null;
      date: string;
      category?: string[];
      pending?: boolean;
      paymentChannel?: string | null;
      payment_channel?: string | null;
      accountName?: string | null;
      account_name?: string | null;
      accountMask?: string | null;
      account_mask?: string | null;
      institutionName?: string | null;
      institution_name?: string | null;
    }>): PlaidTransaction[] =>
      (transactions ?? []).map((txn) => ({
        id: txn.transactionId || txn.transaction_id || '',
        transactionId: txn.transactionId || txn.transaction_id || '',
        accountId: txn.accountId || txn.account_id || '',
        amount: txn.amount,
        name: txn.name,
        merchantName: txn.merchantName ?? txn.merchant_name ?? null,
        date: txn.date,
        category: txn.category ?? [],
        pending: Boolean(txn.pending),
        paymentChannel: txn.paymentChannel ?? txn.payment_channel ?? null,
        accountName: txn.accountName ?? txn.account_name ?? null,
        accountMask: txn.accountMask ?? txn.account_mask ?? null,
        institutionName: txn.institutionName ?? txn.institution_name ?? null,
      }));

    try {
      const data = await this.request<{
        transactions: Array<{
          transactionId: string;
          accountId: string;
          amount: number;
          name: string;
          merchantName: string | null;
          date: string;
          category: string[];
          pending: boolean;
          paymentChannel: string | null;
          accountName: string | null;
          accountMask: string | null;
          institutionName: string | null;
        }>;
      }>(`/api/plaid/transactions${query}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        userId,
      });

      return mapped(data.transactions ?? []);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        const legacyParams = new URLSearchParams();
        legacyParams.set('user_id', userId);
        if (options.startDate) legacyParams.set('start_date', options.startDate);
        if (options.endDate) legacyParams.set('end_date', options.endDate);

        const legacy = await this.request<{
          transactions: Array<{
            id: string;
            account_id: string;
            amount: number;
            name: string;
            merchant_name: string | null;
            date: string;
            category: string[];
            pending: boolean;
            account_name?: string | null;
          }>;
        }>(`/api/transactions?${legacyParams.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          userId,
        });

        return mapped(
          (legacy.transactions ?? []).map((txn) => ({
            transaction_id: txn.id,
            account_id: txn.account_id,
            amount: txn.amount,
            name: txn.name,
            merchant_name: txn.merchant_name,
            date: txn.date,
            category: txn.category,
            pending: txn.pending,
            account_name: txn.account_name ?? null,
          })),
        );
      }
      throw error;
    }
  }

  async syncTransactions(
    userId: string,
    itemId?: string,
  ): Promise<SyncResult> {
    try {
      return await this.request<SyncResult>('/api/plaid/transactions/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          itemId,
        }),
        userId,
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return this.request<SyncResult>('/api/sync-transactions', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
          }),
          userId,
        });
      }
      throw error;
    }
  }

  async checkStoredTokens(userId: string): Promise<PlaidTokenInfo> {
    try {
      const accounts = await this.fetchAccounts(userId);
      const itemIds = Array.from(new Set(accounts.map((acc) => acc.plaidItemId)));
      return {
        hasTokens: accounts.length > 0,
        itemIds,
      };
    } catch (error) {
      return {
        hasTokens: false,
        error: error instanceof Error ? error.message : 'Failed to check tokens',
      };
    }
  }

  async getAccountsFromBackend(userId: string): Promise<{
    success: boolean;
    accounts?: PlaidAccount[];
    error?: string;
  }> {
    try {
      const accounts = await this.fetchAccounts(userId);
      return {
        success: true,
        accounts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
      };
    }
  }

  async fetchTransactionsFromBackend(
    startDate: string,
    endDate: string,
    userId?: string,
    _count = 100,
    _offset = 0,
  ): Promise<{
    success: boolean;
    transactions?: PlaidTransaction[];
    total_transactions?: number;
    error?: string;
  }> {
    if (!userId) {
      return { success: false, error: 'Missing user identifier' };
    }
    try {
      const transactions = await this.fetchTransactions(userId, {
        startDate,
        endDate,
      });
      return {
        success: true,
        transactions,
        total_transactions: transactions.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch transactions',
      };
    }
  }

  async getTransactions(
    _accessToken: string,
    startDate: string,
    endDate: string,
    _accountIds?: string[],
    userId?: string,
  ): Promise<PlaidTransaction[]> {
    if (!userId) {
      throw new Error('User ID required for fetching transactions');
    }
    return this.fetchTransactions(userId, { startDate, endDate });
  }

  getMockTransactions(): PlaidTransaction[] {
    return [
      {
        id: 'demo_tx_gas_001',
        transactionId: 'demo_tx_gas_001',
        accountId: 'demo_account_credit',
        amount: -42.5,
        name: 'GAS STATION',
        merchantName: 'Shell',
        date: '2025-01-15',
        category: ['Transportation', 'Gas Stations'],
        pending: false,
        paymentChannel: 'in store',
        accountName: 'Demo Credit Card',
        accountMask: '1234',
        institutionName: 'Demo Bank',
        businessHints: {
          isLikelyBusiness: true,
          suggestedCategory: 'Transportation',
          confidence: 0.8,
        },
      },
      {
        id: 'demo_tx_supplies_001',
        transactionId: 'demo_tx_supplies_001',
        accountId: 'demo_account_credit',
        amount: -125.75,
        name: 'HOME DEPOT ONLINE',
        merchantName: 'Home Depot',
        date: '2025-01-14',
        category: ['Shops', 'Hardware Stores'],
        pending: false,
        paymentChannel: 'online',
        accountName: 'Demo Credit Card',
        accountMask: '1234',
        institutionName: 'Demo Bank',
        businessHints: {
          isLikelyBusiness: true,
          suggestedCategory: 'Materials & Supplies',
          confidence: 0.9,
        },
      },
    ];
  }

  convertToExpense(transaction: PlaidTransaction) {
    const categorization = this.categorizeTransaction(transaction);
    return {
      id: transaction.transactionId,
      accountId: transaction.accountId,
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      description: transaction.merchantName || transaction.name,
      category: categorization.category,
      merchantName: transaction.merchantName,
      accountName: transaction.accountName,
      classification: categorization.isBusinessExpense ? 'business' : 'personal',
      isBusinessExpense: categorization.isBusinessExpense,
      confidence: categorization.confidence,
      source: 'plaid',
      pending: transaction.pending,
      originalTransaction: transaction,
    };
  }

  private categorizeTransaction(transaction: PlaidTransaction): {
    category: string;
    isBusinessExpense: boolean;
    confidence: number;
  } {
    if (transaction.businessHints) {
      return {
        category: transaction.businessHints.suggestedCategory,
        isBusinessExpense: transaction.businessHints.isLikelyBusiness,
        confidence: transaction.businessHints.confidence,
      };
    }

    const categories = transaction.category.join(' ').toLowerCase();
    const name = transaction.name.toLowerCase();

    const businessKeywords = [
      'gas',
      'fuel',
      'office',
      'supplies',
      'tools',
      'equipment',
      'insurance',
      'phone',
      'internet',
      'repair',
      'materials',
      'hardware',
      'client',
      'marketing',
      'software',
    ];

    const businessCategories = [
      'transportation',
      'gas',
      'hardware',
      'supplies',
      'office',
      'telecommunication',
      'insurance',
      'service',
      'professional',
    ];

    const hasBusinessKeyword = businessKeywords.some(
      (keyword) => name.includes(keyword) || categories.includes(keyword),
    );

    const hasBusinessCategory = businessCategories.some((keyword) =>
      categories.includes(keyword),
    );

    let mappedCategory = 'Other';
    if (categories.includes('transportation') || categories.includes('gas')) {
      mappedCategory = 'Transportation';
    } else if (categories.includes('hardware') || categories.includes('supplies')) {
      mappedCategory = 'Materials & Supplies';
    } else if (categories.includes('office')) {
      mappedCategory = 'Office Expenses';
    } else if (categories.includes('telecommunication')) {
      mappedCategory = 'Communication';
    } else if (categories.includes('insurance')) {
      mappedCategory = 'Insurance';
    } else if (categories.includes('software')) {
      mappedCategory = 'Software & Apps';
    }

    const isExpense = transaction.amount < 0;
    const isBusinessExpense = isExpense && (hasBusinessKeyword || hasBusinessCategory);
    const confidence = Math.min(
      (hasBusinessKeyword ? 0.5 : 0) + (hasBusinessCategory ? 0.5 : 0),
      1,
    );

    return {
      category: mappedCategory,
      isBusinessExpense,
      confidence,
    };
  }
}

export const plaidService = new PlaidService();
