const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build the React app
console.log('Building React app...');
execSync('npm run build', { stdio: 'inherit' });

// Compile Electron TypeScript files
console.log('Compiling Electron files...');
execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });

console.log('Build completed successfully!'); 