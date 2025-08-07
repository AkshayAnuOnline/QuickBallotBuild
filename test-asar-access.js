import fs from 'fs';

// Test accessing a file in the ASAR archive
const filePath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac/QuickBallot.app/Contents/Resources/app.asar/dist/assets/Cast Vote Sound.mp3';

console.log('Testing access to file in ASAR archive:', filePath);

try {
  // Try to read file stats (this should work for ASAR files)
  const stats = fs.statSync(filePath);
  console.log('File stats:', stats);
  console.log('File exists: true');
} catch (error) {
  console.log('Error accessing file:', error.message);
  console.log('File exists: false');
}

// Try to read the file
try {
  const data = fs.readFileSync(filePath);
  console.log('File read successfully, size:', data.length, 'bytes');
} catch (error) {
  console.log('Error reading file:', error.message);
}
