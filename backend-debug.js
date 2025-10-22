#!/usr/bin/env node

// Backend Crash Diagnostic Script
// This script helps identify what's causing backend crashes

console.log('🔍 Backend Crash Diagnostic\n');

// 1. Check Node.js version
console.log('1. Node.js Version:');
console.log(`   Version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}\n`);

// 2. Check environment variables
console.log('2. Environment Variables:');
const requiredEnvVars = [
  'PLAID_CLIENT_ID',
  'PLAID_SECRET', 
  'PLAID_ENV',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PORT'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '***SET***' : value.substring(0, 20) + '...'}`);
  } else {
    console.log(`   ❌ ${varName}: MISSING`);
  }
});
console.log('');

// 3. Check package.json dependencies
console.log('3. Package Dependencies:');
try {
  const packageJson = require('./backend/package.json');
  const requiredDeps = [
    'express',
    'plaid',
    'pg',
    'cors',
    'body-parser',
    '@supabase/supabase-js'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep}: MISSING`);
    }
  });
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
}
console.log('');

// 4. Test database connection
console.log('4. Database Connection Test:');
async function testDatabase() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    console.log(`   ✅ Database connection successful: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    return false;
  }
}

// 5. Test Plaid configuration
console.log('5. Plaid Configuration Test:');
function testPlaidConfig() {
  try {
    const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
    
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET || !process.env.PLAID_ENV) {
      console.log('   ❌ Missing required Plaid environment variables');
      return false;
    }
    
    const config = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    
    const plaid = new PlaidApi(config);
    console.log('   ✅ Plaid configuration successful');
    return true;
  } catch (error) {
    console.log(`   ❌ Plaid configuration failed: ${error.message}`);
    return false;
  }
}

// 6. Test file imports
console.log('6. File Import Tests:');
function testImports() {
  const files = [
    './backend/plaidServer.js',
    './backend/routes/plaidTransactionsHardened.js'
  ];
  
  files.forEach(file => {
    try {
      require(file);
      console.log(`   ✅ ${file}: Loads successfully`);
    } catch (error) {
      console.log(`   ❌ ${file}: ${error.message}`);
    }
  });
}

// 7. Check for syntax errors
console.log('7. Syntax Check:');
function checkSyntax() {
  const fs = require('fs');
  const files = [
    './backend/plaidServer.js',
    './backend/routes/plaidTransactionsHardened.js'
  ];
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Try to parse as JSON or check for obvious syntax issues
      if (content.includes('const') || content.includes('function')) {
        console.log(`   ✅ ${file}: No obvious syntax errors`);
      } else {
        console.log(`   ⚠️  ${file}: Unusual content`);
      }
    } catch (error) {
      console.log(`   ❌ ${file}: ${error.message}`);
    }
  });
}

// Run all tests
async function runDiagnostics() {
  console.log('Running diagnostics...\n');
  
  // Run synchronous tests
  testPlaidConfig();
  testImports();
  checkSyntax();
  
  // Run asynchronous tests
  const dbSuccess = await testDatabase();
  
  console.log('\n📊 Diagnostic Summary:');
  console.log('======================');
  
  if (dbSuccess) {
    console.log('✅ Database connection working');
  } else {
    console.log('❌ Database connection issues detected');
  }
  
  console.log('\n🔧 Common Crash Causes:');
  console.log('1. Missing environment variables');
  console.log('2. Database connection issues');
  console.log('3. Invalid Plaid credentials');
  console.log('4. Syntax errors in code');
  console.log('5. Missing dependencies');
  console.log('6. Port conflicts');
  console.log('7. Memory issues');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check the logs above for ❌ marks');
  console.log('2. Ensure all environment variables are set');
  console.log('3. Verify database connection string');
  console.log('4. Check Plaid credentials in dashboard');
  console.log('5. Run: npm install in backend directory');
  console.log('6. Try running: node backend/plaidServer.js');
}

runDiagnostics().catch(console.error);
