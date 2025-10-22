#!/bin/bash

# Deploy Expense Categories Fix
# This script runs the migrations to fix the expense_categories table permissions

echo "🚀 Deploying Expense Categories Fix..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

# Run the migrations
echo "📦 Running migrations..."

# Run the comprehensive fix migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🔍 The following fixes have been applied:"
    echo "   - Recreated expense_categories table with proper structure"
    echo "   - Enabled Row Level Security (RLS)"
    echo "   - Created RLS policies for user access control"
    echo "   - Granted proper permissions to authenticated users"
    echo "   - Added performance indexes"
    echo ""
    echo "🧪 You can now test the expense categories functionality in your app."
    echo "   The permission denied error should be resolved."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Expense Categories Fix Deployment Complete!"
