# Backend Deployment Guide

## ✅ Changes Applied

Your backend has been successfully updated to use the new TypeScript server with modern Plaid integration!

### What's New

1. **TypeScript Backend** (`/server/` directory)
   - Modern Express.js server with full TypeScript support
   - Secure AES-256-GCM token encryption
   - Improved error handling and logging
   - Type-safe Plaid API integration

2. **Enhanced Security**
   - Encrypted access tokens in database
   - Row-level security policies
   - Service role authentication
   - No sensitive data exposed to frontend

3. **Better Performance**
   - Cursor-based transaction syncing
   - Efficient database queries
   - Optimized token storage

4. **Railway Configuration**
   - Updated to deploy from `/server/` directory
   - Automatic TypeScript compilation
   - Health check endpoint at `/api/health`

## 🚀 Deployment Steps

### 1. Environment Variables

Set these environment variables in your Railway project:

```bash
NODE_ENV=production
PORT=5001

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here
PLAID_ENV=sandbox  # or 'production' when ready
PLAID_WEBHOOK_URL=https://your-backend.railway.app/api/plaid/webhook

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Token Encryption Key (generate new one below)
TOKEN_ENC_KEY=your_base64_encoded_32_byte_key
```

### 2. Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and set it as `TOKEN_ENC_KEY` in Railway.

### 3. Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- See: /supabase/migrations/20250910080531_create_plaid_secure_tables.sql
```

This creates:
- `plaid_items` table (encrypted access tokens)
- `accounts` table (bank accounts)
- `transactions` table (transaction data)
- Row-level security policies

### 4. Deploy to Railway

Your Railway deployment is already configured! Just push to your repository:

```bash
git add .
git commit -m "Update to TypeScript backend with enhanced Plaid integration"
git push
```

Railway will automatically:
1. Install dependencies
2. Build TypeScript (`npm run build`)
3. Start the server (`npm start`)

### 5. Verify Deployment

Once deployed, test your backend:

```bash
# Check health endpoint
curl https://your-backend.railway.app/api/health

# Expected response:
# {"status":"ok","plaidEnv":"sandbox","timestamp":"2024-..."}
```

### 6. Update Plaid Webhook

1. Go to [Plaid Dashboard](https://dashboard.plaid.com)
2. Navigate to **API** → **Webhooks**
3. Add webhook URL: `https://your-backend.railway.app/api/plaid/webhook`
4. Enable webhook types: `TRANSACTIONS`, `ITEM`

### 7. Update Frontend Configuration

Update your frontend to use the new backend URL:

```typescript
// In your frontend env or config file
const API_URL = 'https://your-backend.railway.app';
```

## 🔌 API Endpoints

### Authentication
All endpoints require `x-user-id` header with the user's UUID.

### Plaid Link
```bash
# Create link token
POST /api/plaid/link-token/create
Headers: { "x-user-id": "user-uuid" }

# Exchange public token
POST /api/plaid/item/public_token/exchange
Headers: { "x-user-id": "user-uuid" }
Body: { "public_token": "...", "institution_name": "..." }
```

### Accounts
```bash
# Get user accounts
GET /api/plaid/accounts
Headers: { "x-user-id": "user-uuid" }
```

### Transactions
```bash
# Get transactions (legacy)
GET /api/plaid/transactions?start_date=2024-01-01&end_date=2024-12-31
Headers: { "x-user-id": "user-uuid" }

# Sync transactions (recommended)
POST /api/plaid/transactions/sync
Headers: { "x-user-id": "user-uuid" }
Body: { "item_id": "optional-item-id" }
```

### Webhooks
```bash
# Plaid webhook endpoint (called by Plaid)
POST /api/plaid/webhook
```

## 🔍 Monitoring & Debugging

### Check Logs
In Railway dashboard:
1. Go to your project
2. Click on the deployment
3. View logs in real-time

### Common Issues

**Issue**: "Missing required environment variable"
- **Solution**: Verify all env vars are set in Railway

**Issue**: "Failed to load Plaid items"
- **Solution**: Check database connection and RLS policies

**Issue**: "Unable to decrypt token"
- **Solution**: Ensure `TOKEN_ENC_KEY` is the same key used to encrypt

**Issue**: Webhook not receiving events
- **Solution**: Verify webhook URL in Plaid dashboard is correct

### Test Backend Locally

```bash
cd server
cp .env.example .env
# Fill in your credentials in .env
npm run dev
```

Visit: http://localhost:5001/api/health

## 📊 Database Queries

### Check Plaid Items
```sql
SELECT 
  user_id, 
  item_id, 
  institution_name,
  created_at 
FROM plaid_items 
ORDER BY created_at DESC;
```

### Check Transactions
```sql
SELECT 
  COUNT(*) as total,
  user_id,
  DATE(date) as transaction_date
FROM transactions
GROUP BY user_id, DATE(date)
ORDER BY transaction_date DESC;
```

### Check Accounts
```sql
SELECT 
  user_id,
  name,
  type,
  current_balance,
  institution_name
FROM accounts
ORDER BY created_at DESC;
```

## 🔐 Security Checklist

- [ ] `TOKEN_ENC_KEY` is set and secure (32 bytes, base64 encoded)
- [ ] Service role key is not exposed in frontend code
- [ ] HTTPS is enabled on Railway (automatic)
- [ ] Database RLS policies are active
- [ ] Webhook endpoint is secured (optional: verify Plaid signatures)

## 📝 Next Steps

1. **Test the Integration**
   - Connect a bank account in your app
   - Verify transactions sync correctly
   - Test webhook updates

2. **Monitor Performance**
   - Check Railway metrics
   - Monitor database query performance
   - Set up error alerting

3. **Production Readiness**
   - Switch Plaid to production environment
   - Update `PLAID_ENV=production`
   - Test with real bank accounts

## 🆘 Support

If you encounter issues:

1. Check Railway logs for errors
2. Verify environment variables
3. Test database connection
4. Check Plaid dashboard for API errors
5. Review Supabase logs

## 📚 Additional Resources

- [Plaid API Documentation](https://plaid.com/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- Server README: `/server/README.md`

---

**Your backend is now ready for production deployment! 🎉**

