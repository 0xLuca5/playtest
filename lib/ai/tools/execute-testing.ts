import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { testingService } from '@/lib/services/testing-service';
import fs from 'fs';
import path from 'path';
import { generateUUID as generateDocumentUUID } from '@/lib/utils';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { MidsceneReportType, MIDSCENE_REPORT } from '@/artifacts/types';
import { getCompleteTestCaseWithoutNote } from '@/lib/db/queries';
import { getCurrentProjectIdOrDefault } from '@/lib/utils/project';
import type { ChatMessage } from '@/lib/types';

interface ExecuteTestingProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId?: string; // 添加可选的chatId参数
}

// 确保报告目录存在
function ensureReportDirExists() {
  const reportDir = path.join(process.cwd(), 'public', 'report');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return reportDir;
}

// 简单的日志函数
function log(message: string) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, 'testing-tool.log');
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  console.log(`[Testing Tool] ${message}`);
}

export const executeAutomationTesting = ({ session, dataStream, chatId }: ExecuteTestingProps) =>
  tool({
    description: '执行网页测试并生成测试报告。可以通过YAML描述测试步骤，自动执行网页交互并返回结果。',
    inputSchema: z.object({
      title: z.string().describe('测试的标题'),
      url: z.string().describe('要测试的网页URL'),
      yaml: z.string().optional().describe('Midscene YAML格式的测试步骤，如果不提供则会自动生成'),
      additionalInfo: z.string().optional().describe('用户提供的额外测试信息，用于生成更精确的测试步骤'),
      testCaseId: z.string().optional().describe('测试用例ID，如果提供则从测试用例中获取已有的YAML配置和相关信息'),
      width: z.number().optional().default(1280).describe('浏览器视窗宽度'),
      height: z.number().optional().default(800).describe('浏览器视窗高度'),
    }),
    execute: async ({ title, url, yaml, additionalInfo, testCaseId, width = 1280, height = 800 }) => {
      log(`开始执行测试工具: ${title}, URL: ${url}, testCaseId: ${testCaseId || '未提供'}`);

      // 如果提供了测试用例ID，尝试从测试用例中获取YAML配置
      let finalYaml = yaml;
      let finalAdditionalInfo = additionalInfo;

      if (testCaseId) {
        try {
          log(`从测试用例 ${testCaseId} 获取配置信息`);
          const testCase = await getCompleteTestCaseWithoutNote(testCaseId);

          if (testCase) {
            // 检查测试用例中是否有自动化配置
            if (testCase.automationConfig) {
              log(`找到测试用例中的自动化配置`);
              // 如果没有提供YAML，使用测试用例中的配置
              if (!finalYaml && testCase.automationConfig.yaml) {
                finalYaml = testCase.automationConfig.yaml;
                log(`使用测试用例中的YAML配置`);
              }
            }

            // 如果没有提供额外信息，使用测试用例的描述
            if (!finalAdditionalInfo) {
              finalAdditionalInfo = testCase.description || testCase.name;
              log(`使用测试用例描述作为额外信息: ${finalAdditionalInfo}`);
            }
          } else {
            log(`警告：测试用例 ${testCaseId} 不存在`);
          }
        } catch (error) {
          log(`获取测试用例配置时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      ensureReportDirExists();
      try {
        // 生成文档ID和工具调用ID
        const id = generateDocumentUUID();
        const toolCallId = generateDocumentUUID();
        log(`创建文档，ID: ${id}, 工具调用ID: ${toolCallId}`);
        
        // 如果有YAML配置，直接调用测试服务
        if (finalYaml) {
          log(`使用提供的YAML配置执行测试`);
          log(`YAML内容预览: ${finalYaml.substring(0, 200)}...`);

          // 直接调用测试服务执行测试
          const testResult = await testingService.executeTest(
            url,
            finalYaml,
            dataStream,
            { width, height, documentId: id }
          );
          log(`测试服务执行完成`);

          // 等待测试报告生成
          log(`等待5秒，确保测试报告已生成`);
          await new Promise(resolve => setTimeout(resolve, 5000));

          // 构建结果对象
          const resultObject = {
            id,
            title: `${title} ${url}`,
            kind: MIDSCENE_REPORT,
            content: testResult?.pageTitle || '测试执行完成',
            publicReportUrl: testResult?.publicReportUrl || '',
            isVisible: true
          };

          return resultObject;
        } else {
          // 没有YAML配置，使用文档处理器生成
          log(`没有YAML配置，使用文档处理器生成`);

          // 查找测试文档处理器
          const documentHandler = documentHandlersByArtifactKind.find(
            (handler) => handler.kind === MIDSCENE_REPORT,
          );
          if (!documentHandler) {
            throw new Error('未找到测试文档处理器');
          }
          
          // 调用文档处理器的onCreateDocument方法
          log(`调用documentHandler.onCreateDocument，ID: ${id}`);
          const testResult = await documentHandler.onCreateDocument({
            id,
            title: `${title} ${url}`,
            dataStream,
            session,
            chatId,
            projectId: getCurrentProjectIdOrDefault(), // 传递项目ID
          });
          log(`documentHandler.onCreateDocument执行完成`);
          
          // 等待5秒，确保测试报告已生成
          log(`等待5秒，确保测试报告已生成`);
          await new Promise(resolve => setTimeout(resolve, 5000));

          // 从testResult中获取报告URL
          let reportUrl = '';
          if (testResult && typeof testResult === 'object') {
            // 尝试从不同的属性名中获取报告URL
            reportUrl = testResult.publicReportUrl || testResult.report_url || testResult.report_uri || '';
            log(`从testResult中获取到报告URL: ${reportUrl || '未找到'}`);
          }

          // 如果没有找到报告URL，尝试从testResult.testResult中获取
          if (!reportUrl && testResult?.testResult?.publicReportUrl) {
            reportUrl = testResult.testResult.publicReportUrl;
            log(`从testResult.testResult中获取到报告URL: ${reportUrl}`);
          }

          // 构建结果对象
          const resultObject = {
            id: id,
            title: title,
            kind: MIDSCENE_REPORT,
            report_uri: reportUrl,
            isVisible: true
          };
          log(`返回结果对象: ${JSON.stringify(resultObject)}`);
          
          let content = `Your test has been completed, and the report has been generated. Please check the test report on the right.`
          if(!reportUrl) {
            content = `测试失败，请检查URL或yaml是否正确，或者尝试提供更具体的测试步骤。`
          }
          
          // 返回正确格式的消息，确保显示document-preview
          return {
            content: content,
            parts: [
              {
                type: "tool-invocation",
                toolInvocation: {
                  toolName: "executeAutomationTesting",
                  toolCallId: toolCallId,
                  state: "result",
                  result: resultObject
                }
              }
            ],
            tool_calls: [
              {
                id: toolCallId,
                type: "function",
                function: {
                  name: "executeAutomationTesting",
                  arguments: JSON.stringify(resultObject)
                }
              }
            ]
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`执行测试时出错: ${errorMsg}`);
        console.error("执行测试时出错:", error);
        // 返回格式化的错误消息
        return {
          content: `## 测试执行失败\n- 测试URL: ${url}\n- 错误信息: ${errorMsg}\n\n请检查URL是否正确，或者尝试提供更具体的测试步骤。`
        };
      }
    }
  });
