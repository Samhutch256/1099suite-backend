# Expense Saving Fix

## Problem
The logged expenses were not saving to the database because there was a schema mismatch between the frontend code and the Supabase database.

## Root Cause
1. **Schema Mismatch**: The frontend code expected an expenses table with columns like `description`, `date`, `is_deductible`, `mileage`, `start_location`, `end_location`, but the Supabase database had an old schema with columns like `amount`, `category`, `vendor_name`, `card_used`, `is_business`, `client_id`, `timestamp`, `notes`.

2. **Interface Mismatch**: The `TransactionReviewScreen` was calling `addExpense` with incorrect field names that didn't match the `Expense` interface.

## Solution

### 1. Database Schema Fix
Created a new migration file `supabase/migrations/20241221000000_fix_expenses_table_schema.sql` that:
- Drops the old expenses table
- Creates a new expenses table with the correct schema that matches the frontend expectations
- Adds proper indexes, RLS policies, and triggers

### 2. Manual SQL Script
Created `fix-expenses-table-manual.sql` that can be run directly in the Supabase dashboard SQL editor to fix the schema.

### 3. Frontend Code Fixes
- Fixed the `createExpense` function in `supabaseService.ts` to properly map between frontend and database schemas
- Fixed the `TransactionReviewScreen.tsx` to pass the correct fields to `addExpense`

### 4. Mapping Functions
The `supabaseService.ts` now properly maps between:
- Frontend Expense interface: `amount`, `category`, `vendor_name`, `is_business`, `timestamp`, `notes`
- Database schema: `description`, `amount`, `category`, `date`, `is_deductible`

## Files Modified
1. `supabase/migrations/20241221000000_fix_expenses_table_schema.sql` - New migration
2. `fix-expenses-table-manual.sql` - Manual SQL script
3. `src/services/supabaseService.ts` - Fixed mapping functions
4. `src/screens/TransactionReviewScreen.tsx` - Fixed expense creation
5. `test-expense-saving.js` - Test script

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended)
```bash
# If you have Supabase CLI set up
npx supabase db push
```

### Option 2: Manual SQL Execution
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-expenses-table-manual.sql`
4. Execute the script

### Option 3: Test the Fix
1. Update the `test-expense-saving.js` file with your Supabase credentials
2. Run the test script to verify everything works:
```bash
node test-expense-saving.js
```

## Verification
After applying the fix, expenses should now save properly to the database when:
- Users manually add expenses through the app
- Expenses are created from Plaid transactions
- Jessica AI creates expenses from conversations

## Database Schema
The new expenses table has these columns:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `description` (TEXT, Required)
- `amount` (DECIMAL(10,2), Required)
- `category` (TEXT, Required)
- `date` (TEXT, Required, YYYY-MM-DD format)
- `receipt` (TEXT, Optional)
- `is_deductible` (BOOLEAN, Default TRUE)
- `mileage` (DECIMAL(10,2), Optional)
- `start_location` (TEXT, Optional)
- `end_location` (TEXT, Optional)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## Notes
- The fix preserves all existing functionality
- Row Level Security (RLS) policies ensure users can only access their own expenses
- Proper indexes are created for performance
- The `updated_at` trigger automatically updates the timestamp on changes
