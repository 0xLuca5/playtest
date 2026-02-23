'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useMemo, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
// import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID, cn } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from 'sonner';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { useProject } from '@/lib/contexts/project-context';
import { useI18n } from '@/hooks/use-i18n';
import { useChatModels } from '@/hooks/use-chat-models';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialProjectId,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialProjectId: string | null;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  const { locale } = useI18n();
  const [input, setInput] = useState<string>('');

  // 跟踪当前选中的模型
  const [currentChatModel, setCurrentChatModel] = useState<string>(initialChatModel);
  const { chatModels: configuredChatModels, loading: modelsLoading, getDefaultChatModelId } = useChatModels();
  const hasAutoSwitched = useRef(false); // 跟踪是否已经执行过自动切换
  const currentChatModelRef = useRef(currentChatModel); // 使用ref来获取最新值

  // 更新ref值
  useEffect(() => {
    currentChatModelRef.current = currentChatModel;
  }, [currentChatModel]);

  // 如果初始模型是默认值且有配置的模型，则使用配置的默认模型
  useEffect(() => {
    if (!modelsLoading && configuredChatModels.length > 0 && !hasAutoSwitched.current) {
      // 如果当前使用的是fallback默认值，且有配置的模型，则切换到配置的模型
      if (currentChatModel === 'chat-model' || currentChatModel === 'chat-model-reasoning') {
        const defaultConfiguredModel = configuredChatModels[0]; // 优先级最高的模型
        setCurrentChatModel(defaultConfiguredModel.id);
        hasAutoSwitched.current = true; // 标记已经执行过自动切换

        // 同时更新cookie
        if (typeof window !== 'undefined') {
          document.cookie = `chat-model=${defaultConfiguredModel.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
          window.dispatchEvent(new CustomEvent('cookieChange', {
            detail: { name: 'chat-model', value: defaultConfiguredModel.id }
          }));
        }
      }
    }
  }, [modelsLoading, configuredChatModels, currentChatModel]); // 重新添加currentChatModel依赖，但用hasAutoSwitched防止无限循环

  // 监听cookie变化以更新当前选中的模型
  useEffect(() => {
    const getCookieModel = () => {
      if (typeof window !== 'undefined') {
        const cookies = document.cookie.split(';');
        const chatModelCookie = cookies.find(cookie => cookie.trim().startsWith('chat-model='));
        if (chatModelCookie) {
          const modelId = chatModelCookie.split('=')[1]?.trim();
          console.log('🔍 从cookie获取的模型ID:', modelId);
          return modelId || null;
        }
      }
      return null;
    };

    // 初始检查
    const initialModel = getCookieModel();
    if (initialModel && initialModel !== currentChatModel) {
      setCurrentChatModel(initialModel);
    }

    // 监听storage事件（当其他标签页修改cookie时触发）
    const handleStorageChange = () => {
      const newModel = getCookieModel();
      if (newModel && newModel !== currentChatModel) {
        setCurrentChatModel(newModel);
      }
    };

    // 监听自定义事件（当前页面修改cookie时触发）
    const handleCookieChange = (event: CustomEvent) => {
      if (event.detail.name === 'chat-model') {
        setCurrentChatModel(event.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cookieChange', handleCookieChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cookieChange', handleCookieChange as EventListener);
    };
  }, [currentChatModel]);

  // 添加调试信息
  useEffect(() => {
    console.log('🔍 Chat 组件状态:');
    console.log('  - initialProjectId:', initialProjectId);
  }, [initialProjectId]);

  // 创建 transport（使用初始项目 ID）
  const transport = useMemo(() => {
    console.log('🔍 transport useMemo 触发:');
    console.log('  - initialProjectId:', initialProjectId);

    const projectId = initialProjectId || '';
    const apiUrl = `/api/chat?projectId=${projectId}&locale=${locale}`;

    console.log('🔍 创建 transport:');
    console.log('  - projectId:', projectId);
    console.log('  - apiUrl:', apiUrl);

    return new DefaultChatTransport({
      api: apiUrl, // 使用完整的 URL
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        // 使用ref获取最新的currentChatModel值
        const latestChatModel = currentChatModelRef.current;

        if (!projectId) {
          throw new Error('No project selected. Please select a project before sending messages.');
        }

        const requestBody = {
          id,
          message: messages.at(-1),
          selectedChatModel: latestChatModel, // 使用ref中的最新值
          selectedVisibilityType: visibilityType,
          ...body,
        };

        return {
          body: requestBody,
        };
      },
    });
  }, [initialProjectId, locale, visibilityType]); // 移除currentChatModel依赖，使用ref获取最新值

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport,
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('Chat error:', error);
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      } else {
        toast.error('An error occurred while sending the message');
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });



  // 如果没有有效项目，显示提示
  if (!initialProjectId) {
    return (
      <div className="flex flex-col min-w-0 h-dvh w-full overflow-y-auto hide-scrollbar">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select a project from the sidebar to start chatting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh w-full overflow-y-auto hide-scrollbar">
        {/* <ChatHeader
          chatId={id}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        /> */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 mx-auto w-full max-w-3xl px-4">
        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />
        </div>
        <div className="flex mx-auto px-4 pb-4 md:pb-6 gap-2 w-full max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              selectedModelId={initialChatModel}
            />
          )}
        </div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        selectedModelId={initialChatModel}
      />
      </div>
    </>
  );
}