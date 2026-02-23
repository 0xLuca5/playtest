import type { InferSelectModel } from 'drizzle-orm';
import {getRelatedDocuments} from "@/lib/db/queries";

export const isSqlite = process.env.DB_PROVIDER === 'sqlite';

// 动态导入类型
const core = isSqlite
  ? require('drizzle-orm/sqlite-core')
  : require('drizzle-orm/pg-core');

const table = isSqlite ? core.sqliteTable : core.pgTable;
const textType = core.text;
const intType = core.integer;
const boolType = isSqlite ? (name: string) => intType(name) : core.boolean;
const primaryKey = core.primaryKey;
const foreignKey = core.foreignKey;
const timestampType = (name: string) => intType(name); // 统一使用整数时间戳
const uuidType = isSqlite ? (name: string) => textType(name) : core.uuid;
// 修复 varcharType 以支持 options 参数（SQLite 会忽略 enum 等选项）
const varcharType = isSqlite
  ? (name: string, options?: any) => textType(name)
  : core.varchar;
// 修复 jsonType 以支持 options 参数
const jsonType = isSqlite
  ? (name: string, options?: any) => textType(name, { mode: 'json' })
  : core.json;

export const user = table('user', {
  id: uuidType('id').primaryKey().notNull(),
  email: varcharType('email', { length: 64 }).notNull(),
  password: varcharType('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = table('chat', {
  id: uuidType('id').primaryKey().notNull(),
  createdAt: timestampType('created_at').notNull(),
  title: textType('title').notNull(),
  userId: uuidType('user_id').notNull(),
  visibility: varcharType('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// 聊天与测试用例的关联表（多对多关系）
export const chatTestCase = table('chat_test_case', {
  id: uuidType('id').primaryKey().notNull(),
  chatId: uuidType('chat_id').notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  createdAt: timestampType('created_at').notNull(),
});

export type ChatTestCase = InferSelectModel<typeof chatTestCase>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = table('message', {
  id: uuidType('id').primaryKey().notNull(),
  chatId: uuidType('chat_id').notNull(),
  role: varcharType('role').notNull(),
  content: jsonType('content').notNull(),
  createdAt: timestampType('created_at').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = table('message', {
  id: uuidType('id').primaryKey().notNull(),
  chatId: uuidType('chat_id').notNull(),
  role: varcharType('role').notNull(),
  parts: jsonType('parts').notNull(),
  attachments: jsonType('attachments').notNull(),
  createdAt: timestampType('created_at').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = table(
  'vote',
  {
    chatId: uuidType('chat_id').notNull(),
    messageId: uuidType('message_id').notNull(),
    isUpvoted: boolType('is_upvoted').notNull(),
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.chatId, tbl.messageId] }),
  })
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = table(
  'vote',
  {
    chatId: uuidType('chat_id').notNull(),
    messageId: uuidType('message_id').notNull(),
    isUpvoted: boolType('is_upvoted').notNull(),
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.chatId, tbl.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = table(
  'document',
  {
    id: uuidType('id').notNull(),
    createdAt: timestampType('created_at').notNull(),
    title: textType('title').notNull(),
    content: textType('content'),
    kind: varcharType('kind', { enum: ['text', 'code', 'image', 'sheet', 'midscene_report', 'test_case_artifact'] })
      .notNull()
      .default('text'),
    userId: uuidType('user_id').notNull(),
    projectId: uuidType('project_id'), // 关联项目，可为空（兼容旧数据）
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.id, tbl.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = table(
  'suggestion',
  {
    id: uuidType('id').notNull(),
    documentId: uuidType('document_id').notNull(),
    documentCreatedAt: timestampType('document_created_at').notNull(),
    originalText: textType('original_text').notNull(),
    suggestedText: textType('suggested_text').notNull(),
    description: textType('description'),
    isResolved: boolType('is_resolved').notNull().default(false),
    userId: uuidType('user_id').notNull(),
    createdAt: timestampType('created_at').notNull(),
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = table(
  'stream',
  {
    id: uuidType('id').notNull(),
    chatId: uuidType('chat_id').notNull(),
    createdAt: timestampType('created_at').notNull(),
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ==================== 测试用例管理系统表结构 ====================

// 项目表 - 用于项目管理和数据隔离
export const project = table('project', {
  id: uuidType('id').primaryKey().notNull(),
  name: varcharType('name', { length: 255 }).notNull(),
  description: textType('description'),
  key: varcharType('key', { length: 50 }).notNull(), // 项目唯一标识，如 'PROJ001'
  status: varcharType('status', { enum: ['active', 'inactive', 'archived'] }).notNull().default('active'),
  color: varcharType('color', { length: 7 }).notNull().default('#3B82F6'), // 项目主题色
  avatar: textType('avatar'), // 项目头像URL
  settings: jsonType('settings').notNull().default('{}'), // 项目设置JSON
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
  createdBy: uuidType('created_by').notNull(),
  updatedBy: uuidType('updated_by').notNull(),
});

export type Project = InferSelectModel<typeof project>;

// 文件夹表 - 用于组织测试用例
export const folder = table('folder', {
  id: uuidType('id').primaryKey().notNull(),
  projectId: uuidType('project_id').notNull(), // 关联项目
  name: varcharType('name', { length: 255 }).notNull(),
  description: textType('description'),
  parentId: uuidType('parent_id'), // 支持嵌套文件夹
  path: textType('path').notNull(), // 完整路径，如 "/root/api/auth"
  level: intType('level').notNull().default(0), // 层级深度
  sortOrder: intType('sort_order').notNull().default(0), // 排序
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
  createdBy: uuidType('created_by').notNull(),
  updatedBy: uuidType('updated_by').notNull(),
});

export type Folder = InferSelectModel<typeof folder>;

// 测试用例主表
export const testCase = table('test_case', {
  id: uuidType('id').primaryKey().notNull(),
  projectId: uuidType('project_id').notNull(), // 关联项目
  folderId: uuidType('folder_id'), // 所属文件夹
  name: varcharType('name', { length: 500 }).notNull(),
  description: textType('description').notNull(),
  preconditions: textType('preconditions'),
  priority: varcharType('priority', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
  status: varcharType('status', { enum: ['work-in-progress', 'active', 'deprecated', 'draft'] }).notNull().default('draft'),
  weight: varcharType('weight', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
  format: varcharType('format', { enum: ['classic', 'bdd', 'exploratory'] }).notNull().default('classic'),
  nature: varcharType('nature', { enum: ['unit', 'integration', 'system', 'e2e'] }).notNull().default('unit'),
  type: varcharType('type', { enum: ['functional', 'non-functional', 'regression', 'smoke'] }).notNull().default('functional'),
  tags: jsonType('tags').notNull().default('[]'), // JSON数组存储标签
  executionTime: intType('execution_time'), // 预估执行时间（分钟）
  lastRunAt: timestampType('last_run_at'), // 最后运行时间
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
  createdBy: uuidType('created_by').notNull(),
  updatedBy: uuidType('updated_by').notNull(),
});

export type TestCase = InferSelectModel<typeof testCase>;

// 测试步骤表
export const testStep = table('test_case_step', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  stepNumber: intType('step_number').notNull(), // 步骤序号
  action: textType('action').notNull(), // 操作描述
  expected: textType('expected').notNull(), // 预期结果
  type: varcharType('type', { enum: ['manual', 'automated', 'optional'] }).notNull().default('manual'),
  notes: textType('notes'), // 备注
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type TestStep = InferSelectModel<typeof testStep>;

// 自动化配置表
export const automationConfig = table('test_case_automation_config', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  repository: varcharType('repository', { length: 500 }).notNull(),
  branch: varcharType('branch', { length: 100 }).notNull().default('main'),
  commands: jsonType('commands').notNull(), // JSON数组存储命令
  parameters: jsonType('parameters').notNull().default('{}'), // JSON对象存储参数
  framework: varcharType('framework', { enum: ['selenium', 'playwright', 'cypress', 'midscene', 'karate'] }).notNull().default('midscene'),
  browser: varcharType('browser', { enum: ['chrome', 'firefox', 'safari', 'edge'] }).notNull().default('chrome'),
  environment: varcharType('environment', { enum: ['dev', 'test', 'staging', 'prod'] }).notNull().default('test'),
  environmentVariables: jsonType('environment_variables').notNull().default('{}'), // JSON对象存储环境变量
  isActive: boolType('is_active').notNull().default(true),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type AutomationConfig = InferSelectModel<typeof automationConfig>;

// 相关需求表
export const relatedDocument = table('test_case_document', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  documentId: varcharType('document_id', { length: 100 }).notNull(), // 外部需求ID
  type: varcharType('type', { enum: ['story', 'epic', 'task', 'document', 'external'] }).notNull(),
  title: varcharType('title', { length: 500 }).notNull(),
  status: varcharType('status', { enum: ['active', 'deprecated', 'archived', 'draft', 'invalid'] }).notNull(),
  assignee: varcharType('assignee', { length: 100 }),
  url: varcharType('url', { length: 1000 }), // 需求链接
  source: varcharType('source', { enum: ['confluence', 'jira', 'sharepoint', 'external'] }), // 文档来源
  sourceMetadata: jsonType('source_metadata'), // 来源特定的元数据（pageId, spaceKey等）
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type RelatedDocument = InferSelectModel<typeof relatedDocument>;

// 数据集表
export const dataset = table('test_case_dataset', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  name: varcharType('name', { length: 255 }).notNull(),
  description: textType('description'),
  type: varcharType('type', { length: 50 }).notNull().default('csv'), // 数据来源类型: csv, api, json, database
  configuration: jsonType('configuration'), // JSON对象存储类型特定配置（API URL、JDBC URI等）
  columns: jsonType('columns').notNull(), // JSON数组存储列定义
  data: jsonType('data').notNull(), // JSON数组存储数据行
  isActive: boolType('is_active').notNull().default(true),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type Dataset = InferSelectModel<typeof dataset>;

// AI模型提供者表
export const aiProvider = table('ai_provider', {
  id: uuidType('id').primaryKey().notNull(),
  name: varcharType('name', { length: 100 }).notNull(), // 如: 'openai', 'qwen', 'xai'
  displayName: varcharType('display_name', { length: 200 }).notNull(), // 显示名称
  description: textType('description'), // 描述
  baseUrl: textType('base_url'), // API基础URL
  apiKeyRequired: boolType('api_key_required').notNull().default(true), // 是否需要API密钥
  supportedFeatures: jsonType('supported_features').notNull().default('[]'), // 支持的功能，如 ['chat', 'image', 'embedding']
  configuration: jsonType('configuration').notNull().default('{}'), // 提供者特定配置
  isActive: boolType('is_active').notNull().default(true),
  sortOrder: intType('sort_order').notNull().default(0),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type AiProvider = InferSelectModel<typeof aiProvider>;

// AI模型表
export const aiModel = table('ai_model', {
  id: uuidType('id').primaryKey().notNull(),
  providerId: uuidType('provider_id').notNull(), // 关联提供者
  modelKey: varcharType('model_key', { length: 100 }).notNull(), // 模型标识符，如 'gpt-4o', 'qwen-max'
  displayName: varcharType('display_name', { length: 200 }).notNull(), // 显示名称
  description: textType('description'), // 描述
  modelType: varcharType('model_type', { enum: ['chat', 'image', 'embedding', 'reasoning'] }).notNull(), // 模型类型
  capabilities: jsonType('capabilities').notNull().default('[]'), // 能力列表，如 ['text', 'vision', 'function_calling']
  contextWindow: intType('context_window'), // 上下文窗口大小
  maxTokens: intType('max_tokens'), // 最大输出token数
  pricing: jsonType('pricing').notNull().default('{}'), // 定价信息 {input: 0.01, output: 0.03}
  configuration: jsonType('configuration').notNull().default('{}'), // 模型特定配置
  isActive: boolType('is_active').notNull().default(true),
  sortOrder: intType('sort_order').notNull().default(0),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type AiModel = InferSelectModel<typeof aiModel>;

// AI模型用途映射表 - 定义不同用途使用哪个模型（系统级别配置）
export const aiModelUsage = table('ai_model_usage', {
  id: uuidType('id').primaryKey().notNull(),
  usageType: varcharType('usage_type', { length: 50 }).notNull(), // 用途类型，如 'chat-model', 'title-model', 'artifact-model'
  modelId: uuidType('model_id').notNull(), // 关联模型
  projectId: uuidType('project_id'), // 保留字段但应为NULL（系统级别配置）
  userId: uuidType('user_id'), // 保留字段但应为NULL（系统级别配置）
  priority: intType('priority').notNull().default(0), // 优先级，数字越大优先级越高
  isActive: boolType('is_active').notNull().default(true),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type AiModelUsage = InferSelectModel<typeof aiModelUsage>;

// AI API密钥配置表（系统级别配置）
export const aiApiKey = table('ai_api_key', {
  id: uuidType('id').primaryKey().notNull(),
  providerId: uuidType('provider_id').notNull(), // 关联提供者
  keyName: varcharType('key_name', { length: 100 }).notNull(), // 密钥名称
  encryptedKey: textType('encrypted_key').notNull(), // 加密后的API密钥
  projectId: uuidType('project_id'), // 保留字段但应为NULL（系统级别配置）
  userId: uuidType('user_id'), // 保留字段但应为NULL（系统级别配置）
  isActive: boolType('is_active').notNull().default(true),
  expiresAt: timestampType('expires_at'), // 密钥过期时间
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type AiApiKey = InferSelectModel<typeof aiApiKey>;

// 测试运行表
export const testRun = table('test_case_run', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  runDate: timestampType('run_date').notNull(),
  status: varcharType('status', { enum: ['passed', 'failed', 'running', 'skipped'] }).notNull(),
  duration: intType('duration'), // 执行时长（秒）
  environment: varcharType('environment', { length: 100 }).notNull(),
  executor: varcharType('executor', { length: 100 }).notNull(), // 执行者
  results: jsonType('results').notNull().default('[]'), // JSON数组存储步骤结果
  errorMessage: textType('error_message'), // 错误信息
  logs: textType('logs'), // 执行日志
  screenshots: jsonType('screenshots').notNull().default('[]'), // 截图URL数组
  reportUrl: varcharType('report_url', { length: 500 }), // 测试报告URL
  createdAt: timestampType('created_at').notNull(),
});

export type TestRun = InferSelectModel<typeof testRun>;

// 已知问题表
export const knownIssue = table('test_case_issue', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  title: varcharType('title', { length: 500 }).notNull(),
  description: textType('description').notNull(),
  severity: varcharType('severity', { enum: ['critical', 'high', 'medium', 'low'] }).notNull(),
  status: varcharType('status', { enum: ['open', 'investigating', 'resolved', 'reopen'] }).notNull().default('open'),
  reporter: varcharType('reporter', { length: 100 }).notNull(),
  assignee: varcharType('assignee', { length: 100 }),
  bugUrl: varcharType('url', { length: 1000 }), // Bug跟踪系统链接
  workaround: textType('workaround'), // 临时解决方案
  category: varcharType('category', { length: 100 }), // 问题分类
  tags: jsonType('tags'), // 标签数组
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
  resolvedAt: timestampType('resolved_at'), // 解决时间
});

export type KnownIssue = InferSelectModel<typeof knownIssue>;

// 测试用例标签表（多对多关系）
export const testCaseTag = table('test_case_tag', {
  id: uuidType('id').primaryKey().notNull(),
  name: varcharType('name', { length: 100 }).notNull(),
  color: varcharType('color', { length: 7 }).notNull().default('#3B82F6'), // 十六进制颜色
  description: textType('description'),
  createdAt: timestampType('created_at').notNull(),
  createdBy: uuidType('created_by').notNull(),
});

export type TestCaseTag = InferSelectModel<typeof testCaseTag>;

// 测试用例标签关联表
export const testCaseTagRelation = table(
  'test_case_tag_relation',
  {
    testCaseId: uuidType('test_case_id').notNull(),
    tagId: uuidType('tag_id').notNull(),
    createdAt: timestampType('created_at').notNull(),
  },
  (tbl: any) => ({
    pk: primaryKey({ columns: [tbl.testCaseId, tbl.tagId] }),
  })
);

export type TestCaseTagRelation = InferSelectModel<typeof testCaseTagRelation>;

// 测试用例评论表
export const testCaseComment = table('test_case_comment', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  content: textType('content').notNull(),
  author: varcharType('author', { length: 255 }).notNull(), // 作者邮箱或名称
  authorType: varcharType('author_type', { enum: ['user', 'ai'] }).notNull().default('user'), // 作者类型
  commentType: varcharType('comment_type', { enum: ['suggestion', 'issue', 'risk', 'improvement', 'question', 'approval', 'general'] }).default('general'), // 评论类型
  category: varcharType('category', { length: 100 }), // 分类（测试覆盖率/清晰度/效率/可维护性/自动化/数据验证等）
  tags: jsonType('tags'), // 标签数组
  relatedStepId: uuidType('related_step_id'), // 关联的测试步骤ID
  attachments: jsonType('attachments'), // 附件链接数组
  parentId: uuidType('parent_id'), // 支持回复评论
  isResolved: boolType('is_resolved').notNull().default(false),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
});

export type TestCaseComment = InferSelectModel<typeof testCaseComment>;

// 测试用例历史版本表
export const testCaseHistory = table('test_case_history', {
  id: uuidType('id').primaryKey().notNull(),
  testCaseId: uuidType('test_case_id').notNull(),
  version: intType('version').notNull(),
  changeType: varcharType('change_type', { enum: ['created', 'updated', 'deleted', 'restored'] }).notNull(),
  changes: jsonType('changes').notNull(), // 变更内容的JSON
  changeDescription: textType('change_description'),
  changedBy: uuidType('changed_by').notNull(),
  createdAt: timestampType('created_at').notNull(),
});

export type TestCaseHistory = InferSelectModel<typeof testCaseHistory>;




// 仓库设置表 - 用于保存项目/文件夹的仓库配置
export const repositorySetting = table('repository_setting', {
  id: uuidType('id').primaryKey().notNull(),
  projectId: uuidType('project_id').notNull(),
  folderId: uuidType('folder_id'), // 可选：如果为 null 则为项目级别设置
  provider: varcharType('provider', { enum: ['github', 'gitlab', 'gitee', 'bitbucket', 'local'] }).notNull().default('github'),
  repoUrl: textType('repo_url').notNull(),
  defaultBranch: varcharType('default_branch', { length: 100 }).notNull().default('main'),
  authType: varcharType('auth_type', { enum: ['token', 'ssh', 'none'] }).notNull().default('token'),
  encryptedAccessToken: textType('encrypted_access_token'),
  sshPrivateKey: textType('ssh_private_key'),
  sshPublicKey: textType('ssh_public_key'),
  webhookSecret: textType('webhook_secret'),
  ciProvider: varcharType('ci_provider', { enum: ['github-actions', 'gitlab-ci', 'jenkins', 'none'] }).notNull().default('none'),
  settings: jsonType('settings').notNull().default('{}'),
  isActive: boolType('is_active').notNull().default(true),
  createdAt: timestampType('created_at').notNull(),
  updatedAt: timestampType('updated_at').notNull(),
  createdBy: uuidType('created_by').notNull(),
  updatedBy: uuidType('updated_by').notNull(),
});

export type RepositorySetting = InferSelectModel<typeof repositorySetting>;
