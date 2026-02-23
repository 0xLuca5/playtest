import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { generateUUID as generateDocumentUUID } from '@/lib/utils';
import { MIDSCENE_REPORT } from '@/artifacts/types';
import { createTestRun, updateTestRun, getAutomationConfig, saveDocument, getCompleteTestCaseWithoutNote, updateTestCase, createKnownIssue } from '@/lib/db/queries';
import type { ChatMessage } from '@/lib/types';

interface TestCaseAutomationProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId?: string;
  locale?: string;
}

// 国际化文档内容
function getDocumentContent(locale: string = 'en') {
  const content = {
    en: {
      reportTitle: 'Automation Test Report',
      testExecutionSuccess: '✅ Test execution successful',
      framework: 'Framework',
      environment: 'Environment',
      reportLink: 'Report Link'
    },
    zh: {
      reportTitle: '自动化测试报告',
      testExecutionSuccess: '✅ 测试执行成功',
      framework: '框架',
      environment: '环境',
      reportLink: '报告链接'
    },
    ja: {
      reportTitle: '自動化テストレポート',
      testExecutionSuccess: '✅ テスト実行成功',
      framework: 'フレームワーク',
      environment: '環境',
      reportLink: 'レポートリンク'
    }
  };

  return content[locale as keyof typeof content] || content.en;
}

// 国际化自动化错误消息
function getAutomationErrorMessages(locale: string = 'en') {
  const messages = {
    en: {
      testFailed: '❌ Automation Test Failed',
      testCase: '📋 Test Case',
      problemDescription: '🚨 Problem Description',
      technicalDetails: '🔧 Technical Details (Click to expand)',
      errorDetails: '**Error Details**',
      solutions: '🛠️ Solutions',
      quickActions: '💬 Quick Actions',
      quickActionsText: 'You can directly say:',
      regenerateConfig: '- "Regenerate automation configuration"',
      checkConfig: '- "Check test case configuration"',
      helpFix: '- "Help me fix this issue"'
    },
    zh: {
      testFailed: '❌ 自动化测试失败',
      testCase: '📋 测试用例',
      problemDescription: '🚨 问题描述',
      technicalDetails: '🔧 技术详情 (点击展开)',
      errorDetails: '**错误详情**',
      solutions: '🛠️ 解决方案',
      quickActions: '💬 快速操作',
      quickActionsText: '您可以直接说：',
      regenerateConfig: '- "重新生成自动化配置"',
      checkConfig: '- "检查测试用例配置"',
      helpFix: '- "帮我修复这个问题"'
    },
    ja: {
      testFailed: '❌ 自動化テストが失敗しました',
      testCase: '📋 テストケース',
      problemDescription: '🚨 問題の説明',
      technicalDetails: '🔧 技術的詳細 (クリックして展開)',
      errorDetails: '**エラー詳細**',
      solutions: '🛠️ 解決策',
      quickActions: '💬 クイックアクション',
      quickActionsText: '直接以下のように言えます：',
      regenerateConfig: '- "自動化設定を再生成"',
      checkConfig: '- "テストケース設定を確認"',
      helpFix: '- "この問題の修正を手伝って"'
    }
  };

  return messages[locale as keyof typeof messages] || messages.en;
}

// 日志函数
const log = (message: string) => {
  console.log(`[TestCase Automation Tool] ${message}`);
};

// 确保报告目录存在
const ensureReportDirExists = () => {
  const reportDir = path.join(process.cwd(), 'public', 'report');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
};

// 处理log.json文件并更新测试步骤的notes
const processLogJsonAndUpdateSteps = async (testCaseId: string, logJsonPath: string) => {
  try {
    log(`开始处理log.json文件: ${logJsonPath}`);

    // 检查文件是否存在
    if (!fs.existsSync(logJsonPath)) {
      log(`log.json文件不存在: ${logJsonPath}`);
      return;
    }

    // 读取log.json文件
    const logContent = fs.readFileSync(logJsonPath, 'utf-8');
    const logData = JSON.parse(logContent);
    log(`成功读取log.json文件，数据长度: ${JSON.stringify(logData).length}`);

    // 获取当前测试用例的步骤
    const testCase = await getCompleteTestCaseWithoutNote(testCaseId);
    if (!testCase || !testCase.steps) {
      log(`未找到测试用例或测试步骤: ${testCaseId}`);
      return;
    }

    log(`找到测试用例，步骤数量: ${testCase.steps.length}`);

    // 获取YAML配置以便匹配aiAssert
    let yamlConfig: any = null;
    try {
      const { getAutomationConfig } = await import('@/lib/db/queries');
      const automationConfig = await getAutomationConfig(testCaseId, 'midscene');

      if (automationConfig && automationConfig.parameters) {
        let params: any;
        if (typeof automationConfig.parameters === 'string') {
          params = JSON.parse(automationConfig.parameters);
        } else {
          params = automationConfig.parameters;
        }

        const yamlContent = params.yaml_content || params.yamlContent || params.yaml || '';
        if (yamlContent) {
          // 解析YAML内容
          const yaml = await import('yaml');
          yamlConfig = yaml.parse(yamlContent);
        }
      }
    } catch (error) {
      console.log('获取YAML配置失败:', error);
    }

    // 创建YAML任务和测试步骤的映射关系 - 移到map外面避免重复处理
    const yamlStepMapping: { [key: number]: any } = {};

    if (logData && logData.executions && Array.isArray(logData.executions) &&
        yamlConfig && yamlConfig.tasks && Array.isArray(yamlConfig.tasks)) {
      console.log(`开始处理，YAML任务数量: ${yamlConfig.tasks.length}, log执行数量: ${logData.executions.length}`);

          // 遍历YAML任务，如果存在aiAssert，则在log.json里面寻找
          for (let taskIndex = 0; taskIndex < yamlConfig.tasks.length; taskIndex++) {
            const yamlTask = yamlConfig.tasks[taskIndex];
            const stepNumber = taskIndex + 1; // YAML任务1对应步骤1，任务2对应步骤2

            console.log(`处理YAML任务 ${taskIndex + 1} (${yamlTask.name}) -> 对应步骤 ${stepNumber}`);

            if (yamlTask.flow && Array.isArray(yamlTask.flow)) {
              // 查找该任务中的aiAssert
              const aiAssertStep = yamlTask.flow.find((flowStep: any) => flowStep.aiAssert);

              if (aiAssertStep && aiAssertStep.aiAssert) {
                const yamlAssertion = aiAssertStep.aiAssert;
                console.log(`YAML任务 ${taskIndex + 1} 有aiAssert: "${yamlAssertion}"`);

                // 在log.json里面寻找匹配的assertion
                let foundExecution = null;

                for (let execIndex = 0; execIndex < logData.executions.length; execIndex++) {
                  const exec = logData.executions[execIndex];

                  if (exec.tasks && Array.isArray(exec.tasks)) {
                    for (let logTaskIndex = 0; logTaskIndex < exec.tasks.length; logTaskIndex++) {
                      const logTask = exec.tasks[logTaskIndex];

                      if (logTask.param && logTask.param.assertion) {
                        const logAssertion = logTask.param.assertion;

                        // 检查是否匹配
                        if (logAssertion === yamlAssertion) {
                          console.log(`✅ 找到匹配: YAML "${yamlAssertion}" = Log "${logAssertion}"`);
                          console.log(`✅ 匹配的执行: ${exec.name}`);
                          foundExecution = exec;
                          break;
                        }
                      }
                    }
                  }

                  if (foundExecution) {
                    break; // 找到匹配就停止遍历log执行
                  }
                }

                // 如果找到匹配，则保存到映射中
                if (foundExecution) {
                  yamlStepMapping[stepNumber] = foundExecution;
                  console.log(`✅ 步骤 ${stepNumber} 映射到执行: ${foundExecution.name}`);
                } else {
                  console.log(`❌ YAML任务 ${taskIndex + 1} 的aiAssert "${yamlAssertion}" 在log.json中未找到匹配`);
                }
              } else {
                console.log(`YAML任务 ${taskIndex + 1} (${yamlTask.name}) 没有aiAssert`);
              }
            }
          }
    }

    // 处理log数据，提取每个步骤的截图和信息
    const updatedSteps = testCase.steps.map((step: any, index: number) => {
      let stepNotes = step.notes || '';
      let targetExecution: any = null;

      // 使用数组索引+1作为步骤编号，确保与YAML任务编号对应
      const stepNumber = index + 1;
      if (yamlStepMapping[stepNumber]) {
        targetExecution = yamlStepMapping[stepNumber];
        console.log(`步骤 ${stepNumber} 使用映射的执行: ${targetExecution.name}`);
      } else {
        console.log(`步骤 ${stepNumber} 没有找到对应的映射，保持原有notes`);
      }

      if (targetExecution) {
        let screenshot: string | null = null;

        // 从执行记录中提取最后一张截图
        console.log(`步骤 ${stepNumber} 开始提取截图，执行记录: ${targetExecution.name}`);
        if (targetExecution.tasks && Array.isArray(targetExecution.tasks)) {
          console.log(`步骤 ${stepNumber} tasks数量: ${targetExecution.tasks.length}`);
          // 遍历所有任务，找到最后一张截图
          for (let i = targetExecution.tasks.length - 1; i >= 0; i--) {
            const task = targetExecution.tasks[i];
            console.log(`步骤 ${stepNumber} 检查task ${i}, type: ${task.type}, subType: ${task.subType}`);
            if (task.recorder && Array.isArray(task.recorder)) {
              console.log(`步骤 ${stepNumber} task ${i} recorder数量: ${task.recorder.length}`);
              const screenshots = task.recorder.filter((record: any) => record.type === 'screenshot');
              console.log(`步骤 ${stepNumber} task ${i} 截图记录数量: ${screenshots.length}`);
              if (screenshots.length > 0) {
                const lastScreenshot = screenshots[screenshots.length - 1];
                if (lastScreenshot.screenshot) {
                  screenshot = lastScreenshot.screenshot;
                  console.log(`步骤 ${stepNumber} 从task ${i} 获取截图，长度: ${screenshot?.length || 0}`);
                  break; // 找到截图就停止
                }
              }
            } else {
              console.log(`步骤 ${stepNumber} task ${i} 没有recorder`);
            }
          }
        } else {
          console.log(`步骤 ${stepNumber} 执行记录没有tasks`);
        }

        // 如果找到了截图，完全替换notes内容
        if (screenshot) {
          console.log(`步骤 ${stepNumber} 找到截图数据:`, {
            length: screenshot.length,
            prefix: screenshot.substring(0, 50) + '...',
            startsWithData: screenshot.startsWith('data:'),
            type: typeof screenshot,
            assertion: targetExecution.assertion
          });

          // 验证screenshot是否是有效的base64数据
          const isValidBase64 = screenshot.startsWith('data:image') ||
                               (screenshot.length > 100 && /^[A-Za-z0-9+/=]+$/.test(screenshot.substring(0, 100)));

          if (isValidBase64) {
            // 完全替换notes内容，不保留任何旧内容
            stepNotes = '## Result\n\n';
a
            // 确保base64数据格式正确
            let base64Data = screenshot.startsWith('data:')
              ? screenshot
              : `data:image/png;base64,${screenshot}`;

            // 验证base64数据长度，如果太长可能导致Markdown解析问题
            if (base64Data.length > 500000) {
              console.warn(`步骤 ${stepNumber} 的base64数据过长 (${base64Data.length} 字符)，可能导致解析问题`);
            }

            // 使用特殊的分隔符来标记图片，避免Markdown解析问题
            stepNotes += `\n\n---SCREENSHOT-START---\n${base64Data}\n---SCREENSHOT-END---\n\n`;

            console.log(`步骤 ${stepNumber} 生成的Markdown:`, {
              notesLength: stepNotes.length,
              base64DataLength: base64Data.length,
              markdownPreview: stepNotes.substring(0, 100) + '...',
              assertion: targetExecution.assertion
            });
          } else {
            console.warn(`步骤 ${stepNumber} 的截图数据无效:`, {
              length: screenshot.length,
              prefix: screenshot.substring(0, 100),
              startsWithData: screenshot.startsWith('data:'),
              isString: typeof screenshot === 'string'
            });
            // 即使截图无效，也要清空旧的notes
            stepNotes = '## Result\n\n❌ 截图数据无效\n';
          }
        } else {
          console.log(`步骤 ${stepNumber} 未找到截图数据`);
          // 如果没有截图，显示调试信息
          stepNotes = `## Result \n\n❌ 未找到截图\n\n**调试信息**:\n- 匹配的执行记录: ${targetExecution?.name || '无'}\n- 执行记录任务数: ${targetExecution?.tasks?.length || 0}\n- assertion: ${targetExecution?.assertion || '无'}\n`;
        }
      } else {
        // 如果没有找到匹配的execution，保持原有的notes不变
        console.log(`步骤 ${stepNumber} 没有找到匹配的assertion，保持原有notes不变`);
        // stepNotes 保持原值，不做任何修改
      }

      return {
        ...step,
        notes: stepNotes.trim()
      };
    });

    // 更新测试用例的步骤
    await updateTestCase(testCaseId, { steps: updatedSteps }, 'automation-system');
    log(`成功更新测试步骤的notes，更新了 ${updatedSteps.length} 个步骤`);

  } catch (error) {
    log(`处理log.json文件时出错: ${error instanceof Error ? error.message : String(error)}`);
    console.error('处理log.json文件时出错:', error);
  }
};

// 从YAML中提取URL的辅助函数
function extractUrlFromYaml(yamlContent: string): string {
  try {
    const urlMatch = yamlContent.match(/url:\s*(.+)/);
    return urlMatch ? urlMatch[1].trim() : '';
  } catch (error) {
    log(`提取URL失败: ${error}`);
    return '';
  }
}

// 专门为测试用例执行自动化测试的工具，使用数据库中的配置
export const executeTestCaseAutomation = ({ session, dataStream, chatId, locale: defaultLocale = 'en' }: TestCaseAutomationProps) =>
  tool({
    description: 'Execute automation testing for test cases using saved automation configuration and YAML from database. If no configuration exists, prompts user to generate configuration first.',
    inputSchema: z.object({
      testCaseId: z.string().describe('Test case ID'),
      title: z.string().describe('Test title'),
      framework: z.string().optional().describe('Specify automation framework to use, if not specified uses default configuration'),
      locale: z.string().optional().default('en').describe('Language setting (en/zh/ja) - affects error message language'),
    }),
    execute: async ({ testCaseId, title, framework, locale }) => {
      // 优先使用传入的locale参数，如果没有则使用defaultLocale
      const finalLocale = locale || defaultLocale;
      log(`开始执行测试用例自动化测试: ${title}, 测试用例ID: ${testCaseId}, 框架: ${framework || '默认'}`);

      // 发送执行状态更新
      const statusMessages = {
        en: {
          message: '🚀 Executing automation test',
          details: `Executing automation test for test case "${title}"...`
        },
        zh: {
          message: '🚀 正在执行自动化测试',
          details: `正在为测试用例 "${title}" 执行自动化测试...`
        },
        ja: {
          message: '🚀 自動化テストを実行中',
          details: `テストケース "${title}" の自动化テストを実行中...`
        }
      };

      const statusMsg = statusMessages[finalLocale as keyof typeof statusMessages] || statusMessages.en;

      // 发送执行状态更新 - 检查 dataStream 是否存在
      if (dataStream) {
        dataStream.write({
          type: 'data-textDelta',
          data: `🚀 ${statusMsg.message}\n${statusMsg.details}\n\n`,
          transient: true,
        });
      }

      ensureReportDirExists();
      
      let testRunId: string | null = null;
      const startTime = Date.now();
      
      try {
        // 1. 获取数据库中的自动化配置
        const automationConfig = await getAutomationConfig(testCaseId, framework);
        
        if (!automationConfig) {
          // 发送友好的错误消息，建议用户生成配置
          const errorMessage = `## ❌ 自动化配置未找到\n\n测试用例 "${title}" (ID: ${testCaseId}) 还没有配置自动化测试。\n\n### 📋 接下来的步骤：\n\n1. **生成 Midscene 配置**\n   - 说 "generate midscene config" 或 "生成自动化配置"\n\n2. **或者生成通用自动化配置**\n   - 说 "generate automation config"\n\n3. **然后再执行自动化测试**\n   - 说 "run automation" 或 "执行自动化测试"\n\n### 💡 提示\n如果您想要我自动为您生成配置并执行测试，请说："为这个测试用例生成配置并执行自动化测试"`;

          // 发送完成信号
          if (dataStream) {
            dataStream.write({
              type: 'data-finish',
              data: null,
              transient: false
            });
          }

          return {
            success: false,
            error: errorMessage,
            testCaseId: testCaseId,
            framework: framework || 'unknown',
            environment: 'unknown',
            needsConfig: true
          };
        }

        // 2. 检查配置中是否有YAML内容
        log(`自动化配置详情: ${JSON.stringify(automationConfig, null, 2)}`);
        
        let yamlContent = '';
        if (automationConfig.parameters) {
          try {
            // 检查parameters是字符串还是对象
            let params: any;
            if (typeof automationConfig.parameters === 'string') {
              log(`参数是字符串，需要解析: ${automationConfig.parameters.substring(0, 100)}...`);
              params = JSON.parse(automationConfig.parameters);
            } else {
              params = automationConfig.parameters;
            }
            
            log(`解析后的参数内容: ${JSON.stringify(params, null, 2)}`);
            
            // 尝试多种可能的字段名
            yamlContent = params.yaml_content || params.yamlContent || params.yaml || '';
            log(`提取的YAML内容长度: ${yamlContent.length}`);
            if (yamlContent) {
              log(`YAML内容预览: ${yamlContent.substring(0, 200)}...`);
            }
          } catch (parseError) {
            log(`解析参数失败: ${parseError}`);
          }
        }

        if (!yamlContent) {
          return {
            content: `## ❌ 配置中缺少YAML内容\n\n找到了自动化配置，但缺少YAML测试脚本。\n\n**调试信息**:\n- 配置ID: ${automationConfig.id}\n- 框架: ${automationConfig.framework}\n- 参数类型: ${typeof automationConfig.parameters}\n- 参数内容: ${automationConfig.parameters ? String(automationConfig.parameters).substring(0, 100) + '...' : 'null'}\n\n请重新生成Midscene配置以包含完整的YAML内容。`
          };
        }

        log(`找到自动化配置: 框架=${automationConfig.framework}, 环境=${automationConfig.environment}`);
        log(`YAML内容长度: ${yamlContent.length} 字符`);

        // 发送开始执行的消息
        if (dataStream) {
          dataStream.write({
            type: 'data-textDelta',
            data: `## 🚀 开始执行自动化测试\n\n正在为测试用例 "${title}" 执行自动化测试...\n\n### 📊 执行状态\n- ⏳ 正在初始化测试环境\n- 📝 创建测试运行记录\n- 🔧 准备自动化配置 (${automationConfig.framework})\n\n请稍候，测试正在进行中...\n\n`,
            transient: true,
          });
        }

        // 3. 创建测试运行记录
        const startLogMessage = finalLocale === 'zh'
          ? `开始执行自动化测试: ${title} (使用数据库配置)`
          : finalLocale === 'ja'
          ? `自動化テストの実行を開始: ${title} (データベース設定を使用)`
          : `Starting automation test execution: ${title} (using database configuration)`;

        testRunId = await createTestRun({
          testCaseId,
          status: 'running',
          environment: automationConfig.environment || 'test',
          executor: session.user?.email || 'automation-bot',
          logs: startLogMessage
        });
        log(`创建测试运行记录: ${testRunId}`);

        // 4. 准备执行自动化测试，不创建文档
        log(`准备执行自动化测试，不创建文档`);

        // 5. 直接调用测试服务，传递testRunId以便错误处理
        const testUrl = extractUrlFromYaml(yamlContent);

        log(`直接调用testingService.executeTest，使用数据库YAML，URL: ${testUrl}`);
        const { TestingService } = await import('@/lib/services/testing-service');
        const testingService = new TestingService();

        const testResult = await testingService.executeTest(
          testUrl || 'https://example.com',
          yamlContent,
          dataStream,
          {
            width: 1280,
            height: 800,
            documentId: generateDocumentUUID(), // 生成临时ID，但不创建文档
            testRunId: testRunId // 传递testRunId以便错误处理
          }
        );
        log(`testingService.executeTest执行完成`);

        // 8. 等待测试报告生成
        log(`等待5秒，确保测试报告已生成`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 9. 获取报告URL和错误信息
        let reportUrl = '';
        let detailedError = '';
        if (testResult && typeof testResult === 'object') {
          reportUrl = testResult.publicReportUrl || '';
          // 获取详细的错误信息
          if (testResult.error && testResult.error.message) {
            detailedError = testResult.error.message;
          }
          log(`从testResult中获取到报告URL: ${reportUrl || '未找到'}`);
          log(`从testResult中获取到错误信息: ${detailedError || '无'}`);
        }

        // 10. 计算测试持续时间并准备日志信息
        const duration = Math.round((Date.now() - startTime) / 1000);

        // 准备日志信息（用于数据库和用户显示）
        const testStatus = (testResult && testResult.success) ? 'passed' : 'failed';
        const logs = (testResult && testResult.success)
          ? `Test execution successful using ${automationConfig.framework} framework, report URL: ${reportUrl}`
          : detailedError
            ? `Test execution failed using ${automationConfig.framework} framework. Error details: ${detailedError}${reportUrl ? `, report URL: ${reportUrl}` : ''}`
            : `Test execution failed using ${automationConfig.framework} framework${reportUrl ? `, report URL: ${reportUrl}` : ', no report generated'}`;

        if (testRunId) {
          await updateTestRun(testRunId, {
            status: testStatus,
            duration,
            logs,
            reportUrl: reportUrl || undefined
          });
          log(`更新测试运行记录: ${testRunId}, 状态: ${testStatus}, 持续时间: ${duration}s`);

          // 11. 处理log.json文件并更新测试步骤的notes（不管测试状态如何）
          const logJsonPath = path.join(process.cwd(), 'data', 'automation', testCaseId, 'log.json');
          log(`尝试处理log.json文件: ${logJsonPath}`);
          await processLogJsonAndUpdateSteps(testCaseId, logJsonPath);

          // 12. 更新测试用例的UI状态 - 发送测试用例数据流
          try {
            const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
            if (updatedTestCase && dataStream) {
              // 发送测试用例更新数据流，让UI知道测试已完成
              dataStream.write({
                type: 'data-id',
                data: testCaseId,
                transient: true,
              });
              dataStream.write({
                type: 'data-kind',
                data: 'midscene_report',
                transient: true,
              });
              dataStream.write({
                type: 'data-title',
                data: updatedTestCase.name,
                transient: true,
              });

              // 发送测试用例详细数据，包含最新的测试运行信息
              dataStream.write({
                type: 'data-midscene-delta',
                data: {
                  testCaseId: updatedTestCase.id,
                  name: updatedTestCase.name,
                  description: updatedTestCase.description,
                  priority: updatedTestCase.priority,
                  status: updatedTestCase.status,
                  type: updatedTestCase.type,
                  tags: updatedTestCase.tags || [],
                  preconditions: updatedTestCase.preconditions,
                  postconditions: updatedTestCase.postconditions,
                  estimatedTime: updatedTestCase.estimatedTime,
                  actualTime: updatedTestCase.actualTime,
                  author: updatedTestCase.createdBy,
                  modifier: updatedTestCase.updatedBy,
                  executionTime: updatedTestCase.executionTime,
                  lastRun: new Date().toISOString(), // 更新最后运行时间
                  steps: updatedTestCase.steps || [],
                  relatedRequirements: updatedTestCase.relatedRequirements || [],
                  datasets: updatedTestCase.datasets || [],
                  knownIssues: updatedTestCase.knownIssues || [],
                  reportUrl: reportUrl || '' // 添加报告URL
                }
              });
              log(`已发送测试用例UI更新数据流`);
            }
          } catch (uiUpdateError) {
            log(`更新测试用例UI失败: ${uiUpdateError}`);
          }
        }

        // 11. 根据测试结果决定是否创建文档
        log(`测试执行完成，报告URL: ${reportUrl || '无'}`);

        let content: string;
        let resultObject: any = null;

        if (testResult && testResult.success) {
          // 成功情况 - 创建文档
          const documentId = generateDocumentUUID();

          try {
            // 创建测试报告文档
            if (chatId) {
              const docContent = getDocumentContent(finalLocale);
              await saveDocument({
                id: documentId,
                chatId: chatId,
                title: `${title} - ${docContent.reportTitle}`,
                content: `# ${title} - ${docContent.reportTitle}\n\n${docContent.testExecutionSuccess}\n\n**${docContent.framework}**: ${automationConfig.framework}\n**${docContent.environment}**: ${automationConfig.environment}\n**${docContent.reportLink}**: ${reportUrl}`,
                kind: MIDSCENE_REPORT,
                userId: session.user?.id || 'system'
              });
              log(`创建测试报告文档: ${documentId}`);
            }

            // 构建结果对象
            resultObject = {
              id: documentId,
              title: `${title} (${automationConfig.framework})`,
              kind: MIDSCENE_REPORT,
              reportUri: reportUrl,
              isVisible: true
            };
          } catch (docError) {
            log(`创建文档失败: ${docError}`);
          }

          content = finalLocale === 'zh'
            ? `✅ 自动化测试执行完成！\n\n**使用配置**: ${automationConfig.framework} (${automationConfig.environment})\n**测试用例**: ${title}\n\n测试报告已生成，请查看左侧Test Runs菜单下的报告。`
            : finalLocale === 'ja'
            ? `✅ 自動化テストの実行が完了しました！\n\n**使用設定**: ${automationConfig.framework} (${automationConfig.environment})\n**テストケース**: ${title}\n\nテストレポートが生成されました。左側のTest Runsメニューでレポートを確認してください。`
            : `✅ Automation test execution completed!\n\n**Configuration Used**: ${automationConfig.framework} (${automationConfig.environment})\n**Test Case**: ${title}\n\nTest report has been generated. Please check the report in the Test Runs menu on the left.`;
        } else {
          // 失败情况 - 不创建文档，显示数据库logs字段的详细错误信息
          const reportInfo = reportUrl ? `\n\n**测试报告**: 可在右侧面板中查看详细报告` : '';
          const reportInfoJa = reportUrl ? `\n\n**テストレポート**: 右側パネルで詳細レポートを確認できます` : '';
          const reportInfoEn = reportUrl ? `\n\n**Test Report**: Detailed report available in the right panel` : '';

          content = finalLocale === 'zh'
            ? `❌ 测试执行失败\n\n**使用配置**: ${automationConfig.framework} (${automationConfig.environment})\n**测试用例**: ${title}\n\n**错误详情**: ${logs || '未知错误'}${reportInfo}`
            : finalLocale === 'ja'
            ? `❌ テスト実行に失敗しました\n\n**使用設定**: ${automationConfig.framework} (${automationConfig.environment})\n**テストケース**: ${title}\n\n**エラー詳細**: ${logs || '不明なエラー'}${reportInfoJa}`
            : `❌ Test execution failed\n\n**Configuration Used**: ${automationConfig.framework} (${automationConfig.environment})\n**Test Case**: ${title}\n\n**Error Details**: ${logs || 'Unknown error'}${reportInfoEn}`;

          // 自动创建 issue（测试失败时）
          try {
            log(`开始创建自动化测试失败的 issue...`);
            const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
            if (updatedTestCase) {
              // 构建 issue 描述，包含执行步骤和错误信息
              let issueDescription = `# Issue Description\nAutomation Test Failed\n\n`;
              issueDescription += `## Test Case\n${updatedTestCase.name}\n\n`;
              issueDescription += `## Framework\n${automationConfig.framework}\n\n`;
              issueDescription += `## Environment\n${automationConfig.environment}\n\n`;
              
              // 添加测试步骤
              if (updatedTestCase.steps && updatedTestCase.steps.length > 0) {
                issueDescription += `## Test Steps\n`;
                updatedTestCase.steps.forEach((step: any, index: number) => {
                  issueDescription += `${index + 1}. ${step.action}\n`;
                  if (step.expectedResult) {
                    issueDescription += `   Expected: ${step.expectedResult}\n`;
                  }
                });
                issueDescription += `\n`;
              }
              
              // 添加错误信息
              issueDescription += `## Error Details\n${logs || 'Unknown error'}\n\n`;
              
              // 添加报告链接（如果有）
              if (reportUrl) {
                issueDescription += `\n## Test Report\n${reportUrl}`;
              }

              // 构建 issue 标题
              const issueTitle = `Automation Test Failed: ${updatedTestCase.name}`;

              // 构建 tags 数组
              const issueTags = ['automation', 'test-failure'];
              if (automationConfig.framework) {
                issueTags.push(automationConfig.framework);
              }

              // 创建 issue
              const issueId = await createKnownIssue({
                testCaseId: testCaseId,
                title: issueTitle,
                description: issueDescription,
                severity: 'high',
                status: 'open',
                reporter: session.user?.email || 'system',
                category: 'automation',
                tags: issueTags
              });

              log(`✅ 已自动创建 issue: ${issueId} - ${issueTitle}`);
            }
          } catch (issueCreationError) {
            log(`❌ 自动创建 issue 失败: ${issueCreationError instanceof Error ? issueCreationError.message : String(issueCreationError)}`);
          }
        }

        // 发送完成信号
        if (dataStream) {
          dataStream.write({
            type: 'data-finish',
            data: null,
            transient: false
          });
        }

        // 总是返回对象格式
        if (resultObject) {
          // 成功且创建了文档，返回文档对象
          return {
            success: true,
            message: content,
            document: resultObject,
            testCaseId: testCaseId,
            framework: automationConfig.framework,
            environment: automationConfig.environment,
            reportUri: reportUrl || '' // 添加报告URL
          };
        } else {
          // 失败或没有创建文档，返回错误对象
          return {
            success: false,
            error: content,
            testCaseId: testCaseId,
            framework: automationConfig?.framework || 'unknown',
            environment: automationConfig?.environment || 'unknown',
            reportUri: reportUrl || '' // 添加报告URL，即使失败也可能有报告
          };
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`执行测试用例自动化测试时出错: ${errorMsg}`);
        console.error("执行测试用例自动化测试时出错:", error);

        // 即使测试失败，也尝试获取报告URL
        let reportUrl = '';
        try {
          // 等待报告生成
          await new Promise(resolve => setTimeout(resolve, 3000));

          // 查找报告文件
          const reportDir = path.join(process.cwd(), 'public', 'report');
          if (fs.existsSync(reportDir)) {
            const reportFiles = fs.readdirSync(reportDir);
            const reportPattern = /^puppeteer-.*\.html$/;
            const matchingFiles = reportFiles
              .filter(file => reportPattern.test(file))
              .map(file => ({
                name: file,
                path: path.join(reportDir, file),
                mtime: fs.statSync(path.join(reportDir, file)).mtime.getTime()
              }))
              .sort((a, b) => b.mtime - a.mtime);

            if (matchingFiles.length > 0) {
              // 使用最新的报告文件
              const latestReportPath = matchingFiles[0].path;
              log(`找到最新的报告文件: ${latestReportPath}`);

              // 生成报告URL
              const { TestingService } = await import('@/lib/services/testing-service');
              const testingService = new TestingService();
              reportUrl = await testingService.copyReportToPublic(latestReportPath);
              log(`失败测试的报告URL已生成: ${reportUrl}`);
            }
          }
        } catch (reportError) {
          log(`获取失败测试报告URL时出错: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
        }

        // 只在testing-service没有更新记录的情况下才更新
        // 通过检查错误类型来判断是否需要更新
        if (testRunId) {
          try {
            // 如果错误来自testing-service的executeTest，那么记录已经被更新了
            // 这种情况下，错误会被重新抛出到这里
            const isTestingServiceError = errorMsg.includes('Error(s) occurred in running yaml script') ||
                                        errorMsg.includes('执行测试YAML失败') ||
                                        errorMsg.includes('Network timeout') ||
                                        errorMsg.includes('reCAPTCHA');

            if (isTestingServiceError) {
              // 这是来自testing-service的错误，记录已经被更新，不要覆盖
              log(`错误来自testing-service，测试运行记录已包含详细错误信息，跳过更新: ${testRunId}`);
            } else {
              // 这是其他类型的错误（如配置问题、网络问题等），需要更新记录
              const duration = Math.round((Date.now() - startTime) / 1000);
              // 数据库日志统一使用英文
              const failureLogMessage = `Test execution failed: ${errorMsg}`;

              await updateTestRun(testRunId, {
                status: 'failed',
                duration,
                logs: failureLogMessage,
                reportUrl: undefined
              });
              log(`更新测试运行记录为失败状态: ${testRunId}`);
            }

            // 更新测试用例的UI状态 - 即使失败也要更新UI
            try {
              const updatedTestCase = await getCompleteTestCaseWithoutNote(testCaseId);
              if (updatedTestCase && dataStream) {
                // 发送UI更新数据流
                dataStream.write({ type: 'data-id', data: testCaseId, transient: true });
                dataStream.write({ type: 'data-kind', data: 'midscene_report', transient: true });
                dataStream.write({ type: 'data-title', data: updatedTestCase.name, transient: true });

                dataStream.write({
                  type: 'data-midscene-delta',
                  data: {
                      testCaseId: updatedTestCase.id,
                      name: updatedTestCase.name,
                      description: updatedTestCase.description,
                    priority: updatedTestCase.priority,
                    status: updatedTestCase.status,
                    type: updatedTestCase.type,
                    tags: updatedTestCase.tags || [],
                    preconditions: updatedTestCase.preconditions,
                    postconditions: updatedTestCase.postconditions,
                    estimatedTime: updatedTestCase.estimatedTime,
                    actualTime: updatedTestCase.actualTime,
                    author: updatedTestCase.createdBy,
                    modifier: updatedTestCase.updatedBy,
                    executionTime: updatedTestCase.executionTime,
                    lastRun: new Date().toISOString(), // 更新最后运行时间
                    steps: updatedTestCase.steps || [],
                    relatedRequirements: updatedTestCase.relatedRequirements || [],
                    datasets: updatedTestCase.datasets || [],
                    knownIssues: updatedTestCase.knownIssues || [],
                    reportUri: reportUrl || '' // 添加报告URL，即使失败也可能有报告
                  }
                });
                log(`已发送测试用例UI更新数据流（失败状态）`);
              }
            } catch (uiUpdateError) {
              log(`更新测试用例UI失败: ${uiUpdateError}`);
            }
          } catch (updateError) {
            log(`更新测试运行记录失败: ${updateError}`);
          }
        }
        
        // 简化错误显示 - 直接显示错误信息
        const errorContent = finalLocale === 'zh'
          ? `❌ 测试执行失败\n\n**测试用例**: ${title}\n\n**错误详情**: ${errorMsg}`
          : finalLocale === 'ja'
          ? `❌ テスト実行に失敗しました\n\n**テストケース**: ${title}\n\n**エラー詳細**: ${errorMsg}`
          : `❌ Test execution failed\n\n**Test Case**: ${title}\n\n**Error Details**: ${errorMsg}`;

        // 发送完成信号
        if (dataStream) {
          dataStream.write({
            type: 'data-finish',
            data: null,
            transient: false
          });
        }

        return {
          success: false,
          error: errorContent,
          testCaseId: testCaseId,
          framework: framework || 'unknown',
          environment: 'unknown',
          reportUri: reportUrl || '' // 添加报告URL，即使在catch块中也可能有报告
        };
      }
    }
  });



// 格式化错误消息为用户友好的显示
function formatErrorMessage(error: any, errorMsg: string, testCaseTitle?: string, locale: string = 'en'): string {
  // 分析错误类型并提供简化的解释
  const errorAnalysis = analyzeError(error, errorMsg, locale);

  const messages = getAutomationErrorMessages(locale);
  let structuredError = `## ${messages.testFailed}\n\n`;

  if (testCaseTitle) {
    structuredError += `**${messages.testCase}**: ${testCaseTitle}\n\n`;
  }

  // 显示简化的错误信息
  structuredError += `### ${messages.problemDescription}\n\n`;
  structuredError += `${errorAnalysis.userFriendlyMessage}\n\n`;

  // 只在需要时显示技术细节，但不显示原始JSON
  if (errorAnalysis.showTechnicalDetails) {
    // 清理错误信息，移除JSON格式
    let cleanErrorMsg = errorMsg;
    try {
      // 如果是JSON格式，尝试提取有用信息
      if (errorMsg.includes('{') && errorMsg.includes('}')) {
        const jsonMatch = errorMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0]);
          const fallbackMsg = locale === 'zh' ? '执行过程中遇到技术问题' :
                              locale === 'ja' ? '実行中に技術的な問題が発生しました' :
                              'Technical issue encountered during execution';
          cleanErrorMsg = errorObj.message || errorObj.error || errorObj.description || fallbackMsg;
        }
      }
    } catch (e) {
      // 如果不是JSON，保持原样但限制长度
      cleanErrorMsg = errorMsg.substring(0, 200);
    }

    structuredError += `<details>\n<summary>${messages.technicalDetails}</summary>\n\n`;
    structuredError += `${messages.errorDetails}: ${cleanErrorMsg}\n\n`;
    structuredError += `</details>\n\n`;
  }

  // 提供针对性的解决方案
  structuredError += `### �️ 解决方案\n\n`;
  errorAnalysis.solutions.forEach((solution, index) => {
    structuredError += `${index + 1}. **${solution.title}** - ${solution.description}\n`;
  });

  structuredError += `\n### ${messages.quickActions}\n\n`;
  structuredError += `${messages.quickActionsText}\n`;
  structuredError += `${messages.regenerateConfig}\n`;
  structuredError += `${messages.checkConfig}\n`;
  structuredError += `${messages.helpFix}\n`;

  return structuredError;
}

// 分析错误并提供用户友好的解释
function analyzeError(_error: any, errorMsg: string, locale: string = 'en'): {
  userFriendlyMessage: string;
  showTechnicalDetails: boolean;
  solutions: Array<{ title: string; description: string }>;
} {
  const lowerErrorMsg = errorMsg.toLowerCase();

  // 获取本地化错误分析消息
  const getErrorAnalysisMessages = (locale: string) => {
    const messages = {
      en: {
        networkIssue: "🌐 **Network Connection Issue** - Unable to connect to the target website, possibly due to unstable network or temporary website unavailability.",
        networkSolutions: [
          { title: "Check Network Connection", description: "Ensure your network connection is stable" },
          { title: "Verify Website Address", description: "Confirm the test website URL is correct and accessible" },
          { title: "Retry Later", description: "Wait a few minutes and retry the test" }
        ],
        configIssue: "⚙️ **Configuration File Issue** - There's a problem with the automation test configuration file, possibly format errors or missing necessary information.",
        configSolutions: [
          { title: "Regenerate Configuration", description: "Delete current configuration and regenerate" },
          { title: "Check Test Steps", description: "Ensure test steps are complete and logically correct" },
          { title: "Verify URL Settings", description: "Confirm test target website URL is set correctly" }
        ],
        elementIssue: "🎯 **Page Element Location Failed** - Unable to find the required elements on the webpage, possibly due to page structure changes.",
        elementSolutions: [
          { title: "Update Test Steps", description: "Check and update operation descriptions in test steps" },
          { title: "Check Page Changes", description: "Confirm if the target webpage has been updated or redesigned" },
          { title: "Simplify Operation Steps", description: "Try using more generic operation descriptions" }
        ],
        permissionIssue: "🔒 **Access Permission Issue** - Insufficient permissions to access the target website or perform certain operations.",
        permissionSolutions: [
          { title: "Check Login Status", description: "Ensure test steps include necessary login operations" },
          { title: "Verify Permission Settings", description: "Confirm test account has sufficient operation permissions" },
          { title: "Contact Administrator", description: "For enterprise internal systems, contact system administrator" }
        ],
        genericIssue: "⚠️ **Test Execution Issue** - The automation test encountered an unexpected situation during execution.",
        genericSolutions: [
          { title: "Re-run Test", description: "Sometimes re-running can resolve temporary issues" },
          { title: "Check Test Configuration", description: "Confirm automation configuration is correct" },
          { title: "Simplify Test Steps", description: "Try reducing complex operation steps" },
          { title: "Seek Help", description: "Contact technical support for further assistance" }
        ]
      },
      zh: {
        networkIssue: "🌐 **网络连接问题** - 无法连接到目标网站，可能是网络不稳定或网站暂时无法访问。",
        networkSolutions: [
          { title: "检查网络连接", description: "确保您的网络连接正常" },
          { title: "验证网站地址", description: "确认测试的网站URL是否正确且可访问" },
          { title: "稍后重试", description: "等待几分钟后重新执行测试" }
        ],
        configIssue: "⚙️ **配置文件问题** - 自动化测试的配置文件有问题，可能是格式错误或缺少必要信息。",
        configSolutions: [
          { title: "重新生成配置", description: "删除当前配置并重新生成" },
          { title: "检查测试步骤", description: "确保测试步骤完整且逻辑正确" },
          { title: "验证URL设置", description: "确认测试目标网站URL设置正确" }
        ],
        elementIssue: "🎯 **页面元素定位失败** - 无法在网页上找到需要操作的元素，可能是页面结构发生了变化。",
        elementSolutions: [
          { title: "更新测试步骤", description: "检查并更新测试步骤中的操作描述" },
          { title: "检查页面变化", description: "确认目标网页是否有更新或改版" },
          { title: "简化操作步骤", description: "尝试使用更通用的操作描述" }
        ],
        permissionIssue: "🔒 **访问权限问题** - 没有足够的权限访问目标网站或执行某些操作。",
        permissionSolutions: [
          { title: "检查登录状态", description: "确保测试步骤包含必要的登录操作" },
          { title: "验证权限设置", description: "确认测试账号有足够的操作权限" },
          { title: "联系管理员", description: "如果是企业内部系统，请联系系统管理员" }
        ],
        genericIssue: "⚠️ **测试执行遇到问题** - 自动化测试在执行过程中遇到了意外情况。",
        genericSolutions: [
          { title: "重新执行测试", description: "有时重新运行可以解决临时问题" },
          { title: "检查测试配置", description: "确认自动化配置是否正确" },
          { title: "简化测试步骤", description: "尝试减少复杂的操作步骤" },
          { title: "寻求帮助", description: "联系技术支持获取进一步协助" }
        ]
      },
      ja: {
        networkIssue: "🌐 **ネットワーク接続の問題** - 対象ウェブサイトに接続できません。ネットワークが不安定であるか、ウェブサイトが一時的にアクセスできない可能性があります。",
        networkSolutions: [
          { title: "ネットワーク接続を確認", description: "ネットワーク接続が安定していることを確認してください" },
          { title: "ウェブサイトアドレスを確認", description: "テストウェブサイトのURLが正しくアクセス可能であることを確認してください" },
          { title: "後で再試行", description: "数分待ってからテストを再実行してください" }
        ],
        configIssue: "⚙️ **設定ファイルの問題** - 自動化テストの設定ファイルに問題があります。フォーマットエラーまたは必要な情報が不足している可能性があります。",
        configSolutions: [
          { title: "設定を再生成", description: "現在の設定を削除して再生成してください" },
          { title: "テストステップを確認", description: "テストステップが完全で論理的に正しいことを確認してください" },
          { title: "URL設定を確認", description: "テスト対象ウェブサイトのURL設定が正しいことを確認してください" }
        ],
        elementIssue: "🎯 **ページ要素の特定に失敗** - ウェブページ上で操作が必要な要素を見つけることができません。ページ構造が変更された可能性があります。",
        elementSolutions: [
          { title: "テストステップを更新", description: "テストステップの操作説明を確認して更新してください" },
          { title: "ページの変更を確認", description: "対象ウェブページが更新またはリニューアルされていないか確認してください" },
          { title: "操作ステップを簡素化", description: "より汎用的な操作説明を使用してみてください" }
        ],
        permissionIssue: "🔒 **アクセス権限の問題** - 対象ウェブサイトにアクセスしたり、特定の操作を実行するのに十分な権限がありません。",
        permissionSolutions: [
          { title: "ログイン状態を確認", description: "テストステップに必要なログイン操作が含まれていることを確認してください" },
          { title: "権限設定を確認", description: "テストアカウントに十分な操作権限があることを確認してください" },
          { title: "管理者に連絡", description: "企業内部システムの場合は、システム管理者に連絡してください" }
        ],
        genericIssue: "⚠️ **テスト実行の問題** - 自動化テストの実行中に予期しない状況が発生しました。",
        genericSolutions: [
          { title: "テストを再実行", description: "再実行により一時的な問題が解決される場合があります" },
          { title: "テスト設定を確認", description: "自動化設定が正しいことを確認してください" },
          { title: "テストステップを簡素化", description: "複雑な操作ステップを減らしてみてください" },
          { title: "サポートを求める", description: "技術サポートに連絡してさらなる支援を求めてください" }
        ]
      }
    };

    return messages[locale as keyof typeof messages] || messages.en;
  };

  const errorMessages = getErrorAnalysisMessages(locale);

  // 网络连接错误
  if (lowerErrorMsg.includes('network') || lowerErrorMsg.includes('connection') || lowerErrorMsg.includes('timeout')) {
    return {
      userFriendlyMessage: errorMessages.networkIssue,
      showTechnicalDetails: false,
      solutions: errorMessages.networkSolutions
    };
  }

  // 配置错误
  if (lowerErrorMsg.includes('config') || lowerErrorMsg.includes('yaml') || lowerErrorMsg.includes('parse')) {
    return {
      userFriendlyMessage: errorMessages.configIssue,
      showTechnicalDetails: false,
      solutions: errorMessages.configSolutions
    };
  }

  // 元素定位错误
  if (lowerErrorMsg.includes('element') || lowerErrorMsg.includes('selector') || lowerErrorMsg.includes('not found')) {
    return {
      userFriendlyMessage: errorMessages.elementIssue,
      showTechnicalDetails: false,
      solutions: errorMessages.elementSolutions
    };
  }

  // 权限或访问错误
  if (lowerErrorMsg.includes('permission') || lowerErrorMsg.includes('access') || lowerErrorMsg.includes('forbidden')) {
    return {
      userFriendlyMessage: errorMessages.permissionIssue,
      showTechnicalDetails: false,
      solutions: errorMessages.permissionSolutions
    };
  }

  // 默认通用错误
  return {
    userFriendlyMessage: errorMessages.genericIssue,
    showTechnicalDetails: true,
    solutions: errorMessages.genericSolutions
  };
}
