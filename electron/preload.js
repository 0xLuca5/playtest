const { contextBridge, ipcRenderer } = require('electron');

// 通过contextBridge暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('app-info'),
  
  // 退出应用
  quitApp: () => ipcRenderer.send('quit-app'),
  
  // 可以根据需要添加更多API
  platform: process.platform,
  isElectron: true,
});

// 监听DOM加载完成
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});
