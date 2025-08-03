-- Transaction Database Schema for 1099 Suite
-- This schema supports persistent Plaid integration with automatic transaction sync

-- Store Plaid access tokens (one per user)
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_name TEXT,
    institution_id TEXT,
    cursor TEXT, -- For transaction sync pagination
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Store linked accounts from Plaid
CREATE TABLE IF NOT EXISTS plaid_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    name TEXT,
    official_name TEXT,
    type TEXT,
    subtype TEXT,
    mask TEXT,
    current_balance DECIMAL(12, 2),
    available_balance DECIMAL(12, 2),
    iso_currency_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plaid_item_id, account_id)
);

-- Main transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_account_id UUID REFERENCES plaid_accounts(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL, -- Plaid's transaction ID
    account_id TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    authorized_date DATE,
    datetime TIMESTAMP WITH TIME ZONE,
    name TEXT NOT NULL,
    merchant_name TEXT,
    payment_channel TEXT,
    pending BOOLEAN DEFAULT false,
    
    -- Plaid categories
    primary_category TEXT,
    detailed_category TEXT,
    category_confidence TEXT,
    
    -- Business categorization
    is_business BOOLEAN DEFAULT false,
    business_category TEXT,
    tax_category TEXT,
    
    -- User overrides
    user_category TEXT,
    user_notes TEXT,
    receipt_url TEXT,
    
    -- Tags and metadata
    tags TEXT[], -- Array of tags like 'recurring', 'income', 'expense'
    is_recurring BOOLEAN DEFAULT false,
    is_income BOOLEAN DEFAULT false,
    
    -- Location data (if available)
    location_address TEXT,
    location_city TEXT,
    location_region TEXT,
    location_postal_code TEXT,
    location_country TEXT,
    location_lat DECIMAL(10, 8),
    location_lon DECIMAL(11, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, transaction_id),
    INDEX idx_transactions_user_date (user_id, date DESC),
    INDEX idx_transactions_merchant (user_id, merchant_name),
    INDEX idx_transactions_business (user_id, is_business, date DESC)
);

-- Categorization rules table
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('merchant', 'category', 'amount', 'keyword')),
    rule_value TEXT NOT NULL,
    is_business BOOLEAN NOT NULL,
    business_category TEXT,
    tax_category TEXT,
    tags TEXT[],
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_rules_user_active (user_id, is_active)
);

-- Transaction sync log
CREATE TABLE IF NOT EXISTS transaction_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE CASCADE,
    sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    transactions_added INTEGER DEFAULT 0,
    transactions_modified INTEGER DEFAULT 0,
    transactions_removed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jessica AI conversation context for transactions
CREATE TABLE IF NOT EXISTS jessica_transaction_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    conversation_id TEXT,
    context TEXT,
    classification_confidence DECIMAL(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly summaries for quick reporting
CREATE TABLE IF NOT EXISTS transaction_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_income DECIMAL(12, 2) DEFAULT 0,
    total_expenses DECIMAL(12, 2) DEFAULT 0,
    business_income DECIMAL(12, 2) DEFAULT 0,
    business_expenses DECIMAL(12, 2) DEFAULT 0,
    personal_income DECIMAL(12, 2) DEFAULT 0,
    personal_expenses DECIMAL(12, 2) DEFAULT 0,
    category_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, month)
);

-- Create necessary indexes
CREATE INDEX idx_plaid_items_user ON plaid_items(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_pending ON transactions(pending);
CREATE INDEX idx_categorization_rules_value ON categorization_rules(rule_value);

-- Enable Row Level Security
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jessica_transaction_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own Plaid items" ON plaid_items
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own accounts" ON plaid_accounts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM plaid_items WHERE plaid_items.id = plaid_accounts.plaid_item_id 
        AND plaid_items.user_id = auth.uid()
    ));

CREATE POLICY "Users can only see their own transactions" ON transactions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own categorization rules" ON categorization_rules
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own sync logs" ON transaction_sync_log
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own Jessica context" ON jessica_transaction_context
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own summaries" ON transaction_summaries
    FOR ALL USING (user_id = auth.uid());

-- Function to automatically update transaction summaries
CREATE OR REPLACE FUNCTION update_transaction_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert monthly summary
    INSERT INTO transaction_summaries (
        user_id,
        month,
        total_income,
        total_expenses,
        business_income,
        business_expenses,
        personal_income,
        personal_expenses
    )
    SELECT 
        NEW.user_id,
        date_trunc('month', NEW.date)::date,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END),
        SUM(CASE WHEN amount > 0 AND is_business THEN amount ELSE 0 END),
        SUM(CASE WHEN amount < 0 AND is_business THEN ABS(amount) ELSE 0 END),
        SUM(CASE WHEN amount > 0 AND NOT is_business THEN amount ELSE 0 END),
        SUM(CASE WHEN amount < 0 AND NOT is_business THEN ABS(amount) ELSE 0 END)
    FROM transactions
    WHERE user_id = NEW.user_id 
    AND date_trunc('month', date) = date_trunc('month', NEW.date)
    AND NOT pending
    ON CONFLICT (user_id, month)
    DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        business_income = EXCLUDED.business_income,
        business_expenses = EXCLUDED.business_expenses,
        personal_income = EXCLUDED.personal_income,
        personal_expenses = EXCLUDED.personal_expenses,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for summary updates
CREATE TRIGGER update_transaction_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transaction_summary();

-- Function to apply categorization rules
CREATE OR REPLACE FUNCTION apply_categorization_rules()
RETURNS TRIGGER AS $$
DECLARE
    rule RECORD;
BEGIN
    -- Only apply rules if this is a new transaction or key fields changed
    IF TG_OP = 'INSERT' OR 
       OLD.merchant_name != NEW.merchant_name OR 
       OLD.name != NEW.name THEN
        
        -- Apply rules in priority order
        FOR rule IN 
            SELECT * FROM categorization_rules 
            WHERE user_id = NEW.user_id 
            AND is_active = true
            ORDER BY priority DESC, created_at ASC
        LOOP
            -- Check if rule matches
            IF (rule.rule_type = 'merchant' AND NEW.merchant_name ILIKE '%' || rule.rule_value || '%') OR
               (rule.rule_type = 'category' AND NEW.primary_category = rule.rule_value) OR
               (rule.rule_type = 'keyword' AND (NEW.name ILIKE '%' || rule.rule_value || '%' OR NEW.merchant_name ILIKE '%' || rule.rule_value || '%')) OR
               (rule.rule_type = 'amount' AND NEW.amount::text = rule.rule_value) THEN
                
                -- Apply rule
                NEW.is_business = rule.is_business;
                IF rule.business_category IS NOT NULL THEN
                    NEW.business_category = rule.business_category;
                END IF;
                IF rule.tax_category IS NOT NULL THEN
                    NEW.tax_category = rule.tax_category;
                END IF;
                IF rule.tags IS NOT NULL THEN
                    NEW.tags = array_cat(NEW.tags, rule.tags);
                END IF;
                
                -- Exit after first matching rule
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-categorization
CREATE TRIGGER apply_categorization_rules_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION apply_categorization_rules();