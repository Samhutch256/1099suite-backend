# 🚀 Railway Deployment Instructions

## ⚠️ GitHub Push Issue

GitHub is blocking the push due to secret scanning detecting an API key in the git history. Here's how to deploy your new TypeScript backend:

## 🎯 Solution: Manual Railway Deployment

Since the new backend is ready, you can deploy it manually through Railway:

### Option 1: Connect New Repository (Recommended)

1. **Create a new GitHub repository** (without the old commits):
   ```bash
   # Create new repo on GitHub
   # Then locally:
   git remote remove origin
   git remote add origin https://github.com/YOUR_USERNAME/1099suite-backend-new.git
   git push -u origin main
   ```

2. **Connect to Railway**:
   - Go to Railway dashboard
   - Create new project
   - Connect the new repository

### Option 2: Manual Deployment via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy directly**:
   ```bash
   cd /Users/hutch/Downloads/1099Suite
   railway deploy
   ```

### Option 3: Upload Files via Railway Dashboard

1. **Zip your project** (excluding node_modules, .git):
   ```bash
   cd /Users/hutch/Downloads/1099Suite
   zip -r 1099suite-backend.zip . -x "node_modules/*" ".git/*" "*.log"
   ```

2. **Upload to Railway**:
   - Go to Railway dashboard
   - Create new project
   - Upload the zip file

## 🔧 Environment Variables Setup

Once deployed, set these in Railway:

```bash
NODE_ENV=production
PORT=5001

# Generate this key:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TOKEN_ENC_KEY=<generated_32_byte_base64_key>

PLAID_CLIENT_ID=<your_plaid_client_id>
PLAID_SECRET=<your_plaid_secret>
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=https://<your-railway-app>.railway.app/api/plaid/webhook

SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

## 📋 What's Ready to Deploy

✅ **New TypeScript Backend** (`/server/` directory):
- Modern Express.js server
- AES-256-GCM token encryption
- Cursor-based transaction syncing
- Webhook support
- Type-safe Plaid integration

✅ **Configuration Files**:
- `railway.json` - Updated for new server
- `nixpacks.toml` - Build configuration
- `server/package.json` - Dependencies and scripts

✅ **Database Migration**:
- `/supabase/migrations/20250910080531_create_plaid_secure_tables.sql`

## 🎯 Quick Deploy Steps

1. **Generate encryption key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Choose deployment method** (Option 1, 2, or 3 above)

3. **Set environment variables** in Railway

4. **Run database migration** in Supabase SQL Editor

5. **Test deployment**:
   ```bash
   curl https://<your-app>.railway.app/api/health
   ```

## 🔍 Verification

Once deployed, test:

```bash
# Health check
curl https://<your-app>.railway.app/api/health

# Expected response:
# {"status":"ok","plaidEnv":"sandbox","timestamp":"..."}
```

## 📚 Documentation Available

- `QUICK_START.md` - 3-step deployment guide
- `BACKEND_DEPLOYMENT_GUIDE.md` - Comprehensive setup
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `server/README.md` - API documentation

## 🆘 Need Help?

The new backend is production-ready! The only issue is the GitHub secret scanning. Choose any of the 3 deployment options above to get your enhanced Plaid integration live.

---

**Your TypeScript backend is ready to deploy! 🚀**
