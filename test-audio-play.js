// Test playing audio from ASAR archive
const filePath = '/Users/akshayanu/Documents/Files/Startups/QuickBallot/Code/QB Optimized/release/mac/QuickBallot.app/Contents/Resources/app.asar/dist/assets/Cast Vote Sound.mp3';
const fileUrl = `file://${filePath}`;

console.log('Testing audio playback from ASAR archive');
console.log('File path:', filePath);
console.log('File URL:', fileUrl);

// Try to create an Audio object (this would normally be done in the renderer process)
console.log('In a real Electron app, this would be done in the renderer process:');
console.log('const audio = new Audio("' + fileUrl + '");');
console.log('audio.play().catch(error => console.log("Audio play error:", error));');
