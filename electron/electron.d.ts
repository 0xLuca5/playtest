// Electron API 类型定义

export interface AppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export interface ElectronAPI {
  /**
   * 获取应用程序信息
   */
  getAppInfo: () => Promise<AppInfo>;
  
  /**
   * 退出应用程序
   */
  quitApp: () => void;
  
  /**
   * 当前运行平台
   */
  platform: string;
  
  /**
   * 是否在 Electron 环境中运行
   */
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
