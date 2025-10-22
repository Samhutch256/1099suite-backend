# 1099Suite Backend Server

Modern TypeScript backend server with Plaid integration for 1099Suite.

## Features

- 🔒 **Secure Token Encryption**: AES-256-GCM encryption for Plaid access tokens
- 🏦 **Plaid Integration**: Complete transaction sync, webhooks, and account management
- 📊 **Transaction Management**: Real-time syncing with cursor-based pagination
- 🔄 **Webhooks**: Automatic transaction updates from Plaid
- 🛡️ **Row Level Security**: Supabase RLS policies for data protection

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `PLAID_CLIENT_ID` - Your Plaid client ID
- `PLAID_SECRET` - Your Plaid secret key
- `PLAID_ENV` - Plaid environment (sandbox/development/production)
- `PLAID_WEBHOOK_URL` - Your webhook endpoint URL
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `TOKEN_ENC_KEY` - Base64 encoded 32-byte encryption key

### 3. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Database Setup

Run the migration in Supabase SQL editor:

```sql
-- See: /supabase/migrations/20250910080531_create_plaid_secure_tables.sql
```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Plaid Link
- `POST /api/plaid/link-token/create` - Create Plaid link token
- `POST /api/plaid/item/public_token/exchange` - Exchange public token

### Accounts
- `GET /api/plaid/accounts` - Get user's linked accounts

### Transactions
- `GET /api/plaid/transactions` - Fetch transactions (legacy)
- `POST /api/plaid/transactions/sync` - Sync transactions with cursor

### Webhooks
- `POST /api/plaid/webhook` - Plaid webhook endpoint

## Security

- All access tokens are encrypted with AES-256-GCM
- Service role authentication for sensitive operations
- Row-level security on all database tables
- Webhook signature verification (recommended)

## Deployment

Deployed automatically via Railway using nixpacks configuration.

### Railway Environment Variables

Set these in your Railway project settings:
1. All variables from `.env.example`
2. Ensure `TOKEN_ENC_KEY` is properly set
3. Update `PLAID_WEBHOOK_URL` to your Railway URL

## Architecture

```
server/
├── index.ts          # Express app setup & entry point
├── env.ts           # Environment configuration
├── plaid.ts         # Plaid client configuration
├── crypto.ts        # Token encryption/decryption
└── routes/
    └── plaid.ts     # Plaid API routes
```

## Database Schema

### Tables
- `plaid_items` - Encrypted Plaid access tokens
- `accounts` - User bank accounts
- `transactions` - Transaction data

All tables have RLS enabled with service role access for writes.

