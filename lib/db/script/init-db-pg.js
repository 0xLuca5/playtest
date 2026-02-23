// PostgreSQL 数据库初始化脚本
const { Client } = require('pg');

const initPostgresDB = async () => {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // 启用必要的扩展
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    console.log('✅ Extensions enabled');

    // 检查是否已经初始化
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Database already initialized');
      return;
    }

    console.log('🔄 Initializing PostgreSQL database...');

    // 注意：实际的表结构应该通过 Drizzle 迁移来创建
    // 这里只是示例，建议使用 npm run db:migrate
    
    console.log('⚠️  Warning: This script is for reference only.');
    console.log('⚠️  Please use Drizzle migrations instead:');
    console.log('   npm run db:migrate');
    console.log('');
    console.log('🔧 The proper way to initialize PostgreSQL:');
    console.log('   1. Ensure POSTGRES_URL is set');
    console.log('   2. Run: npm run db:migrate');
    console.log('   3. This will create all tables with proper types');

  } catch (error) {
    console.error('❌ PostgreSQL initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 只在直接运行时执行
if (require.main === module) {
  initPostgresDB().catch(console.error);
}

module.exports = { initPostgresDB };
