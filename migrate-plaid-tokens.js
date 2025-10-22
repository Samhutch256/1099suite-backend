// Migration script to move Plaid tokens from plaid_tokens to plaid_items table
// Run this after creating the plaid_items table

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function migratePlaidTokens() {
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  try {
    console.log('Starting Plaid tokens migration...');

    // Check if old table exists
    const { data: oldTokens, error: oldError } = await supabase
      .from('plaid_tokens')
      .select('*');

    if (oldError) {
      console.log('No plaid_tokens table found or error:', oldError.message);
      return;
    }

    if (!oldTokens || oldTokens.length === 0) {
      console.log('No tokens to migrate');
      return;
    }

    console.log(`Found ${oldTokens.length} tokens to migrate`);

    // Migrate each token to the new table
    for (const token of oldTokens) {
      try {
        const { error: insertError } = await supabase
          .from('plaid_items')
          .upsert({
            user_id: token.user_id,
            access_token: token.access_token,
            item_id: token.item_id,
            institution_name: 'Migrated Institution', // Will be updated when user next syncs
            created_at: token.created_at || new Date().toISOString()
          }, {
            onConflict: 'user_id,item_id'
          });

        if (insertError) {
          console.error(`Error migrating token for user ${token.user_id}:`, insertError);
        } else {
          console.log(`Successfully migrated token for user ${token.user_id}`);
        }
      } catch (err) {
        console.error(`Error processing token for user ${token.user_id}:`, err);
      }
    }

    console.log('Migration completed!');
    console.log('You can now safely drop the plaid_tokens table if desired.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  migratePlaidTokens();
}

module.exports = { migratePlaidTokens };
