// import { createQwen } from 'qwen-ai-provider';

// // 创建Qwen提供者实例，使用环境变量中的API密钥
// export const qwen = createQwen({
//   apiKey: process.env.DASHSCOPE_API_KEY,
//   // 使用国际版API
//   baseURL: process.env.DASHSCOPE_BASE_URL,
// });

// 创建qwen-max模型（向后兼容）
// export const qwenMaxModel = qwen(process.env.DASHSCOPE_MODEL_NAME || 'qwen-max');

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const qwen = createOpenAICompatible({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_BASE_URL,
  includeUsage: true, // Include usage information in streaming responses
});

export const qwenMaxModel = qwen.languageModel(process.env.DASHSCOPE_MODEL_NAME || 'qwen-max');