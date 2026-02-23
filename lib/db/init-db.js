// 初始化数据库
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// 生成UUID的辅助函数
function generateUUID() {
  return crypto.randomUUID();
}

// 确保数据库文件存在
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/sqlite.db');
console.log(`初始化数据库: ${dbPath}`);

// 如果文件不存在或大小为0，创建新的数据库文件
if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
  console.log('创建新的数据库文件...');
  const db = new Database(dbPath);

  // 启用外键约束
  db.pragma('foreign_keys = ON');
  console.log('SQLite外键约束已启用');

  // 创建用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      password TEXT
    );
  `);

  // 创建聊天表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private'
    );
  `);

  // 创建聊天与测试用例关联表（多对多关系）
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_test_case (
      id TEXT PRIMARY KEY NOT NULL,
      chat_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chat(id) ON DELETE CASCADE,
      FOREIGN KEY (test_case_id) REFERENCES test_case(id) ON DELETE CASCADE
    );
  `);

  // 创建消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY NOT NULL,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      parts TEXT NOT NULL,
      attachments TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 创建投票表
  db.exec(`
    CREATE TABLE IF NOT EXISTS vote (
      chat_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      is_upvoted INTEGER NOT NULL,
      PRIMARY KEY (chat_id, message_id)
    );
  `);

  // 创建文档表
  db.exec(`
    CREATE TABLE IF NOT EXISTS document (
      id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      kind TEXT NOT NULL DEFAULT 'text',
      user_id TEXT NOT NULL,
      project_id TEXT,
      PRIMARY KEY (id, created_at),
      FOREIGN KEY (project_id) REFERENCES project(id)
    );
  `);

  // 创建建议表
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestion (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL,
      document_created_at INTEGER NOT NULL,
      original_text TEXT NOT NULL,
      suggested_text TEXT NOT NULL,
      description TEXT,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 创建流表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream (
      id TEXT PRIMARY KEY NOT NULL,
      chat_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // ==================== 测试用例管理系统表 ====================

  // 创建项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      key VARCHAR(50) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
      color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
      avatar TEXT,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );
  `);

  // 创建仓库设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS repository_setting (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      folder_id TEXT,
      provider TEXT NOT NULL DEFAULT 'github',
      repo_url TEXT NOT NULL,
      default_branch TEXT NOT NULL DEFAULT 'main',
      auth_type TEXT NOT NULL DEFAULT 'token',
      encrypted_access_token TEXT,
      ssh_private_key TEXT,
      ssh_public_key TEXT,
      webhook_secret TEXT,
      ci_provider TEXT NOT NULL DEFAULT 'none',
      settings TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES project(id),
      FOREIGN KEY (folder_id) REFERENCES folder(id)
    );
  `);


  // 创建文件夹表
  db.exec(`
    CREATE TABLE IF NOT EXISTS folder (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      path TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES project(id),
      FOREIGN KEY (parent_id) REFERENCES folder(id) ON DELETE CASCADE
    );
  `);

  // 创建测试用例主表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      folder_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      preconditions TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'draft',
      weight TEXT NOT NULL DEFAULT 'medium',
      format TEXT NOT NULL DEFAULT 'classic',
      nature TEXT NOT NULL DEFAULT 'functional',
      type TEXT NOT NULL DEFAULT 'functional',
      tags TEXT NOT NULL DEFAULT '[]',
      execution_time INTEGER,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES project(id),
      FOREIGN KEY (folder_id) REFERENCES folder(id) ON DELETE CASCADE
    );
  `);

  // 创建测试步骤表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_step (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      action TEXT NOT NULL,
      expected TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建自动化配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_automation_config (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'main',
      commands TEXT NOT NULL,
      parameters TEXT NOT NULL DEFAULT '{}',
      framework TEXT NOT NULL DEFAULT 'midscene',
      browser TEXT NOT NULL DEFAULT 'chrome',
      environment TEXT NOT NULL DEFAULT 'test',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建相关需求表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_document (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      url TEXT,
      source TEXT,
      source_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建数据集表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_dataset (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'csv',
      configuration TEXT,
      columns TEXT NOT NULL,
      data TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建测试运行表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_run (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      run_date INTEGER NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER,
      environment TEXT NOT NULL,
      executor TEXT NOT NULL,
      results TEXT NOT NULL DEFAULT '[]',
      error_message TEXT,
      logs TEXT,
      screenshots TEXT NOT NULL DEFAULT '[]',
      report_url TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // 创建已知问题表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_issue (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      reporter TEXT NOT NULL,
      assignee TEXT,
      url TEXT,
      workaround TEXT,
      category TEXT,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
  `);

  // 创建测试用例标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_tag (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      description TEXT,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL
    );
  `);

  // 创建测试用例标签关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_tag_relation (
      test_case_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (test_case_id, tag_id)
    );
  `);

  // 创建测试用例评论表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_comment (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_type TEXT NOT NULL DEFAULT 'user',
      comment_type TEXT DEFAULT 'general',
      category TEXT,
      tags TEXT,
      related_step_id TEXT,
      attachments TEXT,
      parent_id TEXT,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建测试用例历史版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_history (
      id TEXT PRIMARY KEY NOT NULL,
      test_case_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      changes TEXT NOT NULL,
      change_description TEXT,
      changed_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // ==================== AI模型配置系统表 ====================

  // 创建AI提供者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_provider (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      base_url TEXT,
      api_key_required INTEGER NOT NULL DEFAULT 1,
      supported_features TEXT NOT NULL DEFAULT '[]',
      configuration TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 创建AI模型表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_model (
      id TEXT PRIMARY KEY NOT NULL,
      provider_id TEXT NOT NULL,
      model_key TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      model_type TEXT NOT NULL CHECK (model_type IN ('chat', 'image', 'embedding', 'reasoning')),
      capabilities TEXT NOT NULL DEFAULT '[]',
      context_window INTEGER,
      max_tokens INTEGER,
      pricing TEXT NOT NULL DEFAULT '{}',
      configuration TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES ai_provider(id)
    );
  `);

  // 创建AI模型用途映射表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_model_usage (
      id TEXT PRIMARY KEY NOT NULL,
      usage_type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      project_id TEXT,
      user_id TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (model_id) REFERENCES ai_model(id),
      FOREIGN KEY (project_id) REFERENCES project(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    );
  `);

  // 创建AI API密钥配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_api_key (
      id TEXT PRIMARY KEY NOT NULL,
      provider_id TEXT NOT NULL,
      key_name TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      project_id TEXT,
      user_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES ai_provider(id),
      FOREIGN KEY (project_id) REFERENCES project(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    );
  `);

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_key ON project(key);
    CREATE INDEX IF NOT EXISTS idx_project_status ON project(status);
    CREATE INDEX IF NOT EXISTS idx_folder_project ON folder(project_id);
    CREATE INDEX IF NOT EXISTS idx_folder_parent ON folder(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folder_path ON folder(path);
    CREATE INDEX IF NOT EXISTS idx_test_case_project ON test_case(project_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_folder ON test_case(folder_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_status ON test_case(status);
    CREATE INDEX IF NOT EXISTS idx_test_case_priority ON test_case(priority);
    CREATE INDEX IF NOT EXISTS idx_test_case_updated ON test_case(updated_at);
    CREATE INDEX IF NOT EXISTS idx_test_case_step_testcase ON test_case_step(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_step_number ON test_case_step(test_case_id, step_number);
    CREATE INDEX IF NOT EXISTS idx_test_case_automation_config_testcase ON test_case_automation_config(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_document_testcase ON test_case_document(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_dataset_testcase ON test_case_dataset(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_run_testcase ON test_case_run(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_run_date ON test_case_run(run_date);
    CREATE INDEX IF NOT EXISTS idx_test_case_issue_testcase ON test_case_issue(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_issue_status ON test_case_issue(status);

    -- 仓库设置相关索引
    CREATE INDEX IF NOT EXISTS idx_repository_setting_projectId ON repository_setting(project_id);
    CREATE INDEX IF NOT EXISTS idx_repository_setting_folderId ON repository_setting(folder_id);
    CREATE INDEX IF NOT EXISTS idx_repository_setting_isActive ON repository_setting(is_active);
    CREATE INDEX IF NOT EXISTS idx_repository_setting_updatedAt ON repository_setting(updated_at);

    CREATE INDEX IF NOT EXISTS idx_comment_testcase ON test_case_comment(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_history_testcase ON test_case_history(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_document_project ON document(project_id);
    CREATE INDEX IF NOT EXISTS idx_chat_test_case_chat ON chat_test_case(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chat_test_case_testcase ON chat_test_case(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_chat_test_case_composite ON chat_test_case(test_case_id, chat_id);
    -- AI模型配置相关索引
    CREATE INDEX IF NOT EXISTS idx_ai_provider_name ON ai_provider(name);
    CREATE INDEX IF NOT EXISTS idx_ai_provider_active ON ai_provider(is_active);
    CREATE INDEX IF NOT EXISTS idx_ai_model_provider ON ai_model(provider_id);
    CREATE INDEX IF NOT EXISTS idx_ai_model_key ON ai_model(model_key);
    CREATE INDEX IF NOT EXISTS idx_ai_model_type ON ai_model(model_type);
    CREATE INDEX IF NOT EXISTS idx_ai_model_active ON ai_model(is_active);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_model_usage(usage_type);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_model_usage(model_id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_project ON ai_model_usage(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_model_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_priority ON ai_model_usage(priority);
    CREATE INDEX IF NOT EXISTS idx_ai_key_provider ON ai_api_key(provider_id);
    CREATE INDEX IF NOT EXISTS idx_ai_key_project ON ai_api_key(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_key_user ON ai_api_key(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_key_active ON ai_api_key(is_active);
  `);

  // 插入示例数据
  console.log('插入示例数据...');

  // 插入示例项目
  db.exec(`
    INSERT OR IGNORE INTO project (id, name, description, key, status, color, avatar, settings, created_at, updated_at, created_by, updated_by)
    VALUES
      ('default-project', 'ICRM UK', '默认项目', 'DEFAULT', 'active', '#3B82F6', NULL, '{}', ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('demo-project', 'ICRM LU', '演示项目', 'DEMO', 'active', '#10B981', NULL, '{}', ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('test-project', 'EPAYMENT', '测试项目', 'TEST', 'active', '#F59E0B', NULL, '{}', ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('beta-project', 'TOES', 'Beta版本项目', 'BETA', 'active', '#EF4444', NULL, '{}', ${Date.now()}, ${Date.now()}, 'system', 'system');
  `);

  // 插入根文件夹 - default-project

  // 插入示例仓库设置
  db.exec(`
    INSERT OR IGNORE INTO repository_setting (id, project_id, folder_id, provider, repo_url, default_branch, auth_type, ci_provider, settings, is_active, created_at, updated_at, created_by, updated_by)
    VALUES
      ('repo-setting-default', 'default-project', NULL, 'github', 'https://github.com/company/ai-run', 'main', 'token', 'github-actions', '{}', 1, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('repo-setting-test', 'test-project', NULL, 'gitlab', 'https://gitlab.com/company/epayment', 'main', 'ssh', 'gitlab-ci', '{}', 1, ${Date.now()}, ${Date.now()}, 'system', 'system');
  `);

  db.exec(`
    INSERT OR IGNORE INTO folder (id, project_id, name, description, parent_id, path, level, sort_order, created_at, updated_at, created_by, updated_by)
    VALUES
      ('root-folder', 'default-project', 'Root', '根文件夹', NULL, '/Root', 0, 0, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('api-folder', 'default-project', 'API Tests', 'API接口测试', 'root-folder', '/Root/API Tests', 1, 1, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('ui-folder', 'default-project', 'UI Tests', 'UI界面测试', 'root-folder', '/Root/UI Tests', 1, 2, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('auth-folder', 'default-project', 'Authentication', '认证相关测试', 'ui-folder', '/Root/UI Tests/Authentication', 2, 1, ${Date.now()}, ${Date.now()}, 'system', 'system');
  `);

  // 插入根文件夹 - test-project
  db.exec(`
    INSERT OR IGNORE INTO folder (id, project_id, name, description, parent_id, path, level, sort_order, created_at, updated_at, created_by, updated_by)
    VALUES
      ('test-root-folder', 'test-project', 'Root', '根文件夹', NULL, '/Root', 0, 0, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('test-api-folder', 'test-project', 'API Tests', 'API接口测试', 'test-root-folder', '/Root/API Tests', 1, 1, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('test-ui-folder', 'test-project', 'UI Tests', 'UI界面测试', 'test-root-folder', '/Root/UI Tests', 1, 2, ${Date.now()}, ${Date.now()}, 'system', 'system'),
      ('test-auth-folder', 'test-project', 'Authentication', '认证相关测试', 'test-ui-folder', '/Root/UI Tests/Authentication', 2, 1, ${Date.now()}, ${Date.now()}, 'system', 'system');
  `);

  // 插入示例测试用例 - default-project
  db.exec(`
    INSERT OR IGNORE INTO test_case (id, project_id, folder_id, name, description, preconditions, priority, status, weight, format, nature, type, tags, execution_time, created_at, updated_at, created_by, updated_by)
    VALUES
      ('1-1-1', 'default-project', 'auth-folder', 'Login with valid user', 'Test the login functionality with valid user credentials to ensure proper authentication flow and user experience', 'User account must be created and activated. Application must be running and accessible. Database connection must be established.', 'high', 'work-in-progress', 'low', 'classic', 'functional', 'regression', '["login", "authentication", "smoke"]', 45, ${Date.now()}, ${Date.now()}, 'henix_admin', 'guest_tr'),
      ('1-1-2', 'default-project', 'auth-folder', 'Login with invalid credentials', 'Test login functionality with invalid credentials to ensure proper error handling', 'Application must be running and accessible', 'high', 'active', 'low', 'classic', 'functional', 'regression', '["login", "authentication", "negative"]', 30, ${Date.now()}, ${Date.now()}, 'henix_admin', 'henix_admin'),
      ('1-2-1', 'default-project', 'ui-folder', 'User profile update', 'Test user profile information update functionality', 'User must be logged in', 'medium', 'active', 'medium', 'classic', 'functional', 'regression', '["profile", "update"]', 60, ${Date.now()}, ${Date.now()}, 'henix_admin', 'henix_admin');
  `);

  // 插入示例测试用例 - test-project
  db.exec(`
    INSERT OR IGNORE INTO test_case (id, project_id, folder_id, name, description, preconditions, priority, status, weight, format, nature, type, tags, execution_time, created_at, updated_at, created_by, updated_by)
    VALUES
      ('test-1-1-1', 'test-project', 'test-auth-folder', 'Payment Login Test', 'Test the payment system login functionality with valid user credentials', 'Payment system must be running and accessible. Test user account must exist.', 'high', 'work-in-progress', 'medium', 'classic', 'functional', 'regression', '["payment", "login", "authentication"]', 60, ${Date.now()}, ${Date.now()}, 'test_admin', 'test_admin'),
      ('test-1-1-2', 'test-project', 'test-auth-folder', 'Payment Authentication Failure', 'Test payment system authentication with invalid credentials', 'Payment system must be running', 'high', 'active', 'low', 'classic', 'functional', 'regression', '["payment", "authentication", "negative"]', 45, ${Date.now()}, ${Date.now()}, 'test_admin', 'test_admin'),
      ('test-1-2-1', 'test-project', 'test-ui-folder', 'Payment UI Navigation', 'Test payment system UI navigation and user experience', 'User must be logged into payment system', 'medium', 'active', 'medium', 'classic', 'functional', 'regression', '["payment", "ui", "navigation"]', 90, ${Date.now()}, ${Date.now()}, 'test_admin', 'test_admin');
  `);

  // 插入示例测试步骤
  db.exec(`
    INSERT OR IGNORE INTO test_case_step (id, test_case_id, step_number, action, expected, type, notes, created_at, updated_at)
    VALUES
      ('step-1-1', '1-1-1', 1, 'Navigate to login page', 'Login page should be displayed with username and password fields', 'manual', 'Ensure browser is in incognito mode', ${Date.now()}, ${Date.now()}),
      ('step-1-2', '1-1-1', 2, 'Enter valid username and password', 'Credentials should be accepted without validation errors', 'manual', NULL, ${Date.now()}, ${Date.now()}),
      ('step-1-3', '1-1-1', 3, 'Click login button', 'User should be redirected to dashboard', 'manual', NULL, ${Date.now()}, ${Date.now()}),
      ('step-1-4', '1-1-1', 4, 'Verify user session', 'User session should be active and user info displayed', 'automated', NULL, ${Date.now()}, ${Date.now()});
  `);

  // 插入示例标签
  db.exec(`
    INSERT OR IGNORE INTO test_case_tag (id, name, color, description, created_at, created_by)
    VALUES
      ('tag-login', 'login', '#10B981', '登录相关测试', ${Date.now()}, 'system'),
      ('tag-auth', 'authentication', '#3B82F6', '认证相关测试', ${Date.now()}, 'system'),
      ('tag-smoke', 'smoke', '#F59E0B', '冒烟测试', ${Date.now()}, 'system'),
      ('tag-regression', 'regression', '#EF4444', '回归测试', ${Date.now()}, 'system'),
      ('tag-api', 'api', '#8B5CF6', 'API测试', ${Date.now()}, 'system'),
      ('tag-ui', 'ui', '#06B6D4', 'UI测试', ${Date.now()}, 'system');
  `);

  // 插入自动化配置示例数据
  db.exec(`
    INSERT OR IGNORE INTO test_case_automation_config (id, test_case_id, repository, branch, commands, parameters, framework, browser, environment, is_active, created_at, updated_at)
    VALUES
      ('auto-1-1-1', '1-1-1', 'https://github.com/company/test-automation', 'main',
       '["npm install", "npm run test:login", "npm run test:report"]',
       '{"browser": "chrome", "headless": "true", "timeout": "30000", "viewport": "1920x1080", "retries": "3"}',
       'midscene', 'chrome', 'test', 1, ${Date.now()}, ${Date.now()}),
      ('auto-1-1-2', '1-1-2', 'https://github.com/company/security-tests', 'develop',
       '["npm install", "npx playwright test login-negative", "npx playwright show-report"]',
       '{"browser": "firefox", "headless": "false", "timeout": "45000", "workers": "2", "retries": "1", "video": "retain-on-failure"}',
       'playwright', 'firefox', 'staging', 1, ${Date.now()}, ${Date.now()}),
      ('auto-1-2-1', '1-2-1', 'https://github.com/company/e2e-tests', 'feature/profile-tests',
       '["yarn install", "yarn cypress:run --spec \\"cypress/e2e/profile/**\\"", "yarn cypress:report"]',
       '{"browser": "chrome", "headless": "true", "timeout": "60000", "baseUrl": "https://staging.company.com", "video": "true", "screenshots": "true", "env": "staging"}',
       'cypress', 'chrome', 'staging', 1, ${Date.now()}, ${Date.now()});
  `);

  // 插入测试运行示例数据
  db.exec(`
    INSERT OR IGNORE INTO test_case_run (id, test_case_id, run_date, status, duration, environment, executor, results, error_message, logs, screenshots, created_at)
    VALUES
      ('run-1', '1-1-1', ${Date.now() - 86400000}, 'passed', 45, 'staging', 'john.doe',
       '[{"stepId": "step-1", "status": "passed", "duration": 15}, {"stepId": "step-2", "status": "passed", "duration": 10}, {"stepId": "step-3", "status": "passed", "duration": 20}]',
       NULL, 'Test completed successfully', '[]', ${Date.now() - 86400000}),
      ('run-2', '1-1-1', ${Date.now() - 172800000}, 'failed', 30, 'production', 'jane.smith',
       '[{"stepId": "step-1", "status": "passed", "duration": 15}, {"stepId": "step-2", "status": "failed", "duration": 15, "error": "Invalid credentials"}]',
       'Login failed with invalid credentials', 'Error: Element not found', '[]', ${Date.now() - 172800000}),
      ('run-3', '1-1-2', ${Date.now() - 43200000}, 'passed', 28, 'staging', 'security.bot',
       '[{"stepId": "step-1", "status": "passed", "duration": 8}, {"stepId": "step-2", "status": "passed", "duration": 12}, {"stepId": "step-3", "status": "passed", "duration": 8}]',
       NULL, 'Security test passed', '[]', ${Date.now() - 43200000}),
      ('run-4', '1-2-1', ${Date.now() - 21600000}, 'passed', 58, 'staging', 'cypress.runner',
       '[{"stepId": "step-1", "status": "passed", "duration": 12}, {"stepId": "step-2", "status": "passed", "duration": 18}, {"stepId": "step-3", "status": "passed", "duration": 15}, {"stepId": "step-4", "status": "passed", "duration": 13}]',
       NULL, 'Profile update test completed', '[]', ${Date.now() - 21600000});
  `);

  console.log('自动化配置示例数据插入完成');
  console.log('测试运行示例数据插入完成');

  // ==================== 插入AI模型配置初始数据 ====================
  console.log('插入AI模型配置初始数据...');

  const now = Date.now();

  // 生成提供者ID
  const openaiProviderId = generateUUID();
  const qwenProviderId = generateUUID();
  const xaiProviderId = generateUUID();
  const chatgptProxyProviderId = generateUUID();

  // 插入AI提供者
  db.exec(`
    INSERT OR IGNORE INTO ai_provider (id, name, display_name, description, base_url, api_key_required, supported_features, configuration, is_active, sort_order, created_at, updated_at)
    VALUES
      ('${openaiProviderId}', 'openai', 'OpenAI', 'OpenAI GPT models', 'https://api.openai.com/v1', 1, '["chat", "image", "embedding"]', '{}', 1, 1, ${now}, ${now}),
      ('${qwenProviderId}', 'qwen', 'Qwen (通义千问)', 'Alibaba Qwen models', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 1, '["chat", "image"]', '{}', 1, 2, ${now}, ${now}),
      ('${xaiProviderId}', 'xai', 'xAI', 'xAI Grok models', 'https://api.x.ai/v1', 1, '["chat", "reasoning"]', '{}', 1, 3, ${now}, ${now}),
      ('${chatgptProxyProviderId}', 'chatgpt-proxy', 'ChatGPT Proxy', 'ChatGPT models via proxy', 'https://api.qingyuntop.top/v1', 1, '["chat"]', '{}', 1, 4, ${now}, ${now});
  `);

  // 生成模型ID
  const gpt4oModelId = generateUUID();
  const gpt4oMiniModelId = generateUUID();
  const gpt4TurboModelId = generateUUID();
  const gpt35TurboModelId = generateUUID();
  const qwenMaxModelId = generateUUID();
  const qwenVlMaxModelId = generateUUID();
  const qwenPlusModelId = generateUUID();
  const grok2ModelId = generateUUID();
  const grok2VisionModelId = generateUUID();
  const grok3MiniModelId = generateUUID();
  const chatgptGpt4oModelId = generateUUID();
  const chatgptGpt4oMiniModelId = generateUUID();

  // 插入AI模型
  db.exec(`
    INSERT OR IGNORE INTO ai_model (id, provider_id, model_key, display_name, description, model_type, capabilities, context_window, max_tokens, pricing, configuration, is_active, sort_order, created_at, updated_at)
    VALUES
      -- OpenAI 模型
      ('${gpt4oModelId}', '${openaiProviderId}', 'gpt-4o', 'GPT-4o', 'Most capable GPT-4 model', 'chat', '["text", "vision", "function_calling"]', 128000, 4096, '{"input": 0.005, "output": 0.015}', '{}', 1, 1, ${now}, ${now}),
      ('${gpt4oMiniModelId}', '${openaiProviderId}', 'gpt-4o-mini', 'GPT-4o Mini', 'Faster, cheaper GPT-4o', 'chat', '["text", "vision", "function_calling"]', 128000, 16384, '{"input": 0.00015, "output": 0.0006}', '{}', 1, 2, ${now}, ${now}),
      ('${gpt4TurboModelId}', '${openaiProviderId}', 'gpt-4-turbo', 'GPT-4 Turbo', 'High-performance GPT-4 model', 'chat', '["text", "vision", "function_calling"]', 128000, 4096, '{"input": 0.01, "output": 0.03}', '{}', 1, 3, ${now}, ${now}),
      ('${gpt35TurboModelId}', '${openaiProviderId}', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model', 'chat', '["text", "function_calling"]', 16385, 4096, '{"input": 0.0005, "output": 0.0015}', '{}', 1, 4, ${now}, ${now}),

      -- Qwen 模型
      ('${qwenMaxModelId}', '${qwenProviderId}', 'qwen-max', 'Qwen Max', 'Most capable Qwen model', 'chat', '["text", "function_calling"]', 32000, 8192, '{"input": 0.002, "output": 0.006}', '{}', 1, 1, ${now}, ${now}),
      ('${qwenVlMaxModelId}', '${qwenProviderId}', 'qwen-vl-max-latest', 'Qwen VL Max', 'Qwen vision-language model', 'chat', '["text", "vision"]', 32000, 8192, '{"input": 0.002, "output": 0.006}', '{}', 1, 2, ${now}, ${now}),
      ('${qwenPlusModelId}', '${qwenProviderId}', 'qwen-plus', 'Qwen Plus', 'Balanced performance and cost', 'chat', '["text", "function_calling"]', 32000, 8192, '{"input": 0.001, "output": 0.003}', '{}', 1, 3, ${now}, ${now}),

      -- xAI 模型
      ('${grok2ModelId}', '${xaiProviderId}', 'grok-2-1212', 'Grok-2', 'xAI Grok-2 model', 'chat', '["text", "reasoning"]', 131072, 4096, '{"input": 0.002, "output": 0.01}', '{}', 1, 1, ${now}, ${now}),
      ('${grok2VisionModelId}', '${xaiProviderId}', 'grok-2-vision-1212', 'Grok-2 Vision', 'xAI Grok-2 with vision capabilities', 'chat', '["text", "vision", "reasoning"]', 131072, 4096, '{"input": 0.002, "output": 0.01}', '{}', 1, 2, ${now}, ${now}),
      ('${grok3MiniModelId}', '${xaiProviderId}', 'grok-3-mini-beta', 'Grok-3 Mini', 'Compact and efficient Grok model', 'reasoning', '["text", "reasoning"]', 65536, 2048, '{"input": 0.001, "output": 0.005}', '{}', 1, 3, ${now}, ${now}),

      -- ChatGPT Proxy 模型
      ('${chatgptGpt4oModelId}', '${chatgptProxyProviderId}', 'gpt-4o', 'GPT-4o (Proxy)', 'GPT-4o via proxy service', 'chat', '["text", "vision", "function_calling"]', 128000, 4096, '{"input": 0.005, "output": 0.015}', '{}', 1, 1, ${now}, ${now}),
      ('${chatgptGpt4oMiniModelId}', '${chatgptProxyProviderId}', 'gpt-4o-mini', 'GPT-4o Mini (Proxy)', 'GPT-4o Mini via proxy service', 'chat', '["text", "vision", "function_calling"]', 128000, 16384, '{"input": 0.00015, "output": 0.0006}', '{}', 1, 2, ${now}, ${now});
  `);

  // 插入默认模型用途映射（全局配置）
  db.exec(`
    INSERT OR IGNORE INTO ai_model_usage (id, usage_type, model_id, project_id, user_id, priority, is_active, created_at, updated_at)
    VALUES
      -- 主要聊天模型使用 Qwen Max
      ('${generateUUID()}', 'chat-model', '${qwenMaxModelId}', NULL, NULL, 100, 1, ${now}, ${now}),

      -- 推理模型使用 Grok-3 Mini
      ('${generateUUID()}', 'chat-model-reasoning', '${grok3MiniModelId}', NULL, NULL, 100, 1, ${now}, ${now}),

      -- 标题生成使用 Qwen Max
      ('${generateUUID()}', 'title-model', '${qwenMaxModelId}', NULL, NULL, 100, 1, ${now}, ${now}),

      -- 文档生成使用 Qwen Max
      ('${generateUUID()}', 'artifact-model', '${qwenMaxModelId}', NULL, NULL, 100, 1, ${now}, ${now}),

      -- 向后兼容性映射
      ('${generateUUID()}', 'qwen-max', '${qwenMaxModelId}', NULL, NULL, 100, 1, ${now}, ${now}),
      ('${generateUUID()}', 'gpt-4o', '${chatgptGpt4oModelId}', NULL, NULL, 100, 1, ${now}, ${now}),
      ('${generateUUID()}', 'gpt-4o-mini', '${chatgptGpt4oMiniModelId}', NULL, NULL, 100, 1, ${now}, ${now}),

      -- 特定用途的高级配置
      ('${generateUUID()}', 'vision-model', '${qwenVlMaxModelId}', NULL, NULL, 90, 1, ${now}, ${now}),
      ('${generateUUID()}', 'code-model', '${gpt4oModelId}', NULL, NULL, 90, 1, ${now}, ${now}),
      ('${generateUUID()}', 'analysis-model', '${grok2ModelId}', NULL, NULL, 90, 1, ${now}, ${now});
  `);

  // 插入示例API密钥配置（注意：这里使用占位符，实际使用时需要配置真实的加密密钥）
  db.exec(`
    INSERT OR IGNORE INTO ai_api_key (id, provider_id, key_name, encrypted_key, project_id, user_id, is_active, expires_at, created_at, updated_at)
    VALUES
      -- 全局配置示例（需要实际配置时替换为真实的加密密钥）
      ('${generateUUID()}', '${qwenProviderId}', 'Qwen Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_QWEN', NULL, NULL, 0, NULL, ${now}, ${now}),
      ('${generateUUID()}', '${openaiProviderId}', 'OpenAI Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_OPENAI', NULL, NULL, 0, NULL, ${now}, ${now}),
      ('${generateUUID()}', '${xaiProviderId}', 'xAI Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_XAI', NULL, NULL, 0, NULL, ${now}, ${now}),
      ('${generateUUID()}', '${chatgptProxyProviderId}', 'ChatGPT Proxy Global Key', 'ENCRYPTED_KEY_PLACEHOLDER_CHATGPT_PROXY', NULL, NULL, 0, NULL, ${now}, ${now});
  `);

  console.log('✅ AI提供者数据插入完成 (4个提供者)');
  console.log('✅ AI模型数据插入完成 (12个模型)');
  console.log('✅ 模型用途映射插入完成 (10个映射)');
  console.log('✅ API密钥配置模板插入完成 (4个配置)');
  console.log('⚠️  请注意：API密钥配置为占位符，需要通过管理界面或API配置真实密钥');

  console.log('示例数据插入完成');
  console.log('测试用例管理系统表创建完成');
  console.log('AI模型配置系统表创建完成');
  console.log('数据库表创建完成');
  db.close();
} else {
  console.log('数据库文件已存在，大小正常');
}

console.log('数据库初始化完成');