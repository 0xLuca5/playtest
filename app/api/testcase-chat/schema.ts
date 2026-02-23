import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.string(),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const messageSchema = z.object({
  id: z.string().min(1), // 允许任何非空字符串作为消息ID
  role: z.enum(['user']), // 只允许用户消息，因为只发送新消息
  parts: z.array(partSchema),
});

export const postRequestBodySchema = z.object({
  testCaseId: z.string().uuid(),
  chatId: z.string().min(1), // 必需的chatId，用于查询历史消息
  message: messageSchema, // 单个新消息，而不是消息数组
  locale: z.string().default('en'),
  selectedChatModel: z.string().min(1).default('chat-model'), // 支持动态配置的模型ID
  projectId: z.string().optional(), // 添加可选的项目ID字段
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
