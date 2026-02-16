export interface ElectronAPI {
  selectStockPlan: () => Promise<any>;
  selectOutputDir: () => Promise<string | null>;
  getSettings: () => Promise<{ apiKey: string; outputDir: string }>;
  saveSettings: (settings: { apiKey: string; outputDir: string }) => Promise<{ success: boolean }>;
  runSearch: (stockPlan: any) => Promise<any>;
  runDownload: (stockPlan: any) => Promise<any>;
  openOutputFolder: () => Promise<void>;
  onSearchProgress: (callback: (data: any) => void) => void;
  onDownloadProgress: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
