# DeductionsTransactionsScreen Implementation

## Overview
The DeductionsTransactionsScreen provides an Everlance-style transaction list with fast classification, category management, and infinite scroll functionality.

## Features Implemented

### ✅ Core UI Requirements
- **Screen Location**: Integrated into the Deductions tab as a new "Transactions" tab
- **Header**: Search bar + filter chips (All | Business | Personal | Unreviewed) + date-range pill
- **List**: Grouped by Month with sticky headers
- **Row Layout**: Everlance-style with merchant logo/initials, title/subtitle, amount, and badges
- **Swipe Actions**: Swipe right → Business (green), Swipe left → Personal (neutral)
- **Bottom Sheet**: Tap row opens editor with classification, category, client, and notes fields

### ✅ Technical Implementation
- **FlashList**: Using @shopify/flash-list for performance with large lists
- **Gesture Handler**: Swipe actions using react-native-gesture-handler
- **Infinite Scroll**: Pagination via next_cursor
- **Pull-to-Refresh**: Refreshes transaction list
- **Skeleton Loading**: Shimmer loading states while fetching data
- **Optimistic Updates**: UI updates immediately on swipe actions

### ✅ Data Management
- **TypeScript Types**: Complete type definitions for transactions and API responses
- **Hook Pattern**: usePlaidTransactions hook for data fetching and state management
- **Mock Service**: Mock transaction service for testing without Plaid API
- **Filtering**: Client-side filtering by classification and search query
- **Date Range**: Date picker for filtering transactions by date range

## File Structure

```
src/
├── types/
│   └── transactions.ts          # Transaction type definitions
├── hooks/
│   └── usePlaidTransactions.ts  # Data fetching hook
├── components/
│   ├── TransactionItem.tsx      # Individual transaction row
│   ├── TransactionEditorSheet.tsx # Bottom sheet editor
│   ├── TransactionSkeleton.tsx  # Loading skeleton
│   └── DateRangePicker.tsx      # Date range picker
├── screens/
│   └── DeductionsTransactionsScreen.tsx # Main screen
└── services/
    └── mockTransactionService.ts # Mock data for testing
```

## API Integration

### Current State
- Using mock data service for development/testing
- Ready for Plaid API integration

### Required Backend Endpoints
1. `GET /api/plaid/transactions/sync` - Fetch transactions with pagination
2. `POST /api/expenses/classify` - Classify transaction as business/personal
3. `POST /api/expenses/upsert` - Update transaction details

### Database Schema
The implementation expects a `public.expenses` table with the following structure:
```sql
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_transaction_id text UNIQUE,
  account_id text,
  date date NOT NULL,
  name text,
  merchant_name text,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  category text[],
  account_name text,
  pending boolean DEFAULT false,
  classification text CHECK (classification IN ('business', 'personal', 'unreviewed')) DEFAULT 'unreviewed',
  client_id uuid,
  notes text,
  logo_url text,
  recurring boolean DEFAULT false,
  original_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Usage

### Navigation
The screen is accessible via the Deductions tab in the main navigation. It appears as the middle tab between "Expenses & Income" and "Mileage".

### User Interactions
1. **Search**: Type in the search bar to filter transactions by name, merchant, or category
2. **Filter**: Tap filter chips to show only business, personal, or unreviewed transactions
3. **Date Range**: Tap date pills to select custom date ranges
4. **Swipe**: Swipe right on a transaction to mark as business, left for personal
5. **Tap**: Tap any transaction to open the detailed editor
6. **Scroll**: Pull down to refresh, scroll to bottom for infinite loading

### Development Notes
- All components use NativeWind for styling
- TypeScript strict mode enabled
- Mock data includes various transaction types for testing
- Ready for production API integration

## Next Steps
1. Replace mock service with actual Plaid API calls
2. Add client selection dropdown in editor
3. Implement category picker with predefined categories
4. Add transaction export functionality
5. Implement offline support with local caching
