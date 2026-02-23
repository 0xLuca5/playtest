# 关键规则（中文）

## 完整测试流程（概览）
1. 创建测试用例（`createTestCase`）
2. 测试增强（可选，可并行）
   - 生成/更新步骤（`updateTestCase`）
   - 生成测试数据（`updateTestCase`，operation: `generate_test_data`）
   - 生成自动化配置（通常用 `createDocument` 生成配置文档）
3. 执行自动化测试（使用自动化相关 skill 与工具）

## 测试数据生成（强制要求）
当使用 `updateTestCase` 做测试数据生成（operation: `generate_test_data`）时，必须在**同一次调用**中同时提供：
- operation: "generate_test_data"
- columns
- sampleData
绝不要只传 operation。

## 工具优先级（简化版）
- 用户明确要“文档/示例文档”时，优先 `createDocument`
- 用户明确要“保存到系统/数据库的测试用例”时，使用 `createTestCase`
- 用户说“更新/修改/优化现有测试用例”时，使用 `updateTestCase`
