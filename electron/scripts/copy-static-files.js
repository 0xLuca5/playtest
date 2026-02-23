const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 复制静态文件到 standalone 目录...\n');

const rootDir = path.join(__dirname, '..', '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

// 复制函数
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  源目录不存在: ${src}`);
    return false;
  }

  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  try {
    // 在 Windows 上使用 xcopy，在其他系统上使用 cp
    if (process.platform === 'win32') {
      execSync(`xcopy "${src}" "${dest}" /E /I /Y /Q`, { stdio: 'inherit' });
    } else {
      execSync(`cp -r "${src}" "${dest}"`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error(`❌ 复制失败: ${error.message}`);
    return false;
  }
}

// 复制 .next/static
console.log('1️⃣  复制 .next/static...');
if (copyDir(staticSrc, staticDest)) {
  console.log(`✅ 已复制到: ${staticDest}\n`);
} else {
  console.log('❌ .next/static 复制失败\n');
}

// 复制 public（如果目标不存在）
console.log('2️⃣  检查 public 目录...');
if (!fs.existsSync(publicDest)) {
  console.log('   复制 public...');
  if (copyDir(publicSrc, publicDest)) {
    console.log(`✅ 已复制到: ${publicDest}\n`);
  } else {
    console.log('❌ public 复制失败\n');
  }
} else {
  console.log('✅ public 目录已存在\n');
}

console.log('✅ 静态文件复制完成！');
