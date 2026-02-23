-- PostgreSQL 数据库初始化脚本
-- 基于 lib/db/init-db.js 创建所有必要的表和示例数据

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 设置时区
SET timezone = 'UTC';

-- ==================== 基础系统表 ====================

-- 创建用户表
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);

-- 创建聊天表
CREATE TABLE IF NOT EXISTS "chat" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" bigint NOT NULL,
  "title" text NOT NULL,
  "user_id" text NOT NULL,
  "visibility" varchar DEFAULT 'private' NOT NULL
);

-- 创建聊天与测试用例关联表
CREATE TABLE IF NOT EXISTS "chat_test_case" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "test_case_id" text NOT NULL,
  "created_at" bigint NOT NULL
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS "message" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "role" text NOT NULL,
  "parts" text NOT NULL,
  "attachments" text NOT NULL,
  "created_at" bigint NOT NULL
);

-- 创建投票表
CREATE TABLE IF NOT EXISTS "vote" (
  "chat_id" text NOT NULL,
  "message_id" text NOT NULL,
  "is_upvoted" boolean NOT NULL,
  PRIMARY KEY ("chat_id", "message_id")
);

-- 创建文档表
CREATE TABLE IF NOT EXISTS "document" (
  "id" text NOT NULL,
  "created_at" bigint NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "kind" varchar DEFAULT 'text' NOT NULL,
  "user_id" text NOT NULL,
  "project_id" text,
  PRIMARY KEY ("id", "created_at")
);

-- 创建建议表
CREATE TABLE IF NOT EXISTS "suggestion" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL,
  "document_created_at" bigint NOT NULL,
  "original_text" text NOT NULL,
  "suggested_text" text NOT NULL,
  "description" text,
  "is_resolved" boolean DEFAULT false NOT NULL,
  "user_id" text NOT NULL,
  "created_at" bigint NOT NULL
);

-- 创建流表
CREATE TABLE IF NOT EXISTS "stream" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "created_at" bigint NOT NULL
);

-- ==================== 项目管理系统表 ====================

-- 创建项目表
CREATE TABLE IF NOT EXISTS "project" (
  "id" text PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "key" varchar(50) NOT NULL UNIQUE,
  "status" varchar CHECK ("status" IN ('active', 'inactive', 'archived')) DEFAULT 'active' NOT NULL,
  "color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
  "avatar" text,
  "settings" json DEFAULT '{}' NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL
);

-- 创建仓库设置表
CREATE TABLE IF NOT EXISTS "repository_setting" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "folder_id" text,
  "provider" varchar DEFAULT 'github' NOT NULL,
  "repo_url" text NOT NULL,
  "default_branch" varchar(100) DEFAULT 'main' NOT NULL,
  "auth_type" varchar DEFAULT 'token' NOT NULL,
  "encrypted_access_token" text,
  "ssh_private_key" text,
  "ssh_public_key" text,
  "webhook_secret" text,
  "ci_provider" varchar DEFAULT 'none' NOT NULL,
  "settings" json DEFAULT '{}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL
);


-- 创建文件夹表
CREATE TABLE IF NOT EXISTS "folder" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "parent_id" text,
  "path" text NOT NULL,
  "level" integer DEFAULT 0 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL
);

-- 创建测试用例主表
CREATE TABLE IF NOT EXISTS "test_case" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL,
  "folder_id" text,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "preconditions" text,
  "priority" varchar CHECK ("priority" IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium' NOT NULL,
  "status" varchar CHECK ("status" IN ('draft', 'active', 'work-in-progress', 'review', 'approved', 'deprecated')) DEFAULT 'draft' NOT NULL,
  "weight" varchar CHECK ("weight" IN ('low', 'medium', 'high')) DEFAULT 'medium' NOT NULL,
  "format" varchar CHECK ("format" IN ('classic', 'gherkin', 'exploratory')) DEFAULT 'classic' NOT NULL,
  "nature" varchar CHECK ("nature" IN ('functional', 'non-functional', 'performance', 'security', 'usability')) DEFAULT 'functional' NOT NULL,
  "type" varchar CHECK ("type" IN ('functional', 'regression', 'smoke', 'integration', 'unit', 'e2e', 'performance')) DEFAULT 'functional' NOT NULL,
  "tags" json DEFAULT '[]' NOT NULL,
  "execution_time" integer,
  "last_run_at" bigint,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL
);

-- 创建测试步骤表
CREATE TABLE IF NOT EXISTS "test_case_step" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "step_number" integer NOT NULL,
  "action" text NOT NULL,
  "expected" text NOT NULL,
  "type" varchar CHECK ("type" IN ('manual', 'automated')) DEFAULT 'manual' NOT NULL,
  "notes" text,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建自动化配置表
CREATE TABLE IF NOT EXISTS "test_case_automation_config" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "repository" varchar(500) NOT NULL,
  "branch" varchar(100) DEFAULT 'main' NOT NULL,
  "commands" json NOT NULL,
  "parameters" json DEFAULT '{}' NOT NULL,
  "framework" varchar CHECK ("framework" IN ('selenium', 'playwright', 'cypress', 'midscene')) DEFAULT 'midscene' NOT NULL,
  "browser" varchar CHECK ("browser" IN ('chrome', 'firefox', 'safari', 'edge')) DEFAULT 'chrome' NOT NULL,
  "environment" varchar DEFAULT 'test' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建相关需求表
CREATE TABLE IF NOT EXISTS "test_case_document" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "document_id" text NOT NULL,
  "type" varchar CHECK ("type" IN ('story', 'epic', 'task', 'document', 'external')) NOT NULL,
  "title" text NOT NULL,
  "status" varchar CHECK ("status" IN ('active', 'deprecated', 'archived', 'draft', 'invalid')) NOT NULL,
  "assignee" text,
  "url" text,
  "source" varchar CHECK ("source" IN ('confluence', 'jira', 'sharepoint', 'external')),
  "source_metadata" jsonb,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建数据集表
CREATE TABLE IF NOT EXISTS "test_case_dataset" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "type" varchar(50) DEFAULT 'csv' NOT NULL,
  "configuration" json,
  "columns" json NOT NULL,
  "data" json NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建测试运行表
CREATE TABLE IF NOT EXISTS "test_case_run" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "run_date" bigint NOT NULL,
  "status" varchar CHECK ("status" IN ('passed', 'failed', 'running', 'skipped')) NOT NULL,
  "duration" integer,
  "environment" text NOT NULL,
  "executor" text NOT NULL,
  "results" json DEFAULT '[]' NOT NULL,
  "error_message" text,
  "logs" text,
  "screenshots" json DEFAULT '[]' NOT NULL,
  "report_url" text,
  "created_at" bigint NOT NULL
);

-- 创建已知问题表
CREATE TABLE IF NOT EXISTS "test_case_issue" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "severity" varchar CHECK ("severity" IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  "status" varchar CHECK ("status" IN ('open', 'in-progress', 'resolved', 'closed')) DEFAULT 'open' NOT NULL,
  "reporter" text NOT NULL,
  "assignee" text,
  "url" text,
  "workaround" text,
  "category" varchar(100),
  "tags" json,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "resolved_at" bigint
);

-- 创建测试用例标签表
CREATE TABLE IF NOT EXISTS "test_case_tag" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
  "description" text,
  "created_at" bigint NOT NULL,
  "created_by" text NOT NULL
);

-- 创建测试用例标签关联表
CREATE TABLE IF NOT EXISTS "test_case_tag_relation" (
  "test_case_id" text NOT NULL,
  "tag_id" text NOT NULL,
  "created_at" bigint NOT NULL,
  PRIMARY KEY ("test_case_id", "tag_id")
);

-- 创建测试用例评论表
CREATE TABLE IF NOT EXISTS "test_case_comment" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "content" text NOT NULL,
  "author" text NOT NULL,
  "author_type" varchar CHECK ("author_type" IN ('user', 'ai')) DEFAULT 'user' NOT NULL,
  "comment_type" varchar CHECK ("comment_type" IN ('suggestion', 'issue', 'risk', 'improvement', 'question', 'approval', 'general')) DEFAULT 'general',
  "category" varchar(100),
  "tags" json,
  "related_step_id" text,
  "attachments" json,
  "parent_id" text,
  "is_resolved" boolean DEFAULT false NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建测试用例历史版本表
CREATE TABLE IF NOT EXISTS "test_case_history" (
  "id" text PRIMARY KEY NOT NULL,
  "test_case_id" text NOT NULL,
  "version" integer NOT NULL,
  "change_type" text NOT NULL,
  "changes" json NOT NULL,
  "change_description" text,
  "changed_by" text NOT NULL,
  "created_at" bigint NOT NULL
);

-- ==================== AI模型配置系统表 ====================

-- 创建AI提供者表
CREATE TABLE IF NOT EXISTS "ai_provider" (
  "id" text PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "display_name" varchar(200) NOT NULL,
  "description" text,
  "base_url" text,
  "api_key_required" boolean DEFAULT true NOT NULL,
  "supported_features" json DEFAULT '[]' NOT NULL,
  "configuration" json DEFAULT '{}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建AI模型表
CREATE TABLE IF NOT EXISTS "ai_model" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "model_key" varchar(100) NOT NULL,
  "display_name" varchar(200) NOT NULL,
  "description" text,
  "model_type" varchar CHECK ("model_type" IN ('chat', 'image', 'embedding', 'reasoning')) NOT NULL,
  "capabilities" json DEFAULT '[]' NOT NULL,
  "context_window" integer,
  "max_tokens" integer,
  "pricing" json DEFAULT '{}' NOT NULL,
  "configuration" json DEFAULT '{}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建AI模型用途映射表
CREATE TABLE IF NOT EXISTS "ai_model_usage" (
  "id" text PRIMARY KEY NOT NULL,
  "usage_type" varchar(50) NOT NULL,
  "model_id" text NOT NULL,
  "project_id" text,
  "user_id" text,
  "priority" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- 创建AI API密钥配置表
CREATE TABLE IF NOT EXISTS "ai_api_key" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "key_name" varchar(100) NOT NULL,
  "encrypted_key" text NOT NULL,
  "project_id" text,
  "user_id" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "expires_at" bigint,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);

-- ==================== 创建外键约束 ====================

-- 基础系统表外键
DO $$ BEGIN
  ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "chat_test_case" ADD CONSTRAINT "chat_test_case_chatId_chat_id_fk"
  FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "chat_test_case" ADD CONSTRAINT "chat_test_case_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk"
  FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "document" ADD CONSTRAINT "document_userId_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "document" ADD CONSTRAINT "document_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "repository_setting" ADD CONSTRAINT "repository_setting_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- 项目管理系统外键
DO $$ BEGIN
  ALTER TABLE "folder" ADD CONSTRAINT "folder_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "folder" ADD CONSTRAINT "folder_parentId_folder_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case" ADD CONSTRAINT "test_case_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case" ADD CONSTRAINT "test_case_folderId_folder_id_fk"
  FOREIGN KEY ("folder_id") REFERENCES "folder"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 测试用例相关表外键
DO $$ BEGIN
  ALTER TABLE "test_case_step" ADD CONSTRAINT "test_case_step_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_automation_config" ADD CONSTRAINT "test_case_automation_config_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_requirement" ADD CONSTRAINT "test_case_requirement_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_dataset" ADD CONSTRAINT "test_case_dataset_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_run" ADD CONSTRAINT "test_case_run_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_issue" ADD CONSTRAINT "test_case_issue_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_comment" ADD CONSTRAINT "test_case_comment_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_tag_relation" ADD CONSTRAINT "test_case_tag_relation_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_tag_relation" ADD CONSTRAINT "test_case_tag_relation_tagId_test_case_tag_id_fk"
  FOREIGN KEY ("tag_id") REFERENCES "test_case_tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "test_case_history" ADD CONSTRAINT "test_case_history_testCaseId_test_case_id_fk"
  FOREIGN KEY ("test_case_id") REFERENCES "test_case"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AI模型配置系统外键
DO $$ BEGIN
  ALTER TABLE "ai_model" ADD CONSTRAINT "ai_model_providerId_ai_provider_id_fk"
  FOREIGN KEY ("provider_id") REFERENCES "ai_provider"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_model_usage" ADD CONSTRAINT "ai_model_usage_modelId_ai_model_id_fk"
  FOREIGN KEY ("model_id") REFERENCES "ai_model"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_model_usage" ADD CONSTRAINT "ai_model_usage_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_model_usage" ADD CONSTRAINT "ai_model_usage_userId_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_api_key" ADD CONSTRAINT "ai_api_key_providerId_ai_provider_id_fk"
  FOREIGN KEY ("provider_id") REFERENCES "ai_provider"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_api_key" ADD CONSTRAINT "ai_api_key_projectId_project_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_api_key" ADD CONSTRAINT "ai_api_key_userId_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==================== 创建索引以提高查询性能 ====================

-- 基础系统表索引
CREATE INDEX IF NOT EXISTS idx_chat_userId ON "chat"("user_id");
CREATE INDEX IF NOT EXISTS idx_message_chatId ON "message"("chat_id");
CREATE INDEX IF NOT EXISTS idx_document_userId ON "document"("user_id");
CREATE INDEX IF NOT EXISTS idx_document_projectId ON "document"("project_id");
CREATE INDEX IF NOT EXISTS idx_chat_test_case_chatId ON "chat_test_case"("chat_id");
CREATE INDEX IF NOT EXISTS idx_chat_test_case_testCaseId ON "chat_test_case"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_chat_test_case_composite ON "chat_test_case"("test_case_id", "chat_id");

-- 项目管理系统索引
CREATE INDEX IF NOT EXISTS idx_project_key ON "project"("key");
CREATE INDEX IF NOT EXISTS idx_project_status ON "project"("status");
CREATE INDEX IF NOT EXISTS idx_folder_projectId ON "folder"("project_id");
CREATE INDEX IF NOT EXISTS idx_folder_parentId ON "folder"("parent_id");
CREATE INDEX IF NOT EXISTS idx_folder_path ON "folder"("path");
CREATE INDEX IF NOT EXISTS idx_test_case_projectId ON "test_case"("project_id");
CREATE INDEX IF NOT EXISTS idx_test_case_folderId ON "test_case"("folder_id");
CREATE INDEX IF NOT EXISTS idx_test_case_status ON "test_case"("status");
CREATE INDEX IF NOT EXISTS idx_test_case_priority ON "test_case"("priority");
CREATE INDEX IF NOT EXISTS idx_test_case_updatedAt ON "test_case"("updated_at");
CREATE INDEX IF NOT EXISTS idx_repository_setting_projectId ON "repository_setting"("project_id");
CREATE INDEX IF NOT EXISTS idx_repository_setting_folderId ON "repository_setting"("folder_id");
CREATE INDEX IF NOT EXISTS idx_repository_setting_isActive ON "repository_setting"("is_active");
CREATE INDEX IF NOT EXISTS idx_repository_setting_updatedAt ON "repository_setting"("updated_at");


-- 测试用例相关表索引
CREATE INDEX IF NOT EXISTS idx_test_case_step_testCaseId ON "test_case_step"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_step_number ON "test_case_step"("test_case_id", "step_number");
CREATE INDEX IF NOT EXISTS idx_test_case_automation_config_testCaseId ON "test_case_automation_config"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_requirement_testCaseId ON "test_case_requirement"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_dataset_testCaseId ON "test_case_dataset"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_run_testCaseId ON "test_case_run"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_run_runDate ON "test_case_run"("run_date");
CREATE INDEX IF NOT EXISTS idx_test_case_issue_testCaseId ON "test_case_issue"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_issue_status ON "test_case_issue"("status");
CREATE INDEX IF NOT EXISTS idx_test_case_comment_testCaseId ON "test_case_comment"("test_case_id");
CREATE INDEX IF NOT EXISTS idx_test_case_history_testCaseId ON "test_case_history"("test_case_id");

-- AI模型配置相关索引
CREATE INDEX IF NOT EXISTS idx_ai_provider_name ON "ai_provider"("name");
CREATE INDEX IF NOT EXISTS idx_ai_provider_isActive ON "ai_provider"("is_active");
CREATE INDEX IF NOT EXISTS idx_ai_model_providerId ON "ai_model"("provider_id");
CREATE INDEX IF NOT EXISTS idx_ai_model_modelKey ON "ai_model"("model_key");
CREATE INDEX IF NOT EXISTS idx_ai_model_modelType ON "ai_model"("model_type");
CREATE INDEX IF NOT EXISTS idx_ai_model_isActive ON "ai_model"("is_active");
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_usageType ON "ai_model_usage"("usage_type");
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_modelId ON "ai_model_usage"("model_id");
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_projectId ON "ai_model_usage"("project_id");
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_userId ON "ai_model_usage"("user_id");
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_priority ON "ai_model_usage"("priority");
CREATE INDEX IF NOT EXISTS idx_ai_api_key_providerId ON "ai_api_key"("provider_id");
CREATE INDEX IF NOT EXISTS idx_ai_api_key_projectId ON "ai_api_key"("project_id");
CREATE INDEX IF NOT EXISTS idx_ai_api_key_userId ON "ai_api_key"("user_id");
CREATE INDEX IF NOT EXISTS idx_ai_api_key_isActive ON "ai_api_key"("is_active");

-- ==================== 插入示例数据 ====================

-- 插入示例用户
INSERT INTO "user" (id, email, password)
VALUES
  ('system', 'system@example.com', NULL),
  ('henix_admin', 'henix@example.com', NULL),
  ('guest_tr', 'guest@example.com', NULL)
ON CONFLICT (id) DO NOTHING;

-- 插入示例项目
INSERT INTO "project" (id, name, description, key, status, color, avatar, settings, "created_at", "updated_at", "created_by", "updated_by")
VALUES
  ('default-project', 'ICRM UK', '默认项目', 'DEFAULT', 'active', '#3B82F6', NULL, '{}', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('demo-project', 'ICRM LU', '演示项目', 'DEMO', 'active', '#10B981', NULL, '{}', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('test-project', 'EPAYMENT', '测试项目', 'TEST', 'active', '#F59E0B', NULL, '{}', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('beta-project', 'TOES', 'Beta版本项目', 'BETA', 'active', '#EF4444', NULL, '{}', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 插入示例仓库设置
INSERT INTO "repository_setting" (id, "project_id", "folder_id", provider, "repo_url", "default_branch", "auth_type", "ci_provider", settings, "is_active", "created_at", "updated_at", "created_by", "updated_by")
VALUES
  ('repo-setting-default', 'default-project', NULL, 'github', 'https://github.com/company/ai-run', 'main', 'token', 'github-actions', '{}', true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('repo-setting-test', 'test-project', NULL, 'gitlab', 'https://gitlab.com/company/epayment', 'main', 'ssh', 'gitlab-ci', '{}', true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system')
ON CONFLICT (id) DO NOTHING;


-- 插入根文件夹
INSERT INTO "folder" (id, "project_id", name, description, "parent_id", path, level, "sort_order", "created_at", "updated_at", "created_by", "updated_by")
VALUES
  ('root-folder', 'default-project', 'Root', '根文件夹', NULL, '/Root', 0, 0, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('api-folder', 'default-project', 'API Tests', 'API接口测试', 'root-folder', '/Root/API Tests', 1, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('ui-folder', 'default-project', 'UI Tests', 'UI界面测试', 'root-folder', '/Root/UI Tests', 1, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system'),
  ('auth-folder', 'default-project', 'Authentication', '认证相关测试', 'ui-folder', '/Root/UI Tests/Authentication', 2, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- 插入示例测试用例
INSERT INTO "test_case" (id, "project_id", "folder_id", name, description, preconditions, priority, status, weight, format, nature, type, tags, "execution_time", "created_at", "updated_at", "created_by", "updated_by")
VALUES
  ('1-1-1', 'default-project', 'auth-folder', 'Login with valid user', 'Test the login functionality with valid user credentials to ensure proper authentication flow and user experience', 'User account must be created and activated. Application must be running and accessible. Database connection must be established.', 'high', 'work-in-progress', 'low', 'classic', 'functional', 'regression', '["login", "authentication", "smoke"]', 45, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'henix_admin', 'guest_tr'),
  ('1-1-2', 'default-project', 'auth-folder', 'Login with invalid credentials', 'Test login functionality with invalid credentials to ensure proper error handling', 'Application must be running and accessible', 'high', 'active', 'low', 'classic', 'functional', 'regression', '["login", "authentication", "negative"]', 30, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'henix_admin', 'henix_admin'),
  ('1-2-1', 'default-project', 'ui-folder', 'User profile update', 'Test user profile information update functionality', 'User must be logged in', 'medium', 'active', 'medium', 'classic', 'functional', 'regression', '["profile", "update"]', 60, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000, 'henix_admin', 'henix_admin')
ON CONFLICT (id) DO NOTHING;

-- 插入示例测试步骤
INSERT INTO "test_case_step" (id, "test_case_id", "step_number", action, expected, type, notes, "created_at", "updated_at")
VALUES
  ('step-1-1', '1-1-1', 1, 'Navigate to login page', 'Login page should be displayed with username and password fields', 'manual', 'Ensure browser is in incognito mode', extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('step-1-2', '1-1-1', 2, 'Enter valid username and password', 'Credentials should be accepted without validation errors', 'manual', NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('step-1-3', '1-1-1', 3, 'Click login button', 'User should be redirected to dashboard', 'manual', NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('step-1-4', '1-1-1', 4, 'Verify user session', 'User session should be active and user info displayed', 'automated', NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- 插入示例标签
INSERT INTO "test_case_tag" (id, name, color, description, "created_at", "created_by")
VALUES
  ('tag-login', 'login', '#10B981', '登录相关测试', extract(epoch from now()) * 1000, 'system'),
  ('tag-auth', 'authentication', '#3B82F6', '认证相关测试', extract(epoch from now()) * 1000, 'system'),
  ('tag-smoke', 'smoke', '#F59E0B', '冒烟测试', extract(epoch from now()) * 1000, 'system'),
  ('tag-regression', 'regression', '#EF4444', '回归测试', extract(epoch from now()) * 1000, 'system'),
  ('tag-api', 'api', '#8B5CF6', 'API测试', extract(epoch from now()) * 1000, 'system'),
  ('tag-ui', 'ui', '#06B6D4', 'UI测试', extract(epoch from now()) * 1000, 'system')
ON CONFLICT (id) DO NOTHING;

-- 插入自动化配置示例数据
INSERT INTO "test_case_automation_config" (id, "test_case_id", repository, branch, commands, parameters, framework, browser, environment, "is_active", "created_at", "updated_at")
VALUES
  ('auto-1-1-1', '1-1-1', 'https://github.com/company/test-automation', 'main',
   '["npm install", "npm run test:login", "npm run test:report"]',
   '{"browser": "chrome", "headless": "true", "timeout": "30000", "viewport": "1920x1080", "retries": "3"}',
   'midscene', 'chrome', 'test', true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('auto-1-1-2', '1-1-2', 'https://github.com/company/security-tests', 'develop',
   '["npm install", "npx playwright test login-negative", "npx playwright show-report"]',
   '{"browser": "firefox", "headless": "false", "timeout": "45000", "workers": "2", "retries": "1", "video": "retain-on-failure"}',
   'playwright', 'firefox', 'staging', true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  ('auto-1-2-1', '1-2-1', 'https://github.com/company/e2e-tests', 'feature/profile-tests',
   '["yarn install", "yarn cypress:run --spec \"cypress/e2e/profile/**\"", "yarn cypress:report"]',
   '{"browser": "chrome", "headless": "true", "timeout": "60000", "base_url": "https://staging.company.com", "video": "true", "screenshots": "true", "env": "staging"}',
   'cypress', 'chrome', 'staging', true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- 插入测试运行示例数据
INSERT INTO "test_case_run" (id, "test_case_id", "run_date", status, duration, environment, executor, results, "error_message", logs, screenshots, "created_at")
VALUES
  ('run-1', '1-1-1', extract(epoch from now()) * 1000 - 86400000, 'passed', 45, 'staging', 'john.doe',
   '[{"stepId": "step-1", "status": "passed", "duration": 15}, {"stepId": "step-2", "status": "passed", "duration": 10}, {"stepId": "step-3", "status": "passed", "duration": 20}]',
   NULL, 'Test completed successfully', '[]', extract(epoch from now()) * 1000 - 86400000),
  ('run-2', '1-1-1', extract(epoch from now()) * 1000 - 172800000, 'failed', 30, 'production', 'jane.smith',
   '[{"stepId": "step-1", "status": "passed", "duration": 15}, {"stepId": "step-2", "status": "failed", "duration": 15, "error": "Invalid credentials"}]',
   'Login failed with invalid credentials', 'Error: Element not found', '[]', extract(epoch from now()) * 1000 - 172800000),
  ('run-3', '1-1-2', extract(epoch from now()) * 1000 - 43200000, 'passed', 28, 'staging', 'security.bot',
   '[{"stepId": "step-1", "status": "passed", "duration": 8}, {"stepId": "step-2", "status": "passed", "duration": 12}, {"stepId": "step-3", "status": "passed", "duration": 8}]',
   NULL, 'Security test passed', '[]', extract(epoch from now()) * 1000 - 43200000),
  ('run-4', '1-2-1', extract(epoch from now()) * 1000 - 21600000, 'passed', 58, 'staging', 'cypress.runner',
   '[{"stepId": "step-1", "status": "passed", "duration": 12}, {"stepId": "step-2", "status": "passed", "duration": 18}, {"stepId": "step-3", "status": "passed", "duration": 15}, {"stepId": "step-4", "status": "passed", "duration": 13}]',
   NULL, 'Profile update test completed', '[]', extract(epoch from now()) * 1000 - 21600000)
ON CONFLICT (id) DO NOTHING;

-- ==================== 插入AI模型配置初始数据 ====================

-- 插入AI提供者
INSERT INTO "ai_provider" (id, name, "display_name", description, "base_url", "api_key_required", "supported_features", configuration, "is_active", "sort_order", "created_at", "updated_at")
VALUES
  (uuid_generate_v4()::text, 'openai', 'OpenAI', 'OpenAI GPT models', 'https://api.openai.com/v1', true, '["chat", "image", "embedding"]', '{}', true, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  (uuid_generate_v4()::text, 'qwen', 'Qwen (通义千问)', 'Alibaba Qwen models', 'https://dashscope.aliyuncs.com/compatible-mode/v1', true, '["chat", "image"]', '{}', true, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  (uuid_generate_v4()::text, 'xai', 'xAI', 'xAI Grok models', 'https://api.x.ai/v1', true, '["chat", "reasoning"]', '{}', true, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
  (uuid_generate_v4()::text, 'chatgpt-proxy', 'ChatGPT Proxy', 'ChatGPT models via proxy', 'https://api.qingyuntop.top/v1', true, '["chat"]', '{}', true, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000);

-- 由于PostgreSQL中我们使用了uuid_generate_v4()，我们需要先获取提供者ID，然后插入模型
-- 这里我们使用WITH语句来处理这个依赖关系

WITH provider_ids AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY "sort_order") as rn
  FROM "ai_provider"
  WHERE name IN ('openai', 'qwen', 'xai', 'chatgpt-proxy')
),
openai_provider AS (SELECT id FROM provider_ids WHERE name = 'openai'),
qwen_provider AS (SELECT id FROM provider_ids WHERE name = 'qwen'),
xai_provider AS (SELECT id FROM provider_ids WHERE name = 'xai'),
chatgpt_proxy_provider AS (SELECT id FROM provider_ids WHERE name = 'chatgpt-proxy')

-- 插入AI模型
INSERT INTO "ai_model" (id, "provider_id", "model_key", "display_name", description, "model_type", capabilities, "context_window", "max_tokens", pricing, configuration, "is_active", "sort_order", "created_at", "updated_at")
SELECT * FROM (
  VALUES
    -- OpenAI 模型
    (uuid_generate_v4()::text, (SELECT id FROM openai_provider), 'gpt-4o', 'GPT-4o', 'Most capable GPT-4 model', 'chat', '["text", "vision", "function_calling"]'::json, 128000, 4096, '{"input": 0.005, "output": 0.015}'::json, '{}'::json, true, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM openai_provider), 'gpt-4o-mini', 'GPT-4o Mini', 'Faster, cheaper GPT-4o', 'chat', '["text", "vision", "function_calling"]'::json, 128000, 16384, '{"input": 0.00015, "output": 0.0006}'::json, '{}'::json, true, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM openai_provider), 'gpt-4-turbo', 'GPT-4 Turbo', 'High-performance GPT-4 model', 'chat', '["text", "vision", "function_calling"]'::json, 128000, 4096, '{"input": 0.01, "output": 0.03}'::json, '{}'::json, true, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM openai_provider), 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model', 'chat', '["text", "function_calling"]'::json, 16385, 4096, '{"input": 0.0005, "output": 0.0015}'::json, '{}'::json, true, 4, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- Qwen 模型
    (uuid_generate_v4()::text, (SELECT id FROM qwen_provider), 'qwen-max', 'Qwen Max', 'Most capable Qwen model', 'chat', '["text", "function_calling"]'::json, 32000, 8192, '{"input": 0.002, "output": 0.006}'::json, '{}'::json, true, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM qwen_provider), 'qwen-vl-max-latest', 'Qwen VL Max', 'Qwen vision-language model', 'chat', '["text", "vision"]'::json, 32000, 8192, '{"input": 0.002, "output": 0.006}'::json, '{}'::json, true, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM qwen_provider), 'qwen-plus', 'Qwen Plus', 'Balanced performance and cost', 'chat', '["text", "function_calling"]'::json, 32000, 8192, '{"input": 0.001, "output": 0.003}'::json, '{}'::json, true, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- xAI 模型
    (uuid_generate_v4()::text, (SELECT id FROM xai_provider), 'grok-2-1212', 'Grok-2', 'xAI Grok-2 model', 'chat', '["text", "reasoning"]'::json, 131072, 4096, '{"input": 0.002, "output": 0.01}'::json, '{}'::json, true, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM xai_provider), 'grok-2-vision-1212', 'Grok-2 Vision', 'xAI Grok-2 with vision capabilities', 'chat', '["text", "vision", "reasoning"]'::json, 131072, 4096, '{"input": 0.002, "output": 0.01}'::json, '{}'::json, true, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM xai_provider), 'grok-3-mini-beta', 'Grok-3 Mini', 'Compact and efficient Grok model', 'reasoning', '["text", "reasoning"]'::json, 65536, 2048, '{"input": 0.001, "output": 0.005}'::json, '{}'::json, true, 3, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- ChatGPT Proxy 模型
    (uuid_generate_v4()::text, (SELECT id FROM chatgpt_proxy_provider), 'gpt-4o', 'GPT-4o (Proxy)', 'GPT-4o via proxy service', 'chat', '["text", "vision", "function_calling"]'::json, 128000, 4096, '{"input": 0.005, "output": 0.015}'::json, '{}'::json, true, 1, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM chatgpt_proxy_provider), 'gpt-4o-mini', 'GPT-4o Mini (Proxy)', 'GPT-4o Mini via proxy service', 'chat', '["text", "vision", "function_calling"]'::json, 128000, 16384, '{"input": 0.00015, "output": 0.0006}'::json, '{}'::json, true, 2, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
) AS model_data(id, "provider_id", "model_key", "display_name", description, "model_type", capabilities, "context_window", "max_tokens", pricing, configuration, "is_active", "sort_order", "created_at", "updated_at");

-- 插入默认模型用途映射（全局配置）
WITH model_mappings AS (
  SELECT
    m.id as model_id,
    m."model_key",
    p.name as provider_name
  FROM "ai_model" m
  JOIN "ai_provider" p ON m."provider_id" = p.id
  WHERE m."is_active" = true AND p."is_active" = true
)
INSERT INTO "ai_model_usage" (id, "usage_type", "model_id", "project_id", "user_id", priority, "is_active", "created_at", "updated_at")
SELECT * FROM (
  VALUES
    -- 主要聊天模型使用 Qwen Max
    (uuid_generate_v4()::text, 'chat-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'qwen-max' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- 推理模型使用 Grok-3 Mini
    (uuid_generate_v4()::text, 'chat-model-reasoning', (SELECT model_id FROM model_mappings WHERE "model_key" = 'grok-3-mini-beta' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- 标题生成使用 Qwen Max
    (uuid_generate_v4()::text, 'title-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'qwen-max' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- 文档生成使用 Qwen Max
    (uuid_generate_v4()::text, 'artifact-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'qwen-max' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- 向后兼容性映射
    (uuid_generate_v4()::text, 'qwen-max', (SELECT model_id FROM model_mappings WHERE "model_key" = 'qwen-max' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, 'gpt-4o', (SELECT model_id FROM model_mappings WHERE "model_key" = 'gpt-4o' AND provider_name = 'chatgpt-proxy' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, 'gpt-4o-mini', (SELECT model_id FROM model_mappings WHERE "model_key" = 'gpt-4o-mini' AND provider_name = 'chatgpt-proxy' LIMIT 1), NULL, NULL, 100, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),

    -- 特定用途的高级配置
    (uuid_generate_v4()::text, 'vision-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'qwen-vl-max-latest' LIMIT 1), NULL, NULL, 90, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, 'code-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'gpt-4o' AND provider_name = 'openai' LIMIT 1), NULL, NULL, 90, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, 'analysis-model', (SELECT model_id FROM model_mappings WHERE "model_key" = 'grok-2-1212' LIMIT 1), NULL, NULL, 90, true, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
) AS usage_data(id, "usage_type", "model_id", "project_id", "user_id", priority, "is_active", "created_at", "updated_at")
WHERE usage_data."model_id" IS NOT NULL;

-- 插入示例API密钥配置（注意：这里使用占位符，实际使用时需要配置真实的加密密钥）
INSERT INTO "ai_api_key" (id, "provider_id", "key_name", "encrypted_key", "project_id", "user_id", "is_active", "expires_at", "created_at", "updated_at")
SELECT * FROM (
  VALUES
    -- 全局配置示例（需要实际配置时替换为真实的加密密钥）
    (uuid_generate_v4()::text, (SELECT id FROM "ai_provider" WHERE name = 'qwen' LIMIT 1), 'Qwen Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_QWEN', NULL, NULL, false, NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM "ai_provider" WHERE name = 'openai' LIMIT 1), 'OpenAI Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_OPENAI', NULL, NULL, false, NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM "ai_provider" WHERE name = 'xai' LIMIT 1), 'xAI Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_XAI', NULL, NULL, false, NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000),
    (uuid_generate_v4()::text, (SELECT id FROM "ai_provider" WHERE name = 'chatgpt-proxy' LIMIT 1), 'ChatGPT Proxy Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_CHATGPT_PROXY', NULL, NULL, false, NULL, extract(epoch from now()) * 1000, extract(epoch from now()) * 1000)
) AS key_data(id, "provider_id", "key_name", "encrypted_key", "project_id", "user_id", "is_active", "expires_at", "created_at", "updated_at")
WHERE key_data."provider_id" IS NOT NULL;

-- 输出初始化完成信息
SELECT
  'PostgreSQL database initialized successfully for AI Run project' as status,
  'AI model configuration system tables created and populated' as ai_status,
  '✅ 4 AI providers, 12 AI models, 10 usage mappings, 4 API key templates' as summary,
  '⚠️  Please configure real API keys through the management interface or API' as warning;