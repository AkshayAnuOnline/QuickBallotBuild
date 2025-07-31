import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';

// Function to get app version from package.json
const getAppVersion = () => {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '1.0.0'; // fallback version
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  getVersion: () => getAppVersion(),
  platform: process.platform
}); 