const fs = require('fs');
const path = require('path');

// Simulate the production environment paths
const appPath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac-arm64/QuickBallot.app/Contents/Resources/app.asar';
const resourcesPath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac-arm64/QuickBallot.app/Contents/Resources';
const assetName = 'Cast Vote Sound.mp3';

console.log('Testing asset path resolution for:', assetName);
console.log('App path:', appPath);
console.log('Resources path:', resourcesPath);

// Test all the paths that the get-asset-path handler checks
const pathsToCheck = [
  path.join(appPath, assetName),
  path.join(appPath, 'assets', assetName),
  path.join(appPath, 'dist', 'assets', assetName),
  path.join(resourcesPath, 'dist-electron', 'assets', assetName)
];

pathsToCheck.forEach((assetPath, index) => {
  console.log(`\nChecking path ${index + 1}:`, assetPath);
  try {
    const exists = fs.existsSync(assetPath);
    console.log('File exists:', exists);
    if (exists) {
      console.log('SUCCESS: File found at this location');
      const stats = fs.statSync(assetPath);
      console.log('File size:', stats.size, 'bytes');
    }
  } catch (error) {
    console.log('Error checking path:', error.message);
  }
});

console.log('\nTest completed.');
