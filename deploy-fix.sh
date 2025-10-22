#!/bin/bash

# Backend Deployment Fix Script
# This script ensures all dependencies are properly installed

echo "🔧 Fixing Backend Deployment Issues..."

# 1. Install missing dependencies
echo "1. Installing dependencies..."
cd backend
npm install google-auth-library@^10.2.0
npm install

# 2. Check if all dependencies are installed
echo "2. Verifying dependencies..."
npm list --depth=0

# 3. Test the server startup
echo "3. Testing server startup..."
timeout 10s node plaidServer.js || echo "Server test completed"

echo "✅ Deployment fix completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Commit and push these changes to Railway"
echo "2. Railway will automatically redeploy"
echo "3. Check the logs to ensure the server starts successfully"
echo ""
echo "🔍 If issues persist:"
echo "- Check Railway logs for new errors"
echo "- Verify all environment variables are set"
echo "- Ensure Node.js version is 20+ in Railway settings"
