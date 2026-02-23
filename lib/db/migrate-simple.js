// 简化的 PostgreSQL 迁移脚本 - 不依赖 Drizzle ORM
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const runSimpleMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  console.log('🔗 Connecting to PostgreSQL:', process.env.POSTGRES_URL.replace(/:[^:]*@/, ':****@'));

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // 启用必要的扩展
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ Extensions enabled');

    // 执行基本的表创建 SQL
    console.log('⏳ Creating tables...');
    
    // 创建 User 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar(64) NOT NULL,
        "password" varchar(64)
      );
    `);

    // 创建 Chat 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Chat" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "createdAt" timestamp NOT NULL,
        "messages" json NOT NULL,
        "userId" uuid NOT NULL
      );
    `);

    // 创建外键约束
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" 
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 创建其他必要的表
    await client.query(`
      CREATE TABLE IF NOT EXISTS "chat" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "createdAt" timestamp NOT NULL,
        "title" text NOT NULL,
        "userId" uuid NOT NULL,
        "visibility" varchar DEFAULT 'private' NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "message" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chatId" uuid NOT NULL,
        "role" text NOT NULL,
        "parts" json NOT NULL,
        "attachments" json NOT NULL,
        "createdAt" timestamp NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "vote" (
        "chatId" uuid NOT NULL,
        "messageId" uuid NOT NULL,
        "isUpvoted" boolean NOT NULL,
        PRIMARY KEY ("chatId", "messageId")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "document" (
        "id" uuid NOT NULL,
        "createdAt" timestamp NOT NULL,
        "title" text NOT NULL,
        "content" text,
        "kind" varchar DEFAULT 'text' NOT NULL,
        "userId" uuid NOT NULL,
        "projectId" uuid,
        PRIMARY KEY ("id", "createdAt")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "suggestion" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "documentId" uuid NOT NULL,
        "documentCreatedAt" timestamp NOT NULL,
        "originalText" text NOT NULL,
        "suggestedText" text NOT NULL,
        "description" text,
        "isResolved" boolean DEFAULT false NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "project" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "key" varchar(50) NOT NULL UNIQUE,
        "status" varchar DEFAULT 'active' NOT NULL,
        "color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
        "avatar" text,
        "settings" json DEFAULT '{}' NOT NULL,
        "createdAt" timestamp NOT NULL,
        "updatedAt" timestamp NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid NOT NULL
      );
    `);

    console.log('✅ Tables created successfully');

    // 插入示例数据
    console.log('📊 Inserting sample data...');
    
    await client.query(`
      INSERT INTO "project" (id, name, description, key, status, color, avatar, settings, "createdAt", "updatedAt", "createdBy", "updatedBy")
      VALUES
        ('default-project', 'ICRM UK', '默认项目', 'DEFAULT', 'active', '#3B82F6', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('demo-project', 'ICRM LU', '演示项目', 'DEMO', 'active', '#10B981', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('test-project', 'EPAYMENT', '测试项目', 'TEST', 'active', '#F59E0B', NULL, '{}', NOW(), NOW(), 'system', 'system'),
        ('beta-project', 'TOES', 'Beta版本项目', 'BETA', 'active', '#EF4444', NULL, '{}', NOW(), NOW(), 'system', 'system')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "User" (id, email, password)
      VALUES
        ('system-user', 'system@example.com', NULL)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Sample data inserted');
    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 只在直接运行时执行
if (require.main === module) {
  runSimpleMigrate().catch((err) => {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runSimpleMigrate };
