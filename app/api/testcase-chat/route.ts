import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { getProvider } from '@/lib/ai/providers';
import { getModelInstanceById, getModelForUsageType } from '@/lib/ai/dynamic-provider';

import { generateUUID, convertToUIMessages } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { saveChat, getChatById, saveMessages, getMessagesByChatId, getCompleteTestCaseWithoutNote, createChatTestCaseRelation } from '@/lib/db/queries';
import type { UIMessage } from 'ai';
import { generateUnifiedTestPrompt, resolveUpdatePromptFromMarkdown, testCasePrompts } from '@/lib/ai/prompts/testcase-prompts';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { ChatSDKError } from '@/lib/errors';
import { runSkillsAgentStream } from '@/lib/ai/agent/skills-agent';

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export const maxDuration = 60;



export async function POST(request: Request) {
  console.log('🚀 TestCase chat API - 收到请求');

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log('📝 TestCase chat API - 解析的JSON:', JSON.stringify(json, null, 2));

    requestBody = postRequestBodySchema.parse(json);
    console.log('✅ TestCase chat API - Schema验证通过');
    console.log('📋 TestCase chat API - 请求体:', {
      testCaseId: requestBody.testCaseId,
      chatId: requestBody.chatId,
      selectedChatModel: requestBody.selectedChatModel,
      locale: requestBody.locale,
      messageId: requestBody.message.id,
      messageRole: requestBody.message.role
    });
  } catch (error) {
    console.error('❌ TestCase chat API - 请求解析失败:', error);
    console.error('❌ TestCase chat API - 错误详情:', error instanceof Error ? error.message : String(error));
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { testCaseId, chatId, message, locale, selectedChatModel, projectId } = requestBody;

    // 从新消息中提取文本内容
    const textPart = message.parts.find((part: any) => part.type === 'text');
    const currentMessage = textPart?.type === 'text' ? textPart.text : null;

    // 1. 通过testCaseId查询完整的测试用例上下文
    let testCaseContext = null;
    if (testCaseId) {
      testCaseContext = await getCompleteTestCaseWithoutNote(testCaseId);
      if (!testCaseContext) {
        return new Response(
          JSON.stringify({ error: 'Test case not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. 通过chatId查询完整的消息历史
    let fullMessages: UIMessage[] = [];
    if (chatId) {

      try {
        const messageHistory = await getMessagesByChatId({
          id: chatId,
          userId: (session as any)?.user?.id || 'anonymous',
          limit: 100 // 限制最多100条历史消息
        });

        // 转换数据库消息格式为UI消息格式
        const uiMessages = convertToUIMessages(messageHistory);

        // 过滤和清理消息，确保与convertToModelMessages兼容
        const cleanedMessages = uiMessages.map((msg): UIMessage | null => {
          // 只保留基本的消息结构，移除可能导致问题的复杂工具调用
          if (msg.role === 'user') {
            return {
              id: msg.id,
              role: msg.role,
              parts: msg.parts.filter((part: any) => part.type === 'text'), // 只保留文本部分
              metadata: msg.metadata,
            } as UIMessage;
          } else if (msg.role === 'assistant') {
            // 对于助手消息，只保留文本内容，移除工具调用
            const textParts = msg.parts.filter((part: any) => part.type === 'text');
            if (textParts.length > 0) {
              return {
                id: msg.id,
                role: msg.role,
                parts: textParts,
                metadata: msg.metadata,
              } as UIMessage;
            }
            return null; // 如果没有文本内容，跳过这条消息
          }
          return null;
        }).filter(isNotNull); // 移除null值

        // 将当前用户消息添加到历史消息中（就像 /api/chat 那样）
        // 确保消息格式兼容
        const currentMessage = {
          id: requestBody.message.id,
          role: requestBody.message.role,
          parts: requestBody.message.parts,
          metadata: {
            createdAt: new Date().toISOString(),
          },
        } as UIMessage;

        fullMessages = [...cleanedMessages, currentMessage];
        console.log('� 使用历史消息数:', fullMessages.length);
      } catch (error) {
        console.error('❌ 查询消息历史失败:', error);
        // 如果查询失败，只使用当前消息，确保格式一致
        const currentMessage = {
          id: requestBody.message.id,
          role: requestBody.message.role,
          parts: requestBody.message.parts,
          metadata: {
            createdAt: new Date().toISOString(),
          },
        } as UIMessage;
        fullMessages = [currentMessage];
      }

      // 检查聊天是否存在，不存在则创建
      let chat = await getChatById({ id: chatId });
      if (!chat) {

        await saveChat({
          id: chatId,
          userId: (session as any)?.user?.id || 'anonymous',
          title: `测试用例助手 - ${testCaseContext?.name || '未知'}`,
          visibility: 'private',
        });

        // 创建聊天与测试用例的关联
        await createChatTestCaseRelation({
          chatId,
          testCaseId,
        });
      }

      // 保存当前用户消息（如果有新消息）
      if (currentMessage && currentMessage.trim()) {

        const dbMessage = {
          id: generateUUID(),
          chatId,
          role: 'user' as const,
          parts: [{ type: 'text', text: currentMessage }],
          attachments: [],
          createdAt: new Date(),
        };
        await saveMessages({ messages: [dbMessage] });

        // 将当前消息添加到fullMessages中，确保格式一致
        fullMessages.push({
          id: dbMessage.id,
          role: 'user',
          parts: [{ type: 'text', text: currentMessage }],
          metadata: {
            createdAt: new Date().toISOString(),
          },
        } as UIMessage);

      }
    } else {
      // 如果没有chatId，只使用当前消息，确保格式一致
      const currentMessage = {
        id: requestBody.message.id,
        role: requestBody.message.role,
        parts: requestBody.message.parts,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      } as UIMessage;
      fullMessages = [currentMessage];
    }

    // 3. 使用统一的测试系统提示词
    let systemPrompt = generateUnifiedTestPrompt({
      locale,
      mode: 'sidebar',
      testCaseContext
    });

    // 如果是更新请求，添加强制工具调用指令
    const lowerMessage = currentMessage?.toLowerCase() ?? '';
    const isUpdateRequest =
      lowerMessage.includes('update') ||
      lowerMessage.includes('change') ||
      lowerMessage.includes('modify') ||
      currentMessage?.includes('更新') ||
      currentMessage?.includes('修改') ||
      currentMessage?.includes('变更') ||
      currentMessage?.includes('修正') ||
      currentMessage?.includes('更新する') ||
      currentMessage?.includes('変更') ||
      currentMessage?.includes('修正');

    if (isUpdateRequest) {
      const promptFallback = (testCasePrompts[locale] || testCasePrompts.en).updatePrompt;
      const resolvedUpdatePrompt = resolveUpdatePromptFromMarkdown({
        locale,
        testCaseId: testCaseContext?.id ?? testCaseId ?? undefined,
        updateRequest: currentMessage ?? undefined,
        fallback: promptFallback,
      });

      systemPrompt += `\n\n## Update Request\n\n${resolvedUpdatePrompt.currentTestCase}\n\n${resolvedUpdatePrompt.guidelines}\n\n${resolvedUpdatePrompt.requestAnalysis}\n\n${resolvedUpdatePrompt.languageRequirement}\n\n${resolvedUpdatePrompt.automationRequirement}\n\n${resolvedUpdatePrompt.userMessage}\n\n🚨 CRITICAL: The user is requesting an update. You MUST call the appropriate tool (updateTestSteps / updateTestCase / updateTestCaseSteps) instead of generating plain text.`;
    }

    console.log('🤖 开始TestCase AI流式响应...');

    // 确保至少有一条消息
    if (fullMessages.length === 0) {
      console.error('❌ No messages available for AI processing');
      return new Response(
        JSON.stringify({ error: 'No messages to process' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 开始TestCase AI流式响应...');

    // 获取动态provider
    const provider = await getProvider();
    console.log('🤖 TestCase chat - 使用的provider:', provider ? 'dynamic' : 'static');

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // 获取模型实例 - 优先使用指定的模型ID，失败时回退到chat-model用途
        console.log('🤖 TestCase chat - 尝试获取模型实例 - selectedChatModel:', selectedChatModel);

        let model;
        try {
          // 首先尝试直接通过模型ID获取
          model = await getModelInstanceById(selectedChatModel);
          console.log('🤖 TestCase chat - 成功通过模型ID创建实例:', selectedChatModel);
        } catch (modelError) {
          console.error('❌ TestCase chat - 通过模型ID获取失败:', modelError);

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
              throw new Error(`无法获取任何可用的模型实例: 原始模型(${selectedChatModel}): ${modelError}, 用途模型: ${usageError}, 静态模型: ${staticError}`);
            }
          }
        }

        await runSkillsAgentStream({
          baseSystem: systemPrompt,
          uiMessages: fullMessages,
          toolConfig: {
            mode: 'sidebar',
            session,
            dataStream,
            testcaseId: testCaseId || undefined,
            projectId: projectId || undefined,
            locale,
          },
          model,
          streamText,
          convertToModelMessages,
          stopWhen: stepCountIs(5),
          experimental_transform: smoothStream({ chunking: 'word' }),
          dataStream,
        });
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        console.log('TestCase chat stream finished');

        // 保存AI回复到数据库
        if (chatId && messages.length > 0) {
          try {
            const assistantMessages = messages
              .filter(msg => msg.role === 'assistant')
              .map(msg => ({
                id: msg.id,
                chatId,
                role: msg.role,
                parts: msg.parts,
                attachments: [],
                createdAt: new Date(),
              }));

            if (assistantMessages.length > 0) {
              await saveMessages({ messages: assistantMessages });
            }
          } catch (error) {
            console.error('❌ Failed to save AI message:', error);
          }
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error('TestCase chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
