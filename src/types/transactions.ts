export type Txn = {
  id: string;
  account_id: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  currency: string;
  date: string; // ISO
  pending: boolean;
  category?: string[] | null;
  account_name?: string | null;
  logo_url?: string | null;
  recurring?: boolean;
  original_description?: string | null;
  notes?: string | null;
  classification: 'business'|'personal'|'unreviewed';
  client_id?: string | null;
};

export type TxnSyncResponse = {
  items: Txn[];
  next_cursor?: string | null;
  has_more: boolean;
};
