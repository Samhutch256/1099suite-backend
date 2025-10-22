import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create assets directory if it doesn't exist
const assetsDir = join(__dirname, 'assets');
try {
  mkdirSync(assetsDir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Generate a simple SVG icon for the app
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="200" fill="#1a1f2e"/>
  <rect x="200" y="200" width="624" height="624" rx="100" fill="#f97316"/>
  <text x="512" y="580" font-family="Arial, sans-serif" font-size="200" font-weight="bold" text-anchor="middle" fill="white">1099</text>
  <text x="512" y="780" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">Suite</text>
</svg>
`;

// Generate a simple SVG splash screen
const splashSvg = `
<svg width="1242" height="2436" viewBox="0 0 1242 2436" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2436" fill="#1a1f2e"/>
  <rect x="200" y="800" width="842" height="842" rx="150" fill="#f97316"/>
  <text x="621" y="1200" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">1099</text>
  <text x="621" y="1350" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="white">Suite</text>
  <text x="621" y="1500" font-family="Arial, sans-serif" font-size="40" text-anchor="middle" fill="#cbd5e1">What Gets Monitored Gets Managed</text>
</svg>
`;

// Write the SVG files
writeFileSync(join(assetsDir, 'icon.svg'), iconSvg);
writeFileSync(join(assetsDir, 'splash.svg'), splashSvg);

console.log('✅ Generated SVG assets in assets/ directory');
console.log('📝 Note: You will need to convert these SVG files to PNG format for Expo');
console.log('💡 You can use online tools or design software to convert SVG to PNG');
console.log('📱 Required sizes:');
console.log('   - icon.png: 1024x1024');
console.log('   - splash.png: 1242x2436 (or use a square format like 1024x1024)');