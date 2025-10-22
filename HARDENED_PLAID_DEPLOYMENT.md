# Hardened Plaid Transactions System - Deployment Guide

This guide will help you deploy the hardened Plaid transactions system that fixes the "No transactions found" issue for AmEx and other banks.

## Overview

The hardened system:
- Stores Plaid access tokens securely in the database
- Removes the need to send access tokens from frontend to backend
- Provides better error handling and logging
- Uses a more robust database schema

## Step 1: Database Setup

Run the SQL migration in your Supabase SQL editor:

```sql
-- Hardened Plaid Transactions Setup
-- Run this against Supabase/Postgres (e.g., psql, Supabase SQL editor)

-- 1. Create plaid_items table for storing access tokens securely
create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  item_id text,
  institution_name text,
  created_at timestamptz default now()
);
create index if not exists plaid_items_user_idx on public.plaid_items(user_id);

-- 2. Ensure expenses table has all required columns
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plaid_transaction_id text unique,
  account_id text,
  date date not null,
  name text,
  merchant_name text,
  amount numeric(12,2) not null,
  currency text default 'USD',
  category text[],
  account_name text,
  pending boolean default false,
  classification text check (classification in ('business','personal','unreviewed')) default 'unreviewed',
  client_id uuid null,
  notes text,
  logo_url text,
  recurring boolean default false,
  original_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Create indexes for performance
create index if not exists idx_expenses_plaid_transaction_id on public.expenses(plaid_transaction_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_classification on public.expenses(classification);
```

## Step 2: Backend Deployment

The backend has been updated with:
- New hardened route: `backend/routes/plaidTransactionsHardened.js`
- Updated token exchange endpoint to use `plaid_items` table
- Better error handling and logging

### Deploy to Railway:

1. Push the updated backend code to your repository
2. Railway will automatically deploy the changes
3. The new route will be available at `/api/plaid/transactions/sync`

## Step 3: Frontend Updates

The frontend has been updated to:
- Remove access token headers from API calls
- Use the new hardened backend endpoint
- Provide better error handling

### Key Changes:
- `src/hooks/usePlaidTransactions.ts` - Removed access token dependency
- Backend now retrieves access tokens from database

## Step 4: Migration (if needed)

If you have existing Plaid tokens in the old `plaid_tokens` table, run the migration:

```bash
node migrate-plaid-tokens.js
```

This will move existing tokens to the new `plaid_items` table.

## Step 5: Testing

Run the test script to verify everything is working:

```bash
node test-hardened-plaid.js
```

This will check:
- Database tables exist
- Users have Plaid tokens
- Backend connectivity
- Existing transactions

## Step 6: Verification

### Test the system:

1. **Check database tables:**
   ```sql
   -- Verify plaid_items table
   select user_id, left(access_token,6)||'…' token from public.plaid_items order by created_at desc limit 5;
   
   -- Verify expenses table structure
   select column_name, data_type from information_schema.columns where table_name = 'expenses' and table_schema = 'public';
   ```

2. **Test API endpoint:**
   ```bash
   curl -H "x-user-id: YOUR_USER_ID" "https://1099suite-backend-production.up.railway.app/api/plaid/transactions/sync"
   ```

3. **Check app functionality:**
   - Go to Deductions > Expenses
   - Pull to refresh
   - Check device console for any errors

## Troubleshooting

### Common Issues:

1. **"No Plaid access_token for user"**
   - User needs to link their bank account again
   - Check if tokens exist in `plaid_items` table

2. **"Plaid item does not have the Transactions product enabled"**
   - User needs to re-link with Transactions product
   - Check Plaid dashboard for product configuration

3. **"ITEM_LOGIN_REQUIRED"**
   - User needs to re-authenticate with their bank
   - Prompt them to re-link their account

4. **"PRODUCT_NOT_READY"**
   - Wait a few minutes and try again
   - Common with AmEx right after linking

5. **"INSUFFICIENT_PERMISSIONS"**
   - User needs to re-link with proper permissions
   - Check Plaid dashboard settings

### Debug Commands:

```sql
-- Check user's Plaid tokens
select user_id, institution_name, created_at from public.plaid_items where user_id = 'USER_ID';

-- Check recent transactions
select name, amount, date, classification from public.expenses where user_id = 'USER_ID' order by date desc limit 20;

-- Check for specific errors
select * from public.expenses where plaid_transaction_id is not null and user_id = 'USER_ID';
```

## Security Notes

- Access tokens are now stored securely in the database
- Frontend no longer handles sensitive Plaid tokens
- All API calls are authenticated via user ID
- Database has proper indexes for performance

## Performance Notes

- Transactions are fetched in batches of 100
- Database uses efficient upsert operations
- Proper indexing on frequently queried columns
- Cursor-based pagination for large datasets

## Support

If you encounter issues:
1. Check the device console for exact error messages
2. Run the test script to verify setup
3. Check database tables and user tokens
4. Verify backend deployment and environment variables

The hardened system should resolve the "No transactions found" issue and provide a more robust Plaid integration.
