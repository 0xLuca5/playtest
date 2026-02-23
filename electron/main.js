const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextServer;
const SERVER_PORT = 3000;

// 创建日志文件
const logPath = path.join(app.getPath('userData'), 'electron-debug.log');
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

log('=== Electron Application Starting ===');
log(`App path: ${app.getAppPath()}`);
log(`User data: ${app.getPath('userData')}`);

// 启动 Next.js 服务器（仅生产模式）
async function startNextServer() {
  if (isDev) {
    log('DEV mode: skipping server start');
    return; // 开发模式下 Next.js 服务器已经在外部运行
  }

  return new Promise((resolve, reject) => {
    // asar 已禁用，所有文件在 app 目录中
    const serverPath = path.join(__dirname, '../.next/standalone/server.js');
    const serverCwd = path.join(__dirname, '../.next/standalone');
    
    log(`Starting Next.js server from: ${serverPath}`);
    log(`Working directory: ${serverCwd}`);
    log(`Server exists: ${fs.existsSync(serverPath)}`);
    log(`App path: ${app.getAppPath()}`);
    log(`__dirname: ${__dirname}`);
    
    if (!fs.existsSync(serverPath)) {
      const error = `Server file not found: ${serverPath}`;
      log(`ERROR: ${error}`);
      
      // 列出实际存在的文件
      const nextDir = path.join(__dirname, '../.next');
      if (fs.existsSync(nextDir)) {
        log(`.next directory exists`);
        const items = fs.readdirSync(nextDir);
        log(`.next contains: ${items.join(', ')}`);
      } else {
        log(`.next directory NOT found`);
      }
      
      dialog.showErrorBox('启动错误', `服务器文件不存在:\n${serverPath}\n\nApp path: ${app.getAppPath()}\n\n请查看日志: ${logPath}`);
      reject(new Error(error));
      return;
    }
    
    // 使用 Electron 内置的 Node.js
    const nodePath = process.execPath;
    log(`Using node from: ${nodePath}`);
    log(`Node exists: ${fs.existsSync(nodePath)}`);
    
    nextServer = spawn(nodePath, [serverPath], {
      cwd: serverCwd,
      env: {
        ...process.env,
        PORT: SERVER_PORT,
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1'  // 让 Electron 以 Node.js 模式运行
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    nextServer.stdout.on('data', (data) => {
      log(`Next.js stdout: ${data}`);
      if (data.toString().includes('ready') || data.toString().includes('started')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      log(`Next.js stderr: ${data}`);
    });

    nextServer.on('error', (error) => {
      log(`Next.js process error: ${error.message}`);
      dialog.showErrorBox('服务器启动失败', error.message);
      reject(error);
    });

    // 给服务器一些启动时间
    setTimeout(() => {
      log('Server start timeout (3s), assuming ready');
      resolve();
    }, 3000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    autoHideMenuBar: !isDev,
    show: false, // 不立即显示，等待ready-to-show事件
  });

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();  // 启动时最大化
    mainWindow.show();
  });

  // 开发和生产模式都加载 localhost（都运行 Next.js 服务器）
  const startUrl = `http://127.0.0.1:${SERVER_PORT}`;
  
  mainWindow.loadURL(startUrl);

  // 开发模式下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 在默认浏览器中打开外部链接
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 捕获未处理的错误
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  log(error.stack);
  dialog.showErrorBox('程序错误', `${error.message}\n\n日志位置:\n${logPath}`);
});

// 当Electron完成初始化时创建窗口
app.whenReady().then(async () => {
  log('App ready event fired');
  try {
    // 生产模式下先启动 Next.js 服务器
    log('Starting Next.js server...');
    await startNextServer();
    log('Server started successfully');
    
    // 然后创建窗口
    log('Creating window...');
    createWindow();
    log('Window created successfully');
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    log(error.stack);
    dialog.showErrorBox(
      '启动失败', 
      `应用无法启动:\n${error.message}\n\n日志位置:\n${logPath}`
    );
    app.quit();
  }

  app.on('activate', () => {
    log('Activate event fired');
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，
    // 重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

log('Main process initialized');

// 当所有窗口都关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 关闭 Next.js 服务器
    if (nextServer) {
      nextServer.kill();
    }
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// 处理IPC通信示例
ipcMain.handle('app-info', () => {
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  };
});

// 处理应用退出
ipcMain.on('quit-app', () => {
  app.quit();
});
