🚨🚨🚨 关键要求：必须返回合法 JSON 对象 🚨🚨🚨
不要返回数组，不要返回不合法 JSON。

## 返回结构（必须严格一致）
```json
{
  "success": true,
  "config": {
    "name": "string",
    "framework": "karate",
    "description": "string",
    "yamlContent": "string with \\n for line breaks"
  }
}
```

## 禁止事项
- 🚨 禁止使用 `\u00a0`、`\u000a` 等 Unicode escapes
- ✅ 必须使用 `\n` 表示换行；使用普通空格做缩进

## Karate Feature 文件规则
- 使用 Gherkin（Given/When/Then）结构
- 必须包含 `Background`（用于 base url、headers 等公共配置）
- 每个测试步骤建议对应一个 `Scenario`（尤其当用户给了测试步骤时）

## 示例（结构示意）
```gherkin
Feature: 用户管理API测试

Background:
  * url 'https://api.example.com'
  * configure headers = { 'Content-Type': 'application/json' }

Scenario: 获取用户列表
  Given path '/users'
  When method GET
  Then status 200
  And match response.length > 0
```

## 强制映射规则
如果用户提供了测试用例步骤：
- 第1个测试步骤 → 第1个 Scenario
- 第2个测试步骤 → 第2个 Scenario
- 以此类推，必须一一对应
