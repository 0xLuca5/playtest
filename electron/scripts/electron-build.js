const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取项目根目录
const rootDir = path.join(__dirname, '..', '..');

console.log('🚀 开始 Electron 构建流程...\n');

// 步骤 1: 为 Node.js 重建 better-sqlite3
console.log('📦 步骤 1/3: 为 Node.js 重建原生模块...');
try {
  execSync('npm rebuild better-sqlite3', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('✅ Node.js 原生模块重建完成\n');
} catch (error) {
  console.log('⚠️  Node.js 重建失败，继续...\n');
}

// 步骤 2: 构建 Next.js
console.log('⚡ 步骤 2/4: 构建 Next.js 应用...');
try {
  execSync('next build', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('✅ Next.js 构建完成\n');
} catch (error) {
  console.error('❌ Next.js 构建失败');
  process.exit(1);
}

// 步骤 2.5: 复制静态文件到 standalone
console.log('📦 步骤 3/5: 复制静态文件...');
try {
  execSync('node electron/scripts/copy-static-files.js', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('✅ 静态文件复制完成\n');
} catch (error) {
  console.log('⚠️  静态文件复制失败，继续...\n');
}

// 步骤 3: 修复 standalone 依赖
console.log('🔧 步骤 4/5: 修复 standalone 依赖...');
try {
  execSync('node electron/scripts/fix-standalone-deps.js', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('✅ 依赖修复完成\n');
} catch (error) {
  console.log('⚠️  依赖修复失败，继续...\n');
}

// 步骤 5: 为 Electron 重建 better-sqlite3（在根目录）
console.log('🔧 步骤 5/5: 为 Electron 重建原生模块（根目录）...');
try {
  execSync('npx electron-rebuild -f -w better-sqlite3', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('✅ Electron 原生模块重建完成\n');
} catch (error) {
  console.log('⚠️  Electron 重建失败，继续...\n');
}

console.log('✅ 构建流程完成！现在可以打包了。\n');
