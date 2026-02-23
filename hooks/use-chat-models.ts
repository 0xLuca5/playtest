'use client';

import { useState, useEffect } from 'react';

export interface ChatModelUsage {
  id: string;
  usageType: string;
  modelId: string;
  priority: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  modelName?: string;
  modelKey?: string;
  providerId?: string;
  providerName?: string;
}

export interface ChatModelOption {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  modelKey?: string;
  providerName?: string;
}

export function useChatModels() {
  const [chatModels, setChatModels] = useState<ChatModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChatModels = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取所有usage配置
        const usageResponse = await fetch('/api/ai-models/usage');
        if (!usageResponse.ok) {
          throw new Error('Failed to fetch usage configurations');
        }

        const usageData: ChatModelUsage[] = await usageResponse.json();
        
        // 过滤出chat-model类型的配置
        const chatModelUsages = usageData.filter(
          usage => usage.usageType === 'chat-model' && usage.isActive
        );

        // 按优先级排序
        chatModelUsages.sort((a, b) => a.priority - b.priority);

        // 转换为ChatModelOption格式
        const chatModelOptions: ChatModelOption[] = chatModelUsages.map(usage => ({
          id: usage.modelId,
          name: usage.modelName || `Model ${usage.modelId.slice(0, 8)}`,
          description: usage.providerName 
            ? `${usage.providerName} - ${usage.modelKey || 'Chat Model'}`
            : usage.modelKey || 'Chat Model',
          priority: usage.priority,
          isActive: usage.isActive,
          modelKey: usage.modelKey,
          providerName: usage.providerName
        }));

        setChatModels(chatModelOptions);
      } catch (err) {
        console.error('Failed to load chat models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat models');
        
        // 如果加载失败，使用默认的fallback模型
        setChatModels([
          {
            id: 'chat-model',
            name: 'Chat Model',
            description: 'Default chat model',
            priority: 1,
            isActive: true
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadChatModels();
  }, []);

  // 获取默认的chat model（优先级最高的活跃模型）
  const getDefaultChatModel = (): ChatModelOption | null => {
    const activeModels = chatModels.filter(model => model.isActive);
    return activeModels.length > 0 ? activeModels[0] : null;
  };

  // 根据ID查找模型
  const getChatModelById = (id: string): ChatModelOption | null => {
    return chatModels.find(model => model.id === id) || null;
  };

  // 获取默认模型ID（用于cookie存储）
  const getDefaultChatModelId = (): string => {
    const defaultModel = getDefaultChatModel();
    return defaultModel?.id || 'chat-model'; // fallback到默认ID
  };

  // 获取所有活跃的chat models
  const getActiveChatModels = (): ChatModelOption[] => {
    return chatModels.filter(model => model.isActive);
  };

  return {
    chatModels,
    loading,
    error,
    getDefaultChatModel,
    getChatModelById,
    getDefaultChatModelId,
    getActiveChatModels,
    refetch: () => {
      // 重新加载数据
      setLoading(true);
      const loadChatModels = async () => {
        try {
          const usageResponse = await fetch('/api/ai-models/usage');
          if (!usageResponse.ok) {
            throw new Error('Failed to fetch usage configurations');
          }

          const usageData: ChatModelUsage[] = await usageResponse.json();
          const chatModelUsages = usageData.filter(
            usage => usage.usageType === 'chat-model' && usage.isActive
          );

          chatModelUsages.sort((a, b) => a.priority - b.priority);

          const chatModelOptions: ChatModelOption[] = chatModelUsages.map(usage => ({
            id: usage.modelId,
            name: usage.modelName || `Model ${usage.modelId.slice(0, 8)}`,
            description: usage.providerName 
              ? `${usage.providerName} - ${usage.modelKey || 'Chat Model'}`
              : usage.modelKey || 'Chat Model',
            priority: usage.priority,
            isActive: usage.isActive,
            modelKey: usage.modelKey,
            providerName: usage.providerName
          }));

          setChatModels(chatModelOptions);
          setError(null);
        } catch (err) {
          console.error('Failed to refetch chat models:', err);
          setError(err instanceof Error ? err.message : 'Failed to refetch chat models');
        } finally {
          setLoading(false);
        }
      };

      loadChatModels();
    }
  };
}
