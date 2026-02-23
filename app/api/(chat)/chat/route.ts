import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';

import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';

import {
  getChatById,
  deleteChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  getTestCaseIdByChatId,
} from '@/lib/db/queries';

import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(protected)/chat/actions';
import { isProductionEnvironment } from '@/lib/constants';
import { getModelInstanceById } from '@/lib/ai/dynamic-provider';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import { ChatSDKError } from '@/lib/errors';

import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/chat/visibility-selector';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import type { Session } from 'next-auth';

import { runSkillsAgentStream } from '@/lib/ai/agent/skills-agent';

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session: Session | null = await getServerSession(authConfig);
    const user = (session && typeof session === 'object' && session !== null && 'user' in session && (session as any).user)
      ? (session as any).user
      : { id: 'anonymous-user', name: 'Anonymous User', email: 'anonymous@example.com', type: 'guest' };

    if (!user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    console.log('开始AI流式响应...');

    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: unknown }) => {
        const dataStream = writer as { merge: (stream: unknown) => void };
        const url = new URL(request.url);
        const projectIdFromUrl = url.searchParams.get('projectId') || undefined;
        const locale = url.searchParams.get('locale') || 'en';

        const testcaseId = await getTestCaseIdByChatId({ chatId: id });
        console.log('chatId:', id);
        console.log('从chatId获取到的testcaseId:', testcaseId);

        const model = await getModelInstanceById(selectedChatModel);
        console.log('创建的模型实例 - modelId:', selectedChatModel);

        await runSkillsAgentStream({
          baseSystem: systemPrompt({ selectedChatModel: 'chat-model', requestHints, locale }),
          uiMessages,
          toolConfig: {
            mode: 'chat',
            session: session as Session,
            dataStream,
            chatId: id,
            testcaseId: testcaseId || undefined,
            projectId: projectIdFromUrl,
            locale,
          },
          model,
          streamText,
          convertToModelMessages,
          stopWhen: stepCountIs(10),
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
          dataStream,
        });
      },
      generateId: generateUUID,

      onFinish: async ({
        messages,
      }: {
        messages: Array<{ id: string; role: string; parts: unknown }>;
      }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },

      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Unhandled error in chat API:', error);
    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await getServerSession(authConfig);
  const user = (session && typeof session === 'object' && session !== null && 'user' in session && (session as any).user)
  ? (session as any).user
  : { id: 'anonymous-user', name: 'Anonymous User', email: 'anonymous@example.com', type: 'guest' };

  if (!user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}