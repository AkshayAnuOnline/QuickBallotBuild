export interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, func: (...args: any[]) => void): void;
  once(channel: string, func: (...args: any[]) => void): void;
  removeListener(channel: string, func: (...args: any[]) => void): void;
  platform: string;
  getVersion(): Promise<string>;
  readOpenMojiData(): Promise<any[]>;
  readOpenMojiImage(hexcode: string): Promise<{ success: boolean; data?: string; error?: string }>;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': any;
    }
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 