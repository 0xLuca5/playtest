import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { z } from 'zod';
import { getModelInstanceById, getModelForUsageType } from '@/lib/ai/dynamic-provider';
import { getFrameworkDetailedPrompt } from '@/lib/ai/prompts/automation-prompts';
import { createOrUpdateAutomationConfig, getCompleteTestCase, getCompleteTestCaseWithoutNote } from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';

const logger = dbLogger.child('automation-config-generate');



// 定义返回的配置结构
const AutomationConfigSchema = z.object({
  success: z.boolean(),
  config: z.object({
    name: z.string(),
    framework: z.enum(['selenium', 'playwright', 'cypress', 'midscene', 'karate']),
    description: z.string(),
    yamlContent: z.string(), // 只接受字符串
    parameters: z.record(z.any()).optional(),
  }).optional(),
  error: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      testCaseId,
      projectId,
      framework,
      testCaseName,
      locale,
      selectedChatModel
    } = body;

    if (!testCaseId || !framework) {
      return NextResponse.json(
        { error: 'Missing required parameters: testCaseId, framework' },
        { status: 400 }
      );
    }

    // 验证和设置默认值
    const finalLocale = locale || 'en';
    const finalSelectedChatModel = selectedChatModel || 'chat-model';

    logger.info(`自动化配置生成参数: testCaseId=${testCaseId}, framework=${framework}, locale=${finalLocale}, selectedChatModel=${finalSelectedChatModel}`);

    // 动态获取AI模型实例
    let model;
    try {
      // 首先尝试直接通过模型ID获取
      model = await getModelInstanceById(finalSelectedChatModel);
      console.log('🤖 Automation config - 成功通过模型ID创建实例:', finalSelectedChatModel);
    } catch (modelError) {
      console.error('❌ Automation config - 通过模型ID获取失败:', modelError);

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

    // 使用框架特定的prompt
    const detailedPrompt = await getFrameworkDetailedPrompt(framework, finalLocale);

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

    // 构建完整的提示词
    const prompt = `${detailedPrompt}

Complete Test Case Information:
- Test Case ID: ${testCaseId}
- Test Case Name: ${completeTestCase.name}
- Description: ${completeTestCase.description}
- Priority: ${completeTestCase.priority}
- Status: ${completeTestCase.status}
- Weight: ${completeTestCase.weight}
- Format: ${completeTestCase.format}
- Type: ${completeTestCase.type}
- Nature: ${completeTestCase.nature}
- Framework: ${framework}
- Tags: ${tagsInfo}
- Preconditions: ${completeTestCase.preconditions || 'None'}
- Author: ${completeTestCase.author || 'Unknown'}
- Created At: ${completeTestCase.createdAt}
- Updated At: ${completeTestCase.updatedAt}

Test Steps (${completeTestCase.steps.length} steps):
${stepsInfo}

Related Documents:
${documentsInfo}

Test Datasets:
${datasetsInfo}

Please generate ${framework} automation configuration based on the complete test case information above. Make sure to create YAML tasks that correspond to each test step and include all necessary assertions and validations.

IMPORTANT: Return ONLY valid JSON without any markdown code block markers. DO NOT wrap the response in \`\`\`json or \`\`\`. Just return the raw JSON object.`;

    // 记录调试信息
    logger.info(`发送给AI的完整prompt长度: ${prompt.length}`);
    logger.info(`测试用例步骤数量: ${completeTestCase.steps.length}`);
    logger.info(`测试用例名称: ${completeTestCase.name}`);
    logger.info(`详细prompt长度: ${detailedPrompt.length}`);

    // 记录测试用例的详细信息
    logger.info(`测试用例详细信息:`, {
      id: completeTestCase.id,
      name: completeTestCase.name,
      description: completeTestCase.description,
      stepsCount: completeTestCase.steps.length,
      steps: completeTestCase.steps.map((step: any, index: number) => ({
        step: index + 1,
        action: step.action,
        expected: step.expected
      }))
    });

    // 记录prompt的关键部分
    logger.info(`Prompt开头: ${prompt.substring(0, 500)}...`);
    logger.info(`测试步骤信息: ${stepsInfo}`);

    // 使用AI流式生成配置
    const result = streamText({
      model: model,
      prompt,
      temperature: 0.7,
      async onFinish({ text }) {
        // 在流式生成完成后处理结果
        try {
          logger.info(`AI生成完成，开始处理结果...`);
          
          // 解析生成的文本为JSON
          let parsedResult;
          try {
            // 尝试提取JSON（可能包含在markdown代码块中）
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
              cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // 尝试找到JSON对象
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
            } else {
              parsedResult = JSON.parse(cleanText);
            }
          } catch (parseError) {
            logger.error(`解析AI响应失败: ${parseError}`);
            return;
          }

          // 后处理：确保framework值是小写的
          if (parsedResult.success && parsedResult.config) {
            parsedResult.config.framework = parsedResult.config.framework.toLowerCase();

            // 记录AI生成的原始YAML内容
            logger.info(`AI生成的原始YAML内容: ${parsedResult.config.yamlContent?.substring(0, 200)}...`);

            // 保存配置到数据库
            try {
              logger.info(`保存自动化配置到数据库: testCaseId=${testCaseId}, framework=${framework}`);

              await createOrUpdateAutomationConfig(testCaseId, {
                repository: 'https://github.com/example/automation-tests',
                branch: 'main',
                commands: ['npm install', 'npm run test'],
                parameters: {
                  yaml: parsedResult.config.yamlContent,
                  name: parsedResult.config.name,
                  description: parsedResult.config.description,
                  ...parsedResult.config.parameters
                },
                framework: parsedResult.config.framework as 'selenium' | 'playwright' | 'cypress' | 'midscene',
                browser: 'chrome',
                environment: 'test',
                isActive: true
              });

              logger.info(`自动化配置已保存到数据库: testCaseId=${testCaseId}`);
            } catch (dbError) {
              logger.error(`保存配置到数据库失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
            }
          }
        } catch (onFinishError) {
          logger.error(`onFinish处理失败: ${onFinishError}`);
        }
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    logger.error('Automation config generation error:', error);
    
    // 处理特定的错误类型
    let errorMessage = 'Failed to generate automation configuration';
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('负载已饱和') || error.message.includes('稍后再试')) {
        errorMessage = 'AI service is currently busy, please try again later';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed, please refresh the page and try again';
      } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
        errorMessage = 'Server internal error, please try again later';
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMessage = 'Request timeout, please check your network connection and try again';
      }
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
