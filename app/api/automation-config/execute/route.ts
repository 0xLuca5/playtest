import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { getModelInstanceById, getModelForUsageType } from '@/lib/ai/dynamic-provider';
import { getCompleteTestCaseWithoutNote, getAutomationConfig } from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { getToolsForMode } from '@/lib/ai/tools/tool-config';
import { generateUUID } from '@/lib/utils';
import type { Session } from 'next-auth';

const logger = dbLogger.child('automation-config-execute');

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 获取会话
    const session = await getServerSession(authConfig);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const {
      testCaseId,
      projectId,
      framework,
      locale,
      selectedChatModel
    } = body;

    if (!testCaseId || !framework) {
      return NextResponse.json(
        { error: 'Missing required parameters: testCaseId, framework' },
        { status: 400 }
      );
    }

    // 只支持 midscene 框架
    if (framework.toLowerCase() !== 'midscene') {
      return NextResponse.json(
        { error: `Currently only 'midscene' framework is supported for execution. Requested framework: ${framework}` },
        { status: 400 }
      );
    }

    // 验证和设置默认值
    const finalLocale = locale || 'en';
    const finalSelectedChatModel = selectedChatModel || 'chat-model';

    logger.info(`自动化测试执行参数: testCaseId=${testCaseId}, framework=${framework}, locale=${finalLocale}, selectedChatModel=${finalSelectedChatModel}`);

    // 动态获取AI模型实例
    let model;
    try {
      // 首先尝试直接通过模型ID获取
      model = await getModelInstanceById(finalSelectedChatModel);
      console.log('🤖 Automation execute - 成功通过模型ID创建实例:', finalSelectedChatModel);
    } catch (modelError) {
      console.error('❌ Automation execute - 通过模型ID获取失败:', modelError);

      try {
        // 尝试通过chat-model用途获取默认模型
        console.log('🔄 尝试通过chat-model用途获取默认模型');
        model = await getModelForUsageType('chat-model');
        console.log('✅ 成功通过chat-model用途获取模型');
      } catch (usageError) {
        console.error('❌ 通过用途获取模型也失败:', usageError);

        // 最后尝试使用静态默认模型ID
        try {
          console.log('🔄 最后尝试使用静态默认模型ID: chat-model');
          model = await getModelInstanceById('chat-model');
          console.log('✅ 成功使用静态默认模型');
        } catch (staticError) {
          console.error('❌ 所有模型获取方式都失败了');
          throw new Error(`无法获取任何可用的模型实例: 原始模型(${finalSelectedChatModel}): ${modelError}, 用途模型: ${usageError}, 静态模型: ${staticError}`);
        }
      }
    }

    // 获取完整的测试用例信息
    logger.info(`获取测试用例详细信息: testCaseId=${testCaseId}`);
    const completeTestCase = await getCompleteTestCaseWithoutNote(testCaseId);

    if (!completeTestCase) {
      return NextResponse.json(
        { success: false, error: 'Test case not found' },
        { status: 404 }
      );
    }

    // 获取自动化配置
    logger.info(`获取自动化配置: testCaseId=${testCaseId}, framework=${framework}`);
    const config = await getAutomationConfig(testCaseId, framework);

    if (!config) {
      return NextResponse.json(
        { success: false, error: `Automation configuration not found for framework: ${framework}` },
        { status: 404 }
      );
    }

    // 构建测试步骤信息
    const stepsInfo = completeTestCase.steps.map((step: any, index: number) =>
      `Step ${index + 1}: ${step.action}\nExpected: ${step.expected}${step.notes ? `\nNotes: ${step.notes}` : ''}`
    ).join('\n\n');

    // 构建相关需求信息
    const documentsInfo = completeTestCase.relatedDocuments?.length > 0
      ? completeTestCase.relatedDocuments.map((req: any) =>
          `- ${req.title} (${req.type}) - Status: ${req.status}`
        ).join('\n')
      : 'None';

    // 构建数据集信息
    const datasetsInfo = completeTestCase.datasets?.length > 0
      ? completeTestCase.datasets.map((ds: any) =>
          `- ${ds.name}: ${ds.description || 'No description'}`
        ).join('\n')
      : 'None';

    // 构建标签信息
    const tagsInfo = completeTestCase.tags?.length > 0
      ? completeTestCase.tags.join(', ')
      : 'None';

    // 获取YAML配置内容
    let yamlContent = '';
    if (config.parameters) {
      try {
        // 检查parameters是字符串还是对象
        let params: any;
        if (typeof config.parameters === 'string') {
          logger.info(`参数是字符串，需要解析`);
          params = JSON.parse(config.parameters);
        } else {
          params = config.parameters;
        }
        
        // 尝试多种可能的字段名
        yamlContent = params.yaml_content || params.yamlContent || params.yaml || '';
        logger.info(`提取的YAML内容长度: ${yamlContent.length}`);
      } catch (parseError) {
        logger.error(`解析参数失败: ${parseError}`);
        yamlContent = 'No YAML configuration available';
      }
    } else {
      yamlContent = 'No YAML configuration available';
    }

    // 处理 commands 字段（可能是字符串或数组）
    let commandsText = 'None';
    if (config.commands) {
      if (Array.isArray(config.commands)) {
        commandsText = config.commands.join(', ');
      } else if (typeof config.commands === 'string') {
        try {
          const parsedCommands = JSON.parse(config.commands);
          commandsText = Array.isArray(parsedCommands) ? parsedCommands.join(', ') : config.commands;
        } catch {
          commandsText = config.commands;
        }
      } else {
        commandsText = String(config.commands);
      }
    }

    // 构建执行提示词
    const executePrompt = `You are an automation testing expert. Please execute the ${framework} automation test based on the following information.

Complete Test Case Information:
- Test Case ID: ${testCaseId}
- Test Case Name: ${completeTestCase.name}
- Description: ${completeTestCase.description}
- Priority: ${completeTestCase.priority}
- Status: ${completeTestCase.status}
- Framework: ${framework}
- Tags: ${tagsInfo}
- Preconditions: ${completeTestCase.preconditions || 'None'}

Test Steps (${completeTestCase.steps.length} steps):
${stepsInfo}

Related Documents:
${documentsInfo}

Test Datasets:
${datasetsInfo}

Automation Configuration:
- Framework: ${config.framework}
- Browser: ${config.browser}
- Environment: ${config.environment}
- Repository: ${config.repository}
- Branch: ${config.branch}
- Commands: ${commandsText}

YAML Configuration:
${yamlContent}

Please execute this ${framework} automation test and provide a detailed report including:
1. Test execution status (success/failure)
2. Each step's execution result
3. Any errors or issues encountered
4. Screenshots or logs if available
5. Summary and recommendations

Format your response in a clear, structured way with appropriate status indicators (✅ for success, ❌ for failure, ⚠️ for warnings).`;

    // 记录调试信息
    logger.info(`发送给AI的完整prompt长度: ${executePrompt.length}`);
    logger.info(`测试用例步骤数量: ${completeTestCase.steps.length}`);
    logger.info(`测试用例名称: ${completeTestCase.name}`);
    logger.info(`自动化配置框架: ${config.framework}`);

    // 创建初始消息
    const initialMessage = {
      id: generateUUID(),
      role: 'user' as const,
      parts: [{
        type: 'text' as const,
        text: `Execute ${framework} automation test for test case "${completeTestCase.name}"`
      }],
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    // 使用 createUIMessageStream 以支持工具调用
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // 获取 sidebar 模式的工具集
        const sidebarTools = getToolsForMode({
          mode: 'sidebar',
          session: session as Session,
          dataStream,
          testcaseId: testCaseId,
          projectId: projectId,
          locale: finalLocale,
        });

        // 使用 streamText 并注册工具
        const result = streamText({
          model: model,
          system: executePrompt,
          messages: convertToModelMessages([initialMessage]),
          stopWhen: stepCountIs(5),
          experimental_activeTools: Object.keys(sidebarTools) as any,
          tools: sidebarTools,
          experimental_transform: smoothStream({ chunking: 'word' }),
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        logger.info(`AI执行完成: testCaseId=${testCaseId}, framework=${framework}`);
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));

  } catch (error) {
    logger.error('Automation test execution error:', error);
    console.error('Detailed error:', error);
    
    // 处理特定的错误类型
    let errorMessage = 'Failed to execute automation test';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('429') || error.message.includes('负载已饱和') || error.message.includes('稍后再试')) {
        errorMessage = 'AI service is currently busy, please try again later';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed, please refresh the page and try again';
      } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
        errorMessage = 'Server internal error, please try again later';
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMessage = 'Request timeout, please check your network connection and try again';
      }
    } else {
      errorMessage = String(error);
    }

    // 返回错误的流式响应
    const errorStream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({ 
          success: false, 
          error: errorMessage 
        });
        controller.enqueue(new TextEncoder().encode(`0:${errorData}\n`));
        controller.close();
      }
    });

    return new Response(errorStream, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });
  }
}
