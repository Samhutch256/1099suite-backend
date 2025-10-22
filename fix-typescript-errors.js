#!/usr/bin/env node

// Fix TypeScript Errors Script
// This script helps resolve TypeScript module resolution issues

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Fixing TypeScript Errors...\n');

try {
  // 1. Clear node_modules and reinstall
  console.log('1. Clearing node_modules and reinstalling dependencies...');
  if (fs.existsSync('node_modules')) {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
  }
  if (fs.existsSync('package-lock.json')) {
    execSync('rm package-lock.json', { stdio: 'inherit' });
  }
  
  // 2. Reinstall dependencies
  console.log('2. Reinstalling dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // 3. Clear TypeScript cache
  console.log('3. Clearing TypeScript cache...');
  if (fs.existsSync('.expo')) {
    execSync('rm -rf .expo', { stdio: 'inherit' });
  }
  
  // 4. Clear Metro cache
  console.log('4. Clearing Metro cache...');
  execSync('npx expo start --clear', { stdio: 'inherit', timeout: 10000 });
  
  console.log('\n✅ TypeScript errors should be resolved!');
  console.log('\n📋 Next Steps:');
  console.log('1. Restart your TypeScript language server in VS Code');
  console.log('2. Reload the VS Code window (Cmd+Shift+P -> "Developer: Reload Window")');
  console.log('3. Check if the TypeScript errors are gone');
  
} catch (error) {
  console.error('❌ Error during fix:', error.message);
  console.log('\n💡 Manual steps to try:');
  console.log('1. In VS Code: Cmd+Shift+P -> "TypeScript: Restart TS Server"');
  console.log('2. In VS Code: Cmd+Shift+P -> "Developer: Reload Window"');
  console.log('3. Run: npm install');
  console.log('4. Run: npx expo install --fix');
}
