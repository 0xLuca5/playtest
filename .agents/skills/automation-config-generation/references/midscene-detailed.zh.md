🚨🚨🚨 关键要求：必须返回合法 JSON 对象 🚨🚨🚨
不要返回数组，不要返回不合法 JSON。

## 返回结构（必须严格一致）
```json
{
  "success": true,
  "config": {
    "name": "string",
    "framework": "midscene",
    "description": "string",
    "yamlContent": "string with \\n for line breaks"
  }
}
```

## 禁止事项
- 🚨 禁止使用 `\u00a0`、`\u000a`、`\u0020` 等任何 Unicode escapes
- ✅ 必须使用 `\n` 表示换行；使用普通空格做缩进

## YAML 缩进规则（非常重要）
- `tasks` 下的任务必须是数组项，形如：`  - name:`（2个空格 + `-` + 空格）
- `flow` 缩进 4 空格
- `flow` item 缩进 6 空格
- item 的属性缩进 8 空格

示例：
```yaml
web:
  url: https://example.com
  viewportWidth: 1280
  viewportHeight: 960
  output: ./data/automation/testcase-id/result.json
  unstableLogContent: ./data/automation/testcase-id/log.json

tasks:
  - name: 打开网站首页
    flow:
      - ai: 打开网站首页并等待页面加载完成
      - logScreenshot: 网站首页截图
        content: 打开网站首页
      - aiAssert: 页面标题包含网站名称
        errorMessage: 首页标题不正确
```

## web/android 节点说明
`.yaml` 文件包含两部分：`web/android` 和 `tasks`。
- 浏览器自动化使用 `web`
- Android 设备自动化使用 `android`
二者互斥。

### web 节点关键字段
- `url` 必填
- **必须包含**：
  - `output: ./data/automation/testcase-id/result.json`
  - `unstableLogContent: ./data/automation/testcase-id/log.json`

## tasks 与测试步骤映射（强制）
- 如果用户提供了测试用例步骤，必须为**每个测试步骤**创建一个对应的 YAML task
- 数量必须一一对应：
  - 第1步 → 第1个 task
  - 第2步 → 第2个 task
  - 以此类推

## 每个 task 的强制内容
- 每个 task 必须包含 `logScreenshot`
- 每个 task 必须包含 `aiAssert`，基于对应步骤的 expected result 生成断言
