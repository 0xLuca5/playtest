import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from './index';

import {
  chat,
  chatTestCase,
  document,
  message,
  suggestion,
  user,
  vote,
  stream,
  // 测试用例相关表
  project,
  folder,
  testCase,
  testStep,
  automationConfig,
  relatedDocument,
  dataset,
  testRun,
  knownIssue,
  testCaseTag,
  testCaseTagRelation,
  testCaseComment,
  testCaseHistory,
  // AI模型相关表
  aiProvider,
  aiModel,
  aiModelUsage,
  aiApiKey,
  // 仓库设置表
  repositorySetting,
  type DBMessage,
  type User,
  type Chat,
  type Suggestion,
  type Project,
  type Folder,
  type TestCase,
  type TestStep,
  type AutomationConfig,
  type RelatedDocument,
  type Dataset,
  type TestRun,
  type KnownIssue,
  type TestCaseTag,
  type TestCaseTagRelation,
  type TestCaseComment,
  type TestCaseHistory,
  type AiProvider,
  type AiModel,
  type AiModelUsage,
  type AiApiKey,
  type RepositorySetting,
  isSqlite,
} from './schema';

import { ArtifactKind } from '@/components/chat/artifact';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID } from '@/lib/utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/chat/visibility-selector';
import { dbLogger } from '@/lib/logger';
import {MessagePart} from '../types'
import { MidsceneReportType, MIDSCENE_REPORT } from '@/artifacts/types';
import { id } from 'date-fns/locale';

// 创建模块专用的日志记录器
const logger = dbLogger.child('queries');

/**
 * 统一的JSON字段处理函数
 * 处理SQLite和PostgreSQL之间JSON字段的差异
 * - SQLite: JSON字段存储为TEXT，查询返回字符串，需要JSON.parse()
 * - PostgreSQL: JSON字段存储为JSON类型，查询返回对象，不需要JSON.parse()
 */
export function safeJsonParse(jsonData: any, defaultValue: any = null) {
  // 如果已经是对象，直接返回（PostgreSQL情况）
  if (typeof jsonData === 'object' && jsonData !== null) {
    return jsonData;
  }

  // 如果不是字符串，返回默认值
  if (typeof jsonData !== 'string') {
    return defaultValue;
  }

  // 如果是空字符串，返回默认值
  if (!jsonData || jsonData.trim() === '') {
    return defaultValue;
  }

  // 尝试解析字符串（SQLite情况）
  try {
    return JSON.parse(jsonData);
  } catch (error) {
    logger.warn(`JSON解析失败: ${jsonData}, 错误: ${error instanceof Error ? error.message : String(error)}`);
    return defaultValue;
  }
}

// 创建schema对象以便于引用表
const schema = {
  // 基础系统表
  user,
  chat,
  chatTestCase,
  document,
  message,
  suggestion,
  vote,
  stream,
  // 项目管理表
  project,
  folder,
  testCase,
  testStep,
  automationConfig,
  relatedDocument,
  dataset,
  testRun,
  knownIssue,
  testCaseTag,
  testCaseTagRelation,
  testCaseComment,
  testCaseHistory,
  // AI模型配置表
  aiProvider,
  aiModel,
  aiModelUsage,
  aiApiKey,
  // 仓库设置表
  repositorySetting,
};

// ==================== 仓库设置相关查询 ====================

export async function createRepositorySetting(data: {
  projectId: string;
  repoUrl: string;
  createdBy: string;
  provider?: 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'local';
  defaultBranch?: string;
  authType?: 'token' | 'ssh' | 'none';
  encryptedAccessToken?: string;
  sshPrivateKey?: string;
  sshPublicKey?: string;
  webhookSecret?: string;
  ciProvider?: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'none';
  settings?: Record<string, any>;
  isActive?: boolean;
}): Promise<RepositorySetting> {
  try {
    const id = generateUUID();
    const timestamp = Date.now();
    const isSqlite = process.env.DB_PROVIDER === 'sqlite';

    const record: any = {
      id,
      projectId: data.projectId,
      folderId: data.folderId || null,
      provider: data.provider || 'github',
      repoUrl: data.repoUrl,
      defaultBranch: data.defaultBranch || 'main',
      authType: data.authType || 'token',
      encryptedAccessToken: data.encryptedAccessToken || null,
      sshPrivateKey: data.sshPrivateKey || null,
      sshPublicKey: data.sshPublicKey || null,
      webhookSecret: data.webhookSecret || null,
      ciProvider: data.ciProvider || 'none',
      settings: isSqlite ? JSON.stringify(data.settings || {}) : (data.settings || {}),
      isActive: data.isActive !== undefined ? (isSqlite ? (data.isActive ? 1 : 0) : data.isActive) : (isSqlite ? 1 : true),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };

    await db.insert(repositorySetting).values(record);
    logger.info(`仓库设置创建成功: id=${id}, projectId=${data.projectId}`);
    return record as unknown as RepositorySetting;
  } catch (error) {
    logger.error(`创建仓库设置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create repository setting');
  }
}

export async function getRepositorySettingsByProject(projectId: string): Promise<Array<RepositorySetting>> {
  try {
    const rows = await db
      .select()
      .from(repositorySetting)
      .where(eq(repositorySetting.projectId, projectId))
      .orderBy(desc(repositorySetting.updatedAt));
    return rows as Array<RepositorySetting>;
  } catch (error) {
    logger.error(`获取仓库设置列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get repository settings by project');
  }
}

export async function getRepositorySettingsByFolder(projectId: string, folderId: string): Promise<Array<RepositorySetting>> {
  try {
    const rows = await db
      .select()
      .from(repositorySetting)
      .where(
        and(
          eq(repositorySetting.projectId, projectId),
          eq(repositorySetting.folderId, folderId)
        )
      )
      .orderBy(desc(repositorySetting.updatedAt));
    return rows as Array<RepositorySetting>;
  } catch (error) {
    logger.error(`获取文件夹仓库设置列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get repository settings by folder');
  }
}

export async function getRepositorySettingById(id: string): Promise<RepositorySetting | null> {
  try {
    const rows = await db
      .select()
      .from(repositorySetting)
      .where(eq(repositorySetting.id, id))
      .limit(1);
    return rows.length > 0 ? (rows[0] as RepositorySetting) : null;
  } catch (error) {
    logger.error(`获取仓库设置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get repository setting by id');
  }
}

export async function updateRepositorySetting(
  id: string,
  data: Partial<{
    repoUrl: string;
    provider: 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'local';
    defaultBranch: string;
    authType: 'token' | 'ssh' | 'none';
    encryptedAccessToken: string | null;
    sshPrivateKey: string | null;
    sshPublicKey: string | null;
    webhookSecret: string | null;
    ciProvider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'none';
    settings: Record<string, any>;
    isActive: boolean;
  }>,
  updatedBy: string
): Promise<void> {
  try {
    const isSqlite = process.env.DB_PROVIDER === 'sqlite';
    const timestamp = Date.now();

    const allowedFields = [
      'repoUrl', 'provider', 'defaultBranch', 'authType',
      'encryptedAccessToken', 'sshPrivateKey', 'sshPublicKey', 'webhookSecret',
      'ciProvider', 'settings', 'isActive'
    ];

    const updateData: any = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (!allowedFields.includes(key)) continue;
      if (key === 'settings' && value) {
        updateData.settings = isSqlite ? JSON.stringify(value) : value;
      } else if (key === 'isActive' && typeof value === 'boolean') {
        updateData.isActive = isSqlite ? (value ? 1 : 0) : value;
      } else {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) return;

    updateData.updatedAt = timestamp;
    updateData.updatedBy = updatedBy;

    await db.update(repositorySetting)
      .set(updateData)
      .where(eq(repositorySetting.id, id));

    logger.info(`仓库设置已更新: id=${id}`);
  } catch (error) {
    logger.error(`更新仓库设置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update repository setting');
  }
}

export async function deleteRepositorySetting(id: string): Promise<void> {
  try {
    await db.delete(repositorySetting).where(eq(repositorySetting.id, id));
    logger.info(`仓库设置已删除: id=${id}`);
  } catch (error) {
    logger.error(`删除仓库设置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete repository setting');
  }
}


// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    logger.error(`获取用户失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    logger.info(`创建用户: ${email}`);
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    logger.error(`创建用户失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser(guestId?: string) {
  // 如果提供了guestId，使用它；否则生成新的
  const id = guestId || generateUUID();
  const email = `guest-${id}`;
  const password = generateHashedPassword(generateUUID());

  try {
    logger.info(`尝试创建访客用户: ${email}, ID: ${id}`);

    // 检查用户是否已存在
    const existingUsers = await db.select().from(user).where(eq(user.id, id));
    if (existingUsers.length > 0) {
      logger.info(`访客用户已存在: ${id}`);
      return [{ id: existingUsers[0].id, email: existingUsers[0].email }];
    }

    // 检查数据库连接
    try {
      const testQuery = await db.select({ count: count() }).from(user);
      logger.debug(`数据库连接测试: ${JSON.stringify(testQuery)}`);
    } catch (dbError) {
      logger.error(`数据库连接测试失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      throw new Error(`数据库连接失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }

    // 创建用户
    const result = await db.insert(user).values({
      id,
      email,
      password
    }).returning({
      id: user.id,
      email: user.email,
    });

    logger.info(`访客用户创建成功: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logger.error(`创建访客用户失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to create guest user: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    logger.info(`尝试保存聊天记录: ID=${id}, 用户=${userId}, 标题=${title}, 可见性=${visibility}`);
    // 统一使用整数时间戳（毫秒）
    const now = new Date();
    const createdAt = now.getTime();
    return await db.insert(chat).values({
      id,
      createdAt,
      userId,
      title,
      visibility,
    });
  } catch (error) {
    logger.error(`保存聊天记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    logger.info(`删除聊天记录: ID=${id}`);

    // 安全删除相关记录 - 即使记录不存在也不会报错
    try {
      await db.delete(vote).where(eq(vote.chatId, id));
      logger.debug(`删除投票记录完成`);
    } catch (error) {
      logger.warn(`删除投票记录时出错: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await db.delete(message).where(eq(message.chatId, id));
      logger.debug(`删除消息记录完成`);
    } catch (error) {
      logger.warn(`删除消息记录时出错: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await db.delete(stream).where(eq(stream.chatId, id));
      logger.debug(`删除流记录完成`);
    } catch (error) {
      logger.warn(`删除流记录时出错: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await db.delete(chatTestCase).where(eq(chatTestCase.chatId, id));
      logger.debug(`删除聊天测试用例关联记录完成`);
    } catch (error) {
      logger.warn(`删除聊天测试用例关联记录时出错: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 最后删除聊天记录本身
    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();

    if (chatsDeleted) {
      logger.info(`聊天记录删除成功: ID=${id}`);
    } else {
      logger.warn(`聊天记录不存在或已被删除: ID=${id}`);
    }

    return chatsDeleted;
  } catch (error) {
    logger.error(`删除聊天记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    logger.debug(`获取用户聊天记录: 用户=${id}, 限制=${limit}, 开始=${startingAfter}, 结束=${endingBefore}`);
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        logger.warn(`未找到ID为${startingAfter}的聊天记录`);
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        logger.warn(`未找到ID为${endingBefore}的聊天记录`);
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;
    logger.debug(`获取到${filteredChats.length}条聊天记录, 是否有更多: ${hasMore}`);

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    logger.error(`获取用户聊天记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    logger.debug(`获取聊天记录: ID=${id}`);
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    logger.error(`获取聊天记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    // 使用显式类型注解
    const patchedMessages = messages.map((msg) => {
      // 显式指定返回类型
      const now = msg.createdAt instanceof Date ? msg.createdAt : new Date();
      // 统一使用整数时间戳（毫秒）
      const timestamp = now.getTime();

      // 根据数据库类型处理 JSON 字段
      const isSqlite = process.env.DB_PROVIDER === 'sqlite';

      return {
        ...msg,
        createdAt: timestamp,
        parts: !isSqlite
          ? msg.parts // PostgreSQL 支持 JSON 类型
          : (typeof msg.parts === 'string' ? msg.parts : JSON.stringify(msg.parts)),
        attachments: !isSqlite
          ? msg.attachments // PostgreSQL 支持 JSON 类型
          : (typeof msg.attachments === 'string' ? msg.attachments : JSON.stringify(msg.attachments)),
      };
    });
    // 打印最终插入内容，便于调试
    logger.debug(`准备插入消息: ${messages.map(m => m.id).join(', ')}`);
    return await db.insert(message).values(patchedMessages);
  } catch (error) {
    logger.error(`保存消息失败: ${error instanceof Error ? error.message : String(error)}`);
    logger.debug(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({
  id,
  userId,
  limit = 50
}: {
  id: string;
  userId?: string;
  limit?: number;
}) {
  try {
    logger.debug(`获取聊天消息: chatId=${id}, userId=${userId}, limit=${limit}`);

    // 首先检查聊天是否存在
    if (userId) {
      const chatExists = await db.select().from(chat).where(and(eq(chat.id, id), eq(chat.userId, userId))).execute();
      logger.debug(`聊天记录检查: chatId=${id}, userId=${userId}, exists=${chatExists.length > 0}`);
      if (chatExists.length === 0) {
        logger.warn(`用户 ${userId} 无权访问聊天 ${id} 或聊天不存在`);
        return [];
      }
    }

    let messages;

    if (userId) {
      // 如果提供了userId，需要验证用户是否有权限访问这个聊天
      messages = await db.select({
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        parts: message.parts,
        attachments: message.attachments,
        createdAt: message.createdAt,
      })
        .from(message)
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(and(eq(message.chatId, id), eq(chat.userId, userId)))
        .orderBy(desc(message.createdAt))
        .limit(limit)
        .execute();
    } else {
      // 如果没有提供userId，直接查询（保持向后兼容）
      messages = await db.select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(desc(message.createdAt))
        .limit(limit)
        .execute();
    }

    logger.debug(`查询到 ${messages.length} 条消息`);

    // 按时间正序排列（最早的在前面）
    const sortedMessages = messages.reverse();

    // 使用统一的JSON解析函数

    // 修正：确保 parts/attachments 为对象
    return sortedMessages.map((msg: any) => ({
      ...msg,
      parts: typeof msg.parts === 'string' ? safeJsonParse(msg.parts, []) : msg.parts,
      attachments: typeof msg.attachments === 'string' ? safeJsonParse(msg.attachments, []) : msg.attachments,
    }));
  } catch (error) {
    logger.error(`获取聊天消息失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    logger.debug(`投票消息: chatId=${chatId}, messageId=${messageId}, 类型=${type}`);
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      logger.debug(`更新现有投票: messageId=${messageId}`);
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    logger.debug(`创建新投票: messageId=${messageId}`);
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    logger.error(`投票消息失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    logger.debug(`获取聊天投票: chatId=${id}`);
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    logger.error(`获取聊天投票失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  projectId,
  chatId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  projectId?: string;
  chatId?: string;
}) {
  try {
    logger.info(`保存文档: ID=${id}, 标题=${title}, 类型=${kind}, 用户=${userId}, 项目=${projectId}`);

    // 确保参数有效
    if (!id || !title || !kind || !userId) {
      logger.error('保存文档失败: 参数无效', { id, title, kind, userId });
      throw new Error('无效的文档参数');
    }

    // 创建日期对象并处理数据库日期格式问题
    const now = new Date();
    // 统一使用整数时间戳（毫秒）
    const createdAt = now.getTime();

    // 执行数据库插入
    const result = await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        projectId: projectId || null,
        createdAt,
      })
      .returning();

    // 如果提供了chatId，保存包含工具调用的消息
    if (chatId) {
      // 优先使用kind字段判断文档类型，只有在kind不明确时才使用标题判断
      const isTestingDoc = kind === MIDSCENE_REPORT;
      const toolName = isTestingDoc ? 'executeAutomationTesting' : 'createDocument';

      // 检查是否包含报告URL
      let reportUrl = null;
      if (isTestingDoc && typeof content === 'string') {
        // 尝试多种方式提取报告URL
        // 1. 从Markdown图片链接中提取
        const imgMatch = content.match(/\!\[.*?\]\((\/report\/[^)]+\.html)\)/);
        if (imgMatch) {
          reportUrl = imgMatch[1];
        }
        // 2. 从reportUrl字段中提取
        else {
          const reportUrlMatch = content.match(/reportUrl:\s*(\S+report\/[^,\s\n]+\.html)/);
          if (reportUrlMatch) {
            reportUrl = reportUrlMatch[1];
          }
          // 3. 从内容中的任何位置查找report路径
          else {
            const anyReportMatch = content.match(/(\/report\/[^,\s\n"']+\.html)/);
            if (anyReportMatch) {
              reportUrl = anyReportMatch[1];
            }
          }
        }

        // 4. 尝试解析JSON内容
        if (!reportUrl) {
          try {
            // 尝试解析JSON
            const contentObj = JSON.parse(content);
            if (contentObj.report_link) {
              reportUrl = contentObj.report_link;
            } else if (contentObj.report_url) {
              reportUrl = contentObj.report_url;
            }
          } catch (e) {
            // 解析失败，继续使用其他方法
          }
        }
      }

      logger.info(`提取的报告URL: ${reportUrl || '未找到'}`);

      const parts:MessagePart[] = [
        // { type: 'text', text: `我已经创建了一个${isTestingDoc ? '测试' : ''}文档："${title}"` },
        { type: 'document-reference', title, document_id: id },
      ];
      if (isTestingDoc) {
        parts.push({
          type: MIDSCENE_REPORT,
          title,
          document_id: id
        });
      }
      parts.push({
        type: 'tool-invocation',
        toolInvocation: {
          toolName,
          toolCallId: generateUUID(),
          state: 'result',
          result: {
            id,
            title,
            kind,
            report_url: reportUrl,
            isVisible: true
          }
        }
      });

      const assistantMessage = {
        id: generateUUID(),
        chatId,
        role: 'assistant',
        parts: JSON.stringify(parts),
        attachments: JSON.stringify([]),
        createdAt: new Date(),
      };

      // 调试信息
      logger.debug(`准备保存消息，文档ID=${id}, 报告URL=${reportUrl || '未找到'}`);

      try {
        await saveMessages({ messages: [assistantMessage] });
        logger.info(`包含文档的AI消息已保存: messageId=${assistantMessage.id}`);
      } catch (err) {
        logger.error(`保存AI消息失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    logger.info(`文档保存成功: ID=${id}`);
    return result;
  } catch (error) {
    logger.error(`保存文档到数据库失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    logger.debug(`获取文档: ID=${id}`);
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    // 处理时间戳
    return documents.map((doc: any) => {
      // 如果createdAt是数字（Unix时间戳），则转换为Date对象
      if (doc.createdAt && typeof doc.createdAt === 'number') {
        return {
          ...doc,
          createdAt: new Date(doc.createdAt * 1000) // 将秒转换为毫秒
        };
      }
      return doc;
    });
  } catch (error) {
    logger.error(`获取文档失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    logger.debug(`获取单个文档: ID=${id}`);
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    // 处理时间戳
    if (selectedDocument && selectedDocument.createdAt && typeof selectedDocument.createdAt === 'number') {
      return {
        ...selectedDocument,
        createdAt: new Date(selectedDocument.createdAt * 1000) // 将秒转换为毫秒
      };
    }

    return selectedDocument;
  } catch (error) {
    logger.error(`获取单个文档失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function getDocuments({
  limit = 20,
  offset = 0,
  userId,
  projectId,
  kind,
  search,
  sortBy = 'createdAt',
  sortDirection = 'desc'
}: {
  limit?: number;
  offset?: number;
  userId?: string;
  projectId?: string;
  kind?: ArtifactKind;
  search?: string;
  sortBy?: 'createdAt' | 'title';
  sortDirection?: 'asc' | 'desc';
}) {
  try {
    logger.debug(`获取文档列表: limit=${limit}, offset=${offset}, userId=${userId}, projectId=${projectId}, kind=${kind}, search=${search}, sortBy=${sortBy}, sortDirection=${sortDirection}`);

    // 构建查询条件
    let whereConditions = [];
    if (userId) {
      whereConditions.push(eq(document.userId, userId));
    }
    if (projectId) {
      whereConditions.push(eq(document.projectId, projectId));
    }
    if (kind) {
      whereConditions.push(eq(document.kind, kind));
    }
    if (search) {
      whereConditions.push(like(document.title, `%${search}%`));
    }

    // 构建排序条件
    let orderByClause;
    if (sortBy === 'title') {
      orderByClause = sortDirection === 'asc' ? asc(document.title) : desc(document.title);
    } else {
      orderByClause = sortDirection === 'asc' ? asc(document.createdAt) : desc(document.createdAt);
    }

    // 执行查询
    const documents = await db
      .select()
      .from(document)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // 获取总数
    const [countResult] = await db
      .select({ count: count() })
      .from(document)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = countResult?.count || 0;

    logger.info(`获取到${documents.length}个文档，总数：${total}`);

    // 处理时间戳
    const processedDocuments = documents.map((doc: any) => {
      // 如果createdAt是数字（Unix时间戳），则转换为Date对象
      if (doc.createdAt && typeof doc.createdAt === 'number') {
        return {
          ...doc,
          createdAt: new Date(doc.createdAt * 1000) // 将秒转换为毫秒
        };
      }
      return doc;
    });

    return {
      documents: processedDocuments,
      total,
      limit,
      offset,
      hasMore: offset + documents.length < total
    };
  } catch (error) {
    logger.error(`获取文档列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents list',
    );
  }
}

export async function deleteDocument(id: string, userId: string) {
  try {
    logger.info(`删除文档: ID=${id}, 用户=${userId}`);

    // 首先检查文档是否存在且用户有权限
    const docs = await getDocumentsById({ id });
    if (!docs || docs.length === 0) {
      throw new ChatSDKError('not_found:document', '文档不存在');
    }

    const doc = docs[0];
    if (doc.userId !== userId) {
      throw new ChatSDKError('forbidden:document', 'This document belongs to another user. Please check the document ID and try again.');
    }

    // 删除相关的建议
    await db
      .delete(suggestion)
      .where(eq(suggestion.documentId, id));

    // 删除文档
    const result = await db
      .delete(document)
      .where(eq(document.id, id))
      .returning();

    logger.info(`文档删除成功: ID=${id}`);
    return result;
  } catch (error) {
    logger.error(`删除文档失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error instanceof ChatSDKError ? error : new ChatSDKError(
      'bad_request:database',
      'Failed to delete document',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    logger.info(`删除文档: ID=${id}, 时间戳=${timestamp}`);
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    logger.error(`删除文档失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    logger.info(`保存建议: 数量=${suggestions.length}`);
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    logger.error(`保存建议失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    logger.debug(`获取文档建议: documentId=${documentId}`);
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    logger.error(`获取文档建议失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    logger.debug(`获取消息: ID=${id}`);
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    logger.error(`获取消息失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    logger.info(`删除消息: chatId=${chatId}, 时间戳=${timestamp}`);
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message: { id: string }) => message.id);

    if (messageIds.length > 0) {
      logger.debug(`找到${messageIds.length}条要删除的消息`);
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
    logger.debug('没有找到要删除的消息');
    return [];
  } catch (error) {
    logger.error(`删除消息失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    logger.info(`更新聊天可见性: chatId=${chatId}, 可见性=${visibility}`);
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    logger.error(`更新聊天可见性失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    logger.debug(`获取用户消息计数: 用户=${id}, 小时差=${differenceInHours}`);
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    logger.error(`获取用户消息计数失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    logger.debug(`创建流ID: streamId=${streamId}, chatId=${chatId}`);
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    logger.error(`创建流ID失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

// ==================== 聊天与测试用例关联相关查询 ====================

// 创建聊天与测试用例的关联
export async function createChatTestCaseRelation({
  chatId,
  testCaseId,
}: {
  chatId: string;
  testCaseId: string;
}) {
  try {
    // 验证 chatId 和 testCaseId 是否存在
    const chatExists = await db.select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, chatId))
      .limit(1);

    if (chatExists.length === 0) {
      logger.error(`Chat不存在: chatId=${chatId}`);
      throw new ChatSDKError('bad_request:database', 'Chat does not exist');
    }

    const testCaseExists = await db.select({ id: testCase.id })
      .from(testCase)
      .where(eq(testCase.id, testCaseId))
      .limit(1);

    if (testCaseExists.length === 0) {
      logger.error(`测试用例不存在: testCaseId=${testCaseId}`);
      throw new ChatSDKError('bad_request:database', 'Test case does not exist');
    }

    // 先检查是否已存在关联
    const existing = await db.select()
      .from(chatTestCase)
      .where(and(
        eq(chatTestCase.chatId, chatId),
        eq(chatTestCase.testCaseId, testCaseId)
      ))
      .limit(1);

    if (existing.length > 0) {
      logger.debug(`聊天测试用例关联已存在: chatId=${chatId}, testCaseId=${testCaseId}`);
      return;
    }

    const id = generateUUID();
    const now = Date.now();

    await db.insert(chatTestCase).values({
      id,
      chatId,
      testCaseId,
      createdAt: now,
    });

    logger.debug(`创建聊天测试用例关联: chatId=${chatId}, testCaseId=${testCaseId}`);
  } catch (error) {
    logger.error(`创建聊天测试用例关联失败: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError('bad_request:database', 'Failed to create chat test case relation');
  }
}

// 根据 chatId 获取关联的 testCaseId
export async function getTestCaseIdByChatId({ chatId }: { chatId: string }): Promise<string | null> {
  try {
    logger.debug(`根据chatId获取testCaseId: chatId=${chatId}`);

    const result = await db.select({ testCaseId: chatTestCase.testCaseId })
      .from(chatTestCase)
      .where(eq(chatTestCase.chatId, chatId))
      .limit(1);

    if (result.length === 0) {
      logger.debug(`未找到chatId对应的testCaseId: chatId=${chatId}`);
      return null;
    }

    logger.debug(`找到testCaseId: chatId=${chatId}, testCaseId=${result[0].testCaseId}`);
    return result[0].testCaseId;
  } catch (error) {
    logger.error(`根据chatId获取testCaseId失败: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// 根据测试用例ID和用户ID获取聊天消息
export async function getMessagesByTestCaseAndUser({
  testCaseId,
  userId,
  limit = 50
}: {
  testCaseId: string;
  userId: string;
  limit?: number;
}) {
  try {
    logger.debug(`获取测试用例聊天消息: testCaseId=${testCaseId}, userId=${userId}, limit=${limit}`);

    // 查找该用户在该测试用例下的聊天记录
    const messages = await db.select({
      id: message.id,
      chatId: message.chatId,
      role: message.role,
      parts: message.parts,
      attachments: message.attachments,
      createdAt: message.createdAt,
    })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .innerJoin(chatTestCase, eq(chat.id, chatTestCase.chatId))
      .where(and(
        eq(chatTestCase.testCaseId, testCaseId),
        eq(chat.userId, userId)
      ))
      .orderBy(desc(message.createdAt))
      .limit(limit)
      .execute();

    logger.debug(`查询到 ${messages.length} 条测试用例聊天消息`);

    // 按时间正序排列（最早的在前面）
    const sortedMessages = messages.reverse();

    // 使用统一的JSON解析函数

    return sortedMessages.map((msg) => ({
      id: msg.id,
      chatId: msg.chatId,
      role: msg.role as 'user' | 'assistant' | 'system',
      parts: safeJsonParse(msg.parts, []),
      attachments: safeJsonParse(msg.attachments, []),
      createdAt: new Date(msg.createdAt as number),
    }));
  } catch (error) {
    logger.error(`获取测试用例聊天消息失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test case chat messages');
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    logger.debug(`获取聊天流IDs: chatId=${chatId}`);
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }: { id: string }) => id);
  } catch (error) {
    logger.error(`获取聊天流IDs失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

/**
 * 获取四种文档类型的数量统计
 * @param projectId 项目ID，如果提供则按项目过滤
 * @returns {Promise<{ text: number; code: number; image: number; sheet: number }>}
 */
export async function getDocumentTypeCounts(projectId?: string) {
  try {
    // 统计每种类型的数量
    const kinds = ['text', 'code', 'image', 'sheet'] as const;
    const counts: Record<string, number> = {};
    for (const kind of kinds) {
      // 构建查询条件
      const whereConditions = [eq(document.kind, kind)];

      // 如果提供了项目ID，则按项目过滤
      if (projectId) {
        whereConditions.push(eq(document.projectId, projectId));
      }

      const [result] = await db
        .select({ count: count() })
        .from(document)
        .where(and(...whereConditions));

      counts[kind] = Number(result?.count ?? 0);
    }
    return {
      text: counts['text'] ?? 0,
      code: counts['code'] ?? 0,
      image: counts['image'] ?? 0,
      sheet: counts['sheet'] ?? 0,
    };
  } catch (error) {
    logger.error(`获取文档类型数量失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get document type counts');
  }
}

// ==================== 测试用例管理系统查询函数 ====================

// 文件夹相关查询
export async function getFolders(projectId: string, parentId?: string): Promise<Array<Folder>> {
  try {
    const conditions = [eq(folder.projectId, projectId)];
    if (parentId) {
      conditions.push(eq(folder.parentId, parentId));
    } else {
      conditions.push(eq(folder.parentId, null));
    }

    return await db
      .select()
      .from(folder)
      .where(and(...conditions))
      .orderBy(asc(folder.sortOrder), asc(folder.name));
  } catch (error) {
    logger.error(`获取文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get folders');
  }
}

export async function createFolder(data: {
  projectId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
}): Promise<Folder> {
  try {
    const id = generateUUID();
    const now = new Date();

    // 统一使用整数时间戳（毫秒）
    const timestamp = now.getTime();

    // 计算路径和层级
    let path = `/${data.name}`;
    let level = 0;

    if (data.parentId) {
      const parent = await db.select().from(folder).where(
        and(eq(folder.id, data.parentId), eq(folder.projectId, data.projectId))
      ).limit(1);
      if (parent.length > 0) {
        path = `${parent[0].path}/${data.name}`;
        level = parent[0].level + 1;
      }
    }

    const newFolder: typeof folder.$inferInsert = {
      id,
      projectId: data.projectId,
      name: data.name,
      description: data.description || null,
      parentId: data.parentId || null,
      path,
      level,
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };

    await db.insert(folder).values(newFolder);
    return newFolder as Folder;
  } catch (error) {
    logger.error(`创建文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create folder');
  }
}

// 删除文件夹（递归删除所有内容）
export async function deleteFolder(folderId: string, projectId: string): Promise<void> {
  try {
    logger.info(`开始删除文件夹: ID=${folderId}, 项目=${projectId}`);

    // 1. 删除文件夹内的所有测试用例
    const testCasesResult = await getTestCases({ projectId, folderId });
    logger.info(`找到 ${testCasesResult.testCases.length} 个测试用例需要删除`);

    for (const testCase of testCasesResult.testCases) {
      logger.info(`删除测试用例: ${testCase.id} - ${testCase.name}`);
      await deleteTestCase(testCase.id);
    }

    // 2. 递归删除子文件夹
    const subFolders = await getFolders(projectId, folderId);
    logger.info(`找到 ${subFolders.length} 个子文件夹需要删除`);

    for (const subFolder of subFolders) {
      logger.info(`递归删除子文件夹: ${subFolder.id} - ${subFolder.name}`);
      await deleteFolder(subFolder.id, projectId);
    }

    // 3. 删除文件夹本身
    logger.info(`删除文件夹本身: ${folderId}`);
    await db.delete(folder).where(eq(folder.id, folderId));
    logger.info(`文件夹删除成功: ${folderId}`);
  } catch (error) {
    logger.error(`删除文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete folder');
  }
}

// 测试用例相关查询
export async function getTestCases({
  projectId,
  folderId,
  search,
  limit = 20,
  offset = 0,
  sortBy = 'updatedAt',
  sortDirection = 'desc'
}: {
  projectId: string;
  folderId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  sortDirection?: 'asc' | 'desc';
}): Promise<{
  testCases: Array<TestCase>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  try {
    // 防护性检查：确保 search 参数是字符串或 null/undefined
    const safeSearch = typeof search === 'string' ? search : undefined;

    logger.debug(`获取测试用例列表: projectId=${projectId}, folderId=${folderId}, search=${safeSearch}, limit=${limit}, offset=${offset}`);

    // 构建查询条件
    const conditions = [eq(testCase.projectId, projectId)];
    if (folderId) {
      conditions.push(eq(testCase.folderId, folderId));
    }
    if (safeSearch) {
      conditions.push(like(testCase.name, `%${safeSearch}%`));
    }

    // 构建排序条件
    let orderByClause;
    if (sortBy === 'name') {
      orderByClause = sortDirection === 'asc' ? asc(testCase.name) : desc(testCase.name);
    } else if (sortBy === 'createdAt') {
      orderByClause = sortDirection === 'asc' ? asc(testCase.createdAt) : desc(testCase.createdAt);
    } else {
      orderByClause = sortDirection === 'asc' ? asc(testCase.updatedAt) : desc(testCase.updatedAt);
    }

    // 获取总数
    const totalResult = await db
      .select({ count: count() })
      .from(testCase)
      .where(and(...conditions));

    const total = totalResult[0]?.count || 0;

    // 获取分页数据
    const testCases = await db
      .select()
      .from(testCase)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const hasMore = offset + limit < total;

    logger.debug(`获取测试用例成功: 返回${testCases.length}条记录，总计${total}条`);

    return {
      testCases,
      total,
      limit,
      offset,
      hasMore
    };
  } catch (error) {
    logger.error(`获取测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test cases');
  }
}

// 根据文件夹获取测试用例（包含步骤信息）
export async function getTestCasesByFolder(projectId: string, folderId?: string): Promise<Array<any>> {
  try {
    const conditions = [eq(testCase.projectId, projectId)];
    if (folderId) {
      conditions.push(eq(testCase.folderId, folderId));
    } else {
      // 如果没有指定文件夹ID，获取根目录下的测试用例
      conditions.push(eq(testCase.folderId, ''));
    }

    // 获取测试用例基本信息
    const testCases = await db.select().from(testCase).where(and(...conditions)).orderBy(asc(testCase.createdAt));

    // 为每个测试用例获取步骤信息
    const testCasesWithSteps = await Promise.all(
      testCases.map(async (tc) => {
        const steps = await getTestSteps(tc.id);
        return {
          ...tc,
          steps
        };
      })
    );

    return testCasesWithSteps;
  } catch (error) {
    logger.error(`获取文件夹测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test cases by folder');
  }
}

export async function getTestCaseById(id: string): Promise<TestCase | null> {
  try {
    const result = await db.select().from(testCase).where(eq(testCase.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error(`获取测试用例详情失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test case');
  }
}

export async function createTestCase(data: {
  projectId: string;
  folderId?: string;
  name: string;
  description: string;
  preconditions?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'work-in-progress' | 'active' | 'deprecated' | 'draft';
  weight?: 'high' | 'medium' | 'low';
  format?: 'classic' | 'bdd' | 'exploratory';
  nature?: 'unit' | 'integration' | 'system' | 'e2e';
  type?: 'functional' | 'non-functional' | 'regression' | 'smoke';
  tags?: string[];
  createdBy: string;
}): Promise<TestCase> {
  try {
    const id = generateUUID();
    const now = new Date();

    // 统一使用整数时间戳（毫秒）
    const timestamp = now.getTime();

    const newTestCaseData: typeof testCase.$inferInsert = {
      id,
      projectId: data.projectId,
      folderId: data.folderId || null,
      name: data.name,
      description: data.description,
      preconditions: data.preconditions || null,
      priority: data.priority || 'medium',
      status: data.status || 'draft',
      weight: data.weight || 'medium',
      format: data.format || 'classic',
      nature: data.nature || 'functional',
      type: data.type || 'regression',
      tags: JSON.stringify(data.tags || []),
      executionTime: null,
      lastRunAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };

    console.log('Creating test case with data:', newTestCaseData);
    await db.insert(testCase).values(newTestCaseData);
    return newTestCaseData as TestCase;
  } catch (error) {
    console.error('Detailed error:', error);
    logger.error(`创建测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create test case');
  }
}

export async function updateTestCase(id: string, data: Partial<TestCase>, updatedBy: string): Promise<void> {
  try {
    const now = new Date();

    // 简化版本：只更新基本字段，暂时不处理版本历史
    const allowedFields = [
      'folderId', 'name', 'description', 'preconditions', 'priority',
      'status', 'weight', 'format', 'nature', 'type', 'tags',
      'executionTime', 'lastRunAt', 'steps'
    ];

    const filteredData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        // 特殊处理tags字段，确保它是JSON字符串
        if (key === 'tags' && Array.isArray(value)) {
          filteredData[key] = JSON.stringify(value);
        } else {
          filteredData[key] = value;
        }
      }
    }


    // 只有在有字段需要更新时才执行数据库更新
    if (Object.keys(filteredData).length > 0) {
      // 统一使用整数时间戳（毫秒）
      const timestamp = now.getTime();
      const updateData = { ...filteredData, updatedAt: timestamp, updatedBy };

      await db
        .update(testCase)
        .set(updateData)
        .where(eq(testCase.id, id));

      console.log('Database update successful');
    }

    // 如果包含steps，单独处理测试步骤
    if (data.steps && Array.isArray(data.steps)) {
      console.log('Steps count:', data.steps.length);
      console.log('TestCase ID:', id);

      // 删除现有步骤
      console.log('Deleting existing steps for testCaseId:', id);
      await db.delete(testStep).where(eq(testStep.testCaseId, id));

      // 插入新步骤
      if (data.steps.length > 0) {
        // 统一使用整数时间戳（毫秒）
        const timestamp = now.getTime();

        const stepsToInsert = data.steps.map((step: any, index: number) => ({
          id: generateUUID(),
          testCaseId: id,
          stepNumber: index + 1,
          action: step.action || '',
          expected: step.expected || '',
          type: step.type || 'manual',
          notes: step.notes || '',
          createdAt: timestamp,
          updatedAt: timestamp,
        }));

        console.log('Inserting steps into database...');
        await db.insert(testStep).values(stepsToInsert);
        console.log('Steps inserted successfully');

        // 验证插入结果
        const insertedSteps = await db
          .select()
          .from(testStep)
          .where(eq(testStep.testCaseId, id))
          .orderBy(asc(testStep.stepNumber));
        console.log('Verification - inserted steps count:', insertedSteps.length);
      }
    }

    logger.info(`测试用例更新成功: id=${id}, updatedBy=${updatedBy}`);
  } catch (error) {
    console.error('updateTestCase error:', error);
    logger.error(`更新测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update test case');
  }
}

// 测试步骤相关查询
export async function getTestSteps(testCaseId: string): Promise<Array<TestStep>> {
  try {
    return await db
      .select({id: testStep.id, step:testStep.stepNumber, action:testStep.action, expected:testStep.expected, type: testStep.type})
      .from(testStep)
      .where(eq(testStep.testCaseId, testCaseId))
      .orderBy(asc(testStep.stepNumber));
  } catch (error) {
    logger.error(`获取测试步骤失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test steps');
  }
}

// 测试步骤相关查询
export async function getFullTestSteps(testCaseId: string): Promise<Array<TestStep>> {
  try {
    return await db
      .select()
      .from(testStep)
      .where(eq(testStep.testCaseId, testCaseId))
      .orderBy(asc(testStep.stepNumber));
  } catch (error) {
    logger.error(`获取测试步骤失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test steps');
  }
}

export async function createTestSteps(testCaseId: string, steps: Array<{
  stepNumber: number;
  action: string;
  expected: string;
  type?: 'manual' | 'automated' | 'optional';
  notes?: string;
}>): Promise<void> {
  try {
    const now = new Date();

    // 统一使用整数时间戳（毫秒）
    const timestamp = now.getTime();

    // 先删除现有步骤
    await db.delete(testStep).where(eq(testStep.testCaseId, testCaseId));

    // 插入新步骤
    const newSteps = steps.map(step => ({
      id: generateUUID(),
      testCaseId,
      stepNumber: step.stepNumber,
      action: step.action,
      expected: step.expected,
      type: step.type || 'manual',
      notes: step.notes || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    if (newSteps.length > 0) {
      await db.insert(testStep).values(newSteps);
    }
  } catch (error) {
    logger.error(`创建测试步骤失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create test steps');
  }
}

// 自动化配置相关查询
export async function getAutomationConfig(testCaseId: string, framework?: string): Promise<AutomationConfig | null> {
  try {
    let whereConditions = [eq(automationConfig.testCaseId, testCaseId)];

    if (framework) {
      whereConditions.push(eq(automationConfig.framework, framework));
    }

    const result = await db
      .select()
      .from(automationConfig)
      .where(and(...whereConditions))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error(`获取自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get automation config');
  }
}

export async function getAllAutomationConfigs(testCaseId: string): Promise<AutomationConfig[]> {
  try {
    const result = await db
      .select()
      .from(automationConfig)
      .where(eq(automationConfig.testCaseId, testCaseId));
    return result;
  } catch (error) {
    logger.error(`获取所有自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get all automation configs');
  }
}

export async function createOrUpdateAutomationConfig(testCaseId: string, data: {
  repository: string;
  branch?: string;
  commands: string[];
  parameters?: Record<string, string>;
  framework: 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate';
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
  environment?: 'dev' | 'test' | 'staging' | 'prod';
  environmentVariables?: Record<string, string>;
  isActive?: boolean;
}): Promise<void> {
  try {

    const now = new Date();
    const existing = await getAutomationConfig(testCaseId, data.framework);

    if (existing) {
      console.log(`🔄 更新现有配置 - ID: ${existing.id}`);

      // 准备更新数据，添加详细调试
      // 统一使用整数时间戳（毫秒）
      const timestamp = now.getTime();

      const updateData = {
        repository: data.repository,
        branch: data.branch || 'main',
        commands: JSON.stringify(data.commands),
        parameters: JSON.stringify(data.parameters || {}),
        browser: data.browser || 'chrome',
        environment: data.environment || 'test',
        environmentVariables: JSON.stringify(data.environmentVariables || {}),
        isActive: isSqlite 
          ? (data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1) // SQLite: 转换为整数
          : (data.isActive !== undefined ? data.isActive : true), // PostgreSQL: 保持布尔值
        updatedAt: timestamp,
      };

      console.log(`🔍 更新数据详情:`);
      console.log(`  repository: ${typeof updateData.repository} = ${updateData.repository}`);
      console.log(`  branch: ${typeof updateData.branch} = ${updateData.branch}`);
      console.log(`  commands: ${typeof updateData.commands} = ${updateData.commands}`);
      console.log(`  parameters: ${typeof updateData.parameters} = ${updateData.parameters.substring(0, 100)}...`);
      console.log(`  browser: ${typeof updateData.browser} = ${updateData.browser}`);
      console.log(`  environment: ${typeof updateData.environment} = ${updateData.environment}`);
      console.log(`  isActive: ${typeof updateData.isActive} = ${updateData.isActive}`);
      console.log(`  updatedAt: ${typeof updateData.updatedAt} = ${updateData.updatedAt}`);

      await db
        .update(automationConfig)
        .set(updateData)
        .where(and(
          eq(automationConfig.testCaseId, testCaseId),
          eq(automationConfig.framework, data.framework)
        ));
    } else {
      const newId = generateUUID();
      // 统一使用整数时间戳（毫秒）
      const timestamp = now.getTime();

      await db.insert(automationConfig).values({
        id: newId,
        testCaseId,
        repository: data.repository,
        branch: data.branch || 'main',
        commands: JSON.stringify(data.commands),
        parameters: JSON.stringify(data.parameters || {}),
        framework: data.framework,
        browser: data.browser || 'chrome',
        environment: data.environment || 'test',
        environmentVariables: JSON.stringify(data.environmentVariables || {}),
        isActive: isSqlite 
          ? (data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1) // SQLite: 转换为整数
          : (data.isActive !== undefined ? data.isActive : true), // PostgreSQL: 保持布尔值
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    console.log(`🎉 createOrUpdateAutomationConfig 成功完成`);
  } catch (error) {
    console.error(`❌ createOrUpdateAutomationConfig 失败:`, error);
    logger.error(`创建或更新自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create or update automation config');
  }
}

export async function deleteAutomationConfig(testCaseId: string, framework: string): Promise<void> {
  try {
    await db
      .delete(automationConfig)
      .where(
        and(
          eq(automationConfig.testCaseId, testCaseId),
          eq(automationConfig.framework, framework)
        )
      );
  } catch (error) {
    logger.error(`删除自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete automation config');
  }
}

export async function getAutomationConfigById(id: string): Promise<AutomationConfig | null> {
  try {
    const result = await db
      .select()
      .from(automationConfig)
      .where(eq(automationConfig.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.error(`通过ID获取自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get automation config by ID');
  }
}

export async function updateAutomationConfigById(id: string, data: Partial<AutomationConfig>): Promise<void> {
  try {
    const now = new Date();
    const updateData: any = {
      ...data,
      updatedAt: now.getTime(),
    };

    // 如果有commands或parameters，确保它们是JSON字符串
    if (updateData.commands && Array.isArray(updateData.commands)) {
      updateData.commands = JSON.stringify(updateData.commands);
    }
    if (updateData.parameters && typeof updateData.parameters === 'object') {
      updateData.parameters = JSON.stringify(updateData.parameters);
    }

    // 处理布尔值转换（根据数据库类型）
    if (updateData.isActive !== undefined) {
      updateData.isActive = isSqlite ? (updateData.isActive ? 1 : 0) : updateData.isActive;
    }

    await db
      .update(automationConfig)
      .set(updateData)
      .where(eq(automationConfig.id, id));

    logger.info(`自动化配置更新成功: id=${id}`);
  } catch (error) {
    logger.error(`通过ID更新自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update automation config by ID');
  }
}

// 相关需求查询函数
export async function getRelatedDocuments(testCaseId: string): Promise<RelatedDocument[]> {
  try {
    const result = await db
      .select()
      .from(relatedDocument)
      .where(eq(relatedDocument.testCaseId, testCaseId));

    return result;
  } catch (error) {
    logger.error(`获取相关需求失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get related documents');
  }
}

export async function createRelatedDocuments(data: {
  testCaseId: string;
  documentId: string;
  type: 'story' | 'epic' | 'task' | 'document' | 'external';
  title: string;
  status: 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid';
  assignee?: string;
  url?: string;
  source?: 'confluence' | 'jira' | 'sharepoint' | 'external';
  sourceMetadata?: any;
}): Promise<void> {
  try {
    const now = new Date();
    const timestamp = now.getTime();

    const insertData = {
      id: generateUUID(),
      testCaseId: data.testCaseId,
      documentId: data.documentId,
      type: data.type,
      title: data.title,
      status: data.status,
      assignee: data.assignee || null,
      url: data.url || null,
      source: data.source || null,
      sourceMetadata: data.sourceMetadata || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    logger.info(`准备插入数据: ${JSON.stringify(insertData, null, 2)}`);

    await db.insert(relatedDocument).values(insertData);

    logger.info(`相关需求创建成功: testCaseId=${data.testCaseId}, documentId=${data.documentId}, source=${data.source}`);
  } catch (error) {
    logger.error(`创建相关需求失败: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(`错误详情: ${JSON.stringify(error, null, 2)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create related document');
  }
}

export async function updateRelatedDocument(id: string, data: {
  title?: string;
  url?: string;
  type?: 'story' | 'epic' | 'task' | 'document' | 'external';
  status?: 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid';
  source?: 'confluence' | 'jira' | 'sharepoint' | 'external';
  sourceMetadata?: any;
}): Promise<void> {
  try {
    const now = new Date();
    const timestamp = now.getTime();

    const updateData: any = {
      updatedAt: timestamp,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.sourceMetadata !== undefined) updateData.sourceMetadata = data.sourceMetadata;

    await db
      .update(relatedDocument)
      .set(updateData)
      .where(eq(relatedDocument.id, id));

    logger.info(`相关需求更新成功: id=${id}`);
  } catch (error) {
    logger.error(`更新相关需求失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update related document');
  }
}

export async function deleteRelatedDocument(id: string): Promise<void> {
  try {
    await db
      .delete(relatedDocument)
      .where(eq(relatedDocument.id, id));

    logger.info(`相关需求删除成功: id=${id}`);
  } catch (error) {
    logger.error(`删除相关需求失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete related document');
  }
}

export async function getCompleteTestCaseWithoutNote(id: string): Promise<any | null> {
  try {
    // 获取基本测试用例信息
    const testCaseResult = await getTestCaseById(id);
    if (!testCaseResult) {
      return null;
    }

    // 获取测试步骤
    const steps = await getTestSteps(id);
    console.log('getCompleteTestCase - steps count:', steps.length);

    // 获取自动化配置
    const automation = await getAutomationConfig(id);

    // 获取相关需求
    const documents = await db
      .select()
      .from(relatedDocument)
      .where(eq(relatedDocument.testCaseId, id));

    // 获取数据集
    const datasets = await db
      .select()
      .from(dataset)
      .where(eq(dataset.testCaseId, id));

    // 获取测试运行记录 - 临时跳过，避免reportUrl字段错误
    const testRuns: any[] = [];

    // 获取已知问题
    const knownIssues = await db
      .select()
      .from(knownIssue)
      .where(eq(knownIssue.testCaseId, id))
      .orderBy(desc(knownIssue.createdAt));

    // 使用统一的JSON解析函数

    // 组装完整的测试用例对象
    const completeTestCase = {
      ...testCaseResult,
      tags: safeJsonParse(testCaseResult.tags as string, []),
      steps: steps.map(step => ({
        id: step.id,
        step: step.stepNumber,
        action: step.action,
        expected: step.expected,
        type: step.type,
        notes: step.notes,
      })),
      automation: automation ? {
        repository: automation.repository,
        branch: automation.branch,
        commands: safeJsonParse(automation.commands as string, []),
        parameters: safeJsonParse(automation.parameters as string, {}),
      } : undefined,
      relatedDocuments: documents.map(req => ({
        id: req.documentId,
        type: req.type,
        title: req.title,
        status: req.status,
        assignee: req.assignee,
        url: req.url,
        source: req.source,
        sourceMetadata: safeJsonParse(req.sourceMetadata as string, null),
      })),
      datasets: datasets.map(ds => ({
        id: ds.id,
        name: ds.name,
        columns: safeJsonParse(ds.columns as string, []),
        data: safeJsonParse(ds.data as string, []),
      })),
      testRuns: [], // 临时为空数组
      knownIssues: knownIssues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        reporter: issue.reporter,
        assignee: issue.assignee,
        bugUrl: issue.bugUrl,
        createdAt: new Date(issue.createdAt as number).toISOString(),
      })),
    };

    return completeTestCase;
  } catch (error) {
    logger.error(`获取完整测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get complete test case');
  }
}

// 获取完整的测试用例信息（包含所有关联数据）
export async function getCompleteTestCase(id: string): Promise<any | null> {
  try {
    // 获取基本测试用例信息
    const testCaseResult = await getTestCaseById(id);
    if (!testCaseResult) {
      return null;
    }

    // 获取测试步骤
    const steps = await getFullTestSteps(id);
    console.log('getCompleteTestCase - steps count:', steps.length);

    // 获取所有自动化配置
    const automationConfigs = await getAllAutomationConfigs(id);

    // 获取相关需求
    const documents = await db
      .select()
      .from(relatedDocument)
      .where(eq(relatedDocument.testCaseId, id));

    // 获取数据集
    const datasets = await db
      .select()
      .from(dataset)
      .where(eq(dataset.testCaseId, id));

    // 获取测试运行记录 - 临时跳过，避免reportUrl字段错误
    const testRuns: any[] = [];

    // 获取已知问题
    const knownIssues = await db
      .select()
      .from(knownIssue)
      .where(eq(knownIssue.testCaseId, id))
      .orderBy(desc(knownIssue.createdAt));

    // 使用统一的JSON解析函数

    // 组装完整的测试用例对象
    const completeTestCase = {
      ...testCaseResult,
      tags: safeJsonParse(testCaseResult.tags as string, []),
      steps: steps.map(step => ({
        id: step.id,
        step: step.stepNumber,
        action: step.action,
        expected: step.expected,
        type: step.type,
        notes: step.notes,
      })),
      automationConfigs: automationConfigs.map(config => ({
        id: config.id,
        testCaseId: config.testCaseId,
        repository: config.repository,
        branch: config.branch,
        commands: safeJsonParse(config.commands as string, []),
        parameters: safeJsonParse(config.parameters as string, {}),
        framework: config.framework,
        browser: config.browser,
        environment: config.environment,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      })),
      relatedDocuments: documents.map(req => ({
        id: req.documentId,
        type: req.type,
        title: req.title,
        status: req.status,
        assignee: req.assignee,
        url: req.url,
        source: req.source,
        sourceMetadata: safeJsonParse(req.sourceMetadata as string, null),
      })),
      datasets: datasets.map(ds => ({
        id: ds.id,
        name: ds.name,
        columns: safeJsonParse(ds.columns as string, []),
        data: safeJsonParse(ds.data as string, []),
      })),
      testRuns: [], // 临时为空数组
      knownIssues: knownIssues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        reporter: issue.reporter,
        assignee: issue.assignee,
        bugUrl: issue.bugUrl,
        createdAt: new Date(issue.createdAt as number).toISOString(),
      })),
    };

    console.log('getCompleteTestCase - final steps count:', completeTestCase.steps.length);
    return completeTestCase;
  } catch (error) {
    logger.error(`获取完整测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get complete test case');
  }
}

// 创建测试运行记录
export async function createTestRun(testRunData: {
  testCaseId: string;
  status: 'passed' | 'failed' | 'running' | 'skipped';
  duration?: number;
  environment?: string;
  executor?: string;
  logs?: string;
  screenshots?: string[];
  results?: any[];
  reportUrl?: string; // 恢复reportUrl字段
}) {
  try {
    const now = Date.now();
    const id = generateUUID();

    const newTestRun = {
      id,
      testCaseId: testRunData.testCaseId,
      runDate: now,
      status: testRunData.status,
      duration: testRunData.duration || 0,
      environment: testRunData.environment || 'test',
      executor: testRunData.executor || 'automation',
      logs: testRunData.logs || '',
      screenshots: JSON.stringify(testRunData.screenshots || []),
      results: JSON.stringify(testRunData.results || []),
      reportUrl: testRunData.reportUrl || null, // 恢复reportUrl字段
      createdAt: now,
    };

    await db.insert(testRun).values(newTestRun);

    logger.info(`测试运行记录 ${id} 已创建`);
    return id;
  } catch (error) {
    logger.error(`创建测试运行记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create test run');
  }
}

// 更新测试运行记录
export async function updateTestRun(id: string, updates: {
  status?: 'passed' | 'failed' | 'running' | 'skipped';
  duration?: number;
  logs?: string;
  screenshots?: string[];
  results?: any[];
  reportUrl?: string; // 恢复reportUrl字段
}) {
  try {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.logs) updateData.logs = updates.logs;
    if (updates.screenshots) updateData.screenshots = JSON.stringify(updates.screenshots);
    if (updates.results !== undefined) updateData.results = JSON.stringify(updates.results);
    if (updates.reportUrl !== undefined) updateData.reportUrl = updates.reportUrl; // 恢复reportUrl字段

    await db.update(testRun).set(updateData).where(eq(testRun.id, id));

    logger.info(`测试运行记录 ${id} 已更新`);
  } catch (error) {
    logger.error(`更新测试运行记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update test run');
  }
}

// 获取测试用例的运行记录
export async function getTestRunsByTestCaseId(testCaseId: string, limit: number = 20) {
  try {
    const runs = await db
      .select({
        id: testRun.id,
        testCaseId: testRun.testCaseId,
        runDate: testRun.runDate,
        status: testRun.status,
        duration: testRun.duration,
        environment: testRun.environment,
        executor: testRun.executor,
        logs: testRun.logs,
        screenshots: testRun.screenshots,
        results: testRun.results,
        reportUrl: testRun.reportUrl,
      })
      .from(testRun)
      .where(eq(testRun.testCaseId, testCaseId))
      .orderBy(desc(testRun.runDate))
      .limit(limit);

    // 使用统一的JSON解析函数

    return runs.map(run => ({
      id: run.id,
      runDate: new Date(run.runDate as number).toISOString(),
      status: run.status,
      duration: run.duration,
      environment: run.environment,
      executor: run.executor,
      logs: run.logs,
      screenshots: safeJsonParse(run.screenshots as string, []),
      reportUrl: run.reportUrl, // 恢复reportUrl字段
      results: safeJsonParse(run.results as string, []) // 解析结果数据
    }));
  } catch (error) {
    logger.error(`获取测试运行记录失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get test runs');
  }
}

// 删除测试用例
export async function deleteTestCase(id: string): Promise<void> {
  try {
    // 删除相关数据
    await db.delete(testStep).where(eq(testStep.testCaseId, id));
    await db.delete(automationConfig).where(eq(automationConfig.testCaseId, id));
    await db.delete(relatedDocument).where(eq(relatedDocument.testCaseId, id));
    await db.delete(dataset).where(eq(dataset.testCaseId, id));
    await db.delete(testRun).where(eq(testRun.testCaseId, id));
    await db.delete(knownIssue).where(eq(knownIssue.testCaseId, id));
    await db.delete(testCaseTagRelation).where(eq(testCaseTagRelation.testCaseId, id));
    await db.delete(testCaseComment).where(eq(testCaseComment.testCaseId, id));
    await db.delete(testCaseHistory).where(eq(testCaseHistory.testCaseId, id));

    // 删除主记录
    await db.delete(testCase).where(eq(testCase.id, id));
  } catch (error) {
    logger.error(`删除测试用例失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete test case');
  }
}

// ==================== 项目管理函数 ====================

// 获取所有项目
export async function getProjects(): Promise<Project[]> {
  try {
    return await db.select().from(project).orderBy(asc(project.name));
  } catch (error) {
    logger.error(`获取项目列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get projects');
  }
}

// 根据ID获取项目
export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const projects = await db.select().from(project).where(eq(project.id, id));
    return projects[0] || null;
  } catch (error) {
    logger.error(`获取项目失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get project');
  }
}

// 根据key获取项目
export async function getProjectByKey(key: string): Promise<Project | null> {
  try {
    const projects = await db.select().from(project).where(eq(project.key, key));
    return projects[0] || null;
  } catch (error) {
    logger.error(`获取项目失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get project');
  }
}

// 创建项目
export async function createProject(data: {
  name: string;
  description?: string;
  key: string;
  status?: 'active' | 'inactive' | 'archived';
  color?: string;
  avatar?: string;
  settings?: Record<string, any>;
  createdBy: string;
}): Promise<Project> {
  try {
    const id = generateUUID();
    const now = Date.now();

    const newProject = {
      id,
      name: data.name,
      description: data.description || null,
      key: data.key,
      status: data.status || 'active',
      color: data.color || '#3B82F6',
      avatar: data.avatar || null,
      settings: JSON.stringify(data.settings || {}),
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };

    await db.insert(project).values(newProject);
    return newProject as Project;
  } catch (error) {
    logger.error(`创建项目失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create project');
  }
}

// 更新项目
export async function updateProject(id: string, data: {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  color?: string;
  avatar?: string;
  settings?: Record<string, any>;
  updatedBy: string;
}): Promise<void> {
  try {
    const updateData: any = {
      updatedAt: Date.now(),
      updatedBy: data.updatedBy,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.settings !== undefined) updateData.settings = JSON.stringify(data.settings);

    await db.update(project).set(updateData).where(eq(project.id, id));
  } catch (error) {
    logger.error(`更新项目失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update project');
  }
}

// 删除项目
export async function deleteProject(id: string): Promise<void> {
  try {
    // 注意：这里应该检查项目下是否还有数据，实际使用时可能需要级联删除或阻止删除
    await db.delete(project).where(eq(project.id, id));
  } catch (error) {
    logger.error(`删除项目失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete project');
  }
}

// 数据集相关函数

// 创建或更新测试用例数据集
export async function createOrUpdateTestCaseDataset(testCaseId: string, datasetData: {
  name: string;
  description?: string;
  type?: 'csv' | 'api' | 'json' | 'database';
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description?: string;
  }>;
  data: Array<Record<string, any>>;
}): Promise<void> {
  try {
    logger.debug(`创建或更新测试用例数据集: testCaseId=${testCaseId}, name=${datasetData.name}`);

    const now = new Date();
    // 统一使用整数时间戳（毫秒）
    const timestamp = now.getTime();
    const id = generateUUID();

    // 安全地序列化数据
    let columnsJson: string;
    let dataJson: string;

    try {
      columnsJson = JSON.stringify(datasetData.columns);
      dataJson = JSON.stringify(datasetData.data);
      logger.debug(`JSON序列化成功: columns长度=${columnsJson.length}, data长度=${dataJson.length}`);
    } catch (jsonError) {
      logger.error(`JSON序列化失败: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      throw new ChatSDKError('bad_request:database', 'Failed to serialize dataset data');
    }

    // 检查是否已存在同名数据集
    const existingDataset = await db
      .select()
      .from(dataset)
      .where(and(
        eq(dataset.testCaseId, testCaseId),
        eq(dataset.name, datasetData.name)
      ))
      .limit(1);

    if (existingDataset.length > 0) {
      // 更新现有数据集
      await db
        .update(dataset)
        .set({
          description: datasetData.description || null,
          type: datasetData.type || 'csv',
          columns: columnsJson,
          data: dataJson,
          updatedAt: timestamp,
        })
        .where(eq(dataset.id, existingDataset[0].id));

      logger.debug(`数据集更新成功: id=${existingDataset[0].id}`);
    } else {
      // 创建新数据集
      const insertData = {
        id,
        testCaseId,
        name: datasetData.name,
        description: datasetData.description || null,
        type: datasetData.type || 'csv',
        columns: columnsJson,
        data: dataJson,
        isActive: 1, // SQLite 中布尔值使用整数：1 = true, 0 = false
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      logger.debug(`准备插入数据集详细信息:`, {
        id: { value: insertData.id, type: typeof insertData.id },
        testCaseId: { value: insertData.testCaseId, type: typeof insertData.testCaseId },
        name: { value: insertData.name, type: typeof insertData.name },
        description: { value: insertData.description, type: typeof insertData.description },
        columns: { value: insertData.columns.substring(0, 100) + '...', type: typeof insertData.columns, length: insertData.columns.length },
        data: { value: insertData.data.substring(0, 100) + '...', type: typeof insertData.data, length: insertData.data.length },
        isActive: { value: insertData.isActive, type: typeof insertData.isActive },
        createdAt: { value: insertData.createdAt, type: typeof insertData.createdAt },
        updatedAt: { value: insertData.updatedAt, type: typeof insertData.updatedAt },
        timestamp: { value: timestamp, type: typeof timestamp }
      });

      // 验证所有字段类型
      const validTypes = ['string', 'number', 'boolean'];
      for (const [key, value] of Object.entries(insertData)) {
        if (value !== null && !validTypes.includes(typeof value)) {
          logger.error(`Invalid field type: ${key} = ${value} (${typeof value})`);
          throw new ChatSDKError('bad_request:database', `Invalid field type for ${key}: ${typeof value}`);
        }
      }

      await db.insert(dataset).values(insertData);

      logger.debug(`数据集创建成功: id=${id}`);
    }
  } catch (error) {
    logger.error(`创建或更新数据集失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create or update dataset');
  }
}

// 获取测试用例的所有数据集
export async function getTestCaseDatasets(testCaseId: string) {
  try {
    logger.debug(`获取测试用例数据集: testCaseId=${testCaseId}`);

    const datasets = await db
      .select()
      .from(dataset)
      .where(and(
        eq(dataset.testCaseId, testCaseId),
        eq(dataset.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true)
      ))
      .orderBy(desc(dataset.createdAt));

    return datasets.map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      columns: JSON.parse(ds.columns || '[]'),
      data: JSON.parse(ds.data || '[]'),
      createdAt: new Date(ds.createdAt as number).toISOString(),
      updatedAt: new Date(ds.updatedAt as number).toISOString(),
    }));
  } catch (error) {
    logger.error(`获取数据集失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get datasets');
  }
}

// ==================== 已知问题（Known Issues）相关查询 ====================

/**
 * 创建已知问题
 */
export async function createKnownIssue(data: {
  testCaseId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status?: 'open' | 'investigating' | 'resolved' | 'wont-fix';
  reporter: string;
  assignee?: string;
  bugUrl?: string;
  workaround?: string;
  category?: string;
  tags?: string[];
}): Promise<string> {
  try {
    const now = new Date();
    const timestamp = now.getTime();
    const id = generateUUID();

    await db.insert(knownIssue).values({
      id,
      testCaseId: data.testCaseId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: data.status || 'open',
      reporter: data.reporter,
      assignee: data.assignee || null,
      bugUrl: data.bugUrl || null,
      workaround: data.workaround || null,
      category: data.category || null,
      tags: data.tags || null,
      createdAt: timestamp,
      updatedAt: timestamp,
      resolvedAt: null,
    });

    logger.info(`已知问题已创建: id=${id}, testCaseId=${data.testCaseId}, title=${data.title}`);
    return id;
  } catch (error) {
    logger.error(`创建已知问题失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create known issue');
  }
}

/**
 * 更新已知问题
 */
export async function updateKnownIssue(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'investigating' | 'resolved' | 'wont-fix';
    assignee: string;
    bugUrl: string;
    workaround: string;
    category: string;
    tags: string[];
  }>
): Promise<void> {
  try {
    const now = new Date();
    const timestamp = now.getTime();
    
    const updateData: any = {
      ...data,
      updatedAt: timestamp,
    };

    // 如果状态更改为已解决，记录解决时间
    if (data.status === 'resolved') {
      updateData.resolvedAt = timestamp;
    }

    await db
      .update(knownIssue)
      .set(updateData)
      .where(eq(knownIssue.id, id));

    logger.info(`已知问题已更新: id=${id}`);
  } catch (error) {
    logger.error(`更新已知问题失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update known issue');
  }
}

/**
 * 删除已知问题
 */
export async function deleteKnownIssue(id: string): Promise<void> {
  try {
    await db.delete(knownIssue).where(eq(knownIssue.id, id));
    logger.info(`已知问题已删除: id=${id}`);
  } catch (error) {
    logger.error(`删除已知问题失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete known issue');
  }
}

/**
 * 获取测试用例的所有已知问题
 */
export async function getKnownIssues(testCaseId: string) {
  try {
    logger.debug(`获取测试用例已知问题: testCaseId=${testCaseId}`);

    const issues = await db
      .select()
      .from(knownIssue)
      .where(eq(knownIssue.testCaseId, testCaseId))
      .orderBy(desc(knownIssue.createdAt));

    return issues.map((issue: any) => ({
      id: issue.id,
      testCaseId: issue.testCaseId,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      reporter: issue.reporter,
      assignee: issue.assignee,
      bugUrl: issue.bugUrl,
      uri: issue.bugUrl, // 添加 uri 字段映射到 bugUrl
      workaround: issue.workaround,
      category: issue.category,
      tags: issue.tags ? (typeof issue.tags === 'string' ? JSON.parse(issue.tags) : issue.tags) : [],
      createdAt: new Date(issue.createdAt as number).toISOString(),
      updatedAt: new Date(issue.updatedAt as number).toISOString(),
      resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt as number).toISOString() : null,
    }));
  } catch (error) {
    logger.error(`获取已知问题失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get known issues');
  }
}

/**
 * 根据ID获取单个已知问题
 */
export async function getKnownIssueById(id: string) {
  try {
    logger.debug(`获取已知问题详情: id=${id}`);

    const result = await db
      .select()
      .from(knownIssue)
      .where(eq(knownIssue.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const issue = result[0];
    return {
      id: issue.id,
      testCaseId: issue.testCaseId,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      reporter: issue.reporter,
      assignee: issue.assignee,
      bugUrl: issue.bugUrl,
      uri: issue.bugUrl, // 添加 uri 字段映射到 bugUrl
      workaround: issue.workaround,
      category: issue.category,
      tags: issue.tags ? (typeof issue.tags === 'string' ? JSON.parse(issue.tags) : issue.tags) : [],
      createdAt: new Date(issue.createdAt as number).toISOString(),
      updatedAt: new Date(issue.updatedAt as number).toISOString(),
      resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt as number).toISOString() : null,
    };
  } catch (error) {
    logger.error(`获取已知问题详情失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get known issue');
  }
}

// ==================== AI模型配置相关查询 ====================

/**
 * 获取所有活跃的AI提供者
 */
export async function getActiveAiProviders() {
  try {
    const providers = await db
      .select()
      .from(schema.aiProvider)
      .where(eq(schema.aiProvider.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true))
      .orderBy(schema.aiProvider.sortOrder, schema.aiProvider.name);

    return providers;
  } catch (error) {
    logger.error(`获取AI提供者失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get AI providers');
  }
}

/**
 * 根据提供者ID获取可用的模型
 */
export async function getModelsByProvider(providerId: string) {
  try {
    const models = await db
      .select()
      .from(schema.aiModel)
      .where(
        and(
          eq(schema.aiModel.providerId, providerId),
          eq(schema.aiModel.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true)
        )
      )
      .orderBy(schema.aiModel.sortOrder, schema.aiModel.displayName);

    return models;
  } catch (error) {
    logger.error(`获取模型列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get models');
  }
}

/**
 * 获取指定用途的模型配置（系统级别）
 */
export async function getModelForUsage(usageType: string) {
  try {
    const results = await db
      .select({
        model: schema.aiModel,
        provider: schema.aiProvider,
        usage: schema.aiModelUsage,
      })
      .from(schema.aiModelUsage)
      .innerJoin(schema.aiModel, eq(schema.aiModelUsage.modelId, schema.aiModel.id))
      .innerJoin(schema.aiProvider, eq(schema.aiModel.providerId, schema.aiProvider.id))
      .where(
        and(
          eq(schema.aiModelUsage.usageType, usageType),
          eq(schema.aiModelUsage.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true),
          eq(schema.aiModel.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true),
          eq(schema.aiProvider.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true),
          // 只查询系统级别配置（无用户和项目关联）
          isNull(schema.aiModelUsage.projectId),
          isNull(schema.aiModelUsage.userId)
        )
      )
      .orderBy(desc(schema.aiModelUsage.priority))
      .limit(1);

    return results[0] || null;
  } catch (error) {
    logger.error(`获取模型配置失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get model configuration');
  }
}

/**
 * 获取提供者的API密钥（系统级别）
 */
export async function getApiKeyForProvider(providerId: string) {
  try {
    const result = await db
      .select()
      .from(schema.aiApiKey)
      .where(
        and(
          eq(schema.aiApiKey.providerId, providerId),
          eq(schema.aiApiKey.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true),
          // 只查询系统级别配置（无用户和项目关联）
          isNull(schema.aiApiKey.projectId),
          isNull(schema.aiApiKey.userId)
        )
      )
      .orderBy(desc(schema.aiApiKey.createdAt))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    logger.error(`获取API密钥失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get API key');
  }
}

/**
 * 设置模型用途映射
 */
export async function setModelUsage(data: {
  usageType: string;
  modelId: string;
  projectId?: string;
  userId?: string;
  priority?: number;
}) {
  try {
    const now = new Date();
    const timestamp = now.getTime();

    // 先禁用现有的相同配置
    await db
      .update(schema.aiModelUsage)
      .set({
        isActive: false,
        updatedAt: timestamp
      })
      .where(
        and(
          eq(schema.aiModelUsage.usageType, data.usageType),
          data.userId ? eq(schema.aiModelUsage.userId, data.userId) : isNull(schema.aiModelUsage.userId),
          data.projectId ? eq(schema.aiModelUsage.projectId, data.projectId) : isNull(schema.aiModelUsage.projectId)
        )
      );

    // 创建新的配置
    const newId = generateUUID();
    await db.insert(schema.aiModelUsage).values({
      id: newId,
      usageType: data.usageType,
      modelId: data.modelId,
      projectId: data.projectId || null,
      userId: data.userId || null,
      priority: data.priority || 0,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return newId;
  } catch (error) {
    logger.error(`设置模型用途映射失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to set model usage');
  }
}

/**
 * 创建AI提供者
 */
export async function createAiProvider(data: {
  name: string;
  displayName: string;
  description?: string;
  baseUrl?: string;
  apiKeyRequired?: boolean;
  supportedFeatures?: string[];
  configuration?: Record<string, any>;
}) {
  try {
    const now = new Date();
    const timestamp = now.getTime();
    const id = generateUUID();

    await db.insert(schema.aiProvider).values({
      id,
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      baseUrl: data.baseUrl || null,
      apiKeyRequired: data.apiKeyRequired !== false,
      supportedFeatures: JSON.stringify(data.supportedFeatures || []),
      configuration: JSON.stringify(data.configuration || {}),
      isActive: true,
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return id;
  } catch (error) {
    logger.error(`创建AI提供者失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create AI provider');
  }
}

/**
 * 创建AI模型
 */
export async function createAiModel(data: {
  providerId: string;
  modelKey: string;
  displayName: string;
  description?: string;
  modelType: 'chat' | 'image' | 'embedding' | 'reasoning';
  capabilities?: string[];
  contextWindow?: number;
  maxTokens?: number;
  pricing?: Record<string, number>;
  configuration?: Record<string, any>;
}) {
  try {
    const now = new Date();
    const timestamp = now.getTime();
    const id = generateUUID();

    await db.insert(schema.aiModel).values({
      id,
      providerId: data.providerId,
      modelKey: data.modelKey,
      displayName: data.displayName,
      description: data.description || null,
      modelType: data.modelType,
      capabilities: JSON.stringify(data.capabilities || []),
      contextWindow: data.contextWindow || null,
      maxTokens: data.maxTokens || null,
      pricing: JSON.stringify(data.pricing || {}),
      configuration: JSON.stringify(data.configuration || {}),
      isActive: true,
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return id;
  } catch (error) {
    logger.error(`创建AI模型失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create AI model');
  }
}

// ==================== AI API密钥相关查询 ====================

/**
 * 创建API密钥
 */
export async function createApiKey(data: {
  providerId: string;
  keyName: string;
  encryptedKey: string;
  isActive?: boolean;
  expiresAt?: number | null;
}) {
  try {
    const now = Date.now();
    const id = generateUUID();

    // SQLite需要将布尔值转换为整数
    const isActiveValue = data.isActive ?? true;

    const [result] = await db
      .insert(aiApiKey)
      .values({
        id,
        providerId: data.providerId,
        keyName: data.keyName,
        encryptedKey: data.encryptedKey,
        isActive: isSqlite ? (isActiveValue ? 1 : 0) : isActiveValue,
        expiresAt: data.expiresAt || null,
        projectId: null, // 系统级别配置
        userId: null, // 系统级别配置
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: aiApiKey.id,
        providerId: aiApiKey.providerId,
        keyName: aiApiKey.keyName,
        isActive: aiApiKey.isActive,
        createdAt: aiApiKey.createdAt,
        expiresAt: aiApiKey.expiresAt,
      });

    return result;
  } catch (error) {
    logger.error(`创建API密钥失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to create API key');
  }
}

/**
 * 更新API密钥
 */
export async function updateApiKey(
  id: string,
  data: {
    keyName?: string;
    encryptedKey?: string;
    isActive?: boolean;
    expiresAt?: number | null;
  }
) {
  try {
    const now = Date.now();

    // SQLite需要将布尔值转换为整数
    const updateData: any = { ...data };

    if (updateData.isActive !== undefined && isSqlite) {
      updateData.isActive = updateData.isActive ? 1 : 0;
    }

    const [result] = await db
      .update(aiApiKey)
      .set({
        ...updateData,
        updatedAt: now,
      })
      .where(eq(aiApiKey.id, id))
      .returning({
        id: aiApiKey.id,
        providerId: aiApiKey.providerId,
        keyName: aiApiKey.keyName,
        isActive: aiApiKey.isActive,
        createdAt: aiApiKey.createdAt,
        expiresAt: aiApiKey.expiresAt,
      });

    return result;
  } catch (error) {
    logger.error(`更新API密钥失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to update API key');
  }
}

/**
 * 删除API密钥
 */
export async function deleteApiKey(id: string) {
  try {
    await db.delete(aiApiKey).where(eq(aiApiKey.id, id));
    return true;
  } catch (error) {
    logger.error(`删除API密钥失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to delete API key');
  }
}

/**
 * 获取所有API密钥
 */
export async function getAllApiKeys() {
  try {
    const keys = await db
      .select({
        id: aiApiKey.id,
        providerId: aiApiKey.providerId,
        keyName: aiApiKey.keyName,
        isActive: aiApiKey.isActive,
        createdAt: aiApiKey.createdAt,
        expiresAt: aiApiKey.expiresAt,
        // 不返回加密的密钥内容
      })
      .from(aiApiKey)
      .orderBy(desc(aiApiKey.createdAt));

    return keys;
  } catch (error) {
    logger.error(`获取API密钥列表失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get API keys');
  }
}

/**
 * 根据ID获取API密钥（包含加密内容）
 */
export async function getApiKeyById(id: string) {
  try {
    const [key] = await db
      .select()
      .from(aiApiKey)
      .where(eq(aiApiKey.id, id))
      .limit(1);

    return key || null;
  } catch (error) {
    logger.error(`获取API密钥失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to get API key');
  }
}

/**
 * 检查提供者是否有API密钥配置
 */
export async function checkProviderApiKeyStatus(providerId: string) {
  try {
    const [result] = await db
      .select({
        totalKeys: count(),
        activeKeys: count(eq(aiApiKey.isActive, process.env.DB_PROVIDER === 'sqlite' ? 1 : true)),
      })
      .from(aiApiKey)
      .where(eq(aiApiKey.providerId, providerId));

    return {
      hasApiKey: result.totalKeys > 0,
      totalKeys: result.totalKeys,
      activeKeys: result.activeKeys,
    };


  } catch (error) {
    logger.error(`检查API密钥状态失败: ${error instanceof Error ? error.message : String(error)}`);
    throw new ChatSDKError('bad_request:database', 'Failed to check API key status');
  }
}
