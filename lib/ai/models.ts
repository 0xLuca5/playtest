export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];

// 动态获取默认chat model ID的函数
export async function getDefaultChatModelId(): Promise<string> {
  try {
    // 尝试从usage配置中获取默认模型
    const response = await fetch('/api/ai-models/usage');
    if (response.ok) {
      const usages = await response.json();
      const chatModelUsages = usages
        .filter((usage: any) => usage.usageType === 'chat-model' && usage.isActive)
        .sort((a: any, b: any) => a.priority - b.priority);

      if (chatModelUsages.length > 0) {
        return chatModelUsages[0].modelId;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch default chat model from usage config:', error);
  }

  // Fallback到静态默认值
  return DEFAULT_CHAT_MODEL;
}
