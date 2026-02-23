// 数据库表名迁移脚本 - 将驼峰命名改为下划线分割
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/sqlite.db');
console.log(`迁移数据库: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.log('❌ 数据库文件不存在，请先运行 init-db.js');
  process.exit(1);
}

const db = new Database(dbPath);

// 表名映射：旧表名 -> 新表名
const tableMapping = {
  'message_v2': 'message',
  'vote_v2': 'vote',
  'testcase': 'test_case',
  'teststep': 'test_step',
  'automationconfig': 'automation_config',
  'relatedrequirement': 'related_requirement',
  'testrun': 'test_run',
  'knownissue': 'known_issue',
  'testcasetag': 'test_case_tag',
  'testcasetagrelation': 'test_case_tag_relation',
  'testcasecomment': 'test_case_comment',
  'testcasehistory': 'test_case_history'
};

// 需要添加projectId字段的表
const addProjectIdTables = ['folder', 'test_case'];
const addProjectIdToDocument = true;

// 检查表是否存在的函数
function tableExists(tableName) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);
  return !!result;
}

// 获取表的所有数据
function getTableData(tableName) {
  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    return rows;
  } catch (error) {
    console.log(`⚠️ 无法读取表 ${tableName}: ${error.message}`);
    return [];
  }
}

// 获取表结构
function getTableSchema(tableName) {
  try {
    const result = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    return result ? result.sql : null;
  } catch (error) {
    console.log(`⚠️ 无法获取表结构 ${tableName}: ${error.message}`);
    return null;
  }
}

console.log('🚀 开始数据库表名迁移...');

// 开始事务
db.exec('BEGIN TRANSACTION');

// 首先创建project表（如果不存在）
if (!tableExists('project')) {
  console.log('\n📋 创建project表...');
  db.exec(`
    CREATE TABLE project (
      id TEXT PRIMARY KEY NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      key VARCHAR(50) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
      color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
      avatar TEXT,
      settings TEXT NOT NULL DEFAULT '{}',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      createdBy TEXT NOT NULL,
      updatedBy TEXT NOT NULL
    )
  `);

  // 插入默认项目
  db.exec(`
    INSERT INTO project (id, name, description, key, status, color, settings, createdAt, updatedAt, createdBy, updatedBy)
    VALUES ('default-project', 'Default Project', '默认项目', 'DEFAULT', 'active', '#3B82F6', '{}', ${Date.now()}, ${Date.now()}, 'system', 'system')
  `);

  console.log('✅ project表创建完成');
}

try {
  for (const [oldTableName, newTableName] of Object.entries(tableMapping)) {
    console.log(`\n📋 处理表: ${oldTableName} -> ${newTableName}`);
    
    // 检查旧表是否存在
    if (!tableExists(oldTableName)) {
      console.log(`⏭️ 旧表 ${oldTableName} 不存在，跳过`);
      continue;
    }
    
    // 检查新表是否已存在
    if (tableExists(newTableName)) {
      console.log(`⚠️ 新表 ${newTableName} 已存在，跳过迁移`);
      continue;
    }
    
    // 获取旧表的数据
    const data = getTableData(oldTableName);
    console.log(`📊 表 ${oldTableName} 有 ${data.length} 条记录`);
    
    // 获取表结构并修改表名
    const oldSchema = getTableSchema(oldTableName);
    if (!oldSchema) {
      console.log(`❌ 无法获取表 ${oldTableName} 的结构`);
      continue;
    }
    
    // 替换表名创建新表
    const newSchema = oldSchema.replace(
      new RegExp(`CREATE TABLE (IF NOT EXISTS )?${oldTableName}`, 'i'),
      `CREATE TABLE $1${newTableName}`
    );
    
    console.log(`🔨 创建新表 ${newTableName}`);
    db.exec(newSchema);
    
    // 如果有数据，迁移数据
    if (data.length > 0) {
      console.log(`📦 迁移 ${data.length} 条数据到 ${newTableName}`);
      
      // 获取列名
      const columns = Object.keys(data[0]);
      const columnList = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      
      // 准备插入语句
      const insertStmt = db.prepare(`
        INSERT INTO ${newTableName} (${columnList}) 
        VALUES (${placeholders})
      `);
      
      // 批量插入数据
      for (const row of data) {
        const values = columns.map(col => row[col]);
        insertStmt.run(values);
      }
      
      console.log(`✅ 数据迁移完成`);
    }
    
    // 删除旧表
    console.log(`🗑️ 删除旧表 ${oldTableName}`);
    db.exec(`DROP TABLE ${oldTableName}`);
    
    console.log(`✅ 表 ${oldTableName} -> ${newTableName} 迁移完成`);
  }
  
  // 重建索引（使用新的表名）
  console.log('\n🔧 重建索引...');
  db.exec(`
    DROP INDEX IF EXISTS idx_folder_parent;
    DROP INDEX IF EXISTS idx_folder_path;
    DROP INDEX IF EXISTS idx_testcase_folder;
    DROP INDEX IF EXISTS idx_testcase_status;
    DROP INDEX IF EXISTS idx_testcase_priority;
    DROP INDEX IF EXISTS idx_testcase_updated;
    DROP INDEX IF EXISTS idx_teststep_testcase;
    DROP INDEX IF EXISTS idx_teststep_number;
    DROP INDEX IF EXISTS idx_automation_testcase;
    DROP INDEX IF EXISTS idx_requirement_testcase;
    DROP INDEX IF EXISTS idx_dataset_testcase;
    DROP INDEX IF EXISTS idx_testrun_testcase;
    DROP INDEX IF EXISTS idx_testrun_date;
    DROP INDEX IF EXISTS idx_issue_testcase;
    DROP INDEX IF EXISTS idx_issue_status;
    DROP INDEX IF EXISTS idx_comment_testcase;
    DROP INDEX IF EXISTS idx_history_testcase;
    
    CREATE INDEX IF NOT EXISTS idx_folder_parent ON folder(parentId);
    CREATE INDEX IF NOT EXISTS idx_folder_path ON folder(path);
    CREATE INDEX IF NOT EXISTS idx_test_case_folder ON test_case(folderId);
    CREATE INDEX IF NOT EXISTS idx_test_case_status ON test_case(status);
    CREATE INDEX IF NOT EXISTS idx_test_case_priority ON test_case(priority);
    CREATE INDEX IF NOT EXISTS idx_test_case_updated ON test_case(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_test_case_step_testcase ON test_case_step(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_step_number ON test_case_step(testCaseId, stepNumber);
    CREATE INDEX IF NOT EXISTS idx_test_case_automation_config_testcase ON test_case_automation_config(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_requirement_testcase ON test_case_requirement(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_dataset_testcase ON test_case_dataset(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_run_testcase ON test_case_run(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_run_date ON test_case_run(runDate);
    CREATE INDEX IF NOT EXISTS idx_test_case_known_issue_testcase ON test_case_known_issue(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_test_case_known_issue_status ON test_case_known_issue(status);
    CREATE INDEX IF NOT EXISTS idx_comment_testcase ON test_case_comment(testCaseId);
    CREATE INDEX IF NOT EXISTS idx_history_testcase ON test_case_history(testCaseId);
  `);
  
  // 提交事务
  db.exec('COMMIT');
  console.log('\n✅ 数据库表名迁移完成！');
  
} catch (error) {
  // 回滚事务
  db.exec('ROLLBACK');
  console.error('\n❌ 迁移失败，已回滚:', error.message);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n🎉 迁移脚本执行完成');
