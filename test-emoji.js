const fs = require('fs');
const path = require('path');

// Simulate the packaged app environment
const isPackaged = true;

// Test the openmoji data handler
let openMojiPath;
if (isPackaged) {
  openMojiPath = path.join(__dirname, 'dist/openmoji.json');
} else {
  openMojiPath = path.join(__dirname, 'dist/openmoji.json');
}

console.log('Looking for openmoji.json at:', openMojiPath);
console.log('File exists:', fs.existsSync(openMojiPath));

// Test the openmoji image handler
const testHexcode = 'E000';
let imagePath;
if (isPackaged) {
  imagePath = path.join(__dirname, 'dist/openmoji', `${testHexcode.toUpperCase()}.png`);
} else {
  imagePath = path.join(__dirname, 'dist/openmoji', `${testHexcode.toUpperCase()}.png`);
}

console.log('Looking for image at:', imagePath);
console.log('Image exists:', fs.existsSync(imagePath));

// Try to read the image
if (fs.existsSync(imagePath)) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('Image read successfully, size:', imageBuffer.length, 'bytes');
    // Check if it's a PNG file (PNG signature: 89 50 4E 47 0D 0A 1A 0A)
    console.log('First 8 bytes (PNG signature):', imageBuffer.slice(0, 8));
  } catch (error) {
    console.error('Error reading image:', error.message);
  }
}
