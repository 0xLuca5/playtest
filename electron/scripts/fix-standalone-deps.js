const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复 standalone 目录依赖...\n');

const rootDir = path.join(__dirname, '..', '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const standaloneNodeModules = path.join(standaloneDir, 'node_modules');
const rootNodeModules = path.join(rootDir, 'node_modules');

// 需要完整复制的关键模块
const criticalModules = ['next', 'react', 'react-dom'];

if (!fs.existsSync(standaloneDir)) {
  console.error('❌ .next/standalone 目录不存在！请先运行 next build');
  process.exit(1);
}

console.log('复制关键模块到 standalone...\n');

criticalModules.forEach(moduleName => {
  // better-sqlite3 需要特殊处理：先确保根目录的版本已重建
  if (moduleName === 'better-sqlite3') {
    console.log(`🔨 ${moduleName} 需要为 Electron 重建，跳过从根复制`);
    console.log('   (将在打包时由 electron-builder 自动重建)');
    console.log('');
    return;
  }
  
  const sourcePath = path.join(rootNodeModules, moduleName);
  const targetPath = path.join(standaloneNodeModules, moduleName);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  ${moduleName} 不存在于根 node_modules`);
    return;
  }
  
  console.log(`📦 复制 ${moduleName}...`);
  
  try {
    // 删除目标目录（如果存在）
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    
    // 复制
    if (process.platform === 'win32') {
      execSync(`xcopy "${sourcePath}" "${targetPath}" /E /I /Y /Q`, { stdio: 'inherit' });
    } else {
      execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
    }
    
    console.log(`✅ ${moduleName} 复制完成`);
  } catch (error) {
    console.error(`❌ ${moduleName} 复制失败:`, error.message);
  }
  
  console.log('');
});

// 处理 better-sqlite3：删除 standalone 中的旧版本，让它使用打包时重建的版本
console.log('🔨 处理 better-sqlite3...\n');

const standaloneSqlitePath = path.join(standaloneNodeModules, 'better-sqlite3');
if (fs.existsSync(standaloneSqlitePath)) {
  try {
    console.log('删除 standalone 中的旧 better-sqlite3...');
    fs.rmSync(standaloneSqlitePath, { recursive: true, force: true });
    console.log('✅ 已删除，将使用打包时重建的版本');
  } catch (error) {
    console.log('⚠️  删除失败:', error.message);
  }
} else {
  console.log('⚠️  standalone 中未找到 better-sqlite3');
}

console.log('\n✅ 依赖修复完成!');
