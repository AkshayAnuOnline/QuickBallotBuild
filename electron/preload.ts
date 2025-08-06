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
  readOpenMojiData: async () => {
    try {
      const result = await ipcRenderer.invoke('read-openmoji-data');
      if (result.success) {
        return result.data || [];
      } else {
        console.error('Error reading openmoji data:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error reading openmoji data:', error);
      return [];
    }
  },
  readOpenMojiImage: async (hexcode: string) => {
    try {
      const result = await ipcRenderer.invoke('read-openmoji-image', hexcode);
      return result;
    } catch (error) {
      console.error('Error reading openmoji image:', error);
      return { success: false, error: error.message };
    }
  },
  platform: process.platform
}); 