// 测试数据库连接
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 设置环境变量
process.env.DB_PROVIDER = 'sqlite';
process.env.SQLITE_PATH = 'sqlite.db';

try {
  console.log('测试数据库连接...');
  const dbPath = path.join(__dirname, 'sqlite.db');
  console.log(`数据库路径: ${dbPath}`);
  console.log(`数据库文件存在: ${fs.existsSync(dbPath)}`);
  
  if (fs.existsSync(dbPath)) {
    console.log(`数据库文件大小: ${fs.statSync(dbPath).size} 字节`);
  }
  
  // 尝试连接数据库
  const db = new Database(dbPath, { verbose: console.log });
  
  // 检查表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('数据库表:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // 尝试创建一个测试用户
  try {
    const uuid = require('crypto').randomUUID();
    const email = `test-${Date.now()}@example.com`;
    const stmt = db.prepare('INSERT INTO User (id, email) VALUES (?, ?)');
    const info = stmt.run(uuid, email);
    console.log(`插入测试用户结果: ${JSON.stringify(info)}`);
    
    // 查询刚插入的用户
    const user = db.prepare('SELECT * FROM User WHERE id = ?').get(uuid);
    console.log(`查询用户结果: ${JSON.stringify(user)}`);
  } catch (err) {
    console.error('创建测试用户失败:', err.message);
  }
  
  db.close();
  console.log('数据库连接测试完成');
} catch (err) {
  console.error('数据库连接测试失败:', err);
} 