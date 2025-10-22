const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check if database exists
const dbPath = path.join(__dirname, 'trackingApp.db');
const fs = require('fs');

console.log('=== TRANSACTION DIAGNOSTIC ===');
console.log(`Database exists: ${fs.existsSync(dbPath)}`);

if (fs.existsSync(dbPath)) {
  const db = new sqlite3.Database(dbPath);
  
  // Check tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.log('Error reading tables:', err.message);
      return;
    }
    console.log('Tables found:', tables.map(t => t.name));
    
    // Check plaid_accounts
    db.all("SELECT * FROM plaid_accounts LIMIT 5", (err, accounts) => {
      if (err) {
        console.log('Error reading plaid_accounts:', err.message);
      } else {
        console.log('Plaid accounts found:', accounts.length);
        if (accounts.length > 0) {
          console.log('Sample account:', accounts[0]);
        }
      }
      
      // Check plaid_transactions
      db.all("SELECT * FROM plaid_transactions LIMIT 5", (err, transactions) => {
        if (err) {
          console.log('Error reading plaid_transactions:', err.message);
        } else {
          console.log('Plaid transactions found:', transactions.length);
          if (transactions.length > 0) {
            console.log('Sample transaction:', transactions[0]);
          }
        }
        
        db.close();
      });
    });
  });
} else {
  console.log('Database file does not exist - will be created when app starts');
} 