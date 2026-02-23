import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.string(), // 支持更多文件类型
  name: z.string().min(1).max(100),
  url: z.string().url(), // 恢复URL验证，现在发送完整URL
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const messageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user']),
  parts: z.array(partSchema),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: messageSchema,
  selectedChatModel: z.string().min(1), // 改为支持任意字符串，以支持动态配置的模型ID
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
