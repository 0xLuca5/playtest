# Electron 打包指南

本指南介绍如何将 Next.js 应用打包成 Windows 桌面应用程序。

---

## 📂 目录结构说明

```
electron/
├── main.js              # Electron 主进程（核心入口）
├── preload.js           # 预加载脚本（安全桥接）
├── electron.d.ts        # TypeScript 类型定义
├── scripts/             # 构建脚本
│   ├── electron-build.js        # 主构建流程
│   ├── copy-static-files.js     # 复制静态资源
│   └── fix-standalone-deps.js   # 修复依赖
└── GUIDE.md            # 本指南文档
```

---

## 📄 文件说明

### 1. `main.js` - Electron 主进程 ⭐

**作用：** 应用的核心控制中心

**主要功能：**
- ✅ 启动 Next.js 服务器（生产模式）
- ✅ 创建应用窗口（BrowserWindow）
- ✅ 管理应用生命周期（启动、关闭）
- ✅ 处理进程间通信（IPC）
- ✅ 记录调试日志

**关键代码：**
```javascript
// 启动 Next.js 服务器
async function startNextServer() { ... }

// 创建应用窗口
function createWindow() { ... }

// 应用启动
app.whenReady().then(async () => {
  await startNextServer();  // 先启动后端
  createWindow();           // 再创建窗口
});
```

**日志位置：**
```
C:\Users\<用户名>\AppData\Roaming\app\electron-debug.log
```

---

### 2. `preload.js` - 预加载脚本 🔧

**作用：** 在渲染进程加载前运行，安全地暴露 Node.js API

**主要功能：**
- ✅ 建立主进程和渲染进程之间的安全桥梁
- ✅ 通过 `contextBridge` 暴露特定 API
- ✅ 避免直接暴露 Node.js 全局对象

**使用场景：**
```javascript
// 主进程 (main.js)
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  nodeIntegration: false,  // 安全性
  contextIsolation: true   // 隔离上下文
}

// 预加载脚本 (preload.js)
contextBridge.exposeInMainWorld('electron', {
  // 暴露安全的 API 给前端
});
```

---

### 3. `electron.d.ts` - TypeScript 类型 📝

**作用：** 提供 Electron API 的 TypeScript 类型定义

**功能：**
- ✅ 改善开发体验（智能提示）
- ✅ 类型检查和错误提示
- ✅ IDE 自动补全

---

### 4. `scripts/electron-build.js` - 构建流程 🚀

**作用：** 主构建脚本，协调整个打包流程

**执行步骤：**
```
1. 为 Node.js 重建 better-sqlite3
   └─ 确保数据库驱动兼容 Node.js

2. 构建 Next.js 应用（standalone 模式）
   └─ 生成 .next/standalone 目录

3. 复制静态文件
   └─ 将 .next/static 和 public 复制到 standalone

4. 修复 standalone 依赖
   └─ 复制完整的 next、react、react-dom

5. 为 Electron 重建 better-sqlite3
   └─ 为 Electron 的 Node.js 版本重新编译
```

**命令：**
```bash
npm run electron:build
```

---

### 5. `scripts/copy-static-files.js` - 复制静态资源 📦

**作用：** 将静态文件复制到 standalone 目录

**复制内容：**
- ✅ `.next/static/` → `.next/standalone/.next/static/`
- ✅ `public/` → `.next/standalone/public/`

**为什么需要：**
Next.js standalone 模式不会自动包含静态资源，需要手动复制。

---

### 6. `scripts/fix-standalone-deps.js` - 修复依赖 🔧

**作用：** 确保 standalone 目录包含完整的 npm 依赖

**处理模块：**
- ✅ `next` (7425 个文件)
- ✅ `react` (27 个文件)
- ✅ `react-dom` (43 个文件)
- ⚠️ `better-sqlite3` (删除旧版，使用重建版)

**为什么需要：**
Next.js standalone 构建的 node_modules 可能不完整，需要从根目录复制。

---

## 🚀 打包操作指南

### 前置要求

确保已安装：
- ✅ Node.js v18+ 或 v20+
- ✅ npm 或 yarn
- ✅ Windows 操作系统

### 快速开始

#### 1️⃣ 开发模式运行

```bash
# 同时启动 Next.js 和 Electron
npm run electron:dev
```

**效果：**
- Next.js 开发服务器运行在 `localhost:3000`
- Electron 窗口自动打开并加载应用
- 支持热更新

---

#### 2️⃣ 打包未压缩版（快速测试）

```bash
# 构建并打包到 dist/win-unpacked/
npm run electron:pack
```

**生成位置：**
```
dist/win-unpacked/
└── AI Run.exe  (约 180 MB)
```

**测试：**
双击 `AI Run.exe` 即可运行

**适用场景：**
- ✅ 快速测试打包结果
- ✅ 调试打包问题
- ❌ 不适合分发（体积大，无安装程序）

---

#### 3️⃣ 打包安装程序（完整版）

```bash
# 构建并生成安装程序
npm run electron:dist
```

**生成位置：**
```
dist/
└── AI Run-0.1.0-x64.exe  (安装程序)
```

**包含内容：**
- ✅ NSIS 安装向导
- ✅ 桌面快捷方式
- ✅ 开始菜单快捷方式
- ✅ 自定义安装路径
- ✅ 卸载程序

**适用场景：**
- ✅ 正式发布
- ✅ 分发给用户
- ✅ 自动安装和配置

---

## 📊 构建流程详解

### 完整构建流程

```
npm run electron:dist
    │
    ├─► npm run electron:build
    │       │
    │       ├─► 步骤 1: 重建 better-sqlite3 (Node.js)
    │       │       └─ npm rebuild better-sqlite3
    │       │
    │       ├─► 步骤 2: 构建 Next.js
    │       │       └─ next build (生成 .next/standalone)
    │       │
    │       ├─► 步骤 3: 复制静态文件
    │       │       ├─ .next/static → standalone/.next/static
    │       │       └─ public → standalone/public
    │       │
    │       ├─► 步骤 4: 修复 standalone 依赖
    │       │       ├─ 复制 next (7425 文件)
    │       │       ├─ 复制 react (27 文件)
    │       │       ├─ 复制 react-dom (43 文件)
    │       │       └─ 删除旧的 better-sqlite3
    │       │
    │       └─► 步骤 5: 重建 better-sqlite3 (Electron)
    │               └─ electron-rebuild -f -w better-sqlite3
    │
    └─► electron-builder
            ├─ 再次重建原生模块
            ├─ 打包应用文件
            ├─ 签名（如果配置）
            └─ 生成安装程序
```

---

## 🔧 配置文件

### `package.json` - NPM 脚本

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "开发模式",
    "electron:build": "构建流程",
    "electron:pack": "打包测试版",
    "electron:dist": "打包安装程序"
  }
}
```

### `electron-builder.json` - 打包配置

**关键配置：**

```json
{
  "appId": "com.epam.airun",
  "productName": "AI Run",
  "asar": false,  // 禁用压缩（重要！）
  
  "files": [
    "electron/**/*",
    ".next/standalone/**/*",
    "node_modules/better-sqlite3/**/*",
    "node_modules/bindings/**/*",
    ".next/standalone/node_modules/**/*"
  ],
  
  "win": {
    "target": "nsis",
    "icon": "public/favicon.ico"
  }
}
```

**为什么 `asar: false`？**
- ✅ 避免路径问题
- ✅ 文件可以直接访问
- ❌ 缺点：体积稍大

---

## ⚠️ 常见问题

### 1. 应用无法启动

**症状：** 双击 exe 没反应

**解决方案：**
```bash
# 查看日志
%APPDATA%\app\electron-debug.log
```

### 2. "Cannot find module 'next'" 错误

**原因：** standalone 依赖不完整

**解决方案：**
```bash
# 重新构建
npm run electron:build
```

### 3. "NODE_MODULE_VERSION" 错误

**原因：** better-sqlite3 版本不匹配

**解决方案：**
```bash
# 确保构建流程包含重建步骤
npm run electron:build
```

### 4. 端口 3000 被占用

**症状：** 应用启动但白屏

**解决方案：**
```bash
# 关闭占用端口的进程
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F
```

---

## 🎯 最佳实践

### 1. 测试流程

```bash
# 1. 先测试开发模式
npm run electron:dev

# 2. 测试打包版本
npm run electron:pack
# 运行 dist/win-unpacked/AI Run.exe

# 3. 测试安装程序
npm run electron:dist
# 安装并运行
```

### 2. 调试技巧

**在应用中打开开发者工具：**
- 按 `F12` 或 `Ctrl+Shift+I`

**查看日志：**
```bash
# Windows
%APPDATA%\app\electron-debug.log

# 或者
C:\Users\<用户名>\AppData\Roaming\app\electron-debug.log
```

### 3. 性能优化

**减少打包体积：**
- ✅ 删除不必要的依赖
- ✅ 使用 asar 压缩（如果路径问题已解决）
- ✅ 优化静态资源

**加快启动速度：**
- ✅ 优化 Next.js 构建
- ✅ 减少启动时的同步操作
- ✅ 使用懒加载

---

## 📚 技术架构

### 为什么选择这个方案？

**Electron + Next.js 的优势：**
- ✅ 使用 Web 技术开发桌面应用
- ✅ Next.js 的 SSR 和路由能力
- ✅ React 生态系统
- ✅ 跨平台支持

**standalone 模式的优势：**
- ✅ 包含所有必要的依赖
- ✅ 不需要外部 Next.js 服务器
- ✅ 自包含，易于分发

---

## 🔄 更新和维护

### 更新依赖

```bash
# 更新 Electron
npm install electron@latest --save-dev

# 更新 electron-builder
npm install electron-builder@latest --save-dev

# 更新 Next.js
npm install next@latest
```

### 修改应用信息

**名称和版本：** 编辑 `package.json`
```json
{
  "name": "app",
  "version": "0.1.0",
  "description": "AI-powered test automation platform"
}
```

**图标：** 替换 `public/favicon.ico`
- 推荐尺寸：256x256
- 格式：.ico 或 .png

**应用 ID：** 编辑 `electron-builder.json`
```json
{
  "appId": "com.epam.airun"
}
```

---

## 🆘 获取帮助

**遇到问题？**

1. 查看日志文件
2. 检查 Node.js 和 Electron 版本
3. 确保所有依赖都已安装
4. 重新运行构建流程

**有用的命令：**
```bash
# 清理构建缓存
rm -rf .next dist node_modules/.cache

# 重新安装依赖
npm install

# 完整重建
npm run electron:build
```

---

## 📝 版本记录

**当前版本：** 0.1.0

**技术栈：**
- Electron: v33.4.11
- Next.js: 15.3.4
- Node.js: v20.18.3 (内置于 Electron)

---

## ✅ 检查清单

打包前确认：

- [ ] 所有依赖已安装 (`npm install`)
- [ ] 开发模式正常运行 (`npm run electron:dev`)
- [ ] 数据库功能正常（better-sqlite3）
- [ ] 静态资源路径正确
- [ ] API 密钥已配置（如果需要）
- [ ] 应用图标已准备
- [ ] 版本号已更新

---

**祝打包顺利！** 🎉

如有问题，请查看日志文件或联系开发团队。
