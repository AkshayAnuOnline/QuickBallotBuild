declare global {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': any;
    }
  }

  interface Window {
    electronAPI: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      on(channel: string, func: (...args: any[]) => void): void;
      once(channel: string, func: (...args: any[]) => void): void;
      removeListener(channel: string, func: (...args: any[]) => void): void;
      platform: string;
    };
  }
}

export {}; 