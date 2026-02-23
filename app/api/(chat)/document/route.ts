import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import type { ArtifactKind } from '@/components/chat/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentById,
  getDocumentsById,
  saveDocument,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { dbLogger } from '@/lib/logger';

// 创建模块专用的日志记录器
const logger = dbLogger.child('document-api');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is missing',
    ).toResponse();
  }

  const session = await getServerSession(authConfig) as Session | null;

  if (!session?.user) {
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  try {
    const documents = await getDocumentsById({ id });

    if (!documents || documents.length === 0) {
      return new ChatSDKError('not_found:document').toResponse();
    }

    // 移除权限检查，允许任何已登录用户访问文档
    // if (documents[0].userId !== session.user.id) {
    //   return new ChatSDKError('forbidden:document').toResponse();
    // }

    logger.info(`文档访问成功: ID=${id}, 用户=${session.user.id}, 版本数=${documents.length}`);
    return Response.json(documents, { status: 200 });
  } catch (error) {
    logger.error(`获取文档失败: ${error instanceof Error ? error.message : String(error)}`);
    return new ChatSDKError('bad_request:database', '获取文档失败').toResponse();
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    logger.error('文档创建失败: 缺少ID参数');
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is required.',
    ).toResponse();
  }

  try {
    const session = await getServerSession(authConfig) as Session | null;

    if (!session?.user) {
      logger.error('文档创建失败: 用户未认证');
      return new ChatSDKError('unauthorized:document', '用户未认证').toResponse();
    }

    const body = await request.json();
    const {
      content,
      title,
      kind,
    }: { content: string; title: string; kind: ArtifactKind } = body;

    logger.info(`尝试创建文档: ID=${id}, 标题=${title}, 类型=${kind}, 用户=${session.user.id}`);

    const document = await getDocumentById({ id });

    if (document!=null) {
      if (document.userId !== session.user.id) {
        logger.error(`文档创建失败: 权限不足, 用户=${session.user.id}, 文档所有者=${document.userId}`);
        return new ChatSDKError('forbidden:document', '权限不足').toResponse();
      }
    }

    try {
      const document = await saveDocument({
        id,
        content,
        title,
        kind,
        userId: session.user.id,
      });

      logger.info(`文档创建成功: ID=${id}, 标题=${title}`);
      return Response.json(document, { status: 200 });
    } catch (dbError) {
      logger.error(`数据库保存文档失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      return new ChatSDKError(
        'bad_request:database', 
        '保存文档到数据库失败'
      ).toResponse();
    }
  } catch (error) {
    logger.error(`文档创建处理失败: ${error instanceof Error ? error.message : String(error)}`);
    return new ChatSDKError(
      'bad_request:api',
      '处理请求时发生错误'
    ).toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const timestamp = searchParams.get('timestamp');

  if (!id) {
    logger.error('文档删除失败: 缺少ID参数');
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is required.',
    ).toResponse();
  }

  if (!timestamp) {
    logger.error('文档删除失败: 缺少timestamp参数');
    return new ChatSDKError(
      'bad_request:api',
      'Parameter timestamp is required.',
    ).toResponse();
  }

  const session = await getServerSession(authConfig) as Session | null;

  if (!session?.user) {
    logger.error('文档删除失败: 用户未认证');
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  try {
  const document = await getDocumentById({ id });

    if (!document) {
      logger.error(`文档删除失败: 文档不存在, ID=${id}`);
      return new ChatSDKError('not_found:document').toResponse();
    }

  if (document.userId !== session.user.id) {
      logger.error(`文档删除失败: 权限不足, 用户=${session.user.id}, 文档所有者=${document.userId}`);
    return new ChatSDKError('forbidden:document').toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

    logger.info(`文档删除成功: ID=${id}, 时间戳=${timestamp}, 删除数量=${documentsDeleted.length}`);
  return Response.json(documentsDeleted, { status: 200 });
  } catch (error) {
    logger.error(`文档删除处理失败: ${error instanceof Error ? error.message : String(error)}`);
    return new ChatSDKError(
      'bad_request:api',
      '处理删除请求时发生错误'
    ).toResponse();
  }
}
