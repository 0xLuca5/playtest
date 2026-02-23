// PostgreSQL 数据库迁移脚本 (JavaScript 版本)
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  console.log('🔗 Connecting to PostgreSQL:', process.env.POSTGRES_URL.replace(/:[^:]*@/, ':****@'));

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  try {
    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log('✅ Migrations completed in', end - start, 'ms');
    
    // 插入示例数据
    console.log('📊 Inserting sample data...');
    await insertSampleData(db);
    
    await connection.end();
    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await connection.end();
    throw error;
  }
};

const insertSampleData = async (db) => {
  try {
    // 插入示例项目数据
    await db.execute(`
      INSERT INTO "project" (id, name, description, key, status, color, avatar, settings, "createdAt", "updatedAt", "createdBy", "updatedBy")
      VALUES
        ('default-project', 'ICRM UK', '默认项目', 'DEFAULT', 'active', '#3B82F6', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('demo-project', 'ICRM LU', '演示项目', 'DEMO', 'active', '#10B981', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('test-project', 'EPAYMENT', '测试项目', 'TEST', 'active', '#F59E0B', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('beta-project', 'TOES', 'Beta版本项目', 'BETA', 'active', '#EF4444', NULL, '{}', NOW(), NOW(), 'system', 'system')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Sample projects inserted');

    // 插入示例用户（如果需要）
    await db.execute(`
      INSERT INTO "User" (id, email, password)
      VALUES
        ('system-user', 'system@example.com', NULL)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Sample data insertion completed');
  } catch (error) {
    console.log('⚠️ Sample data insertion failed (this is usually OK):', error.message);
  }
};

// 只在直接运行时执行
if (require.main === module) {
  runMigrate().catch((err) => {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigrate };
