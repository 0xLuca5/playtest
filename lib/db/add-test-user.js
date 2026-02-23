const Database = require('better-sqlite3');
const { genSaltSync, hashSync } = require('bcrypt-ts');
const path = require('path');
const crypto = require('crypto');

// 生成哈希密码的函数
function generateHashedPassword(password) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);
  return hash;
}

// 数据库路径
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/sqlite.db');

console.log('🔗 连接到数据库:', dbPath);

try {
  const db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');
  
  // 测试用户信息
  const testUsers = [
    {
      id: uuidv4(),
      email: 'Lucas_Lu@epam.com',
      password: generateHashedPassword('6113535')
    },
    {
      id: uuidv4(),
      email: 'admin@epam.com', 
      password: generateHashedPassword('lzp1234!')
    }
  ];
  
  // 检查用户是否已存在
  const checkUser = db.prepare('SELECT email FROM user WHERE email = ?');
  
  // 插入用户的准备语句
  const insertUser = db.prepare('INSERT INTO user (id, email, password) VALUES (?, ?, ?)');
  
  testUsers.forEach(user => {
    const existingUser = checkUser.get(user.email);
    
    if (existingUser) {
      console.log(`⚠️  用户 ${user.email} 已存在，跳过创建`);
    } else {
      insertUser.run(user.id, user.email, user.password);
      console.log(`✅ 创建测试用户: ${user.email}`);
    }
  });
  
  db.close();
  console.log('🎉 测试用户创建完成！');
  console.log('');
  console.log('📋 测试账户信息:');
  console.log('   邮箱: test@epam.com');
  console.log('   密码: 123456');
  console.log('');
  console.log('   邮箱: admin@epam.com');
  console.log('   密码: admin123');
  
} catch (error) {
  console.error('❌ 创建测试用户失败:', error);
  process.exit(1);
}
