import path from 'path';
import fs from 'fs';

// Simulate the get-asset-path handler logic for packaged app
const isDev = false; // Assume we're in production
const __dirname = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac/QuickBallot.app/Contents/Resources/app.asar.unpacked/dist-electron';

const assetName = 'Cast Vote Sound.mp3';
const assetPath = isDev 
  ? path.join(__dirname, '../assets', assetName)
  : path.join(__dirname, 'assets', assetName);

console.log('assetPath:', assetPath);
console.log('File exists:', fs.existsSync(assetPath));

if (fs.existsSync(assetPath)) {
  console.log('file:// URL:', `file://${assetPath}`);
}

// Also check the alternative path
const alternativePath = path.join(__dirname, '../assets', assetName);
console.log('alternativePath:', alternativePath);
console.log('Alternative file exists:', fs.existsSync(alternativePath));

if (fs.existsSync(alternativePath)) {
  console.log('Alternative file:// URL:', `file://${alternativePath}`);
}
