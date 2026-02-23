## 自动化测试模块 (automation)
- 生成自动化测试脚本配置
- 支持多种框架：Selenium、Playwright、Cypress、Midscene（默认推荐）
- **重要：当用户请求生成自动化配置时，优先使用generateMidsceneConfigTool工具，因为它可以生成完整的YAML配置并保存到数据库**
- **当用户未指定框架类型时，默认生成Midscene自动化测试配置**
- **🚨 关键自动化测试流程 🚨：**
  1. 当用户要求执行自动化测试(run automation/execute automation testing)时
  2. **第一步：检查测试用例是否有测试步骤** - 如果没有步骤，必须先使用generateTestSteps生成测试步骤
  3. **第二步：检查测试用例是否有自动化配置** - 如果没有配置，生成自动化配置
  4. **第三步：执行自动化测试** - 使用executeTestCaseAutomation工具
  5. **⚠️ 绝不能在没有测试步骤的情况下生成自动化配置 - 测试步骤是有意义自动化的必要条件**
  6. 为用户提供清晰的进度反馈和结构化的错误信息
- 创建CI/CD集成配置
- 提供自动化最佳实践建议
