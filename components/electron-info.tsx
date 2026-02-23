'use client';

import { useEffect, useState } from 'react';

interface AppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export function ElectronInfo() {
  const [isElectron, setIsElectron] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    // 检测是否在 Electron 环境中
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      
      // 获取应用信息
      window.electronAPI.getAppInfo().then((info) => {
        setAppInfo(info);
      });
    }
  }, []);

  if (!isElectron) {
    return null; // 在浏览器中不显示
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg shadow-lg text-xs">
      <div className="font-bold mb-2">🖥️ Electron 应用信息</div>
      {appInfo && (
        <div className="space-y-1">
          <div>应用: {appInfo.appName} v{appInfo.appVersion}</div>
          <div>Electron: {appInfo.electronVersion}</div>
          <div>Node: {appInfo.nodeVersion}</div>
          <div>Chrome: {appInfo.chromeVersion}</div>
          <div>平台: {window.electronAPI?.platform}</div>
        </div>
      )}
    </div>
  );
}
