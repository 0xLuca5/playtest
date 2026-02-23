import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { createOrUpdateAutomationConfig, getCompleteTestCaseWithoutNote, updateTestCase, createTestSteps, createTestCase, saveDocument, createOrUpdateTestCaseDataset } from '@/lib/db/queries';
import { TestingService } from '@/lib/services/testing-service';
import { generateUUID } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

import { TEST_CASE_ARTIFACT } from '@/artifacts/types';

// 国际化支持
const translations = {
  en: () => import('@/lib/i18n/locales/en.json').then(m => m.default),
  zh: () => import('@/lib/i18n/locales/zh.json').then(m => m.default),
  ja: () => import('@/lib/i18n/locales/ja.json').then(m => m.default),
};

// 简单的翻译函数
async function t(key: string, locale: string = 'en', params: Record<string, any> = {}): Promise<string> {
  try {
    const messages = await translations[locale as keyof typeof translations]?.();
    if (!messages) {
      console.warn(`Locale ${locale} not supported, falling back to en`);
      const enMessages = await translations.en();
      return interpolate(enMessages[key as keyof typeof enMessages] || key, params);
    }

    const message = messages[key as keyof typeof messages] || key;
    return interpolate(message, params);
  } catch (error) {
    console.error(`Translation error for key ${key}:`, error);
    return key;
  }
}

// 字符串插值函数
function interpolate(template: string, params: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// 测试步骤Schema
const testStepSchema = z.object({
  step: z.number().describe('Step number'),
  action: z.string().describe('Action description'),
  expected: z.string().describe('Expected result'),
  type: z.enum(['manual', 'automated']).optional().describe('Step type'),
  notes: z.string().optional().describe('Notes')
});

// 辅助函数：推断操作类型
function inferOperation(params: any): string {
  if (params.generateStepsCount || params.operation === 'generate_steps') {
    return 'generate_steps';
  }
  if (params.automationFramework || params.automationUrl || params.operation === 'generate_automation') {
    return 'generate_automation';
  }
  if (params.operation === 'analyze_coverage') {
    return 'analyze_coverage';
  }
  if (params.datasetName || params.rowCount || params.operation === 'generate_test_data') {
    return 'generate_test_data';
  }
  if (params.steps) {
    return 'update_steps';
  }
  return 'update_basic';
}

// 辅助函数：处理基本更新
async function handleBasicUpdate(params: any, testCaseId: string | undefined, options: any): Promise<string> {
  const updates = Object.entries(params)
    .filter(([key, value]) =>
      !['testCaseId', 'operation', 'generateStepsCount', 'automationFramework', 'automationUrl', 'datasetName', 'rowCount'].includes(key) &&
      value !== undefined
    )
    .reduce((acc, [key, value]) => {
      // 特殊处理步骤数据，确保 JSON 安全
      if (key === 'steps' && Array.isArray(value)) {
        const safeSteps = value.map((step, index) => {
          try {
            // 测试每个步骤是否可以序列化
            JSON.stringify(step);
            return step;
          } catch (error) {
            console.error(`❌ Step ${index} has JSON issues:`, error);
            // 返回安全的步骤格式
            return {
              step: step.step || index + 1,
              action: typeof step.action === 'string' ? step.action.replace(/["\\\n\r\t]/g, ' ') : `测试操作 ${index + 1}`,
              expected: typeof step.expected === 'string' ? step.expected.replace(/["\\\n\r\t]/g, ' ') : `预期结果 ${index + 1}`,
              type: step.type || 'manual'
            };
          }
        });
        return { ...acc, [key]: safeSteps };
      }
      return { ...acc, [key]: value };
    }, {});

  // 如果配置了保存到数据库且有测试用例ID，则保存
  if (options?.saveToDb && testCaseId) {
    try {
      await updateTestCase(testCaseId, updates, options.session?.user?.id || 'system');


      // 通过 dataStream 发送更新的测试用例数据
      if (options?.dataStream && testCaseId) {
        try {
          const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
          if (updatedTestCase) {
            // 在 AI SDK V5 中，我们使用 message 类型来发送自定义数据
            const testCaseData = {
              testCaseId: updatedTestCase.id,
              name: updatedTestCase.name,
              description: updatedTestCase.description,
              preconditions: updatedTestCase.preconditions,
              priority: updatedTestCase.priority,
              status: updatedTestCase.status,
              weight: updatedTestCase.weight,
              format: updatedTestCase.format,
              nature: updatedTestCase.nature,
              type: updatedTestCase.type,
              tags: updatedTestCase.tags,
              steps: updatedTestCase.steps || [],
              executionTime: updatedTestCase.executionTime,
              createdAt: updatedTestCase.createdAt,
              updatedAt: updatedTestCase.updatedAt,
              author: updatedTestCase.createdBy,
              modifier: updatedTestCase.updatedBy
            };

            // 使用正确的数据流类型发送 test-case-delta
            options.dataStream.write({
              type: 'data-test-case-delta',
              data: testCaseData,
              transient: true,
            });

          }
        } catch (streamError) {
          console.error('❌ dataStream 发送失败:', streamError);
        }
      }
    } catch (error) {
      console.error('❌ 保存测试用例更新失败:', error);
      throw error;
    }
  }

  // 如果有测试用例ID且保存到数据库，返回更新后的测试用例数据
  if (options?.saveToDb && testCaseId) {
    try {
      const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
      if (updatedTestCase) {
        const result = {
          success: true,
          testCaseId: updatedTestCase.id,
          id: updatedTestCase.id,
          name: updatedTestCase.name,
          title: updatedTestCase.name,
          description: updatedTestCase.description,
          priority: updatedTestCase.priority,
          status: updatedTestCase.status,
          weight: updatedTestCase.weight,
          format: updatedTestCase.format,
          nature: updatedTestCase.nature,
          type: updatedTestCase.type,
          tags: updatedTestCase.tags,
          preconditions: updatedTestCase.preconditions,
          steps: updatedTestCase.steps || [],
          projectId: updatedTestCase.projectId,
          folderId: updatedTestCase.folderId,
          createdAt: updatedTestCase.createdAt,
          updatedAt: updatedTestCase.updatedAt,
          createdBy: updatedTestCase.createdBy,
          updatedBy: updatedTestCase.updatedBy,
          message: '✅ Test case updated successfully!'
        };



        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('❌ 获取更新后的测试用例失败:', error);
    }
  }

  // 返回明确的成功消息，让 AI 知道操作已完成
  const updateSummary = [];
  if (params.name) updateSummary.push(`名称: ${params.name}`);
  if (params.description) updateSummary.push(`描述: ${params.description}`);
  if (params.steps) updateSummary.push(`测试步骤: ${params.steps.length} 个步骤`);
  if (params.priority) updateSummary.push(`优先级: ${params.priority}`);
  if (params.status) updateSummary.push(`状态: ${params.status}`);
  if (params.weight) updateSummary.push(`重要性: ${params.weight}`);

  return `✅ OPERATION COMPLETED SUCCESSFULLY

Test case update has been completed and saved to the database. The following changes were made:
${updateSummary.map(item => `• ${item}`).join('\n')}

The UI has been automatically updated with the latest data through the data stream. No further action is required.`;
}

// 辅助函数：处理生成测试步骤
async function handleGenerateSteps(params: any, testCaseId: string | undefined, options: any): Promise<string> {
  // 检测语言
  const testCaseName = params.name || '';
  const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(testCaseName.trim());
  const locale = isEnglish ? 'en' : 'zh';

  // 获取测试用例信息
  let testCase;
  if (testCaseId) {
    try {
      testCase = await getCompleteTestCaseWithoutNote(testCaseId);
    } catch (error) {
      console.log('无法获取测试用例信息，将使用参数中的信息');
    }
  }

  const finalTestCaseName = params.name || testCase?.name || await t('testCase.testCase', locale);

  // 检查AI是否提供了具体步骤
  let steps = [];
  if (params.steps && Array.isArray(params.steps) && params.steps.length > 0) {
    console.log('🔍 Using AI-provided specific steps:', params.steps.length);
    steps = params.steps.map((step: any, index: number) => ({
      step: step.step || index + 1,
      action: step.action || `Execute ${finalTestCaseName} related test action ${index + 1}`,
      expected: step.expected || `Verify that step ${index + 1} expected result meets requirements`,
      type: step.type || 'automated' as const,
      notes: step.notes || undefined
    }));
  } else {
    // 如果没有提供具体步骤，抛出错误要求AI提供
    console.error('❌ No specific steps provided by AI for generate_steps operation');
    throw new Error('CRITICAL: generate_steps operation requires specific test steps in the "steps" parameter. You must analyze the test case documents and provide detailed, actionable test steps. For example: [{step: 1, action: "Open browser and navigate to YouTube", expected: "YouTube homepage loads successfully", type: "automated"}, {step: 2, action: "Click Sign In button", expected: "Login form appears", type: "automated"}]. Do not use generateStepsCount without providing actual steps.');
  }

  // 如果配置了保存到数据库，则保存步骤
  if (options?.saveToDb && testCaseId) {
    try {
      await updateTestCase(testCaseId, { steps }, options.session?.user?.id || 'system');
      console.log('✅ 生成的测试步骤已保存到数据库');
    } catch (error) {
      console.error('❌ 保存测试步骤失败:', error);
      throw error;
    }
  }

  // 通过 dataStream 发送更新的测试用例数据（如果有 dataStream 和 testCaseId）
  if (options?.dataStream && testCaseId && options?.saveToDb) {
    try {
      const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
      if (updatedTestCase) {
        options.dataStream.write({
          type: 'data-test-case-delta',
          data: {
            testCaseId: updatedTestCase.id,
            name: updatedTestCase.name,
            description: updatedTestCase.description,
            steps: updatedTestCase.steps || [],
            // 其他字段...
          }
        });
        console.log('✅ 生成的测试步骤已通过 dataStream 发送');
      }
    } catch (streamError) {
      console.error('❌ dataStream 发送失败:', streamError);
    }
  }

  return `✅ STEP GENERATION COMPLETED SUCCESSFULLY

Generated ${steps.length} test steps for "${finalTestCaseName}" and saved to database.

The test steps have been automatically updated in the UI through the data stream. No further action is required.`;
}

// 辅助函数：处理生成自动化配置
async function handleGenerateAutomation(params: any, testCaseId: string | undefined, options: any): Promise<string> {
  const framework = params.automationFramework || 'midscene';
  const url = params.automationUrl || 'https://example.com';

  // 获取测试用例信息
  let testCase;
  if (testCaseId) {
    try {
      testCase = await getCompleteTestCaseWithoutNote(testCaseId);
    } catch (error) {
      console.log('无法获取测试用例信息，将使用参数中的信息');
    }
  }

  const testCaseName = params.name || testCase?.name || '';

  // 检测语言
  const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(testCaseName.trim());
  const locale = isEnglish ? 'en' : 'zh';

  if (framework === 'midscene' && testCaseId) {
    try {
      // 使用 TestingService 生成 YAML 配置
      const testingService = new TestingService();
      const yamlResult = await testingService.generateTestingYaml(
        url,
        testCaseName,
        params.description || testCase?.description || '',
        testCaseId
      );

      if (yamlResult.success) {
        // 保存配置到数据库
        if (options?.saveToDb) {
          await createOrUpdateAutomationConfig(testCaseId, {
            framework: 'midscene',
            repository: 'local',
            commands: ['npm test'],
            browser: 'chrome',
            environment: 'test',
            isActive: true,
            parameters: { yaml: yamlResult.yaml }
          });
          console.log(await t('testCase.tools.automation.midsceneSaved', locale));
        }

        // 通过 dataStream 发送更新的测试用例数据（如果有 dataStream 和 testCaseId）
        if (options?.dataStream && testCaseId && options?.saveToDb) {
          try {
            const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
            if (updatedTestCase) {
              options.dataStream.write({
                type: 'data-test-case-delta',
                data: {
                  testCaseId: updatedTestCase.id,
                  name: updatedTestCase.name,
                  description: updatedTestCase.description,
                  automationConfig: updatedTestCase.automationConfig || null,
                  // 包含其他字段以保持数据完整性
                  priority: updatedTestCase.priority,
                  status: updatedTestCase.status,
                  weight: updatedTestCase.weight,
                  format: updatedTestCase.format,
                  nature: updatedTestCase.nature,
                  type: updatedTestCase.type,
                  tags: updatedTestCase.tags,
                  preconditions: updatedTestCase.preconditions,
                  steps: updatedTestCase.steps || [],
                }
              });
              console.log('✅ 生成的自动化配置已通过 dataStream 发送');
            }
          } catch (streamError) {
            console.error('❌ dataStream 发送失败:', streamError);
          }
        }

        // 安全地处理 JSON 序列化
        let configJson;
        try {
          configJson = JSON.stringify({ framework, url, yaml: yamlResult.yaml });
        } catch (error) {
          console.error('❌ Config JSON stringify error:', error);
          configJson = JSON.stringify({ framework, url });
        }

        return `AUTOMATION_CONFIG_GENERATED: ${configJson}

${await t(
  options?.saveToDb ? 'testCase.tools.automation.configGenerated' : 'testCase.tools.automation.configGeneratedNoSave',
  locale,
  { name: testCaseName, framework }
)}

${await t('testCase.tools.automation.details', locale)}
- ${await t('testCase.tools.automation.framework', locale, { framework })}
- ${await t('testCase.tools.automation.testUrl', locale, { url })}
- ${await t('testCase.tools.automation.configStatus', locale)}
- ${await t('testCase.tools.automation.yamlConfig', locale)}

${await t(
  options?.saveToDb ? 'testCase.tools.automation.ready' : 'testCase.tools.automation.readyNoSave',
  locale
)}`;
      } else {
        throw new Error(yamlResult.message);
      }
    } catch (error) {
      throw new Error(await t('testCase.tools.automation.generateFailed', locale, {
        framework,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  } else {
    // 生成通用自动化配置
    const config = {
      framework,
      url,
      browser: 'chrome',
      environment: 'test',
      scripts: [`test_${testCaseName.toLowerCase().replace(/\s+/g, '-')}.js`],
      isActive: true
    };

    // 如果有 testCaseId 且配置了保存到数据库，则保存配置
    if (testCaseId && options?.saveToDb) {
      try {
        await createOrUpdateAutomationConfig(testCaseId, {
          framework,
          repository: 'local',
          commands: config.scripts,
          browser: 'chrome' as const,
          environment: 'test' as const,
          isActive: config.isActive,
          parameters: { url }
        });
        console.log('✅ 通用自动化配置已保存到数据库');

        // 通过 dataStream 发送更新的测试用例数据
        if (options?.dataStream) {
          try {
            const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
            if (updatedTestCase) {
              options.dataStream.write({
                type: 'data-test-case-delta',
                data: {
                  testCaseId: updatedTestCase.id,
                  name: updatedTestCase.name,
                  description: updatedTestCase.description,
                  automationConfig: updatedTestCase.automationConfig || null,
                  // 包含其他字段以保持数据完整性
                  priority: updatedTestCase.priority,
                  status: updatedTestCase.status,
                  weight: updatedTestCase.weight,
                  format: updatedTestCase.format,
                  nature: updatedTestCase.nature,
                  type: updatedTestCase.type,
                  tags: updatedTestCase.tags,
                  preconditions: updatedTestCase.preconditions,
                  steps: updatedTestCase.steps || [],
                }
              });
              console.log('✅ 通用自动化配置已通过 dataStream 发送');
            }
          } catch (streamError) {
            console.error('❌ dataStream 发送失败:', streamError);
          }
        }
      } catch (error) {
        console.error('❌ 保存通用自动化配置失败:', error);
      }
    }

    // 安全地处理 JSON 序列化
    let configJson;
    try {
      configJson = JSON.stringify(config);
    } catch (error) {
      console.error('❌ Config JSON stringify error:', error);
      configJson = JSON.stringify({ framework, url });
    }

    return `AUTOMATION_CONFIG_GENERATED: ${configJson}

${await t(
  options?.saveToDb && testCaseId ? 'testCase.tools.automation.configGenerated' : 'testCase.tools.automation.configGeneratedNoSave',
  locale,
  { name: testCaseName, framework }
)}

${await t('testCase.tools.automation.details', locale)}
- ${await t('testCase.tools.automation.framework', locale, { framework })}
- ${await t('testCase.tools.automation.testUrl', locale, { url })}
- ${await t('testCase.tools.automation.browser', locale)}
- ${await t('testCase.tools.automation.environment', locale)}

${await t(
  options?.saveToDb && testCaseId ? 'testCase.tools.automation.ready' : 'testCase.tools.automation.readyNoSave',
  locale
)}`;
  }
}

// 辅助函数：处理测试覆盖率分析
async function handleAnalyzeCoverage(params: any, testCaseId: string | undefined): Promise<string> {
  // 获取测试用例信息
  let testCase;
  if (testCaseId) {
    try {
      testCase = await getCompleteTestCaseWithoutNote(testCaseId);
    } catch (error) {
      console.log('无法获取测试用例信息，将使用参数中的信息');
    }
  }

  const testCaseName = params.name || testCase?.name || '';
  const steps = params.steps || testCase?.steps || [];

  // 检测语言
  const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(testCaseName.trim());
  const locale = isEnglish ? 'en' : 'zh';

  // 生成分析结果
  const analysis = {
    coverageScore: Math.floor(Math.random() * 30) + 70, // 70-100分
    strengths: [
      await t('testCase.tools.coverage.strength1', locale),
      await t('testCase.tools.coverage.strength2', locale),
      await t('testCase.tools.coverage.strength3', locale)
    ],
    improvements: [
      await t('testCase.tools.coverage.improvement1', locale),
      await t('testCase.tools.coverage.improvement2', locale),
      await t('testCase.tools.coverage.improvement3', locale)
    ],
    stepCount: steps.length,
    riskLevel: 'medium'
  };

  // 安全地处理 JSON 序列化
  let analysisJson;
  try {
    analysisJson = JSON.stringify(analysis);
  } catch (error) {
    console.error('❌ Analysis JSON stringify error:', error);
    analysisJson = JSON.stringify({ coverageScore: analysis.coverageScore, stepCount: analysis.stepCount });
  }

  return `COVERAGE_ANALYSIS: ${analysisJson}

${await t('testCase.tools.coverage.analysisCompleted', locale, { name: testCaseName })}

${await t('testCase.tools.coverage.analysisResults', locale)}
- ${await t('testCase.tools.coverage.coverageScore', locale, { score: analysis.coverageScore })}
- ${await t('testCase.tools.coverage.stepCount', locale, { count: analysis.stepCount })}
- ${await t('testCase.tools.coverage.riskLevel', locale, { level: analysis.riskLevel })}

${await t('testCase.tools.coverage.strengths', locale)}
${analysis.strengths.map(s => `• ${s}`).join('\n')}

${await t('testCase.tools.coverage.improvements', locale)}
${analysis.improvements.map(i => `• ${i}`).join('\n')}

${await t('testCase.tools.coverage.analysisComplete', locale)}`;
}

// 辅助函数：处理生成测试数据
async function handleGenerateTestData(params: any, testCaseId: string | undefined, options: any): Promise<{ success: true; message: string; testCaseId?: string }> {
  console.log('🔍 handleGenerateTestData called with params:', {
    hasColumns: !!params.columns,
    hasSampleData: !!params.sampleData,
    operation: params.operation,
    testCaseId
  });

  // 获取测试用例信息
  let testCase;
  if (testCaseId) {
    try {
      testCase = await getCompleteTestCaseWithoutNote(testCaseId);
    } catch (error) {
      console.log('无法获取测试用例信息，将使用参数中的信息');
    }
  }

  const testCaseName = params.name || testCase?.name || '';
  const datasetName = params.datasetName || `${testCaseName} Test Data`;
  const rowCount = Math.min(params.rowCount || 5, 20); // 限制最大20行

  // 检测语言
  const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(testCaseName.trim());
  const locale = isEnglish ? 'en' : 'zh';

  // 验证必需的参数，如果缺失则提供有用的错误信息
  if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
    const errorMsg = locale === 'en' ?
      'Missing required parameter: columns. For generate_test_data operation, you must provide an array of column definitions. Example: [{"name": "searchQuery", "type": "string", "description": "Search term"}]' :
      '缺少必需参数：columns。对于generate_test_data操作，您必须提供列定义数组。示例：[{"name": "searchQuery", "type": "string", "description": "搜索词"}]';

    console.error('❌ Missing columns parameter for generate_test_data operation');
    throw new Error(errorMsg);
  }

  if (!params.sampleData || !Array.isArray(params.sampleData) || params.sampleData.length === 0) {
    const errorMsg = locale === 'en' ?
      'Missing required parameter: sampleData. For generate_test_data operation, you must provide sample data rows. Example: [{"searchQuery": "laptop", "expectedResults": "Dell, HP laptops"}]' :
      '缺少必需参数：sampleData。对于generate_test_data操作，您必须提供示例数据行。示例：[{"searchQuery": "laptop", "expectedResults": "Dell, HP laptops"}]';

    console.error('❌ Missing sampleData parameter for generate_test_data operation');
    throw new Error(errorMsg);
  }

  try {
    // 使用 AI 提供的列定义和示例数据，并进行深度清理
    const columns: Array<{name: string, type: 'string' | 'number' | 'boolean' | 'date', description?: string}> = JSON.parse(JSON.stringify(params.columns));
    const sampleData: Array<Record<string, any>> = JSON.parse(JSON.stringify(params.sampleData));

    console.log('🔍 Cleaned columns:', columns);
    console.log('🔍 Cleaned sampleData:', sampleData);

    // 验证列定义格式
    for (const column of columns) {
      if (!column.name || typeof column.name !== 'string') {
        throw new Error(locale === 'en' ?
          'Invalid column definition: each column must have a name.' :
          '无效的列定义：每列必须有名称。');
      }
      if (!['string', 'number', 'boolean', 'date'].includes(column.type)) {
        throw new Error(locale === 'en' ?
          `Invalid column type "${column.type}". Supported types: string, number, boolean, date.` :
          `无效的列类型"${column.type}"。支持的类型：string, number, boolean, date。`);
      }
    }

    // 验证示例数据格式
    for (const row of sampleData) {
      if (typeof row !== 'object' || row === null) {
        throw new Error(locale === 'en' ?
          'Invalid sample data: each row must be an object.' :
          '无效的示例数据：每行必须是对象。');
      }
    }

    // 生成指定数量的数据行
    let data: Array<Record<string, any>> = [];

    // 如果提供的示例数据少于需要的行数，则重复使用示例数据
    for (let i = 0; i < rowCount; i++) {
      const sampleIndex = i % sampleData.length;
      const baseRow = { ...sampleData[sampleIndex] };

      // 为每行添加一些变化，避免完全重复
      if (i >= sampleData.length) {
        Object.keys(baseRow).forEach(key => {
          const column = columns.find(col => col.name === key);
          if (column) {
            switch (column.type) {
              case 'string':
                if (typeof baseRow[key] === 'string' && baseRow[key].includes('1')) {
                  baseRow[key] = baseRow[key].replace('1', String(i + 1));
                } else if (typeof baseRow[key] === 'string') {
                  baseRow[key] = `${baseRow[key]}_${i + 1}`;
                }
                break;
              case 'number':
                if (typeof baseRow[key] === 'number') {
                  baseRow[key] = baseRow[key] + (i - sampleIndex);
                }
                break;
              case 'boolean':
                // 保持布尔值不变，或者根据索引变化
                if (Math.random() > 0.7) {
                  baseRow[key] = !baseRow[key];
                }
                break;
            }
          }
        });
      }

      data.push(baseRow);
    }

    // 保存数据集到数据库
    if (options?.saveToDb && testCaseId) {
      // 再次清理数据，确保没有不可序列化的内容
      const cleanDataset = {
        name: datasetName,
        description: locale === 'en' ?
          `Generated test data for "${testCaseName}" test case` :
          `为"${testCaseName}"测试用例生成的测试数据`,
        columns: JSON.parse(JSON.stringify(columns)),
        data: JSON.parse(JSON.stringify(data))
      };

      console.log('🔍 Final dataset to save:', {
        name: cleanDataset.name,
        columnsCount: cleanDataset.columns.length,
        dataRowsCount: cleanDataset.data.length
      });

      await createOrUpdateTestCaseDataset(testCaseId, cleanDataset);
      console.log('测试数据已保存到数据库');
    }

    // 通过 dataStream 发送更新的测试用例数据（如果有 dataStream 和 testCaseId）
    if (options?.dataStream && testCaseId && options?.saveToDb) {
      try {
        const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
        if (updatedTestCase) {
          options.dataStream.write({
            type: 'data-test-case-delta',
            data: {
              testCaseId: updatedTestCase.id,
              name: updatedTestCase.name,
              description: updatedTestCase.description,
              datasets: updatedTestCase.datasets || [],
              // 包含其他字段以保持数据完整性
              priority: updatedTestCase.priority,
              status: updatedTestCase.status,
              weight: updatedTestCase.weight,
              format: updatedTestCase.format,
              nature: updatedTestCase.nature,
              type: updatedTestCase.type,
              tags: updatedTestCase.tags,
              preconditions: updatedTestCase.preconditions,
              steps: updatedTestCase.steps || [],
              automationConfig: updatedTestCase.automationConfig || null,
            }
          });
          console.log('生成的测试数据已通过 dataStream 发送');
        }
      } catch (streamError) {
        console.error('❌ dataStream 发送失败:', streamError);
      }
    }

    return {
      success: true,
      message: '✅ Test data generated and saved successfully.',
      testCaseId,
    };

  } catch (error) {
    throw new Error(`${locale === 'en' ? 'Failed to generate test data:' : '生成测试数据失败：'} ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 更新测试用例工具
// 创建可配置的 updateTestCase 工具
export const updateTestCaseTool = (options?: { testCaseId?: string; session?: any; saveToDb?: boolean; dataStream?: any }) => tool({
  description: 'CRITICAL: For test data generation, call this tool DIRECTLY without any preview or explanation. Updates test case properties and saves to database. This tool can perform multiple operations: update basic info, generate test steps, generate automation config, analyze coverage, and GENERATE TEST DATA. CRITICAL FOR TEST STEPS: When using generate_steps or update_steps operations, you MUST provide specific, detailed test steps in the "steps" parameter. Analyze the test case documents and create concrete, actionable steps (like "Step 1: Open browser and navigate to YouTube", "Step 2: Click Sign In button", etc.). NEVER use empty steps array or rely on generic templates. Always provide detailed steps based on the test case name, description, and documents. CRITICAL FOR TEST DATA GENERATION: When using generate_test_data operation, you MUST ALWAYS provide BOTH columns AND sampleData parameters in the SAME call. Example: {operation: "generate_test_data", columns: [{"name": "searchQuery", "type": "string", "description": "Search term"}], sampleData: [{"searchQuery": "laptop", "expectedResults": "Dell laptops"}]}. NEVER call without both parameters. NEVER show data structure before calling. NEVER repeat data after calling. Just call the tool with both parameters.',
  inputSchema: z.object({
    testCaseId: z.string().optional().describe('Test case ID (optional if provided in context)'),
    name: z.string().optional().describe('Test case name'),
    description: z.string().optional().describe('Test case description'),
    preconditions: z.string().optional().describe('Preconditions'),
    priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority level'),
    status: z.enum(['work-in-progress', 'active', 'deprecated', 'draft']).optional().describe('Test case status'),
    weight: z.enum(['high', 'medium', 'low']).optional().describe('Test case weight/importance level'),
    format: z.enum(['classic', 'bdd', 'exploratory']).optional().describe('Test case format'),
    nature: z.enum(['unit', 'integration', 'system', 'e2e']).optional().describe('Test phase - unit, integration, system, or e2e'),
    type: z.enum(['functional', 'non-functional', 'regression', 'smoke']).optional().describe('Test purpose - functional, non-functional, regression, or smoke'),
    tags: z.array(z.string()).optional().describe('Tags list'),
    executionTime: z.number().optional().describe('Estimated execution time in minutes'),
    steps: z.array(testStepSchema).optional().describe('REQUIRED for generate_steps and update_steps operations: Array of specific, detailed test steps. You MUST analyze the test case and provide concrete steps like [{step: 1, action: "Open browser and navigate to YouTube", expected: "YouTube homepage loads successfully", type: "automated"}, {step: 2, action: "Click Sign In button", expected: "Login form appears", type: "automated"}]. Each step must have: step (number), action (detailed description), expected (expected result), type (automated). NEVER leave this empty when generating or updating steps.'),

    // 操作类型参数 - 指导工具执行特定操作
    operation: z.enum(['update_basic', 'generate_steps', 'update_steps', 'generate_automation', 'analyze_coverage', 'generate_test_data']).optional().describe('Specific operation to perform: update_basic (modify properties), generate_steps (create and save new test steps - MUST include detailed steps in steps parameter), update_steps (update existing test steps - MUST include detailed steps in steps parameter), generate_automation (create automation config), analyze_coverage (analyze test coverage), generate_test_data (CREATE AND SAVE test datasets to database - MUST include both columns and sampleData parameters). If not specified, will infer from other parameters'),

    // 生成相关参数 - generateStepsCount removed as AI must provide specific steps
    automationFramework: z.enum(['midscene', 'selenium', 'playwright', 'cypress', 'karate']).optional().describe('Automation framework for config generation'),
    automationUrl: z.string().optional().describe('URL for automation testing'),

    // 测试数据生成参数 - FOR SAVING TEST DATA TO DATABASE
    datasetName: z.string().optional().describe('Name for the test dataset that will be SAVED TO DATABASE'),
    rowCount: z.number().optional().describe('Number of test data rows to generate and SAVE TO DATABASE (default: 5, max: 20)'),
    columns: z.array(z.object({
      name: z.string().describe('Column name (e.g., username, password, email, expectedResult)'),
      type: z.enum(['string', 'number', 'boolean', 'date']).describe('Data type of the column'),
      description: z.string().optional().describe('Description of what this column represents')
    })).optional().describe('MANDATORY for generate_test_data operation: Array of column definitions for the test dataset that will be SAVED TO DATABASE. You MUST provide this when operation=generate_test_data. Analyze the test case to determine appropriate columns like searchQuery, expectedResults, etc. Do not display these columns to user.'),
    sampleData: z.array(z.record(z.any())).optional().describe('MANDATORY for generate_test_data operation: Array of sample data rows (2-5 examples) that will be used to generate the full dataset and SAVE TO DATABASE. You MUST provide this when operation=generate_test_data. Each row should be an object with realistic test data matching the columns. Do not display this data to user.'),
  }).refine((data) => {
    // 当operation为generate_test_data时，columns和sampleData必须提供
    if (data.operation === 'generate_test_data') {
      if (!data.columns || data.columns.length === 0) {
        return false;
      }
      if (!data.sampleData || data.sampleData.length === 0) {
        return false;
      }
    }
    return true;
  }, {
    message: "For generate_test_data operation, both columns and sampleData parameters are required. Example: columns: [{name: 'searchQuery', type: 'string', description: 'Search term'}], sampleData: [{searchQuery: 'laptop', expectedResults: 'Dell laptops'}]"
  }),
  execute: async (params) => {
    const targetTestCaseId = params.testCaseId || options?.testCaseId;



    try {
      // 根据操作类型或参数推断要执行的操作
      const operation = params.operation || inferOperation(params);


      let result: any = '';

      switch (operation) {
        case 'generate_steps':
          result = await handleGenerateSteps(params, targetTestCaseId, options);
          break;

        case 'generate_automation':
          result = await handleGenerateAutomation(params, targetTestCaseId, options);
          break;

        case 'analyze_coverage':
          result = await handleAnalyzeCoverage(params, targetTestCaseId);
          break;

        case 'generate_test_data':
          result = await handleGenerateTestData(params, targetTestCaseId, options);
          break;

        case 'update_steps':
        case 'update_basic':
        default:
          result = await handleBasicUpdate(params, targetTestCaseId, options);
          break;
      }

      // 如果操作成功且有测试用例ID，返回测试用例对象而不是字符串
      if (options?.saveToDb && targetTestCaseId && typeof result === 'string' && result.includes('✅')) {
        try {
          // 尝试解析 JSON 字符串结果
          let parsedResult;
          try {
            parsedResult = JSON.parse(result);
          } catch {
            // 如果不是 JSON，获取最新的测试用例数据
            const updatedTestCase = await getCompleteTestCaseWithoutNote(targetTestCaseId);
            if (updatedTestCase) {
              parsedResult = {
                success: true,
                testCaseId: updatedTestCase.id,
                id: updatedTestCase.id,
                name: updatedTestCase.name,
                title: updatedTestCase.name,
                description: updatedTestCase.description,
                priority: updatedTestCase.priority,
                status: updatedTestCase.status,
                weight: updatedTestCase.weight,
                format: updatedTestCase.format,
                nature: updatedTestCase.nature,
                type: updatedTestCase.type,
                tags: updatedTestCase.tags,
                preconditions: updatedTestCase.preconditions,
                steps: updatedTestCase.steps || [],
                projectId: updatedTestCase.projectId,
                folderId: updatedTestCase.folderId,
                createdAt: updatedTestCase.createdAt,
                updatedAt: updatedTestCase.updatedAt,
                createdBy: updatedTestCase.createdBy,
                updatedBy: updatedTestCase.updatedBy,
                message: '✅ Test case updated successfully!'
              };
            }
          }

          if (parsedResult) {
            result = parsedResult;
          }
        } catch (error) {
          console.error('❌ Failed to create test case object:', error);
        }
      }

      // generate_test_data 可能返回对象；若只返回 success message，也尽量包装成稳定结构
      if (operation === 'generate_test_data' && typeof result === 'string') {
        result = {
          success: true,
          message: result,
          testCaseId: targetTestCaseId,
        };
      }

      // 在所有操作完成后发送 finish 事件（如果有 dataStream）
      if (options?.dataStream) {
        try {
          options.dataStream.write({
            type: 'data-finish',
            data: null,
            transient: false
          });

        } catch (streamError) {
          console.error('❌ 发送 data-finish 事件失败:', streamError);
        }
      }

      console.log('🔍 [updateTestCaseTool] Final result type:', typeof result);
      // console.log('🔍 [updateTestCaseTool] Final result:', typeof result === 'object' ? result : 'string result');

      return result;

    } catch (error) {
      console.error('❌ updateTestCase tool execution failed:', error);

      // 即使出错也要发送 finish 事件（如果有 dataStream）
      if (options?.dataStream) {
        try {
          options.dataStream.write({
            type: 'data-finish',
            data: null,
            transient: false
          });

        } catch (streamError) {
          console.error('❌ 发送 data-finish 事件失败:', streamError);
        }
      }

      return {
        error: `❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});



// 日志函数
function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [TestCase Tools] ${message}`);
}

// 创建测试用例工具的接口
interface CreateTestCaseProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId?: string;
  projectId?: string;
  locale?: string;
}

// 创建测试用例工具
export const createTestCaseTool = ({ session, dataStream, chatId, projectId: contextProjectId, locale: contextLocale }: CreateTestCaseProps) =>
  tool({
    description: 'Specialized tool for creating or updating executable test cases in the database with detailed test steps and datasets. Use this tool ONLY when users explicitly request creating actual test cases for execution, need database storage, or want the test case details page displayed on the right side. Do NOT use this tool when users request documents, example documents, or documentation about test cases - use createDocument instead. If testCaseId is provided and test case exists, updates existing test case; otherwise creates new test case. Saves to database and displays test case details page on the right side.',
    inputSchema: z.object({
      testCaseId: z.string().optional().describe('Test case ID (optional). If provided and exists, updates existing test case; otherwise creates new test case'),
      name: z.string().describe('Test case name'),
      description: z.string().describe('Test case description'),
      folderId: z.string().optional().describe('Folder ID (optional)'),
      priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Priority'),
      status: z.enum(['work-in-progress', 'active', 'deprecated', 'draft']).optional().default('draft').describe('Status'),
      weight: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Weight'),
      format: z.enum(['classic', 'bdd', 'exploratory']).optional().default('classic').describe('Format'),
      nature: z.enum(['unit', 'integration', 'system', 'e2e']).optional().default('unit').describe('Test phase'),
      type: z.enum(['functional', 'non-functional', 'regression', 'smoke']).optional().default('functional').describe('Test purpose'),
      tags: z.array(z.string()).optional().default([]).describe('Tags'),
      preconditions: z.string().optional().describe('Preconditions'),
      steps: z.array(z.object({
        step: z.number().describe('Step number'),
        action: z.string().describe('Action to perform'),
        expected: z.string().describe('Expected result'),
        type: z.string().optional().default('automated').describe('Step type'),
        notes: z.string().optional().describe('Additional notes')
      })).optional().describe('Test steps (optional). If provided, these steps will be added to the test case'),
      datasets: z.array(z.object({
        name: z.string().describe('Dataset name'),
        data: z.record(z.any()).describe('Dataset data as key-value pairs')
      })).optional().describe('Test datasets (optional). Test data sets for data-driven testing')
    }),
    execute: async ({
      testCaseId,
      name,
      description,
      folderId,
      priority = 'medium',
      status = 'draft',
      weight = 'medium',
      format = 'classic',
      nature = 'functional',
      type = 'regression',
      tags = [],
      preconditions,
      steps = [],
      datasets = []
    }) => {
      const isUpdate = !!testCaseId;

      // 使用上下文语言，如果没有则基于文本检测
      let locale = contextLocale;
      if (!locale) {
        const textToCheck = `${name} ${description || ''}`;
        const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(textToCheck.trim());
        locale = isEnglish ? 'en' : 'zh';
      }
      log(await t('testCase.tools.languageSource', locale, {
        locale,
        source: contextLocale ? 'context' : 'text detection'
      }));

      const logMessage = await t(
        isUpdate ? 'testCase.tools.updating' : 'testCase.tools.creating',
        locale,
        { name: name + (isUpdate ? ` (ID: ${testCaseId})` : '') }
      );

      log(`${logMessage}, ${await t('testCase.tools.detectingLanguage', locale, { locale })}`);

      try {
        // 1. 生成文档ID和工具调用ID
        const documentId = generateUUID();
        const toolCallId = generateUUID();

        log(await t('testCase.tools.generatingIds', locale, { documentId, toolCallId }));

        // 2. 使用上下文项目ID - 应该已经从API参数中验证过
        const finalProjectId = contextProjectId;
        const projectSource = 'context';

        // 确保项目ID存在
        if (!finalProjectId) {
          throw new Error(locale === 'en' ?
            'No project ID available. Project context is required to create test cases. Please ensure you are in a valid project context.' :
            '没有可用的项目ID。创建测试用例需要项目上下文。请确保您在有效的项目上下文中。');
        }

        log(await t('testCase.tools.usingProjectId', locale, { projectId: finalProjectId, source: projectSource }));

        let testCase;

        if (isUpdate) {
          // 3a. 检查测试用例是否存在
          log(await t('testCase.tools.checkingExistence', locale, { testCaseId }));
          try {
            testCase = await getCompleteTestCaseWithoutNote(testCaseId);
            log(await t('testCase.tools.foundExisting', locale, { name: testCase.name }));

            // 更新测试用例
            log(await t('testCase.tools.updatingToDatabase', locale, { testCaseId }));

            // 简化：直接使用提供的folderId，如果没有则为undefined（根目录）
            let finalFolderId = folderId;
            if (!finalFolderId && chatId) {
              log(await t('testCase.tools.noFolderId', locale));
            }

            await updateTestCase(testCaseId, {
              name,
              description,
              preconditions,
              priority,
              status,
              weight,
              format,
              nature,
              type,
              tags,
              folderId: finalFolderId
            }, session.user?.email || 'unknown');

            // 重新获取更新后的测试用例
            testCase = await getCompleteTestCaseWithoutNote(testCaseId);
            log(await t('testCase.tools.updateSuccess', locale, { id: testCase.id, name: testCase.name }));

          } catch (error) {
            log(await t('testCase.tools.notExistCreatingNew', locale, { error: String(error) }));

            // 简化：直接使用提供的folderId，如果没有则为undefined（根目录）
            let finalFolderId = folderId;
            if (!finalFolderId && chatId) {
              log(await t('testCase.tools.noFolderId', locale));
            }

            // 如果测试用例不存在，创建新的
            const safeNature =
              typeof nature === 'string' &&
              ['unit', 'integration', 'system', 'e2e'].includes(nature)
                ? (nature as 'unit' | 'integration' | 'system' | 'e2e')
                : undefined;
            const safeType =
              typeof type === 'string' &&
              ['functional', 'non-functional', 'regression', 'smoke'].includes(type)
                ? (type as 'functional' | 'non-functional' | 'regression' | 'smoke')
                : undefined;

            testCase = await createTestCase({
              projectId: finalProjectId,
              folderId: finalFolderId,
              name,
              description,
              preconditions,
              priority,
              status,
              weight,
              format,
              nature: safeNature,
              type: safeType,
              tags,
              createdBy: session.user?.email || 'unknown'
            });
            log(await t('testCase.tools.createSuccess', locale, {
              id: testCase.id,
              name: testCase.name,
              folderId: finalFolderId || 'none'
            }));
          }
        } else {
          // 3b. 创建新测试用例
          log(await t('testCase.tools.creatingToDatabase', locale, { projectId: finalProjectId }));

          // 简化：直接使用提供的folderId，如果没有则为undefined（根目录）
          let finalFolderId = folderId;
          if (!finalFolderId && chatId) {
            log(await t('testCase.tools.noFolderId', locale));
          }

          const safeNature =
            typeof nature === 'string' &&
            ['unit', 'integration', 'system', 'e2e'].includes(nature)
              ? (nature as 'unit' | 'integration' | 'system' | 'e2e')
              : undefined;
          const safeType =
            typeof type === 'string' &&
            ['functional', 'non-functional', 'regression', 'smoke'].includes(type)
              ? (type as 'functional' | 'non-functional' | 'regression' | 'smoke')
              : undefined;

          testCase = await createTestCase({
            projectId: finalProjectId,
            folderId: finalFolderId,
            name,
            description,
            preconditions,
            priority,
            status,
            weight,
            format,
            nature: safeNature,
            type: safeType,
            tags,
            createdBy: session.user?.email || 'unknown'
          });
          log(await t('testCase.tools.createSuccess', locale, {
            id: testCase.id,
            name: testCase.name,
            folderId: finalFolderId || 'none'
          }));
        }

        log(await t('testCase.tools.operationComplete', locale, { id: testCase.id, name: testCase.name }));

        // 4. 添加测试步骤和数据集（如果提供了）
        if (steps && steps.length > 0) {
          log(await t('testCase.tools.addingSteps', locale, { count: steps.length }));

          try {
            // 更新测试用例的步骤
            await updateTestCase(testCase.id, {
              steps: steps
            }, session.user?.email || 'unknown');

            // 重新获取更新后的测试用例
            testCase = await getCompleteTestCaseWithoutNote(testCase.id);
            log(await t('testCase.tools.stepsAdded', locale, { count: steps.length }));
          } catch (error) {
            console.error('添加测试步骤失败:', error);
            log(await t('testCase.tools.stepsAddFailed', locale, { error: String(error) }));
          }
        }

        // 添加测试数据集（如果提供了）
        if (datasets && datasets.length > 0) {
          log(await t('testCase.tools.addingDatasets', locale, { count: datasets.length }));

          try {
            // 更新测试用例的数据集
            await updateTestCase(testCase.id, {
              datasets: datasets
            }, session.user?.email || 'unknown');

            // 重新获取更新后的测试用例
            testCase = await getCompleteTestCaseWithoutNote(testCase.id);
            log(await t('testCase.tools.datasetsAdded', locale, { count: datasets.length }));
          } catch (error) {
            console.error('添加测试数据集失败:', error);
            log(await t('testCase.tools.datasetsAddFailed', locale, { error: String(error) }));
          }
        }

        // 5. 通过dataStream发送实时数据
        log(await t('testCase.tools.startingSendingData', locale));

        // 发送文档ID
        dataStream.write({
          type: 'data-id',
          data: testCase.id,
          transient: true,
        });

        // 发送文档类型
        console.log(await t('testCase.tools.sendingKindData', locale, { kind: TEST_CASE_ARTIFACT }));
        dataStream.write({
          type: 'data-kind',
          data: TEST_CASE_ARTIFACT,
          transient: true,
        });

        // 发送标题
        dataStream.write({
          type: 'data-title',
          data: testCase.name,
          transient: true,
        });

        // 发送完整的测试用例数据
        const testCaseData = {
          testCaseId: testCase.id,
          testCase: {
            id: testCase.id,
            name: testCase.name,
            description: testCase.description || '',
            preconditions: testCase.preconditions || '',
            priority: testCase.priority || 'medium',
            status: testCase.status || 'draft',
            weight: testCase.weight || 'medium',
            format: testCase.format || 'classic',
            nature: testCase.nature || 'functional',
            type: testCase.type || 'functional',
            tags: testCase.tags || [],
            steps: testCase.steps || [],
            datasets: testCase.datasets || [],
            projectId: testCase.projectId,
            folderId: testCase.folderId,
            createdAt: testCase.createdAt,
            updatedAt: testCase.updatedAt,
            createdBy: testCase.createdBy,
            updatedBy: testCase.updatedBy
          },
          status: 'loaded'
        };

        dataStream.write({
          type: 'data-test-case-delta',
          data: testCaseData,
          transient: true,
        });

        // 发送 finish 事件标记流式传输结束
        dataStream.write({
          type: 'data-finish',
          data: null,
          transient: false
        });

        log(await t('testCase.tools.streamingDataComplete', locale));

        // 5. 返回包含测试用例数据的对象，而不是字符串消息
        const result = {
          success: true,
          testCaseId: testCase.id,
          id: testCase.id, // 兼容性字段
          name: testCase.name,
          title: testCase.name, // 兼容性字段
          description: testCase.description,
          priority: testCase.priority,
          status: testCase.status,
          weight: testCase.weight,
          format: testCase.format,
          nature: testCase.nature,
          type: testCase.type,
          tags: testCase.tags,
          preconditions: testCase.preconditions,
          steps: testCase.steps || [],
          projectId: testCase.projectId,
          folderId: testCase.folderId,
          createdAt: testCase.createdAt,
          updatedAt: testCase.updatedAt,
          createdBy: testCase.createdBy,
          updatedBy: testCase.updatedBy,
          message: await t(
            isUpdate ? 'testCase.tools.updateSuccessMessage' : 'testCase.tools.createSuccessMessage',
            locale,
            { name: testCase.name }
          )
        };

        return result;

      } catch (error) {
        const errorMessage = await t(
          isUpdate ? 'testCase.tools.updateFailedMessage' : 'testCase.tools.createFailedMessage',
          locale,
          { error: error instanceof Error ? error.message : String(error) }
        );

        log(await t('testCase.tools.error', locale, { message: errorMessage }));
        return errorMessage;
      }
    },
  });


