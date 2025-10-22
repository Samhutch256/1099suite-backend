import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CountryCode,
  Products,
  TransactionsSyncRequestOptions,
} from 'plaid';
import { plaidClient } from '../plaid';
import { env } from '../env';
import { decrypt, encrypt } from '../crypto';

interface PlaidItemRecord {
  id: string;
  item_id: string;
  institution_name: string | null;
  access_token_enc: string;
  transactions_cursor: string | null;
}

interface DecryptedPlaidItem {
  id: string;
  itemId: string;
  userId: string;
  institutionName: string | null;
  accessToken: string;
  transactionsCursor: string | null;
}

interface PlaidTokenExchange {
  access_token: string;
  item_id: string;
  request_id: string;
}

type DatabaseClient = SupabaseClient<any, 'public', any>;

const ISO_FORMAT = 'YYYY-MM-DD';

const DEFAULT_TRANSACTION_LOOKBACK_DAYS = 30;

function getUserId(req: Request): string | null {
  return (
    (req.headers['x-user-id'] as string | undefined) ||
    (req.headers['x-userid'] as string | undefined) ||
    (req.query.user_id as string | undefined) ||
    (req.query.userId as string | undefined) ||
    (req.body?.user_id as string | undefined) ||
    (req.body?.userId as string | undefined) ||
    null
  );
}

function parseDateParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function ensureUserId(
  req: Request,
  res: Response,
): { userId: string } | undefined {
  const userId = getUserId(req);
  if (!userId) {
    res.status(400).json({ error: 'Missing user identifier' });
    return undefined;
  }
  return { userId };
}

async function fetchItemsForUser(
  supabase: DatabaseClient,
  userId: string,
): Promise<DecryptedPlaidItem[]> {
  const { data, error } = await supabase
    .from('plaid_items')
    .select(
      'id, item_id, institution_name, access_token_enc, transactions_cursor',
    )
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to load Plaid items: ${error.message}`);
  }

  return (data as PlaidItemRecord[]).map((item) => ({
    id: item.id,
    itemId: item.item_id,
    userId,
    institutionName: item.institution_name,
    accessToken: decrypt(item.access_token_enc),
    transactionsCursor: item.transactions_cursor ?? null,
  }));
}

async function storePlaidItem(
  supabase: DatabaseClient,
  args: {
    userId: string;
    itemId: string;
    institutionName: string | null;
    accessToken: string;
  },
) {
  const encrypted = encrypt(args.accessToken);
  const payload = {
    user_id: args.userId,
    item_id: args.itemId,
    institution_name: args.institutionName,
    access_token_enc: encrypted.encoded,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('plaid_items')
    .upsert(payload, { onConflict: 'user_id,item_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert Plaid item: ${error.message}`);
  }

  return data as PlaidItemRecord;
}

async function upsertAccounts(
  supabase: DatabaseClient,
  params: {
    userId: string;
    plaidItemId: string;
    institutionName: string | null;
    accessToken: string;
  },
) {
  const accountsResponse = await plaidClient.accountsGet({
    access_token: params.accessToken,
  });

  const upsertPayload = accountsResponse.data.accounts.map((account) => ({
    account_id: account.account_id,
    user_id: params.userId,
    plaid_item_id: params.plaidItemId,
    institution_name: params.institutionName,
    name: account.name,
    type: account.type,
    subtype: account.subtype ?? null,
    mask: account.mask ?? null,
    current_balance: account.balances?.current ?? null,
    available_balance: account.balances?.available ?? null,
    iso_currency_code:
      account.balances?.iso_currency_code ??
      account.balances?.unofficial_currency_code ??
      null,
    updated_at: new Date().toISOString(),
  }));

  if (upsertPayload.length === 0) {
    return [];
  }

  const { error } = await supabase
    .from('accounts')
    .upsert(upsertPayload, { onConflict: 'account_id' });

  if (error) {
    throw new Error(`Failed to upsert Plaid accounts: ${error.message}`);
  }

  return upsertPayload;
}

async function upsertTransactions(
  supabase: DatabaseClient,
  params: {
    userId: string;
    transactions: Array<{
      transaction_id: string;
      account_id: string;
      amount: number;
      name: string;
      merchant_name: string | null;
      date: string;
      category: string[] | null;
      pending: boolean;
      payment_channel: string | null;
      updated_at: string;
    }>;
  },
) {
  if (params.transactions.length === 0) {
    return;
  }

  const withUser = params.transactions.map((txn) => ({
    user_id: params.userId,
    ...txn,
  }));

  const { error } = await supabase
    .from('transactions')
    .upsert(withUser, { onConflict: 'transaction_id' });

  if (error) {
    throw new Error(`Failed to upsert Plaid transactions: ${error.message}`);
  }
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - DEFAULT_TRANSACTION_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function updateCursor(
  supabase: DatabaseClient,
  params: { itemId: string; userId: string; cursor: string | null },
) {
  const { error } = await supabase
    .from('plaid_items')
    .update({
      transactions_cursor: params.cursor,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .eq('item_id', params.itemId);

  if (error) {
    throw new Error(`Failed to update Plaid cursor: ${error.message}`);
  }
}

function mapTransactionForStorage(txn: any) {
  return {
    transaction_id: txn.transaction_id,
    account_id: txn.account_id,
    amount: txn.amount,
    name: txn.name,
    merchant_name: txn.merchant_name ?? null,
    date: txn.date,
    category: (txn.category ?? []) as string[],
    pending: Boolean(txn.pending),
    payment_channel: txn.payment_channel ?? null,
    updated_at: new Date().toISOString(),
  };
}

function mapTransactionForResponse(
  txn: any,
  accountMetadata: Map<
    string,
    { name: string; mask: string | null; institutionName: string | null }
  >,
) {
  const account = accountMetadata.get(txn.account_id);
  return {
    transactionId: txn.transaction_id,
    accountId: txn.account_id,
    amount: txn.amount,
    name: txn.name,
    merchantName: txn.merchant_name ?? null,
    date: txn.date,
    category: txn.category ?? [],
    pending: Boolean(txn.pending),
    paymentChannel: txn.payment_channel ?? null,
    accountName: account?.name ?? null,
    accountMask: account?.mask ?? null,
    institutionName: account?.institutionName ?? null,
  };
}

export function createPlaidRouter(supabase: DatabaseClient) {
  const router = Router();

  router.post(
    '/link-token/create',
    async (req: Request, res: Response): Promise<void> => {
      const info = ensureUserId(req, res);
      if (!info) return;

      try {
        const response = await plaidClient.linkTokenCreate({
          user: { client_user_id: info.userId },
          client_name: '1099Suite',
          products: [Products.Transactions],
          country_codes: [CountryCode.Us],
          language: 'en',
          webhook: env.plaidWebhookUrl,
        });

        res.json({
          link_token: response.data.link_token,
          expiration: response.data.expiration,
        });
      } catch (error) {
        console.error('[Plaid] Failed to create link token:', error);
        res.status(500).json({ error: 'Unable to create Plaid link token' });
      }
    },
  );

  router.post(
    '/item/public_token/exchange',
    async (req: Request, res: Response): Promise<void> => {
      const info = ensureUserId(req, res);
      if (!info) return;

      const publicToken: unknown = req.body?.public_token ?? req.body?.publicToken;
      const institutionName: string | null =
        req.body?.institution_name ??
        req.body?.institutionName ??
        req.body?.metadata?.institution?.name ??
        null;

      if (typeof publicToken !== 'string' || publicToken.length === 0) {
        res.status(400).json({ error: 'Missing public_token' });
        return;
      }

      try {
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        });

        const exchange = exchangeResponse.data;
        const itemId = exchange.item_id;
        const storedItem = await storePlaidItem(supabase, {
          userId: info.userId,
          itemId,
          institutionName,
          accessToken: exchange.access_token,
        });

        const accounts = await upsertAccounts(supabase, {
          userId: info.userId,
          plaidItemId: storedItem.id,
          institutionName,
          accessToken: exchange.access_token,
        });

        res.json({
          item_id: itemId,
          institution_name: institutionName,
          accounts,
        });
      } catch (error) {
        console.error('[Plaid] Token exchange failed:', error);
        res.status(500).json({ error: 'Unable to exchange Plaid public token' });
      }
    },
  );

  router.get(
    '/accounts',
    async (req: Request, res: Response): Promise<void> => {
      const info = ensureUserId(req, res);
      if (!info) return;

      try {
        const { data, error } = await supabase
          .from('accounts')
          .select(
            'account_id, name, type, subtype, mask, current_balance, available_balance, iso_currency_code, institution_name, plaid_item_id',
          )
          .eq('user_id', info.userId)
          .order('name', { ascending: true });

        if (error) {
          throw new Error(`Failed to load accounts: ${error.message}`);
        }

        res.json({
          accounts: (data ?? []).map((account: any) => ({
            accountId: account.account_id,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            currentBalance: account.current_balance,
            availableBalance: account.available_balance,
            isoCurrencyCode: account.iso_currency_code,
            institutionName: account.institution_name,
            plaidItemId: account.plaid_item_id,
          })),
        });
      } catch (error) {
        console.error('[Plaid] Failed to fetch accounts:', error);
        res.status(500).json({ error: 'Unable to fetch Plaid accounts' });
      }
    },
  );

  router.get(
    '/transactions',
    async (req: Request, res: Response): Promise<void> => {
      const info = ensureUserId(req, res);
      if (!info) return;

      const startDate = parseDateParam(req.query.start_date) ?? defaultStartDate();
      const endDate = parseDateParam(req.query.end_date) ?? defaultEndDate();

      try {
        const items = await fetchItemsForUser(supabase, info.userId);
        if (items.length === 0) {
          res.status(404).json({ error: 'No linked Plaid items for user' });
          return;
        }

        const allTransactions: any[] = [];
        const accountMetadata = new Map<
          string,
          { name: string; mask: string | null; institutionName: string | null }
        >();

        for (const item of items) {
          const accountsResponse = await plaidClient.accountsGet({
            access_token: item.accessToken,
          });
          accountsResponse.data.accounts.forEach((account) => {
            accountMetadata.set(account.account_id, {
              name: account.name,
              mask: account.mask ?? null,
              institutionName: item.institutionName,
            });
          });

          const response = await plaidClient.transactionsGet({
            access_token: item.accessToken,
            start_date: startDate,
            end_date: endDate,
          });

          const mapped = response.data.transactions.map((txn) =>
            mapTransactionForStorage(txn),
          );

          await upsertTransactions(supabase, {
            userId: info.userId,
            transactions: mapped,
          });

          allTransactions.push(
            ...response.data.transactions.map((txn) =>
              mapTransactionForResponse(txn, accountMetadata),
            ),
          );
        }

        res.json({
          startDate,
          endDate,
          transactions: allTransactions.sort((a, b) =>
            a.date > b.date ? -1 : a.date < b.date ? 1 : 0,
          ),
        });
      } catch (error) {
        console.error('[Plaid] Failed to fetch transactions:', error);
        res.status(500).json({ error: 'Unable to fetch Plaid transactions' });
      }
    },
  );

  router.post(
    '/transactions/sync',
    async (req: Request, res: Response): Promise<void> => {
      const info = ensureUserId(req, res);
      if (!info) return;

      const explicitlyRequestedItem = req.body?.item_id ?? req.body?.itemId;

      try {
        const items = await fetchItemsForUser(supabase, info.userId);
        const relevantItems = explicitlyRequestedItem
          ? items.filter((item) => item.itemId === explicitlyRequestedItem)
          : items;

        if (relevantItems.length === 0) {
          res.status(404).json({ error: 'No linked Plaid items for user' });
          return;
        }

        const aggregated = [];

        for (const item of relevantItems) {
          const options: TransactionsSyncRequestOptions = {
            include_personal_finance_category: true,
          };

          const response = await plaidClient.transactionsSync({
            access_token: item.accessToken,
            cursor: item.transactionsCursor ?? undefined,
            options,
          });

          const added = response.data.added.map((txn) =>
            mapTransactionForStorage(txn),
          );
          const modified = response.data.modified.map((txn) =>
            mapTransactionForStorage(txn),
          );

          await upsertTransactions(supabase, {
            userId: info.userId,
            transactions: [...added, ...modified],
          });

          if (response.data.removed.length > 0) {
            const removedIds = response.data.removed.map(
              (entry) => entry.transaction_id,
            );
            const { error } = await supabase
              .from('transactions')
              .delete()
              .eq('user_id', info.userId)
              .in('transaction_id', removedIds);

            if (error) {
              throw new Error(`Failed to remove transactions: ${error.message}`);
            }
          }

          await updateCursor(supabase, {
            userId: info.userId,
            itemId: item.itemId,
            cursor: response.data.next_cursor,
          });

          aggregated.push({
            itemId: item.itemId,
            hasMore: response.data.has_more,
            nextCursor: response.data.next_cursor,
            addedCount: response.data.added.length,
            modifiedCount: response.data.modified.length,
            removedCount: response.data.removed.length,
          });
        }

        res.json({ status: 'ok', items: aggregated });
      } catch (error) {
        console.error('[Plaid] Failed to sync transactions:', error);
        res.status(500).json({ error: 'Unable to sync Plaid transactions' });
      }
    },
  );

  router.post(
    '/webhook',
    async (req: Request, res: Response): Promise<void> => {
      const { webhook_type: webhookType, webhook_code: webhookCode, item_id: itemId } =
        req.body ?? {};

      if (!itemId) {
        res.status(400).json({ error: 'Missing item_id in webhook payload' });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('plaid_items')
          .select('user_id, item_id, access_token_enc, transactions_cursor')
          .eq('item_id', itemId)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to look up Plaid item: ${error.message}`);
        }

        if (!data) {
          res.status(200).json({ status: 'ignored', reason: 'item not found' });
          return;
        }

        const accessToken = decrypt(data.access_token_enc);

        if (webhookType === 'TRANSACTIONS') {
          const response = await plaidClient.transactionsSync({
            access_token: accessToken,
            cursor: data.transactions_cursor ?? undefined,
            options: { include_personal_finance_category: true },
          });

          const added = response.data.added.map((txn) =>
            mapTransactionForStorage(txn),
          );
          const modified = response.data.modified.map((txn) =>
            mapTransactionForStorage(txn),
          );

          await upsertTransactions(supabase, {
            userId: data.user_id,
            transactions: [...added, ...modified],
          });

          if (response.data.removed.length > 0) {
            const removedIds = response.data.removed.map(
              (entry) => entry.transaction_id,
            );
            const { error: deleteError } = await supabase
              .from('transactions')
              .delete()
              .eq('user_id', data.user_id)
              .in('transaction_id', removedIds);

            if (deleteError) {
              throw new Error(
                `Failed to delete removed transactions: ${deleteError.message}`,
              );
            }
          }

          await updateCursor(supabase, {
            userId: data.user_id,
            itemId: data.item_id,
            cursor: response.data.next_cursor,
          });
        }

        res.json({
          status: 'ok',
          webhookType,
          webhookCode,
        });
      } catch (error) {
        console.error('[Plaid] Webhook handling failed:', error);
        res.status(500).json({ error: 'Failed to process Plaid webhook' });
      }
    },
  );

  return router;
}
