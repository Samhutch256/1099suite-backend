#!/usr/bin/env node

/**
 * Utility script to clear authentication data when refresh token errors occur
 * Run this script if you're experiencing "Invalid Refresh Token" errors
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing authentication data...');

// Clear AsyncStorage data (this will be done by the app on next launch)
console.log('📱 AsyncStorage will be cleared on next app launch');

// Clear any local auth files if they exist
const authFiles = [
  '.auth',
  'auth.json',
  'session.json',
  'tokens.json'
];

authFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted ${file}`);
    } catch (error) {
      console.warn(`⚠️ Could not delete ${file}:`, error.message);
    }
  }
});

console.log('✅ Authentication data cleared!');
console.log('📱 Please restart your app and sign in again.');
