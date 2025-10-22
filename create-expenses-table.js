const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createTableSQL = `
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plaid_transaction_id text unique,
  account_id text,
  date date not null,
  name text,
  merchant_name text,
  amount numeric(12,2) not null,
  currency text default 'USD',
  category text[],
  account_name text,
  pending boolean default false,
  classification text check (classification in ('business','personal','unreviewed')) default 'unreviewed',
  client_id uuid null,
  notes text,
  logo_url text,
  recurring boolean default false,
  original_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
`;

async function createExpensesTable() {
  try {
    console.log('Creating expenses table...');
    
    // Execute the SQL using Supabase's rpc function
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('Error creating expenses table:', error);
      return;
    }
    
    console.log('Expenses table created successfully!');
    
    // Verify the table exists
    const { data: testData, error: testError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Error testing table:', testError);
    } else {
      console.log('Table verification successful!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createExpensesTable();
