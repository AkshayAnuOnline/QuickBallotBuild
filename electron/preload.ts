import { contextBridge, ipcRenderer } from 'electron';





// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  getVersion: async () => {
    try {
      const version = await ipcRenderer.invoke('get-app-version');
      return version;
    } catch (error) {
      console.error('Error getting app version:', error);
      return '1.0.0'; // fallback version
    }
  },
  getAssetPath: async (assetName: string) => {
    try {
      const result = await ipcRenderer.invoke('get-asset-path', assetName);
      return result;
    } catch (error) {
      console.error('Error getting asset path:', error);
      return null;
    }
  },
  platform: process.platform
}); 