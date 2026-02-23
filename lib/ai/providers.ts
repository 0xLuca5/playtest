import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { qwenMaxModel } from './models.qwen';
import {gpt4o, gpt4oMini} from './models.chatgpt';
import { createDynamicProvider } from './dynamic-provider';
import { logger } from '../logger';

// 强制使用测试环境的模型，不使用xAI
const useTestModels = true;

// 静态提供者配置（向后兼容）
const staticProvider = useTestModels || isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
        'qwen-max': qwenMaxModel, // 保留向后兼容性
        // ChatGPT 模型
        'gpt-4o': gpt4o,
        'gpt-4o-mini': gpt4oMini,
      },
    })
  : customProvider({
      languageModels: {
        // 生产环境配置（注释掉的代码保持不变）
      },
    });

/**
 * 获取AI提供者
 * 优先使用数据库配置，如果失败则回退到静态配置
 * AI配置为系统级别，不与特定用户或项目关联
 */
export async function getProvider() {
  try {
    // 尝试使用数据库配置（系统级别）
    const dynamicProvider = await createDynamicProvider();
    logger.info('Using dynamic provider from database configuration');
    return dynamicProvider;
  } catch (error) {
    logger.warn('Failed to create dynamic provider, falling back to static configuration:', error);
    return staticProvider;
  }
}

// 默认导出静态提供者（向后兼容）
export const myProvider = staticProvider;
