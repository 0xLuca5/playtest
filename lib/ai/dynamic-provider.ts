/**
 * 动态AI提供者管理器
 * 根据数据库配置动态创建和管理AI模型实例
 */

import { customProvider } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { xai } from '@ai-sdk/xai';
import {
  getActiveAiProviders,
  getModelsByProvider,
  getModelForUsage,
  getApiKeyForProvider,
  safeJsonParse
} from '../db/queries';
import { logger } from '../logger';
import { decrypt } from '../utils/encryption';

// 缓存已创建的提供者实例
const providerCache = new Map<string, any>();
const modelCache = new Map<string, any>();

/**
 * 提供者工厂函数
 */
const providerFactories = {
  openai: (config: any) => createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    ...config.configuration
  }),
  
  qwen: (config: any) => createOpenAICompatible({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    includeUsage: true,
    ...config.configuration
  }),
  
  xai: (config: any) => xai({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    ...config.configuration
  }),
  
  // 可以继续添加其他提供者
  anthropic: (config: any) => createOpenAICompatible({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || 'https://api.anthropic.com',
    ...config.configuration
  }),
};

/**
 * 获取或创建提供者实例（系统级别）
 */
async function getProviderInstance(providerId: string) {
  const cacheKey = `${providerId}-system`;

  logger.info(`🔍 getProviderInstance - 开始查找提供者: ${providerId}`);

  if (providerCache.has(cacheKey)) {
    logger.info(`✅ getProviderInstance - 从缓存中找到提供者: ${providerId}`);
    return providerCache.get(cacheKey);
  }

  try {
    // 获取提供者信息
    logger.info(`📋 getProviderInstance - 获取活跃提供者列表`);
    const providers = await getActiveAiProviders();
    const provider = providers.find((p: any) => p.id === providerId);

    if (!provider) {
      logger.error(`❌ getProviderInstance - 提供者未找到: ${providerId}`);
      logger.error(`❌ getProviderInstance - 可用的提供者:`, providers.map((p: any) => `${p.name}(${p.id})`));
      throw new Error(`Provider not found: ${providerId}`);
    }

    logger.info(`✅ getProviderInstance - 找到提供者: ${provider.name} (${provider.id})`);
    logger.info(`🔧 getProviderInstance - 提供者详情:`, {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      apiKeyRequired: provider.apiKeyRequired,
      isActive: provider.isActive
    });

    // 获取API密钥（系统级别）
    let apiKey = '';
    if (provider.apiKeyRequired) {
      logger.info(`🔑 getProviderInstance - 获取API密钥: ${providerId}`);
      const keyConfig = await getApiKeyForProvider(providerId);
      if (!keyConfig) {
        logger.error(`❌ getProviderInstance - API密钥未找到: ${provider.name}`);
        throw new Error(`API key not found for provider: ${provider.name}`);
      }
      logger.info(`✅ getProviderInstance - 成功获取API密钥配置`);

      logger.info(`🔓 getProviderInstance - 解密API密钥`);
      apiKey = decrypt(keyConfig.encryptedKey);
      logger.info(`✅ getProviderInstance - 成功解密API密钥`);
    } else {
      logger.info(`ℹ️ getProviderInstance - 提供者不需要API密钥: ${provider.name}`);
    }

    // 创建提供者实例
    logger.info(`🏭 getProviderInstance - 获取提供者工厂: ${provider.name}`);
    const factory = providerFactories[provider.name as keyof typeof providerFactories];
    if (!factory) {
      logger.error(`❌ getProviderInstance - 不支持的提供者: ${provider.name}`);
      logger.error(`❌ getProviderInstance - 可用的工厂:`, Object.keys(providerFactories));
      throw new Error(`Unsupported provider: ${provider.name}`);
    }

    logger.info(`✅ getProviderInstance - 成功获取提供者工厂`);

    const config = {
      apiKey,
      baseUrl: provider.baseUrl,
      configuration: safeJsonParse(provider.configuration, {})
    };

    logger.info(`🔧 getProviderInstance - 创建提供者实例，配置:`, {
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      configKeys: Object.keys(config.configuration || {})
    });

    const instance = factory(config);
    providerCache.set(cacheKey, instance);

    logger.info(`✅ getProviderInstance - 成功创建提供者实例: ${provider.name} (${cacheKey})`);
    return instance;
  } catch (error) {
    logger.error(`❌ getProviderInstance - 创建提供者实例失败:`, error);
    throw error;
  }
}

/**
 * 获取或创建模型实例（系统级别）
 */
async function getModelInstance(modelId: string) {
  const cacheKey = `${modelId}-system`;

  logger.info(`🔍 getModelInstance - 开始查找模型: ${modelId}`);

  if (modelCache.has(cacheKey)) {
    logger.info(`✅ getModelInstance - 从缓存中找到模型: ${modelId}`);
    return modelCache.get(cacheKey);
  }

  try {
    // 获取模型信息
    logger.info(`📋 getModelInstance - 获取活跃提供者列表`);
    const providers = await getActiveAiProviders();
    logger.info(`📋 getModelInstance - 找到 ${providers.length} 个活跃提供者:`, providers.map((p: any) => `${p.name}(${p.id})`));

    logger.info(`📋 getModelInstance - 获取所有提供者的模型列表`);
    const modelsByProvider = await Promise.all(providers.map((p: any) => getModelsByProvider(p.id)));
    const models = modelsByProvider.flat();
    logger.info(`📋 getModelInstance - 总共找到 ${models.length} 个模型`);

    // 打印所有模型的ID用于调试
    logger.info(`📋 getModelInstance - 所有模型ID列表:`, models.map(m => m.id));

    const model = models.find(m => m.id === modelId);
    if (!model) {
      logger.error(`❌ getModelInstance - 模型未找到: ${modelId}`);
      logger.error(`❌ getModelInstance - 可用的模型ID:`, models.map(m => `${m.id} (${m.displayName})`));
      throw new Error(`Model not found: ${modelId}`);
    }

    logger.info(`✅ getModelInstance - 找到模型: ${model.displayName} (${model.id})`);
    logger.info(`🔧 getModelInstance - 模型详情:`, {
      id: model.id,
      providerId: model.providerId,
      modelKey: model.modelKey,
      displayName: model.displayName,
      isActive: model.isActive
    });

    // 获取提供者实例
    logger.info(`🔧 getModelInstance - 获取提供者实例: ${model.providerId}`);
    const providerInstance = await getProviderInstance(model.providerId);
    logger.info(`✅ getModelInstance - 成功获取提供者实例`);

    // 创建模型实例
    logger.info(`🤖 getModelInstance - 创建模型实例: ${model.modelKey}`);
    const modelInstance = providerInstance.languageModel(model.modelKey);
    modelCache.set(cacheKey, modelInstance);

    logger.info(`✅ getModelInstance - 成功创建模型实例: ${model.displayName} (${cacheKey})`);
    return modelInstance;
  } catch (error) {
    logger.error(`❌ getModelInstance - 创建模型实例失败:`, error);
    throw error;
  }
}

/**
 * 根据用途获取模型实例（系统级别）
 */
export async function getModelForUsageType(usageType: string) {
  try {
    const config = await getModelForUsage(usageType);
    if (!config) {
      throw new Error(`No model configured for usage type: ${usageType}`);
    }

    return await getModelInstance(config.model.id);
  } catch (error) {
    logger.error(`Failed to get model for usage type ${usageType}: ${error}`);
    throw error;
  }
}

/**
 * 直接根据模型ID获取模型实例（系统级别）
 * 用于聊天API中直接使用模型ID的场景
 */
export async function getModelInstanceById(modelId: string) {
  try {
    return await getModelInstance(modelId);
  } catch (error) {
    logger.error(`Failed to get model instance by ID ${modelId}: ${error}`);
    throw error;
  }
}

/**
 * 创建动态提供者
 * 根据数据库配置动态构建AI提供者（系统级别）
 */
export async function createDynamicProvider() {
  try {
    const languageModels: Record<string, any> = {};

    // 只为真正的用途类型获取配置的模型
    const usageTypes = [
      'chat-model',
      'title-model',
      'artifact-model',
      'code-model'
    ];

    for (const usageType of usageTypes) {
      try {
        const model = await getModelForUsageType(usageType);
        languageModels[usageType] = model;
      } catch (error) {
        logger.warn(`Failed to load model for ${usageType}: ${error}`);
        // 继续处理其他模型，不中断整个流程
      }
    }

    return customProvider({
      languageModels
    });
  } catch (error) {
    logger.error(`Failed to create dynamic provider: ${error}`);
    throw error;
  }
}

/**
 * 清除缓存
 */
export function clearProviderCache() {
  providerCache.clear();
  modelCache.clear();
  logger.info('Provider cache cleared');
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    providers: providerCache.size,
    models: modelCache.size
  };
}
