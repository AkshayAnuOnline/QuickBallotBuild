const fs = require('fs');
const path = require('path');

// Test if openmoji.json exists and can be parsed
const openMojiPath = path.join(__dirname, 'dist/openmoji.json');
console.log('Looking for openmoji.json at:', openMojiPath);

if (fs.existsSync(openMojiPath)) {
  console.log('File exists');
  try {
    const data = JSON.parse(fs.readFileSync(openMojiPath, 'utf8'));
    console.log('File parsed successfully');
    console.log('Number of emojis:', data.length);
    
    // Show first few emojis
    console.log('First 5 emojis:');
    data.slice(0, 5).forEach(emoji => {
      console.log(`  ${emoji.hexcode}: ${emoji.annotation} (group: ${emoji.group})`);
    });
    
    // Count non-component emojis
    const nonComponentEmojis = data.filter(e => e.group !== 'Component');
    console.log('Non-component emojis:', nonComponentEmojis.length);
  } catch (error) {
    console.error('Error parsing file:', error.message);
  }
} else {
  console.log('File does not exist');
}

// Test if a few emoji images exist
const testHexcodes = ['E000', 'E001', 'E002'];
testHexcodes.forEach(hexcode => {
  const imagePath = path.join(__dirname, 'dist/openmoji', `${hexcode.toUpperCase()}.png`);
  console.log(`Image ${hexcode}:`, fs.existsSync(imagePath) ? 'exists' : 'missing');
});
