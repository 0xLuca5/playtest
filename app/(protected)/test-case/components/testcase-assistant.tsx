'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
// import { Messages } from '@/components/chat/messages'; // 移除以避免URL跳转
import { MultimodalInput } from '@/components/chat/multimodal-input';
import { DataStreamProvider, useDataStream } from '@/components/chat/data-stream-provider';
import { DataStreamHandler } from '@/components/chat/data-stream-handler';
import { generateUUID, fetchWithErrorHandlers, sanitizeText } from '@/lib/utils';
import { DefaultChatTransport } from 'ai';
import { toast } from 'sonner';
import { ChatSDKError } from '@/lib/errors';
import { TestCase } from '../[id]/types';
import { Button } from '@/components/ui/button';
import { useChatModels } from '@/hooks/use-chat-models';
import { Bot, Sparkles, FileText, Play, RefreshCw, User, PanelRightClose, X } from 'lucide-react';
import type { UIMessage } from 'ai';

// 定义Attachment类型
type Attachment = {
  name: string;
  contentType: string;
  size: number;
  url?: string;
};

// 辅助函数：从UIMessage获取文本内容
function getMessageContent(message: UIMessage): string {
  if ('content' in message && typeof message.content === 'string') {
    return message.content;
  }

  if ('parts' in message && message.parts) {
    const textParts = message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
    return textParts;
  }

  return '';
}
import { useIntl } from 'react-intl';
import { TestCaseMarkdown } from './testcase-markdown';
import ThinkingMessageComponent from '@/components/chat/thinking-message';
import { useProject } from '@/lib/contexts/project-context';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolOutput,
} from '@/components/chat/elements/tool';

// 简单的消息显示组件，避免使用会导致URL跳转的Messages组件
function SimpleMessages({ messages, t, status, isAIProcessing, input, locale }: {
  messages: UIMessage[],
  t: (id: string, values?: Record<string, any>) => string,
  status?: string,
  isAIProcessing?: boolean,
  input?: string,
  locale?: string
}) {
  // 检查消息状态
  const lastMessage = messages[messages.length - 1];
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // 检查是否有对应的AI回复
  const hasMatchingAssistantReply = assistantMessages.length >= userMessages.length;

  // 检查最后一条AI消息是否有实际内容
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
  const hasAssistantContent = lastAssistantMessage && (
    getMessageContent(lastAssistantMessage).trim() !== '' ||
    (lastAssistantMessage.parts && lastAssistantMessage.parts.some((part: any) =>
      part.type === 'text' ||
      part.type === 'tool-result' ||
      (part.type === 'tool-invocation' && part.toolInvocation)
    ))
  );

  // 检查是否需要显示思考状态
  // 修复：只要AI正在处理中就显示思考框，不管最后一条消息是什么
  const shouldShowThinking = isAIProcessing;

  // 调试信息
  console.log('🔍 思考状态调试:', {
    status,
    isAIProcessing,
    shouldShowThinking,
    lastMessageRole: lastMessage?.role,
    userMessagesCount: userMessages.length,
    assistantMessagesCount: assistantMessages.length,
    hasMatchingAssistantReply,
    hasAssistantContent,
    lastAssistantContent: lastAssistantMessage ? getMessageContent(lastAssistantMessage) : undefined,
    lastAssistantParts: lastAssistantMessage?.parts?.length,
    lastAssistantPartsTypes: lastAssistantMessage?.parts?.map(p => (p as any).type),
    messagesLength: messages.length,
    lastMessageId: lastMessage?.id
  });

  // 特别关注思考框显示状态
  if (shouldShowThinking) {
    console.log('🎭 思考框正在显示，isAIProcessing:', isAIProcessing);
  }

  // 计算当前输入的大概token数（简单估算：1个token约等于4个字符）
  const estimateTokens = (text: string) => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  };

  // 计算整个对话历史的token数
  const getTotalHistoryTokens = () => {
    let totalTokens = 0;

    // 计算所有消息的token数
    messages.forEach(message => {
      const content = getMessageContent(message);
      if (content) {
        totalTokens += estimateTokens(content);
      }

      // 如果有parts，也计算parts中的内容
      if (message.parts) {
        message.parts.forEach((part: any) => {
          if (part.type === 'text' && part.text) {
            totalTokens += estimateTokens(part.text);
          }
          if (part.type === 'tool-result' && part.result) {
            totalTokens += estimateTokens(typeof part.result === 'string' ? part.result : JSON.stringify(part.result));
          }
        });
      }
    });

    // 如果当前有输入但还没发送，也计算进去
    if (input?.trim()) {
      totalTokens += estimateTokens(input);
    }

    return totalTokens;
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={message.id || `message-${index}`} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {message.role === 'user' ? (
              <>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('testCase.assistant.you')}
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('testCase.assistant.aiAssistant')}
                </div>
              </>
            )}
          </div>
          <div className="ml-11">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {message.role === 'assistant' && getMessageContent(message).trim() === '' && (!message.parts || message.parts.length === 0) ? (
                // AI消息但还没有实际内容时显示思考状态
                <div className="text-slate-500 dark:text-slate-400 italic flex items-center gap-2">
                   <span>Hmmm</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 显示文本内容 */}
                  {getMessageContent(message).trim() && (
                    <TestCaseMarkdown>
                      {sanitizeText(getMessageContent(message))}
                    </TestCaseMarkdown>
                  )}

                  {/* 显示tool parts */}
                  {message.parts?.map((part: any, partIndex: number) => {
                    const { type } = part;
                    const key = `message-${message.id}-part-${partIndex}`;

                    if (type === 'tool-updateTestCase') {
                      const { state, output } = part;
                      return (
                        <Tool key={key} defaultOpen={true} className="mt-2">
                          <ToolHeader type="tool-updateTestCase" state={state} />
                          <ToolContent>
                            {state === 'output-available' && (
                              <ToolOutput
                                output={
                                  <div className="p-3 text-sm text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20 rounded-md">
                                    <div className="font-medium mb-2">✅ Test case updated successfully</div>
                                  </div>
                                }
                                errorText={undefined}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }

                    if (type === 'tool-createTestCase') {
                      const { state, output } = part;
                      return (
                        <Tool key={key} defaultOpen={true} className="mt-2">
                          <ToolHeader type="tool-createTestCase" state={state} />
                          <ToolContent>
                            {state === 'output-available' && (
                              <ToolOutput
                                output={
                                  <div className="p-3 text-sm text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20 rounded-md">
                                    <div className="font-medium mb-2">✅ Test case created successfully</div>
                                    {output && (
                                      <div className="text-xs text-green-600 dark:text-green-400 bg-white dark:bg-green-950/30 p-2 rounded border">
                                        <pre className="whitespace-pre-wrap font-mono">
                                          {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                }
                                errorText={undefined}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }

                    if (type === 'tool-executeTestCaseAutomation') {
                      const { state, output } = part;
                      return (
                        <Tool key={key} defaultOpen={true} className="mt-2">
                          <ToolHeader type="tool-executeTestCaseAutomation" state={state} />
                          <ToolContent>
                            {state === 'output-available' && (
                              <ToolOutput
                                output={
                                  <div className="p-3 text-sm text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20 rounded-md">
                                    <div className="font-medium mb-2">🤖 Test automation executed</div>
                                    {output && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-950/30 p-2 rounded border">
                                        <pre className="whitespace-pre-wrap font-mono">
                                          {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                }
                                errorText={undefined}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }

                    // 其他类型的part不显示
                    return null;
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 在用户发送消息后且AI还没有回复时显示思考状态 */}
      {shouldShowThinking && (
        <ThinkingMessageComponent
          locale={locale}
          status="thinking"
          className="mb-4"
        />
      )}
    </div>
  );
}

interface TestCaseAssistantProps {
  testCase: TestCase | null;
  onTestCaseUpdate: (updates: Partial<TestCase>) => void;
  className?: string;
  onCollapse?: () => void;
  isVisible?: boolean;
}

// 内部组件，使用DataStream
function TestCaseAssistantInner({
  testCase,
  onTestCaseUpdate,
  className = '',
  onCollapse,
  isVisible = true
}: TestCaseAssistantProps) {
  const intl = useIntl();
  const { currentProject } = useProject();

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  // Early return if no test case is selected
  if (!testCase) {
    return (
      <div className={`testcase-assistant flex flex-col h-full bg-white dark:bg-zinc-900 ${className}`}>
        <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('testCase.assistant.title')}
            </h2>
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                className="w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('testCase.assistant.noTestCaseSelected')}</p>
          </div>
        </div>
      </div>
    );
  }

  // 获取当前语言
  const currentLocale = intl.locale;

  // 模型管理 - 参考 components/chat/chat.tsx 的实现
  // 从cookie中获取初始模型ID
  const getInitialChatModel = () => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const chatModelCookie = cookies.find(cookie => cookie.trim().startsWith('chat-model='));
      if (chatModelCookie) {
        const modelId = chatModelCookie.split('=')[1]?.trim();
        return modelId || 'chat-model';
      }
    }
    return 'chat-model';
  };

  const [currentChatModel, setCurrentChatModel] = useState<string>(getInitialChatModel());
  const { chatModels: configuredChatModels, loading: modelsLoading, getDefaultChatModelId } = useChatModels();
  const hasAutoSwitched = useRef(false);
  const currentChatModelRef = useRef(currentChatModel);

  // 更新ref值
  useEffect(() => {
    currentChatModelRef.current = currentChatModel;
  }, [currentChatModel]);

  // 如果初始模型是默认值且有配置的模型，则使用配置的默认模型
  useEffect(() => {
    if (!modelsLoading && configuredChatModels.length > 0 && !hasAutoSwitched.current) {
      if (currentChatModel === 'chat-model' || currentChatModel === 'chat-model-reasoning') {
        const defaultConfiguredModel = configuredChatModels[0];
        setCurrentChatModel(defaultConfiguredModel.id);
        hasAutoSwitched.current = true;

        // 同时更新cookie
        if (typeof window !== 'undefined') {
          document.cookie = `chat-model=${defaultConfiguredModel.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
          window.dispatchEvent(new CustomEvent('cookieChange', {
            detail: { name: 'chat-model', value: defaultConfiguredModel.id }
          }));
        }
      }
    }
  }, [modelsLoading, configuredChatModels, currentChatModel]);

  // 监听cookie变化以更新当前选中的模型
  useEffect(() => {
    const getCookieModel = () => {
      if (typeof window !== 'undefined') {
        const cookies = document.cookie.split(';');
        const chatModelCookie = cookies.find(cookie => cookie.trim().startsWith('chat-model='));
        if (chatModelCookie) {
          const modelId = chatModelCookie.split('=')[1]?.trim();
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

  // 聊天会话 ID - 基于测试用例 ID 生成
  const [chatId, setChatId] = useState<string | null>(null);

  // 简化的聊天会话管理 - 直接生成 chatId，让后端处理会话创建
  const chatIdInitialized = useRef(false);
  const currentTestCaseIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initializeChatId = () => {
      const testCaseId = testCase?.id;

      if (!testCaseId) return;

      // 避免重复初始化同一个测试用例的 chatId
      if (chatIdInitialized.current && currentTestCaseIdRef.current === testCaseId) {
        console.log('🔄 ChatId already initialized for testCase:', testCaseId);
        return;
      }

      // 为每个测试用例生成固定的 chatId 格式
      const chatId = `testcase-${testCaseId}`;
      console.log('🆔 生成测试用例 ChatId:', chatId);
      setChatId(chatId);
      chatIdInitialized.current = true;
      currentTestCaseIdRef.current = testCaseId;
    };

    initializeChatId();
  }, [testCase?.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // 标记是否已经初始化过AI状态
  const aiStateInitialized = useRef(false);

  // 组件初始化日志
  console.log('🚀 TestCaseAssistant 组件初始化:', {
    testCaseId: testCase?.id,
    testCaseName: testCase?.name,
    chatId,
    isVisible,
    initialIsAIProcessing: isAIProcessing,
    initialIsLoadingHistory: isLoadingHistory,
    timestamp: new Date().toISOString()
  });

  // 监听isAIProcessing状态变化
  useEffect(() => {
    console.log('🔄 isAIProcessing状态变化:', isAIProcessing);
    console.log('🔄 基本状态快照:', {
      isAIProcessing,
      isVisible,
      isLoadingHistory,
      timestamp: new Date().toISOString()
    });

    if (isAIProcessing) {
      console.log('🎭 思考框应该显示 - 用户应该看到"正在思考"模态框');
    } else {
      console.log('🎭 思考框应该隐藏 - "正在思考"模态框应该消失');
    }
  }, [isAIProcessing, isVisible, isLoadingHistory]);



  // 获取DataStream上下文
  const { dataStream, setDataStream } = useDataStream();

  // 本地input状态
  const [input, setInput] = useState<string>('');

  // 创建transport
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/testcase-chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        // 使用ref获取最新的currentChatModel值
        const latestChatModel = currentChatModelRef.current;

        // 获取最新的用户消息（参考 /api/chat 的实现）
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            chatId: chatId,
            testCaseId: testCase?.id,
            projectId: currentProject?.id,
            locale: currentLocale,
            selectedChatModel: latestChatModel, // 使用动态的聊天模型ID
            message: lastMessage, // 只发送最新的消息，而不是整个消息数组
            ...body,
          },
        };
      },
    });
  }, [chatId, testCase?.id, currentProject?.id, currentLocale]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
  } = useChat({
    id: chatId || undefined, // 使用chatId作为唯一标识符，确保消息状态持久化
    experimental_throttle: 100,
    generateId: generateUUID, // 添加UUID生成器，确保消息ID格式一致
    transport,
    onData: (dataPart: any) => {
      setDataStream((ds: any) => (ds ? [...ds, dataPart] : []));
    },

    onFinish: (message) => {
      // 步骤3: 监听onFinish
      console.log('🎯 步骤3: onFinish触发，AI回复完成');
      console.log('🎯 步骤4: 立即隐藏思考模态框');
      console.log('🎯 步骤5: 中止按钮变成发送按钮');
      console.log('🔍 onFinish: 当前isAIProcessing状态:', isAIProcessing);
      console.log('🔍 onFinish: 即将设置isAIProcessing为false');

      // 立即隐藏思考框，不等待3秒
      setIsAIProcessing(false);

      console.log('🔍 onFinish: setIsAIProcessing(false)已调用');
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      }
    },
  });

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [currentSessionMessageCount, setCurrentSessionMessageCount] = useState(0);
  const [processedDataLength, setProcessedDataLength] = useState(0); // 跟踪已处理的数据长度

  // 在useChat初始化后立即检查AI状态，确保状态同步
  useEffect(() => {
    if (!aiStateInitialized.current) {
      console.log('🔄 初始化AI状态检查:', {
        status,
        currentIsAIProcessing: isAIProcessing,
        shouldBeProcessing: status === 'streaming' || status === 'submitted'
      });

      // 如果AI正在响应但本地状态是false，立即修正
      if ((status === 'streaming' || status === 'submitted') && !isAIProcessing) {
        console.log('🔧 修正AI状态: 检测到AI正在响应，设置isAIProcessing=true');
        setIsAIProcessing(true);
      }

      aiStateInitialized.current = true;
    }
  }, [status, isAIProcessing]);

  // 监听可见性变化，当组件从隐藏变为可见时检查是否需要恢复思考状态
  const prevVisibleRef = useRef(isVisible);
  useEffect(() => {
    const wasHidden = !prevVisibleRef.current;
    const isNowVisible = isVisible;

    // 详细的可见性状态日志
    console.log('👁️ 可见性状态检查:', {
      wasHidden,
      isNowVisible,
      prevVisible: prevVisibleRef.current,
      currentVisible: isVisible,
      isVisibilityChange: wasHidden && isNowVisible
    });

    // 当组件从隐藏变为可见时
    if (wasHidden && isNowVisible) {
      console.log('🎯 聊天助手从隐藏变为可见！开始检查思考状态...');

      // 详细的状态检查日志
      console.log('📊 当前完整状态:', {
        status,
        isAIProcessing,
        messagesLength: messages.length,
        isLoadingHistory,
        lastMessage: messages[messages.length - 1] ? {
          role: messages[messages.length - 1].role,
          hasContent: !!getMessageContent(messages[messages.length - 1]),
          hasParts: !!messages[messages.length - 1].parts,
          id: messages[messages.length - 1].id
        } : null
      });

      // 检查是否有正在进行的AI响应（包括submitted和streaming状态）
      if ((status === 'streaming' || status === 'submitted') && !isAIProcessing) {
        console.log('✅ 检测到AI正在响应且本地状态显示未处理，强制恢复思考状态');

        // 强制恢复思考状态，不管是否在加载历史消息
        console.log('🔄 强制恢复思考状态: setIsAIProcessing(true)');
        setIsAIProcessing(true);
      } else {
        console.log('❌ 不满足恢复思考状态的条件:', {
          statusIsStreamingOrSubmitted: status === 'streaming' || status === 'submitted',
          isNotAIProcessing: !isAIProcessing,
          bothConditions: (status === 'streaming' || status === 'submitted') && !isAIProcessing,
          currentStatus: status
        });
      }
    } else if (isNowVisible && !wasHidden) {
      console.log('👁️ 聊天助手保持可见状态（无变化）');
    } else if (!isNowVisible) {
      console.log('👁️ 聊天助手被隐藏');
    }

    // 更新前一次的可见性状态
    prevVisibleRef.current = isVisible;
  }, [isVisible, status, isAIProcessing, isLoadingHistory, messages.length]);

  // 当AI开始回复时立即隐藏思考框，避免双头像
  useEffect(() => {
    // 只有在AI正在流式响应且有新的assistant消息时才隐藏思考框
    if (isAIProcessing && status === 'streaming') {
      const lastMessage = messages[messages.length - 1];

      // 如果最后一条消息是assistant消息，且消息内容不为空，说明AI已经开始回复
      if (lastMessage && lastMessage.role === 'assistant' &&
          (getMessageContent(lastMessage) || (lastMessage.parts && lastMessage.parts.length > 0))) {
        console.log('🎯 AI开始回复，立即隐藏思考框避免双头像');
        console.log('🎯 当前状态:', { status, messagesCount: messages.length, lastMessageRole: lastMessage.role });
        setIsAIProcessing(false);
      }
    }
  }, [messages, status, isAIProcessing]);

  // 使用ref来跟踪是否已经为当前测试用例加载过历史消息
  const loadedTestCaseRef = useRef<string | null>(null);
  const historyLoadingRef = useRef<boolean>(false); // 防止重复加载

  // 加载历史消息 - 只在测试用例切换时加载一次，最多30条
  useEffect(() => {
    const currentTestCaseId = testCase?.id;

    // 基本验证
    if (!currentTestCaseId) {
      console.log('❌ No testCaseId, skipping history load');
      return;
    }

    console.log('🔍 History useEffect triggered:', {
      testCaseId: currentTestCaseId,
      alreadyLoaded: loadedTestCaseRef.current,
      isLoading: historyLoadingRef.current
    });

    // 如果已经为当前测试用例加载过历史消息，则跳过
    if (loadedTestCaseRef.current === currentTestCaseId) {
      console.log('📚 History already loaded for test case:', currentTestCaseId);
      return;
    }

    // 如果正在加载中，跳过重复请求
    if (historyLoadingRef.current) {
      console.log('⏳ History loading in progress, skipping duplicate request');
      return;
    }

    const loadChatHistory = async () => {
      try {
        console.log('🔄 Starting to load chat history for testCase:', currentTestCaseId);
        historyLoadingRef.current = true; // 设置加载状态
        setIsLoadingHistory(true);

        // 只有在切换到不同测试用例时才清空消息
        if (loadedTestCaseRef.current !== null && loadedTestCaseRef.current !== currentTestCaseId) {
          console.log('Switching test case, clearing messages');
          setMessages([]);
        }

        // 限制最多加载30条历史消息，通过testCaseId查询
        const response = await fetch(`/api/testcase-chat/history?testCaseId=${encodeURIComponent(testCase?.id || '')}&limit=30`);
        console.log('History response status:', response.status);
        if (response.ok) {
          const historyMessages = await response.json();
          console.log('Loaded history messages:', historyMessages.length, historyMessages);
          if (historyMessages.length > 0) {
            console.log('Setting messages to:', historyMessages);
            setMessages(historyMessages);
            // 不要因为历史消息中有用户消息就隐藏suggestion按钮
            // suggestion按钮应该始终显示，除非用户在当前会话中发送了新消息
            setHasUserSentMessage(false);
            setCurrentSessionMessageCount(0);
            console.log('Loaded history messages, keeping suggestions visible');
          } else {
            console.log('No history messages found for this test case');
            // 没有历史消息时，如果是新测试用例才清空消息
            if (loadedTestCaseRef.current !== currentTestCaseId) {
              setMessages([]);
            }
          }
        } else {
          console.error('Failed to load history, status:', response.status);
          if (response.status === 401) {
            console.error('Unauthorized access to chat history');
          } else if (response.status === 403) {
            console.error('Forbidden access to chat history');
          }
        }

        // 标记已为当前测试用例加载过历史消息
        loadedTestCaseRef.current = currentTestCaseId;
        console.log('✅ History loading completed for testCase:', currentTestCaseId);
      } catch (error) {
        console.error('❌ Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
        historyLoadingRef.current = false; // 重置加载状态
      }
    };

    // 直接加载历史消息，不再检查 isAIProcessing
    loadChatHistory();
  }, [testCase?.id]); // 只依赖testCaseId，避免因isAIProcessing变化导致重复加载

  // 监控messages变化
  useEffect(() => {
    console.log('📨 Messages changed:', messages.length, messages);
    console.log('📨 useChat status:', status);
    console.log('📨 isAIProcessing:', isAIProcessing);
    console.log('📨 Messages details:', messages.map(m => ({
      id: m.id,
      role: m.role,
      content: getMessageContent(m).slice(0, 50) + '...',
      hasContent: !!getMessageContent(m),
      hasParts: !!m.parts
    })));
  }, [messages, status, isAIProcessing]);

  // 自动滚动到底部的函数
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // 使用requestAnimationFrame确保DOM更新后再滚动
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, []);

  // Enhanced handleSubmit with auto-scroll and processing state management
  const handleSubmit = useCallback((event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();

    if (input?.trim()) {
      console.log('🎯 步骤1: 用户发送消息，发送按钮变成中止按钮');
      console.log('🎯 步骤2: 显示正在思考的模态框');

      // 步骤1: 标记AI开始处理，发送按钮变成中止按钮
      setIsAIProcessing(true);

      // 发送纯净的用户消息，语言控制由后端处理
      sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: input.trim(),
          },
        ],
      });

      // 清空输入框
      setInput('');

      // 标记用户已发送消息，隐藏快捷操作
      setHasUserSentMessage(true);
      setCurrentSessionMessageCount(prev => prev + 1);

      // 用户发送消息后立即滚动到底部
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [input, setInput, sendMessage, currentLocale, scrollToBottom]);

  // 处理AI生成的数据流 - 监听消息变化而不是data
  useEffect(() => {
    console.log('🔄 Messages updated:', messages.length);
    console.log('📋 All messages:', messages.map(m => ({ id: m.id, role: m.role, hasContent: !!getMessageContent(m), hasParts: !!m.parts })));

    // 特别检查最新的助手消息
    const latestAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (latestAssistantMessage) {
      console.log('🤖 Latest assistant message:', {
        id: latestAssistantMessage.id,
        hasContent: !!getMessageContent(latestAssistantMessage),
        hasParts: !!latestAssistantMessage.parts,
        content: getMessageContent(latestAssistantMessage),
        parts: latestAssistantMessage.parts
      });
    }

    // 检查所有助手消息中是否包含工具调用结果
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.parts && !processedMessageIds.has(message.id)) {
        console.log('🔍 Processing new assistant message:', message.id, message.parts);

        message.parts.forEach((part: any) => {
          console.log('🔍 Processing part:', { type: part.type, hasToolInvocation: !!part.toolInvocation });

          if (part.type === 'tool-invocation' && part.toolInvocation?.state === 'result') {
            const { toolName, result } = part.toolInvocation;
            console.log('🎯 Found tool result:', {
              toolName,
              resultType: typeof result,
              resultLength: typeof result === 'string' ? result.length : 'N/A',
              containsTestcaseSteps: typeof result === 'string' && result.includes('TESTCASE_STEPS:'),
              containsTestcaseUpdate: typeof result === 'string' && result.includes('TESTCASE_UPDATE:'),
              fullResult: result
            });

            // 移除 JSON 解析逻辑，改为依赖 dataStream
            console.log('🔄 Tool result logged, waiting for dataStream updates...');

            // 移除 updateTestCase 的 JSON 解析逻辑，改为依赖 dataStream
            if (toolName === 'updateTestCase') {
              console.log('🔄 updateTestCase tool completed, waiting for dataStream updates...');
            }
          }
        });

        // 标记这条消息已处理
        setProcessedMessageIds(prev => new Set([...prev, message.id]));
      }
    });
  }, [messages, onTestCaseUpdate, processedMessageIds]);



  // 过滤消息内容，移除JSON数据显示
  const filteredMessages = messages.map(message => {
    if (message.role === 'assistant') {
      let content = getMessageContent(message);

      // 移除TESTCASE_STEPS JSON数据 - 更强的正则表达式
      content = content.replace(/TESTCASE_STEPS:\s*\[[\s\S]*?\]\s*\n*/g, '');

      // 移除TESTCASE_UPDATE JSON数据
      content = content.replace(/TESTCASE_UPDATE:\s*\{[\s\S]*?\}\s*\n*/g, '');

      // 移除AUTOMATION_CONFIG JSON数据
      content = content.replace(/AUTOMATION_CONFIG:\s*\{[\s\S]*?\}\s*\n*/g, '');

      // 移除COVERAGE_ANALYSIS JSON数据
      content = content.replace(/COVERAGE_ANALYSIS:\s*\{[\s\S]*?\}\s*\n*/g, '');

      // 移除MODULE_CONTENT JSON数据
      content = content.replace(/MODULE_CONTENT:\s*\{[\s\S]*?\}\s*\n*/g, '');

      // 清理多余的空行
      content = content.replace(/\n{3,}/g, '\n\n');

      // 保留原始的parts，只更新文本parts
      const updatedParts = message.parts?.map((part: any) => {
        if (part.type === 'text') {
          return { ...part, text: content.trim() };
        }
        return part; // 保留tool parts和其他类型的parts
      }) || [{ type: 'text' as const, text: content.trim() }];

      return {
        ...message,
        parts: updatedParts
      } as any;
    }

    // 移除了系统提示词过滤逻辑，因为前端不再添加系统提示词

    return message;
  });

  // 滚动检测逻辑已移除

  // 当消息更新时自动滚动
  useEffect(() => {
    // 使用多个延迟确保内容完全渲染后再滚动
    const timers = [50, 150, 300].map(delay =>
      setTimeout(() => scrollToBottom(), delay)
    );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [messages.length, scrollToBottom]); // 只监听消息数量变化

  // 当AI正在回复时也要滚动
  useEffect(() => {
    if (status === 'streaming') {
      const timer = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timer);
    }
  }, [status, scrollToBottom]);

  // 滚动监听已移除

  // 监听AI工具响应并更新测试用例 - 使用 dataStream 而不是解析 JSON
  useEffect(() => {
    const currentDataLength = dataStream?.length || 0;

    // 只处理新增的数据，避免重复处理
    if (currentDataLength <= processedDataLength) {
      return;
    }

    if (dataStream && dataStream.length > 0) {
      // 只处理新增的数据项
      const newDataItems = dataStream.slice(processedDataLength);

      for (const dataItem of newDataItems) {
        // 优先处理 dataStream 发送的 test-case-delta 数据
        if (dataItem && typeof dataItem === 'object' && 'type' in dataItem && dataItem.type === 'data-test-case-delta') {
          const testCaseData = (dataItem as any).data;

          if (testCaseData && typeof testCaseData === 'object') {
            try {
              // 直接使用 dataStream 发送的测试用例数据，标记是否来自历史记录
              onTestCaseUpdate({
                ...testCaseData,
                isFromHistory: isLoadingHistory
              });
            } catch (error) {
              console.error('❌ DataStream - Error calling onTestCaseUpdate:', error);
            }
          }
          continue; // 处理下一个数据项
        }
      }

      // 更新已处理的数据长度
      setProcessedDataLength(currentDataLength);
    }
  }, [dataStream, onTestCaseUpdate, processedDataLength, isLoadingHistory]);

  // 预设的快速操作
  const quickActions = [
    {
      id: 'generate-steps',
      label: t('testCase.assistant.generateSteps'),
      icon: FileText,
      prompt: t('testCase.assistant.prompts.generateSteps', {
        name: testCase?.name || '',
        description: testCase?.description || ''
      })
    },
    {
      id: 'improve-description',
      label: t('testCase.assistant.improveDescription'),
      icon: Sparkles,
      prompt: t('testCase.assistant.prompts.improveDescription', {
        description: testCase?.description || ''
      })
    },
    {
      id: 'generate-automation',
      label: t('testCase.assistant.generateAutomation'),
      icon: Play,
      prompt: t('testCase.assistant.prompts.generateAutomation', {
        name: testCase?.name || ''
      })
    },
    {
      id: 'generate-midscene',
      label: t('testCase.assistant.generateMidscene'),
      icon: Bot,
      prompt: t('testCase.assistant.prompts.generateMidscene', {
        name: testCase?.name || '',
        description: testCase?.description || '',
        id: testCase?.id || ''
      })
    },
    {
      id: 'suggest-improvements',
      label: t('testCase.assistant.suggestImprovements'),
      icon: RefreshCw,
      prompt: t('testCase.assistant.prompts.suggestImprovements', {
        testCaseInfo: JSON.stringify(testCase, null, 2)
      })
    }
  ];

  const handleQuickAction = useCallback((action: typeof quickActions[0]) => {
    console.log('🎯 快速操作: 用户点击快速操作按钮');
    console.log('🎯 快速操作: 设置isAIProcessing为true');

    // 设置AI处理状态
    setIsAIProcessing(true);

    // 发送纯净的快速操作消息，语言控制由后端处理
    sendMessage({
      role: 'user',
      parts: [
        {
          type: 'text',
          text: action.prompt,
        },
      ],
    });
    // 标记用户已发送消息，隐藏快捷操作
    setHasUserSentMessage(true);
    setCurrentSessionMessageCount(prev => prev + 1);
  }, [sendMessage, currentLocale]);

  // 当切换测试用例时重置suggestion状态
  useEffect(() => {
    if (testCase?.id !== currentTestCaseIdRef.current) {
      setHasUserSentMessage(false);
      setCurrentSessionMessageCount(0);
    }
  }, [testCase?.id]);

  // 欢迎消息 - 只在没有历史消息且历史消息加载完成后显示
  useEffect(() => {
    if (messages.length === 0 && !isLoadingHistory) {
      console.log('Showing welcome message for test case:', testCase?.name);
      const welcomeMessage: UIMessage = {
        id: generateUUID(),
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `${t('testCase.assistant.welcome')}

${t('testCase.assistant.currentTestCase', { name: testCase?.name || 'Test Case' })}

${t('testCase.assistant.supportedModules')}

${t('testCase.assistant.informationModule')}
${t('testCase.assistant.stepsModule')}
${t('testCase.assistant.automationModule')}
${t('testCase.assistant.documentsModule')}
${t('testCase.assistant.datasetModule')}
${t('testCase.assistant.issuesModule')}

${t('testCase.assistant.howToUse')}
${t('testCase.assistant.quickActions')}
${t('testCase.assistant.freeChat')}
${t('testCase.assistant.multiModal')}

${t('testCase.assistant.getStarted')}`
        }],

      };
      setMessages([welcomeMessage]);
      // 确保欢迎消息不会隐藏suggestion按钮
      setHasUserSentMessage(false);
    }
  }, [messages.length, isLoadingHistory, testCase?.name, testCase?.id, setMessages, t]);

  return (
    <div className={`testcase-assistant flex flex-col h-full bg-white dark:bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {t('testCase.assistant.aiAssistant')}
            </h3>
          </div>
          {onCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCollapse}
              className="h-10 w-10 p-0 hover:bg-slate-100 dark:hover:bg-zinc-800"
              title={t('testCase.assistant.collapseTooltip')}
            >
              <PanelRightClose className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestion Actions - 显示在header下方 */}
      {!hasUserSentMessage && (
        <div className="flex-shrink-0 px-4 pb-4 border-b border-slate-200 dark:border-zinc-700">
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="justify-start text-xs h-8 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700"
                  disabled={status === 'streaming' || status === 'submitted'}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-8 break-words relative"
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.assistant.loadingHistory')}
            </div>
          </div>
        ) : (
          <SimpleMessages messages={filteredMessages} t={t} status={status} isAIProcessing={isAIProcessing} input={input} locale={currentLocale} />
        )}
        {/* 滚动锚点 - 增加底部间距 */}
        <div ref={messagesEndRef} className="h-6" />

        {/* 滚动到底部按钮已移除 */}
      </div>

      {/* Input Area - 固定在底部 */}
      <div className="flex-shrink-0 px-4 pt-4 pb-4 border-t border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        {chatId ? (
          <MultimodalInput
            chatId={chatId}
            input={input}
            setInput={setInput}
            status={status}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={filteredMessages}
            setMessages={setMessages}
            sendMessage={sendMessage}
            selectedVisibilityType="private"
            selectedModelId={currentChatModel}
            hideSuggestedActions={true}
            className="!gap-0"
          />
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.assistant.initializingChat') || '正在初始化聊天...'}
            </div>
          </div>
        )}
      </div>

      {/* Data Stream Handler */}
      <DataStreamHandler />
    </div>
  );
}

// 导出的包装组件，提供DataStreamProvider
export default function TestCaseAssistant(props: TestCaseAssistantProps) {
  return (
    <DataStreamProvider>
      <TestCaseAssistantInner {...props} />
    </DataStreamProvider>
  );
}
