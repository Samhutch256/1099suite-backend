#!/bin/bash

echo "🚀 1099Suite Backend Deployment Script"
echo "======================================"

# Generate encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "🔑 Generated encryption key: $ENCRYPTION_KEY"
echo ""
echo "📋 Environment variables to set in Railway:"
echo "==========================================="
echo "TOKEN_ENC_KEY=$ENCRYPTION_KEY"
echo "PLAID_CLIENT_ID=<your_plaid_client_id>"
echo "PLAID_SECRET=<your_plaid_secret>"
echo "PLAID_ENV=sandbox"
echo "PLAID_WEBHOOK_URL=https://<your-app>.railway.app/api/plaid/webhook"
echo "SUPABASE_URL=<your_supabase_url>"
echo "SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "🔐 Please login to Railway when prompted..."
railway login

echo "🚀 Deploying to Railway..."
railway deploy

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps after deployment:"
echo "1. Set the environment variables above in Railway dashboard"
echo "2. Run database migration in Supabase SQL Editor:"
echo "   File: supabase/migrations/20250910080531_create_plaid_secure_tables.sql"
echo "3. Test deployment: curl https://<your-app>.railway.app/api/health"
echo "4. Update Plaid webhook URL in Plaid dashboard"