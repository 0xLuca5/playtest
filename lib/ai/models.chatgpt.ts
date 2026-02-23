import { createOpenAI } from '@ai-sdk/openai';

// 创建 OpenAI 提供者实例，使用环境变量中的配置
export const chatgpt = createOpenAI({
  apiKey: 'sk-NL1jxearJJTwk3w0lwGHdz0GbH2k3PEiLkczbmVPupBv9Zk2',
  baseURL: 'https://api.qingyuntop.top/v1',
});

// ChatGPT 模型实例
export const gpt4o = chatgpt('gpt-4o');
export const gpt4oMini = chatgpt('gpt-4o-mini');
export const gpt4Turbo = chatgpt('gpt-4-turbo');
export const gpt4 = chatgpt('gpt-4');
export const gpt35Turbo = chatgpt('gpt-3.5-turbo');

// 默认模型 - 使用 gpt-4o-mini 作为性价比最高的选择
export const chatgptDefaultModel = gpt4oMini;

// 针对不同用途的模型推荐
export const chatgptRecommended = {
  // 聊天对话 - 平衡性能和成本
  chat: gpt4oMini,
  
  // 结构化输出 - 需要强大的理解能力
  structuredOutput: gpt4o,
  
  // 代码生成 - 需要精确的代码理解
  codeGeneration: gpt4o,
  
  // 测试用例生成 - 需要逻辑推理能力
  testCaseGeneration: gpt4o,
  
  // 快速响应 - 优先考虑速度和成本
  quickResponse: gpt35Turbo,
  
  // 长文本处理 - 需要大上下文窗口
  longText: gpt4Turbo,
};
