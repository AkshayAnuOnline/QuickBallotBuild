import path from 'path';
import fs from 'fs';

// Test actual paths in the release build
const appPath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac/QuickBallot.app/Contents/Resources/app.asar';
const resourcesPath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac/QuickBallot.app/Contents/Resources';
const assetName = 'Cast Vote Sound.mp3';

console.log('Testing actual paths in release build for:', assetName);
console.log('appPath:', appPath);
console.log('resourcesPath:', resourcesPath);

// Check if the file exists in the actual locations
let assetPath;

// Path 1: In the ASAR root (should not exist)
assetPath = path.join(appPath, assetName);
console.log('\nPath 1 (ASAR root):', assetPath);
// Note: fs.existsSync doesn't work with ASAR files, but we can check if the ASAR file exists
console.log('ASAR exists:', fs.existsSync(appPath));

// Path 2: In the ASAR assets directory (should not exist)
assetPath = path.join(appPath, 'assets', assetName);
console.log('\nPath 2 (ASAR assets):', assetPath);

// Path 3: In the ASAR dist/assets directory (this is where Vite copies it)
assetPath = path.join(appPath, 'dist', 'assets', assetName);
console.log('\nPath 3 (ASAR dist/assets):', assetPath);

// Path 4: In the unpacked dist-electron/assets directory
assetPath = path.join(resourcesPath, 'dist-electron', 'assets', assetName);
console.log('\nPath 4 (unpacked dist-electron/assets):', assetPath);
console.log('Exists:', fs.existsSync(assetPath));

// Check if the file exists in the dist directory (source)
const distPath = path.join('/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized', 'dist', 'assets', assetName);
console.log('\nSource dist/assets path:', distPath);
console.log('Exists:', fs.existsSync(distPath));

// From our asar list command, we know the file is at /dist/assets/Cast Vote Sound.mp3 in the archive
console.log('\nFrom asar list, file is at: /dist/assets/Cast Vote Sound.mp3 in the archive');
