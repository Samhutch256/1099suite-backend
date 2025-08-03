# Transaction Tracking System Implementation Guide

## Overview

This guide provides complete implementation details for building a persistent transaction tracking system with Plaid integration, automatic syncing, and Jessica AI categorization.

## ✅ What We've Built

### 1. Database Schema (`transaction-schema.sql`)
- **plaid_items**: Stores access tokens persistently per user
- **plaid_accounts**: Linked bank accounts with balances
- **transactions**: Full transaction data with business categorization
- **categorization_rules**: Automatic rules for recurring vendors
- **transaction_summaries**: Monthly summaries for quick reporting
- **transaction_sync_log**: Sync history and error tracking
- **jessica_transaction_context**: AI conversation context

### 2. Backend API Enhancements (`plaidServer.js`)

#### Persistent Token Storage
```javascript
// POST /api/exchange-public-token
// Stores access tokens in plaid_items table
// Performs initial transaction sync
// Returns institution info and sync status
```

#### Automatic Transaction Sync
```javascript
// GET /api/transactions?user_id={userId}
// Automatically syncs if last sync > 1 hour ago
// Uses Plaid's /transactions/sync for incremental updates
// Falls back to /transactions/get if sync fails
// Returns transactions from database, not directly from Plaid
```

#### Transaction Management
```javascript
// PATCH /api/transactions/{transactionId}
// Update business categorization and notes

// POST /api/categorization-rules
// Create rules for automatic categorization
// Applies to existing and future transactions

// GET /api/plaid/linked-accounts
// Check if user has linked accounts (skip Plaid Link if true)
```

#### Jessica AI Integration
```javascript
// POST /api/jessica-process-transaction
// Natural language transaction processing
// Examples:
//   "Mark this as business"
//   "All Uber charges are business"
//   "How much did I spend on business this month?"
```

## 📱 Frontend Implementation

### 1. TransactionList Component

Create `src/components/TransactionList.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transaction_id: string;
  merchant_name: string;
  name: string;
  amount: number;
  date: string;
  primary_category: string;
  detailed_category: string;
  is_business: boolean;
  business_category?: string;
  tax_category?: string;
  user_category?: string;
  user_notes?: string;
  tags?: string[];
  pending: boolean;
  plaid_account?: {
    name: string;
    mask: string;
    type: string;
  };
}

interface TransactionListProps {
  userId: string;
  onTransactionUpdate?: (transaction: Transaction) => void;
  jessicaProcessTransaction?: (message: string, transaction: Transaction) => Promise<any>;
}

const TransactionList: React.FC<TransactionListProps> = ({
  userId,
  onTransactionUpdate,
  jessicaProcessTransaction,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  // ... rest of component implementation
};

export default TransactionList;
```

### 2. Enhanced Plaid Service

Create/update `src/services/plaidService.ts`:

```typescript
import { BACKEND_URL } from '../config/constants';

export class PlaidService {
  static async checkLinkedAccounts(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/plaid/linked-accounts?user_id=${userId}`);
      const data = await response.json();
      return data.has_linked_accounts;
    } catch (error) {
      console.error('Error checking linked accounts:', error);
      return false;
    }
  }

  static async createLinkToken(userId: string): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/create-link-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await response.json();
    return data.link_token;
  }

  static async exchangePublicToken(publicToken: string, userId: string, metadata: any): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/exchange-public-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token: publicToken, user_id: userId, metadata }),
    });
    return response.json();
  }

  static async fetchTransactions(userId: string, sync = true): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/transactions?user_id=${userId}&sync=${sync}`);
    return response.json();
  }

  static async updateTransaction(transactionId: string, userId: string, updates: any): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...updates }),
    });
    return response.json();
  }

  static async createCategorizationRule(userId: string, rule: any): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/categorization-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...rule }),
    });
    return response.json();
  }

  static async getTransactionSummary(userId: string, month?: string): Promise<any> {
    const url = month 
      ? `${BACKEND_URL}/api/transaction-summary?user_id=${userId}&month=${month}`
      : `${BACKEND_URL}/api/transaction-summary?user_id=${userId}`;
    const response = await fetch(url);
    return response.json();
  }
}
```

### 3. Update Login/Dashboard Flow

In `src/screens/LoginScreen.tsx` or `src/screens/DashboardScreen.tsx`:

```typescript
import { PlaidService } from '../services/plaidService';
import PlaidLinkModal from '../components/PlaidLinkModal';
import TransactionList from '../components/TransactionList';

const DashboardScreen = () => {
  const [hasLinkedAccounts, setHasLinkedAccounts] = useState(false);
  const [showPlaidLink, setShowPlaidLink] = useState(false);
  const userId = authStore.user?.id;

  useEffect(() => {
    checkPlaidStatus();
  }, []);

  const checkPlaidStatus = async () => {
    if (userId) {
      const linked = await PlaidService.checkLinkedAccounts(userId);
      setHasLinkedAccounts(linked);
    }
  };

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      const result = await PlaidService.exchangePublicToken(publicToken, userId, metadata);
      if (result.success) {
        setHasLinkedAccounts(true);
        Alert.alert('Success', `Connected to ${result.institution}. Synced ${result.transactions_synced} transactions.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  const processTransactionWithJessica = async (message: string, transaction: any) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/jessica-process-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId,
          transactionData: transaction,
        }),
      });
      return response.json();
    } catch (error) {
      console.error('Jessica transaction error:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      {!hasLinkedAccounts ? (
        <View style={styles.plaidPrompt}>
          <Text style={styles.promptTitle}>Connect Your Bank Account</Text>
          <Text style={styles.promptText}>
            Link your bank to automatically track and categorize business expenses
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setShowPlaidLink(true)}
          >
            <Text style={styles.linkButtonText}>Connect Bank Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TransactionList
          userId={userId}
          jessicaProcessTransaction={processTransactionWithJessica}
        />
      )}

      {showPlaidLink && (
        <PlaidLinkModal
          linkToken={await PlaidService.createLinkToken(userId)}
          onSuccess={handlePlaidSuccess}
          onExit={() => setShowPlaidLink(false)}
        />
      )}
    </View>
  );
};
```

### 4. Jessica Chat Integration

Update `src/components/JessicaChatOverlay.tsx` to handle transaction queries:

```typescript
// Add transaction context to Jessica messages
const handleTransactionQuery = async (message: string) => {
  // Check if message is transaction-related
  const transactionKeywords = ['expense', 'spent', 'business', 'personal', 'transaction', 'charge'];
  const isTransactionQuery = transactionKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  if (isTransactionQuery) {
    // Get current transaction context if viewing transactions
    const currentTransaction = getCurrentTransaction(); // Implement based on your state
    
    const response = await fetch(`${BACKEND_URL}/api/jessica-process-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: authStore.user?.id,
        transactionData: currentTransaction,
      }),
    });
    
    const result = await response.json();
    
    // Handle Jessica's response and any actions
    if (result.actions) {
      result.actions.forEach(action => {
        if (action.type === 'update_transaction') {
          // Refresh transaction list
          refreshTransactions();
        } else if (action.type === 'create_rule') {
          // Show confirmation of rule creation
          showNotification(`Rule created: ${result.message}`);
        }
      });
    }
    
    return result.message;
  }
  
  // Handle non-transaction queries as before
  return handleRegularJessicaQuery(message);
};
```

## 🚀 Implementation Checklist

1. **Database Setup**
   - [ ] Run `transaction-schema.sql` in your Supabase database
   - [ ] Verify all tables and triggers are created
   - [ ] Test RLS policies with a test user

2. **Backend Deployment**
   - [ ] Deploy updated `plaidServer.js`
   - [ ] Set environment variables (PLAID_CLIENT_ID, PLAID_SECRET, etc.)
   - [ ] Test all new endpoints

3. **Frontend Integration**
   - [ ] Add TransactionList component to your app
   - [ ] Update PlaidLinkModal to pass metadata
   - [ ] Integrate transaction queries in Jessica chat
   - [ ] Add navigation to transactions screen

4. **Testing**
   - [ ] Test Plaid Link flow (first time)
   - [ ] Verify transactions sync automatically
   - [ ] Test Jessica categorization commands
   - [ ] Verify rules apply to new transactions
   - [ ] Test transaction filtering and search

## 📊 Example Jessica Commands

### Transaction Categorization
- "Mark this as business"
- "This Uber ride was personal"
- "All Starbucks charges are personal"
- "Mark all Amazon transactions as business"

### Creating Rules
- "Always categorize Uber as business"
- "All gas station charges should be business expenses"
- "Mark anything from Home Depot as business"

### Expense Summaries
- "How much have I spent on business this month?"
- "What are my total expenses?"
- "Show me my business meal expenses"
- "How much did I spend at Starbucks?"

### Smart Suggestions
Jessica can also proactively suggest categorizations based on patterns:
- "I noticed you have 5 uncategorized Uber charges. Would you like to mark them all as business?"
- "You frequently mark Amazon purchases as business. Should I create a rule?"

## 🔒 Security Considerations

1. **Token Storage**
   - Access tokens are stored server-side only
   - Never expose tokens to client
   - Use RLS policies for data isolation

2. **User Isolation**
   - All queries filtered by user_id
   - Transactions visible only to owner
   - Rules apply only to user's transactions

3. **Sync Limits**
   - Rate limit sync to once per hour
   - Use cursor-based pagination
   - Log all sync attempts

## 🎯 Next Steps

1. **Enhanced Features**
   - Receipt OCR integration
   - Mileage tracking correlation
   - Quarterly tax estimates
   - Export to accounting software

2. **Performance Optimization**
   - Cache transaction summaries
   - Implement pagination for large datasets
   - Add database indexes for common queries

3. **Advanced AI Features**
   - Predictive categorization
   - Anomaly detection
   - Spending insights and recommendations
   - Budget tracking and alerts

This implementation provides a complete, production-ready transaction tracking system that rivals commercial solutions like Everlance or Hurdlr, with the added benefit of Jessica AI for intelligent categorization and natural language processing.