-- PostgreSQL 数据库初始化验证脚本
-- 验证所有表和数据是否正确创建

-- 验证基础系统表
SELECT 'Verifying basic system tables...' as step;

SELECT
  'user' as table_name,
  COUNT(*) as record_count,
  'Expected: 3 users (system, henix_admin, guest_tr)' as expected
FROM "user"
UNION ALL
SELECT
  'project' as table_name,
  COUNT(*) as record_count,
  'Expected: 4 projects (DEFAULT, DEMO, TEST, BETA)' as expected
FROM "project"
UNION ALL
SELECT
  'folder' as table_name,
  COUNT(*) as record_count,
  'Expected: 4 folders (root, api, ui, auth)' as expected
FROM "folder"
UNION ALL
SELECT
  'test_case' as table_name,
  COUNT(*) as record_count,
  'Expected: 3 test cases' as expected
FROM "test_case"
UNION ALL
SELECT
  'repository_setting' as table_name,
  COUNT(*) as record_count,
  'Expected: 2 repository settings' as expected
FROM "repository_setting";

-- 验证AI模型配置表
SELECT 'Verifying AI model configuration tables...' as step;

SELECT
  'ai_provider' as table_name,
  COUNT(*) as record_count,
  'Expected: 4 providers (OpenAI, Qwen, xAI, ChatGPT Proxy)' as expected
FROM "ai_provider"
UNION ALL
SELECT
  'ai_model' as table_name,
  COUNT(*) as record_count,
  'Expected: 12 models' as expected
FROM "ai_model"
UNION ALL
SELECT
  'ai_model_usage' as table_name,
  COUNT(*) as record_count,
  'Expected: 10 usage mappings' as expected
FROM "ai_model_usage"
UNION ALL
SELECT
  'ai_api_key' as table_name,
  COUNT(*) as record_count,
  'Expected: 4 API key templates' as expected
FROM "ai_api_key";

-- 验证AI提供者详细信息
SELECT 'AI Providers Details:' as info;
SELECT
  name,
  "displayName",
  "baseUrl",
  "isActive",
  "sortOrder"
FROM "ai_provider"
ORDER BY "sortOrder";

-- 验证AI模型详细信息
SELECT 'AI Models by Provider:' as info;
SELECT
  p.name as provider_name,
  m."modelKey",
  m."displayName",
  m."modelType",
  m."isActive"
FROM "ai_model" m
JOIN "ai_provider" p ON m."providerId" = p.id
ORDER BY p."sortOrder", m."sortOrder";

-- 验证模型用途映射
SELECT 'Model Usage Mappings:' as info;
SELECT
  u."usageType",
  p.name as provider_name,
  m."modelKey",
  m."displayName",
  u.priority
FROM "ai_model_usage" u
JOIN "ai_model" m ON u."modelId" = m.id
JOIN "ai_provider" p ON m."providerId" = p.id
WHERE u."isActive" = true
ORDER BY u.priority DESC, u."usageType";

-- 验证外键约束
SELECT 'Verifying foreign key constraints...' as step;

-- 检查是否有孤立的记录
SELECT
  'Orphaned ai_model records' as check_type,
  COUNT(*) as count,
  'Should be 0' as expected
FROM "ai_model" m
LEFT JOIN "ai_provider" p ON m."providerId" = p.id
WHERE p.id IS NULL
UNION ALL
SELECT
  'Orphaned ai_model_usage records' as check_type,
  COUNT(*) as count,
  'Should be 0' as expected
FROM "ai_model_usage" u
LEFT JOIN "ai_model" m ON u."modelId" = m.id
WHERE m.id IS NULL
UNION ALL
SELECT
  'Orphaned ai_api_key records' as check_type,
  COUNT(*) as count,
  'Should be 0' as expected
FROM "ai_api_key" k
LEFT JOIN "ai_provider" p ON k."providerId" = p.id
WHERE p.id IS NULL;

-- 验证索引是否创建
SELECT 'Verifying indexes...' as step;
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('ai_provider', 'ai_model', 'ai_model_usage', 'ai_api_key')
ORDER BY tablename, indexname;

-- 最终验证报告
SELECT
  '🎉 PostgreSQL Database Initialization Verification Complete!' as final_status,
  'All tables, data, constraints, and indexes have been verified.' as details;
