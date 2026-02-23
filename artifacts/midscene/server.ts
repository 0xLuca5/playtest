import { createDocumentHandler } from '@/lib/artifacts/server';
import { testingService } from '@/lib/services/testing-service';
import fs from 'fs';
import path from 'path';
import { getMessagesByChatId, getDocumentById } from '@/lib/db/queries';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { aiLogger } from '@/lib/logger';
import { MIDSCENE_REPORT, MidsceneReportType } from '@/artifacts/types';

// 创建模块专用的日志记录器
const logger = aiLogger.child('testing-handler');

// 从文档内容中提取报告URL
function extractReportUrlFromContent(content: string): string | undefined {
  if (!content) return undefined;
  
  // 方法1：直接匹配reportUrl行
  const reportUrlMatch = content.match(/reportUrl:\s*(\S+report\/[^,\s\n]+\.html)/);
  if (reportUrlMatch && reportUrlMatch[1]) {
    return reportUrlMatch[1];
  }
  
  // 方法2：匹配API路径格式
  const apiReportMatch = content.match(/\/api\/report\/([^,\s\n"']+\.html)/);
  if (apiReportMatch && apiReportMatch[0]) {
    return apiReportMatch[0];
  }
  
  // 方法3：匹配任何report路径
  const anyReportMatch = content.match(/(\/report\/[^,\s\n"']+\.html)/);
  if (anyReportMatch && anyReportMatch[1]) {
    return anyReportMatch[1];
  }
  
  // 方法4：尝试解析JSON内容
  try {
    const contentObj = JSON.parse(content);
    if (contentObj.report_uri) {
      return contentObj.report_uri;
    }
  } catch (e) {
    // 解析失败，继续使用其他方法
  }
  
  return undefined;
}

// 获取聊天记录中的文档
async function getDocumentsByChatId(chatId: string) {
  try {
    // 获取聊天记录中的所有消息（不限制用户，因为这是内部服务调用）
    const messages = await getMessagesByChatId({ id: chatId });
    
    // 从消息中提取文档ID
    const documentIds = [];
    for (const msg of messages) {
      if (typeof msg.parts === 'string') {
        try {
          const parts = JSON.parse(msg.parts);
          for (const part of parts) {
            if (part.type === 'document-reference' || part.type === MIDSCENE_REPORT) {
              if (part.document_id) {
                documentIds.push(part.document_id);
              }
            }
            // 检查工具调用
            if (part.type === 'tool-invocation' && part.toolInvocation?.result?.id) {
              documentIds.push(part.toolInvocation.result.id);
            }
          }
        } catch (e) {
          // 解析错误，继续处理下一条消息
          logger.warn(`解析消息parts失败: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.type === 'document-reference' || part.type === MIDSCENE_REPORT) {
            if (part.document_id) {
              documentIds.push(part.document_id);
            }
          }
          // 检查工具调用
          if (part.type === 'tool-invocation' && part.toolInvocation?.result?.id) {
            documentIds.push(part.toolInvocation.result.id);
          }
        }
      }
    }
    
    // 获取所有文档
    const docs = [];
    for (const docId of documentIds) {
      const doc = await getDocumentById({ id: docId });
      if (doc) {
        docs.push(doc);
      }
    }
    
    // 按创建时间降序排序
    return docs.sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt);
      return timeB - timeA;
    });
  } catch (error) {
    logger.error(`获取聊天文档失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export const testingDocumentHandler = createDocumentHandler<MidsceneReportType>({
  kind: MIDSCENE_REPORT,
  
  onCreateDocument: async ({ title, dataStream, id, chatId, session, projectId }) => {
    // 从标题中提取URL，如果没有则使用默认URL
    const urlMatch = title.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : 'https://example.com';
    
    // 从标题中提取可能的测试信息
    const testInfo = urlMatch ? title.replace(urlMatch[0], '').trim() : title;
    
    logger.info(`开始创建测试文档，ID: ${id}, URL: ${url}, 测试信息: ${testInfo}, 聊天ID: ${chatId || '无'}`);
    
    // 创建初始文档内容
    let draftContent = `# 测试报告: ${title}\n\n正在执行测试，请稍候...\n`;
    
    try {
      // AI SDK V5: 发送必要的初始化消息
      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-kind',
        data: MIDSCENE_REPORT,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      // AI SDK V5: 发送初始内容
      dataStream.write({
        type: 'data-midscene-delta',
        data: draftContent,
        transient: true,
      });
      
      // 检查聊天记录中是否存在文档
      let yaml = undefined;
      let additionalInfo = testInfo;
      
      if (chatId) {
        logger.info(`尝试从聊天记录 ${chatId} 中获取文档`);
        const chatDocuments = await getDocumentsByChatId(chatId);
        
        if (chatDocuments && chatDocuments.length > 0) {
          // 获取最新的文档
          const latestDocument = chatDocuments[0];
          logger.info(`找到最新文档: ${latestDocument.id}, 标题: ${latestDocument.title}`);
          
          // 检查文档内容是否为YAML格式
          if (latestDocument.content) {
            const content = latestDocument.content.toString();
            
            // 判断是否为YAML格式
            if (content.trim().startsWith('web:') || content.includes('web:') || 
                content.includes('tasks:') || content.includes('flow:')) {
              logger.info(`文档 ${latestDocument.id} 包含YAML内容，将用于测试`);
              yaml = content;
            } else {
              logger.info(`文档 ${latestDocument.id} 不是YAML格式，将作为附加信息使用`);
              additionalInfo = content;
            }
          }
        } else {
          logger.info(`聊天记录 ${chatId} 中没有找到文档`);
        }
      }
      
      logger.info(`开始执行测试流程，文档ID: ${id}, YAML: ${yaml ? '已提供' : '未提供'}`);
      
      // 使用TestingService执行完整的测试流程，确保传递文档ID
      const {report, result, yamlResult, error, testResult} = await testingService.runTestingWorkflow(
        title, url, yaml, dataStream, additionalInfo, id
      );
      
      logger.debug(`report: ${report?.substring(0, 100)}...`);
      logger.debug(`result: ${result}`);
      logger.debug(`yamlResult: ${yamlResult?.substring(0, 100)}...`);
      logger.info(`测试流程执行完成，文档ID: ${id}`);
      
      // 自动提取uri
      let uri = ''
      // 1. 先尝试从“测试URL”小节提取
      const urlSectionMatch = report.match(/## 测试URL\s*([\S]+)/)
      if (urlSectionMatch) {
        uri = urlSectionMatch[1].trim()
      } else {
        // 2. 再尝试从yaml片段的web.url字段提取
        const yamlMatch = report.match(/```yaml([\s\S]*?)```/)
        if (yamlMatch) {
          const yamlText = yamlMatch[1]
          const webUrlMatch = yamlText.match(/url:\s*([^\s]+)/)
          if (webUrlMatch) uri = webUrlMatch[1].trim()
        }
      }
      // 解析原始report内容，提取yaml、result、error、testResult
      let parsedYaml = ''
      let resultSection = ''
      let errorMsg = ''
      let testResultVal = ''
      const yamlMatch2 = report.match(/```yaml([\s\S]*?)```/)
      if (yamlMatch2) parsedYaml = yamlMatch2[1].trim()
      const resultMatch = report.match(/## 测试结果([\s\S]*)/)
      if (resultMatch) resultSection = resultMatch[1].trim()
      const errorMatch = resultSection.match(/errorMessage: "([^"]*)"/)
      if (errorMatch) errorMsg = errorMatch[1]
      const testResultMatch = resultSection.match(/测试状态: (成功|失败)/)
      if (testResultMatch) testResultVal = testResultMatch[1]
      // 提取reportUri
      let reportUrl = extractReportUrlFromContent(report) || ''
      // 组装扁平化JSON结构
      const jsonContent = JSON.stringify({
        uri,
        yaml: parsedYaml,
        result: resultSection,
        error: errorMsg,
        testResult: testResultVal,
        reportUri: reportUrl,
        content: report
      });
      // AI SDK V5: 清除初始内容
      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });
      // AI SDK V5: 发送测试结果（流式/最终内容）
      dataStream.write({
        type: 'data-midscene-delta',
        data: jsonContent,
        transient: true,
      });
      // AI SDK V5: 发送完成消息
      dataStream.write({
        type: 'data-finish',
        data: null,
        transient: false,
      });
      // 返回包含报告URI的结果
      return {
        reportUri: reportUrl,
        content: jsonContent
      };
    } catch (error) {
      logger.error(`执行测试时出错: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      
      // 生成错误报告
      let errorReport = `# 测试报告: ${title}\n\n`;
      errorReport += `## 错误信息\n`;
      errorReport += `\`\`\`\n${error instanceof Error ? error.stack || error.message : String(error)}\n\`\`\`\n`;
      
      // AI SDK V5: 清除初始内容
      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      // AI SDK V5: 发送文本增量更新
      const chunks = errorReport.split(/(?<=\n)/);
      for (const chunk of chunks) {
        if (chunk) {
          dataStream.write({
            type: 'data-midscene-delta',
            data: chunk,
            transient: true,
          });

          // 添加小延迟，模拟流式输出
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // AI SDK V5: 发送完成消息
      dataStream.write({
        type: 'data-finish',
        data: null,
        transient: false,
      });
      
      return {
        error: error instanceof Error ? error.message : String(error),
        content: errorReport
      };
    }
  },
  
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // 解析描述中可能包含的URL和YAML
    const url = description.includes('http') 
      ? description.match(/https?:\/\/[^\s]+/)?.[0] || 'https://example.com'
      : 'https://example.com';
    
    // 创建初始文档内容
    let draftContent = `# 更新的测试报告\n\n正在执行测试，请稍候...\n`;
    
    // 声明yaml变量，在整个函数范围内可用
    let yaml = undefined;
    let userSpecifiedYaml = false;
    
    try {
      // AI SDK V5: 发送初始内容
      dataStream.write({
        type: 'data-midscene-delta',
        data: draftContent,
        transient: true,
      });
      
      // 首先，检查描述中是否包含YAML（用户指定的YAML）
      if (description && (description.includes('yaml') || description.includes('YAML'))) {
        const yamlMatch = description.match(/```(?:yaml)?\s*([\s\S]*?)```/);
        if (yamlMatch && yamlMatch[1]) {
          yaml = yamlMatch[1].trim();
          userSpecifiedYaml = true;
          logger.info(`从用户描述中提取到YAML: ${yaml.substring(0, 50)}...，将直接使用`);
        }
      }
      
      // 如果用户没有指定YAML，则进行常规处理
      if (!userSpecifiedYaml) {
        // 1. 获取上次的文档内容
        let previousContent = '';
        
        // 2. 如果文档不存在或不是testing内容，则无法获取上次YAML
        if (!document || document.kind !== MIDSCENE_REPORT) {
          logger.warn(`没有找到有效的测试文档，且用户未指定YAML，将使用undefined`);
        } 
        // 3. 如果文档存在，将文档发给AI修正并生成新的YAML
        else {
          logger.info(`找到测试文档，尝试从中提取内容并发送给AI修正`);
          previousContent = document.content?.toString() || '';
          
          // 从文档内容中提取YAML
          const contentYamlMatch = previousContent.match(/```yaml\s*([\s\S]*?)```/);
          let previousYaml = '';
          
          if (contentYamlMatch && contentYamlMatch[1]) {
            previousYaml = contentYamlMatch[1].trim();
            logger.info(`从文档中提取到YAML: ${previousYaml.substring(0, 50)}...`);
          }
          
          // 提取可能的错误信息
          let errorInfo = '';
          const errorMatch = previousContent.match(/## 错误信息\n```\n([\s\S]*?)```/);
          if (errorMatch && errorMatch[1]) {
            errorInfo = errorMatch[1].trim();
            logger.info(`从文档中提取到错误信息: ${errorInfo.substring(0, 100)}...`);
          }
          
          // 如果有YAML内容，发送给AI修正
          if (previousYaml) {
            // 构建提示词，包含上一次的YAML和错误信息
            const fixPrompt = `
我正在进行网页自动化测试，但测试可能存在问题。请帮我优化YAML以提高测试成功率。

URL: ${url}
${errorInfo ? `错误信息: ${errorInfo}` : ''}
${description ? `用户描述: ${description}` : ''}

上一次使用的YAML:
\`\`\`yaml
${previousYaml}
\`\`\`

请分析可能的问题，并提供优化后的YAML。确保YAML格式正确，以web:开头。
`;
            
            logger.info(`向AI发送修复提示词`);
            
            // 调用AI生成新的YAML
            try {
              const { text: responseText } = await generateText({
                model: myProvider.languageModel('qwen-max'),
                prompt: fixPrompt,
              });
              
              logger.info(`AI返回的修复响应: ${responseText.substring(0, 100)}...`);
              
              // 从响应中提取YAML
              const fixedYamlMatch = responseText.match(/```(?:yaml)?\s*([\s\S]*?)(?:```|$)/);
              
              if (fixedYamlMatch && fixedYamlMatch[1]) {
                yaml = fixedYamlMatch[1].trim();
                logger.info(`成功提取到修复后的YAML: ${yaml.substring(0, 50)}...`);
              } else {
                // 如果无法提取YAML，使用响应文本中的web部分
                const webMatch = responseText.match(/web:[\s\S]*/);
                if (webMatch) {
                  yaml = webMatch[0].trim();
                  logger.info(`从AI响应中提取web部分: ${yaml.substring(0, 50)}...`);
                } else {
                  logger.warn(`无法从AI响应中提取有效的YAML，将使用原始YAML`);
                  yaml = previousYaml;
                }
              }
            } catch (aiError) {
              logger.error(`调用AI修复YAML时出错: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
              // 如果AI调用失败，使用原始YAML
              yaml = previousYaml;
            }
          }
        }
      }
      
      // 4. 将YAML传入runTestingWorkflow
      logger.info(`开始执行测试流程，使用${userSpecifiedYaml ? '用户指定的' : yaml ? 'AI修正的' : '未定义的'}YAML`);
      const {report, result, yamlResult, error, testResult} = await testingService.runTestingWorkflow(
        "更新的测试", url, yaml, dataStream, description, document.id
      );
      
      logger.debug(`report: ${report?.substring(0, 100)}...`);
      logger.debug(`result: ${result}`);
      logger.debug(`yamlResult: ${yamlResult?.substring(0, 100)}...`);

      // 验证报告URL - 从多个来源尝试获取
      let reportUrl = testResult?.publicReportUrl;
      
      // 如果从testResult中没有获取到URL，尝试从报告内容中提取
      if (!reportUrl && report) {
        reportUrl = extractReportUrlFromContent(report);
        logger.info(`从报告内容中提取URL: ${reportUrl || '未找到'}`);
      }
      
      logger.info(`文档ID ${document.id} 的报告URL: ${reportUrl || '未找到'}`);

      // 自动提取uri
      let uri = ''
      // 1. 先尝试从“测试URL”小节提取
      const urlSectionMatch = report.match(/## 测试URL\s*([\S]+)/)
      if (urlSectionMatch) {
        uri = urlSectionMatch[1].trim()
      } else {
        // 2. 再尝试从yaml片段的web.url字段提取
        const yamlMatch = report.match(/```yaml([\s\S]*?)```/)
        if (yamlMatch) {
          const yamlText = yamlMatch[1]
          const webUrlMatch = yamlText.match(/url:\s*([^\s]+)/)
          if (webUrlMatch) uri = webUrlMatch[1].trim()
        }
      }

      // AI SDK V5: 清除初始内容
      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      // AI SDK V5: 发送测试结果
      dataStream.write({
        type: 'data-midscene-delta',
        data: JSON.stringify({
          reportUri: reportUrl,
          result: result,
          yamlResult: yamlResult,
          error: error,
          userSpecifiedYaml: userSpecifiedYaml,
          aiOptimized: !userSpecifiedYaml && yaml !== undefined && yaml !== ''
        }),
        transient: true,
      });

      // AI SDK V5: 发送完成消息
      dataStream.write({
        type: 'data-finish',
        data: null,
        transient: false,
      });
      
      // 返回包含报告URI的结果
      return {
        reportUri: reportUrl,
        content: JSON.stringify({
          reportUri: reportUrl,
          result: result,
          yamlResult: yamlResult,
          error: error,
          userSpecifiedYaml: userSpecifiedYaml,
          aiOptimized: !userSpecifiedYaml && yaml !== undefined && yaml !== ''
        })
      };
    } catch (error) {
      logger.error(`执行测试时出错: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      
      // 生成错误报告
      let errorReport = `# 更新的测试报告\n\n`;
      errorReport += `## 错误信息\n`;
      errorReport += `\`\`\`\n${error instanceof Error ? error.stack || error.message : String(error)}\n\`\`\`\n`;
      
      if (yaml) {
        errorReport += `\n## YAML内容\n\`\`\`yaml\n${yaml}\n\`\`\`\n\n`;
      }
      
      // AI SDK V5: 清除初始内容
      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      // AI SDK V5: 发送文本增量更新
      const chunks = errorReport.split(/(?<=\n)/);
      for (const chunk of chunks) {
        if (chunk) {
          dataStream.write({
            type: 'data-midscene-delta',
            data: chunk,
            transient: true,
          });

          // 添加小延迟，模拟流式输出
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // AI SDK V5: 发送完成消息
      dataStream.write({
        type: 'data-finish',
        data: null,
        transient: false,
      });
      
      return {
        error: error instanceof Error ? error.message : String(error),
        content: errorReport
      };
    }
  },
}); 