// 统一的工具配置管理器

import { executeTestCaseAutomation } from './testcase-automation';
import { createDocument } from './create-document';
import { updateDocument } from './update-document';
import { getWeather } from './get-weather';

import { createTestCaseTool } from './testcase-tools';
import { updateTestCaseTool } from './testcase-tools';
import { getConfluencePageTool, searchConfluencePagesTool } from './confluence-tools';
import type { SkillMetadata } from '../skills';
import { createLoadSkillTool, createReadFileTool } from '../skills';

export interface ToolConfig {
  mode: 'chat' | 'sidebar';
  session: any;
  dataStream?: any;
  chatId?: string;
  testcaseId?: string;
  projectId?: string;
  locale?: string;
  skills?: SkillMetadata[];
}

function withSkillsTools(tools: Record<string, any>, skills?: SkillMetadata[]) {
  if (!skills || skills.length === 0) {
    return tools;
  }

  return {
    ...tools,
    loadSkill: createLoadSkillTool({ skills }),
    readFile: createReadFileTool({ allowedBaseDirs: skills.map((s) => s.path) }),
  };
}

// 聊天模式工具集 - 需要渲染复杂消息
export function getChatModeTools(config: ToolConfig) {
  const { session, dataStream, chatId, testcaseId, projectId, locale, skills } = config;

  return withSkillsTools({
    getConfluencePage: getConfluencePageTool({ session, dataStream }),
    searchConfluencePages: searchConfluencePagesTool({ session, dataStream }),

    // 测试用例专用工具集 - 只保留核心工具，其他功能通过updateTestCase处理
    // 移除所有独立的测试用例工具，统一通过updateTestCase处理
    // generateTestSteps, updateTestSteps, generateAutomationConfig, generateMidsceneConfig,
    // analyzeTestCoverage, generateModuleContent 都通过 updateTestCase 工具处理

    // 文档工具 - 创建复杂的文档artifacts
    createDocument: createDocument({
      session,
      dataStream,
      chatId,
      projectId
    }),
    updateDocument: updateDocument({
      session,
      dataStream
    }),

    // 测试用例工具 - 创建测试用例artifacts
    createTestCase: createTestCaseTool({
      session,
      dataStream,
      chatId,
      projectId,
      locale,
    }),
    updateTestCase: updateTestCaseTool({
      testCaseId: testcaseId,
      session,
      saveToDb: true,
      dataStream
    }),

    // 测试用例自动化执行 - 直接使用侧边栏的成熟实现
    executeTestCaseAutomation: executeTestCaseAutomation({
      session,
      dataStream,
      chatId,
      locale
    }),

    // 其他测试执行和建议功能已整合到 updateTestCase 工具中

    // 移除天气工具 - 与测试无关
    // getWeather,
  }, skills);
}

// 侧边栏模式工具集 - 支持全面功能但简化渲染
export function getSidebarModeTools(config: ToolConfig) {
  const { session, dataStream, chatId, testcaseId, projectId, locale, skills } = config;

  return withSkillsTools({
    getConfluencePage: getConfluencePageTool({ session, dataStream }),
    searchConfluencePages: searchConfluencePagesTool({ session, dataStream }),

    // 只提供两个核心工具 - 简化 AI 决策

    // 测试用例自动化执行
    executeTestCaseAutomation: executeTestCaseAutomation({
      session,
      dataStream,
      chatId,
      locale
    }),

    // 文档工具 - 创建文档但不渲染复杂artifacts，只提供文本确认
    createDocument: createDocument({
      session,
      dataStream,
      chatId,
      projectId
    }),
    updateDocument: updateDocument({
      session,
      dataStream
    }),

    // 测试用例工具
    createTestCase: createTestCaseTool({
      session,
      dataStream,
      chatId,
      projectId,
      locale,
    }),
    updateTestCase: updateTestCaseTool({
      testCaseId: testcaseId,
      session,
      saveToDb: true,
      dataStream
    }),




  }, skills);
}

// 统一工具获取函数
export function getToolsForMode(config: ToolConfig) {
  switch (config.mode) {
    case 'chat':
      return getChatModeTools(config);
    case 'sidebar':
      return getSidebarModeTools(config);
    default:
      throw new Error(`Unknown tool mode: ${config.mode}`);
  }
}

// 工具模式说明
export const TOOL_MODE_DESCRIPTIONS = {
  chat: {
    en: 'Chat mode: Focused on helping users create new test cases from scratch and design comprehensive testing workflows.',
    zh: '聊天模式：专注于帮助用户从零开始创建新测试用例和设计全面的测试工作流程。',
    ja: 'チャットモード：ユーザーがゼロから新しいテストケースを作成し、包括的なテストワークフローを設計することに焦点を当てています。'
  },
  sidebar: {
    en: 'Sidebar mode: Focused on optimizing and enhancing the current test case context.',
    zh: '侧边栏模式：专注于优化和完善当前测试用例的上下文。',
    ja: 'サイドバーモード：現在のテストケースコンテキストの最適化と改善に焦点を当てています。'
  }
} as const;
