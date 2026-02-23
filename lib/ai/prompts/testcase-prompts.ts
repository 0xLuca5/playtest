// 测试用例助手的多语言prompt配置

import path from 'node:path';
import fs from 'node:fs';

export interface TestCasePromptConfig {
  systemPrompt: string;
  toolCallRules: string;
  violationWarning: string;
  correctBehavior: string;
  basicInfo: string;
  classificationInfo: string;
  timeInfo: string;
  testStepsDetail: string;
  relatedInfo: string;
  importantReminder: string;
  supportedModules: string;
  testCaseModule: string;
  automationModule: string;
  dataModule: string;
  finalReminder: string;
  // 新增：更新测试用例的提示词
  updatePrompt: {
    currentTestCase: string;
    guidelines: string;
    requestAnalysis: string;
    languageRequirement: string;
    automationRequirement: string;
    userMessage: string;
  };
}

export const testCasePrompts: Record<string, TestCasePromptConfig> = {
  en: {
    systemPrompt: "You are a test case assistant with access to tools that can create and modify test cases in the database. When users ask you to perform actions, use the appropriate tools to help them. {ROLE_DESCRIPTION}",
    
    toolCallRules: "[testcase-prompts] Missing markdown prompt: tool-call-rules",
    
    violationWarning: "[testcase-prompts] Missing markdown prompt: violation-warning",
    
    correctBehavior: "[testcase-prompts] Missing markdown prompt: correct-behavior",
    
    basicInfo: "**Basic Information**:",
    classificationInfo: "**Classification Information**:",
    timeInfo: "**Time Information**:",
    testStepsDetail: "**Test Steps Details**:",
    relatedInfo: "**Related Information**:",
    
    importantReminder: "[testcase-prompts] Missing markdown prompt: important-reminder",
    
    supportedModules: "[testcase-prompts] Missing markdown prompt: supported-modules",
    
    testCaseModule: "[testcase-prompts] Missing markdown prompt: testcase-module",
    
    automationModule: "[testcase-prompts] Missing markdown prompt: automation-module",
    
    dataModule: "[testcase-prompts] Missing markdown prompt: data-module",

    finalReminder: "[testcase-prompts] Missing markdown prompt: final-reminder",

    updatePrompt: {
      currentTestCase: "Current test case being operated:",
      guidelines: '[testcase-prompts] Missing markdown reference: update-guidelines',
      requestAnalysis: '[testcase-prompts] Missing markdown reference: update-request-analysis',
      languageRequirement: '[testcase-prompts] Missing markdown reference: update-language-requirement',
      automationRequirement: '[testcase-prompts] Missing markdown reference: update-automation-requirement',
      userMessage: '[testcase-prompts] Missing markdown reference: update-user-message'
    }
  },

  zh: {
    systemPrompt: "您是一个测试用例助手，可以访问创建和修改数据库中测试用例的工具。当用户要求您执行操作时，请使用适当的工具来帮助他们。{ROLE_DESCRIPTION}",
    
    toolCallRules: "[testcase-prompts] Missing markdown prompt: tool-call-rules",
    
    violationWarning: "[testcase-prompts] Missing markdown prompt: violation-warning",
    
    correctBehavior: "[testcase-prompts] Missing markdown prompt: correct-behavior",
    
    basicInfo: "**基本信息**：",
    classificationInfo: "**分类信息**：",
    timeInfo: "**时间信息**：",
    testStepsDetail: "**测试步骤详情**：",
    relatedInfo: "**关联信息**：",
    
    importantReminder: "[testcase-prompts] Missing markdown prompt: important-reminder",
    
    supportedModules: "[testcase-prompts] Missing markdown prompt: supported-modules",
    
    testCaseModule: "[testcase-prompts] Missing markdown prompt: testcase-module",
    
    automationModule: "[testcase-prompts] Missing markdown prompt: automation-module",
    
    dataModule: "[testcase-prompts] Missing markdown prompt: data-module",

    finalReminder: "[testcase-prompts] Missing markdown prompt: final-reminder",

    updatePrompt: {
      currentTestCase: "当前操作的测试用例：",
      guidelines: '[testcase-prompts] Missing markdown reference: update-guidelines',
      requestAnalysis: '[testcase-prompts] Missing markdown reference: update-request-analysis',
      languageRequirement: '[testcase-prompts] Missing markdown reference: update-language-requirement',
      automationRequirement: '[testcase-prompts] Missing markdown reference: update-automation-requirement',
      userMessage: '[testcase-prompts] Missing markdown reference: update-user-message'
    }
  },

  ja: {
    systemPrompt: "あなたはデータベース内のテストケースを作成・修正できるツールにアクセス可能なテストケースアシスタントです。ユーザーがアクションを求めた場合は、適切なツールを使用してサポートしてください。{ROLE_DESCRIPTION}",
    
    toolCallRules: "[testcase-prompts] Missing markdown prompt: tool-call-rules",
    
    violationWarning: "[testcase-prompts] Missing markdown prompt: violation-warning",
    
    correctBehavior: "[testcase-prompts] Missing markdown prompt: correct-behavior",
    
    basicInfo: "**基本情報**：",
    classificationInfo: "**分類情報**：",
    timeInfo: "**時間情報**：",
    testStepsDetail: "**テストステップ詳細**：",
    relatedInfo: "**関連情報**：",
    
    importantReminder: "[testcase-prompts] Missing markdown prompt: important-reminder",
    
    supportedModules: "[testcase-prompts] Missing markdown prompt: supported-modules",
    
    testCaseModule: "[testcase-prompts] Missing markdown prompt: testcase-module",
    
    automationModule: "[testcase-prompts] Missing markdown prompt: automation-module",
    
    dataModule: "[testcase-prompts] Missing markdown prompt: data-module",

    finalReminder: "[testcase-prompts] Missing markdown prompt: final-reminder",

    updatePrompt: {
      currentTestCase: "現在操作中のテストケース：",
      guidelines: '[testcase-prompts] Missing markdown reference: update-guidelines',
      requestAnalysis: '[testcase-prompts] Missing markdown reference: update-request-analysis',
      languageRequirement: '[testcase-prompts] Missing markdown reference: update-language-requirement',
      automationRequirement: '[testcase-prompts] Missing markdown reference: update-automation-requirement',
      userMessage: '[testcase-prompts] Missing markdown reference: update-user-message'
    }
  }
};

export function resolveUpdatePromptFromMarkdown(params: {
  locale: string;
  testCaseId?: string;
  updateRequest?: string;
  fallback: TestCasePromptConfig['updatePrompt'];
}): TestCasePromptConfig['updatePrompt'] {
  const normalizedLocale = params.locale === 'zh' || params.locale === 'ja' ? params.locale : 'en';

  const readRef = (name: string) => {
    const filePath = path.join(
      process.cwd(),
      '.agents',
      'skills',
      'testcase-authoring',
      'references',
      `${name}.${normalizedLocale}.md`,
    );

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  };

  const applyParams = (input: string) =>
    input
      .replaceAll('{testCaseId}', params.testCaseId ?? '{testCaseId}')
      .replaceAll('{updateRequest}', params.updateRequest ?? '{updateRequest}');

  const currentTestCase = readRef('update-current-testcase') ?? params.fallback.currentTestCase;
  const guidelines = readRef('update-guidelines') ?? params.fallback.guidelines;
  const requestAnalysis = readRef('update-request-analysis') ?? params.fallback.requestAnalysis;
  const languageRequirement = readRef('update-language-requirement') ?? params.fallback.languageRequirement;
  const automationRequirement = readRef('update-automation-requirement') ?? params.fallback.automationRequirement;
  const userMessage = readRef('update-user-message') ?? params.fallback.userMessage;

  return {
    currentTestCase,
    guidelines: applyParams(guidelines),
    requestAnalysis: applyParams(requestAnalysis),
    languageRequirement,
    automationRequirement,
    userMessage: applyParams(userMessage),
  };
}

// 统一的测试系统prompt生成器
export function generateUnifiedTestPrompt(config: {
  locale: string;
  mode: 'chat' | 'sidebar';
  testCaseContext?: any;
  requestHints?: any;
}): string {
  const { locale, mode, testCaseContext, requestHints } = config;

  // 根据模式选择不同的角色描述
  const roleDescription = mode === 'chat'
    ? 'You are a professional test automation assistant. You help users with comprehensive testing workflows including test case management, test documentation, automation configuration, and test execution.'
    : 'You are a specialized test case assistant focused on helping users manage and optimize the current test case.';

  return generateSystemPrompt(locale, testCaseContext, roleDescription, mode);
}

// 获取角色描述
function getRoleDescription(locale: string, mode: 'chat' | 'sidebar'): string {
  const descriptions = {
    en: {
      chat: 'You are a professional test automation assistant. You help users with comprehensive testing workflows, with a focus on helping users create new test cases from scratch, design test plans, generate test documentation, and set up complete testing projects. You excel at guiding users through the entire testing lifecycle from initial planning to execution.',
      sidebar: 'You are a professional test automation assistant focused on helping users optimize and enhance their current test case. You specialize in improving existing test cases, adding test steps, refining test scenarios, updating test data, and perfecting the current test case context.'
    },
    zh: {
      chat: '你是一个专业的测试自动化助手。你帮助用户处理全面的测试工作流程，专注于帮助用户从零开始创建新的测试用例、设计测试计划、生成测试文档和建立完整的测试项目。你擅长引导用户完成从初始规划到执行的整个测试生命周期。',
      sidebar: '你是一个专业的测试自动化助手，专注于帮助用户优化和完善当前的测试用例。你专长于改进现有测试用例、添加测试步骤、完善测试场景、更新测试数据，以及优化当前测试用例的上下文。'
    },
    ja: {
      chat: 'あなたは専門的なテスト自動化アシスタントです。包括的なテストワークフローでユーザーを支援し、特にユーザーがゼロから新しいテストケースを作成し、テスト計画を設計し、テストドキュメントを生成し、完全なテストプロジェクトを構築することに焦点を当てています。初期計画から実行まで、テストライフサイクル全体を通じてユーザーをガイドすることに長けています。',
      sidebar: 'あなたは現在のテストケースの最適化と改善に焦点を当てた専門的なテスト自動化アシスタントです。既存のテストケースの改善、テストステップの追加、テストシナリオの改良、テストデータの更新、現在のテストケースコンテキストの完善を専門としています。'
    }
  };

  return descriptions[locale as keyof typeof descriptions]?.[mode] || descriptions.en[mode];
}

// 重构原有函数，支持模式参数
export function generateSystemPrompt(locale: string, testCaseContext: any, customRole?: string, mode?: 'chat' | 'sidebar'): string {
  const prompts = testCasePrompts[locale] || testCasePrompts.en;

  const readTestcaseAuthoringPrompt = (name: string) => {
    const normalizedLocale = locale === 'zh' || locale === 'ja' ? locale : 'en';
    const filePath = path.join(
      process.cwd(),
      '.agents',
      'skills',
      'testcase-authoring',
      'prompts',
      `${name}.${normalizedLocale}.md`,
    );

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  };

  const toolCallRules = readTestcaseAuthoringPrompt('tool-call-rules') ?? prompts.toolCallRules;
  const violationWarning = readTestcaseAuthoringPrompt('violation-warning') ?? prompts.violationWarning;
  const correctBehavior = readTestcaseAuthoringPrompt('correct-behavior') ?? prompts.correctBehavior;
  const importantReminder = readTestcaseAuthoringPrompt('important-reminder') ?? prompts.importantReminder;
  const supportedModules = readTestcaseAuthoringPrompt('supported-modules') ?? prompts.supportedModules;
  const testCaseModule = readTestcaseAuthoringPrompt('testcase-module') ?? prompts.testCaseModule;
  const automationModule = readTestcaseAuthoringPrompt('automation-module') ?? prompts.automationModule;
  const dataModule = readTestcaseAuthoringPrompt('data-module') ?? prompts.dataModule;
  const finalReminder = readTestcaseAuthoringPrompt('final-reminder') ?? prompts.finalReminder;

  // 根据语言选择工具调用示例和标签
  const getToolExamples = () => {
    const normalizedLocale = locale === 'zh' || locale === 'ja' ? locale : 'en';
    const filePath = path.join(
      process.cwd(),
      '.agents',
      'skills',
      'testcase-authoring',
      'references',
      `tool-examples.${normalizedLocale}.md`,
    );

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      switch (locale) {
        case 'zh':
          return `1. **生成测试步骤** - 用户说"生成步骤"、"帮我生成测试步骤"、"生成3个步骤"等 → 必须调用 generateTestSteps 工具
2. **生成midscene配置** - 用户说"生成midscene配置"、"帮我生成midscene配置"等 → 必须调用 generateMidsceneConfig 工具
3. **更新测试用例基本信息** - 用户说"更新测试用例"、"修改测试用例信息"、"更新名称"、"修改描述"等 → 必须调用 updateTestCase 工具
4. **更新特定测试步骤** - 用户说"更新测试步骤第一步"、"修改第二步的预期结果"、"更新步骤的操作"、"修改步骤内容"等 → 必须调用 updateTestSteps 工具
5. **创建文档** - 用户说"生成文档"、"生成代码"、"生成数据"、"创建文档"、"写一个文档"、"帮我生成"、"编写代码"等 → 必须调用 createDocument 工具，并选择合适类型：text(文本文档)、sheet(数据表格文档)、code(代码)
6. **更新文档** - 用户说"更新文档"、"修改文档"、"编辑文档"、"改进文档"、"优化文档"等 → 必须调用 updateDocument 工具

**重要：文档工具调用后的行为规范**：
- 调用 createDocument 或 updateDocument 工具后，不要在聊天中重复输出文档内容
- 工具会自动生成并显示文档内容，你只需简单确认操作完成
- 避免在工具调用后生成与文档内容重复或不一致的代码/文本`;
        case 'ja':
          return `1. **テストステップ生成** - ユーザーが「ステップを生成」、「テストステップを生成して」、「3つのステップを生成」などと言った場合 → generateTestSteps ツールを呼び出す必要があります
2. **midscene設定生成** - ユーザーが「midscene設定を生成」、「midscene設定を生成して」などと言った場合 → generateMidsceneConfig ツールを呼び出す必要があります
3. **テストケース基本情報更新** - ユーザーが「テストケースを更新」、「テストケース情報を修正」、「名前を更新」、「説明を修正」などと言った場合 → updateTestCase ツールを呼び出す必要があります
4. **特定テストステップ更新** - ユーザーが「テストステップの第1ステップを更新」、「第2ステップの期待結果を修正」、「ステップの操作を更新」、「ステップ内容を修正」などと言った場合 → updateTestSteps ツールを呼び出す必要があります
5. **文書作成** - ユーザーが「文書を生成」、「コードを生成」、「データを生成」、「文書を作成」、「文書を書く」、「生成を手伝って」、「コードを書く」などと言った場合 → createDocument ツールを呼び出し、適切なタイプを選択：text(テキスト文書)、sheet(データ表文書)、code(コード)
6. **文書更新** - ユーザーが「文書を更新」、「文書を修正」、「文書を編集」、「文書を改善」、「文書を最適化」などと言った場合 → updateDocument ツールを呼び出す必要があります

**重要：文書ツール呼び出し後の行動ガイドライン**：
- createDocument または updateDocument ツールを呼び出した後、チャットで文書内容を繰り返さない
- ツールが自動的に文書内容を生成・表示するため、操作完了の簡単な確認のみ必要
- ツール呼び出し後に文書内容と重複または矛盾するコード/テキストの生成を避ける`;
        default:
          return `1. **createTestCase** - Creates new test cases with specified properties and saves them to the database
2. **updateTestCase** - Modifies existing test cases including basic information, steps, automation configuration, and analysis
3. **createDocument** - Generates various types of documents (text, data tables, code)
4. **updateDocument** - Modifies existing documents
5. **executeTestCaseAutomation** - Runs automated tests for test cases
6. **requestSuggestions** - Provides suggestions and recommendations

**Important: Behavior Guidelines After Document Tool Calls**:
- After calling createDocument or updateDocument tools, do not repeat the document content in chat
- The tools will automatically generate and display document content, you only need to briefly confirm the operation is complete
- Avoid generating code/text that duplicates or conflicts with the document content after tool calls`;
      }
    }
  };

  const getLabels = () => {
    switch (locale) {
      case 'zh':
        return {
          currentInfo: '**当前测试用例完整信息**：',
          id: 'ID', name: '名称', description: '描述', preconditions: '前置条件',
          priority: '优先级', status: '状态', weight: '权重', format: '格式',
          nature: '性质', type: '类型', tags: '标签',
          createdAt: '创建时间', updatedAt: '更新时间', creator: '创建者', modifier: '修改者',
          executionTime: '执行时长', lastRun: '最后运行',
          relatedRequirements: '相关需求', datasets: '数据集', knownIssues: '已知问题',
          unknown: '未知', none: '无', noSteps: '暂无测试步骤', noRun: '未运行',
          minutes: '分钟', action: '操作', expected: '预期结果', notes: '备注'
        };
      case 'ja':
        return {
          currentInfo: '**現在のテストケース完全情報**：',
          id: 'ID', name: '名前', description: '説明', preconditions: '前提条件',
          priority: '優先度', status: 'ステータス', weight: '重み', format: 'フォーマット',
          nature: '性質', type: 'タイプ', tags: 'タグ',
          createdAt: '作成時間', updatedAt: '更新時間', creator: '作成者', modifier: '修正者',
          executionTime: '実行時間', lastRun: '最後の実行',
          relatedRequirements: '関連要件', datasets: 'データセット', knownIssues: '既知の問題',
          unknown: '不明', none: 'なし', noSteps: 'テストステップなし', noRun: '未実行',
          minutes: '分', action: 'アクション', expected: '期待結果', notes: '備考'
        };
      default:
        return {
          currentInfo: '**Current Test Case Complete Information**:',
          id: 'ID', name: 'Name', description: 'Description', preconditions: 'Preconditions',
          priority: 'Priority', status: 'Status', weight: 'Weight', format: 'Format',
          nature: 'Nature', type: 'Type', tags: 'Tags',
          createdAt: 'Created At', updatedAt: 'Updated At', creator: 'Creator', modifier: 'Modifier',
          executionTime: 'Execution Time', lastRun: 'Last Run',
          relatedRequirements: 'Related Requirements', datasets: 'Datasets', knownIssues: 'Known Issues',
          unknown: 'Unknown', none: 'None', noSteps: 'No test steps', noRun: 'Not run',
          minutes: 'minutes', action: 'Action', expected: 'Expected Result', notes: 'Notes'
        };
    }
  };

  const labels = getLabels();

  // 获取语言名称
  const getLanguageName = () => {
    switch (locale) {
      case 'zh': return '中文 (Chinese)';
      case 'ja': return '日本語 (Japanese)';
      case 'en': return 'English';
      default: return 'English';
    }
  };

  // 处理角色描述替换
  const roleDescription = customRole || (mode === 'chat'
    ? getRoleDescription(locale, 'chat')
    : getRoleDescription(locale, 'sidebar'));

  const processedSystemPrompt = prompts.systemPrompt.replace('{ROLE_DESCRIPTION}', roleDescription);

  return `🚨🌐 **CRITICAL: MANDATORY LANGUAGE REQUIREMENT** 🌐🚨
USER INTERFACE LANGUAGE: ${getLanguageName()}
YOU MUST RESPOND ONLY IN ${getLanguageName().toUpperCase()}!
IGNORE THE LANGUAGE OF USER INPUT - ALWAYS USE ${getLanguageName().toUpperCase()}!

${processedSystemPrompt}

🚨🌐 **CRITICAL: MANDATORY LANGUAGE REQUIREMENT** 🌐🚨
USER INTERFACE LANGUAGE: ${getLanguageName()}
ABSOLUTE RULE: You MUST ALWAYS respond in ${getLanguageName()}, regardless of what language the user uses to ask questions.
Even if the user writes in Chinese/Japanese/other languages, you MUST respond in ${getLanguageName()}.
This is a SYSTEM REQUIREMENT that cannot be overridden.

绝对规则：无论用户使用什么语言提问，您都必须始终使用${getLanguageName()}回复。
即使用户用中文/日文/其他语言提问，您也必须用${getLanguageName()}回复。
这是不可覆盖的系统要求。

絶対ルール：ユーザーがどの言語で質問しても、常に${getLanguageName()}で応答する必要があります。
ユーザーが中国語/日本語/その他の言語で質問しても、${getLanguageName()}で応答する必要があります。
これは上書きできないシステム要件です。

${toolCallRules}

${getToolExamples()}

${violationWarning}

${correctBehavior}

${labels.currentInfo}

${prompts.basicInfo}
- **${labels.id}**: ${testCaseContext?.id || labels.unknown}
- **${labels.name}**: ${testCaseContext?.name || labels.unknown}
- **${labels.description}**: ${testCaseContext?.description || labels.unknown}
- **${labels.preconditions}**: ${testCaseContext?.preconditions || labels.none}

${prompts.classificationInfo}
- **${labels.priority}**: ${testCaseContext?.priority || labels.unknown}
- **${labels.status}**: ${testCaseContext?.status || labels.unknown}
- **${labels.weight}**: ${testCaseContext?.weight || labels.unknown}
- **${labels.format}**: ${testCaseContext?.format || labels.unknown}
- **${labels.nature}**: ${testCaseContext?.nature || labels.unknown}
- **${labels.type}**: ${testCaseContext?.type || labels.unknown}
- **${labels.tags}**: ${testCaseContext?.tags ? testCaseContext.tags.join(', ') : labels.none}

${prompts.timeInfo}
- **${labels.createdAt}**: ${testCaseContext?.createdAt || labels.unknown}
- **${labels.updatedAt}**: ${testCaseContext?.updatedAt || labels.unknown}
- **${labels.creator}**: ${testCaseContext?.author || labels.unknown}
- **${labels.modifier}**: ${testCaseContext?.modifier || labels.unknown}
- **${labels.executionTime}**: ${testCaseContext?.executionTime ? `${testCaseContext.executionTime}${labels.minutes}` : labels.unknown}
- **${labels.lastRun}**: ${testCaseContext?.lastRun || labels.noRun}

${prompts.testStepsDetail}
${testCaseContext?.steps && testCaseContext.steps.length > 0
  ? testCaseContext.steps.map((step: any, index: number) =>
      `${index + 1}. **${labels.action}**: ${step.action}\n   **${labels.expected}**: ${step.expected}${step.notes ? `\n   **${labels.notes}**: ${step.notes}` : ''}`
    ).join('\n\n')
  : labels.noSteps
}

${prompts.relatedInfo}
- **${labels.relatedRequirements}**: ${testCaseContext?.relatedRequirements && testCaseContext.relatedRequirements.length > 0
  ? testCaseContext.relatedRequirements.map((req: any) => `${req.title} (${req.status})`).join(', ')
  : labels.none
}
- **${labels.datasets}**: ${testCaseContext?.datasets && testCaseContext.datasets.length > 0
  ? testCaseContext.datasets.map((ds: any) => {
      const columnInfo = ds.columns ? ds.columns.map((col: any) => `${col.name}(${col.type})`).join(', ') : '';
      const dataCount = ds.data ? ds.data.length : 0;
      return `${ds.name} [${columnInfo}] (${dataCount} rows)`;
    }).join('\n  ')
  : labels.none
}
- **${labels.knownIssues}**: ${testCaseContext?.knownIssues && testCaseContext.knownIssues.length > 0
  ? testCaseContext.knownIssues.map((issue: any) => `${issue.title} (${issue.severity})`).join(', ')
  : labels.none
}

${importantReminder}

${supportedModules}

${testCaseModule}

${automationModule}

${dataModule}

${finalReminder}

🚨🚨🚨 FINAL REMINDER: RESPOND ONLY IN ${getLanguageName().toUpperCase()} 🚨🚨🚨
No matter what language the user uses, you MUST respond in ${getLanguageName()}.
This is a non-negotiable system requirement.`;
}
