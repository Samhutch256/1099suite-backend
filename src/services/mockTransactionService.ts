import { Txn, TxnSyncResponse } from '../types/transactions';

const mockTransactions: Txn[] = [
  {
    id: 'txn_1',
    account_id: 'acc_1',
    name: 'STARBUCKS',
    merchant_name: 'Starbucks',
    amount: 5.25,
    currency: 'USD',
    date: '2025-01-15',
    pending: false,
    category: ['Food and Drink', 'Coffee Shop'],
    account_name: 'Chase Sapphire',
    logo_url: null,
    recurring: false,
    original_description: 'POS 12345',
    notes: null,
    classification: 'unreviewed',
    client_id: null,
  },
  {
    id: 'txn_2',
    account_id: 'acc_1',
    name: 'UBER',
    merchant_name: 'Uber',
    amount: 12.50,
    currency: 'USD',
    date: '2025-01-14',
    pending: false,
    category: ['Transportation', 'Ride Share'],
    account_name: 'Chase Sapphire',
    logo_url: null,
    recurring: false,
    original_description: 'UBER *TRIP',
    notes: null,
    classification: 'business',
    client_id: null,
  },
  {
    id: 'txn_3',
    account_id: 'acc_2',
    name: 'AMAZON.COM',
    merchant_name: 'Amazon',
    amount: 89.99,
    currency: 'USD',
    date: '2025-01-13',
    pending: true,
    category: ['Shopping', 'Online'],
    account_name: 'Bank of America',
    logo_url: null,
    recurring: true,
    original_description: 'AMZN MKTP US',
    notes: null,
    classification: 'personal',
    client_id: null,
  },
  {
    id: 'txn_4',
    account_id: 'acc_1',
    name: 'OFFICE DEPOT',
    merchant_name: 'Office Depot',
    amount: 45.00,
    currency: 'USD',
    date: '2025-01-12',
    pending: false,
    category: ['Shopping', 'Office Supplies'],
    account_name: 'Chase Sapphire',
    logo_url: null,
    recurring: false,
    original_description: 'OFFICE DEPOT',
    notes: null,
    classification: 'business',
    client_id: null,
  },
  {
    id: 'txn_5',
    account_id: 'acc_2',
    name: 'NETFLIX',
    merchant_name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    date: '2025-01-11',
    pending: false,
    category: ['Entertainment', 'Streaming'],
    account_name: 'Bank of America',
    logo_url: null,
    recurring: true,
    original_description: 'NETFLIX.COM',
    notes: null,
    classification: 'personal',
    client_id: null,
  },
];

export const mockTransactionService = {
  async getTransactions(params: {
    cursor?: string;
    start?: string;
    end?: string;
  }): Promise<TxnSyncResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Filter by date range if provided
    let filtered = mockTransactions;
    if (params.start || params.end) {
      filtered = mockTransactions.filter(txn => {
        const txnDate = new Date(txn.date);
        const startDate = params.start ? new Date(params.start) : new Date('2020-01-01');
        const endDate = params.end ? new Date(params.end) : new Date('2030-01-01');
        return txnDate >= startDate && txnDate <= endDate;
      });
    }
    
    // Simulate pagination
    const hasMore = !params.cursor;
    const nextCursor = hasMore ? 'next_page_token' : null;
    
    return {
      items: filtered,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  },
};
