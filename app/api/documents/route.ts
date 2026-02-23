import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, deleteDocument } from '@/lib/db/queries';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { dbLogger } from '@/lib/logger';

// 创建模块专用的日志记录器
const logger = dbLogger.child('documents-api');

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const kind = searchParams.get('kind') || undefined;
    const userId = searchParams.get('userId') || undefined; // 允许通过参数筛选用户
    const projectId = searchParams.get('projectId') || undefined; // 允许通过项目ID筛选
    const search = searchParams.get('search') || undefined; // 搜索关键词
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'title' || 'createdAt';
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' || 'desc';

    logger.info(`获取文档列表: userId=${userId}, projectId=${projectId}, limit=${limit}, offset=${offset}, kind=${kind}, search=${search}`);

    // 调用数据库查询
    const result = await getDocuments({
      limit,
      offset,
      userId,
      projectId,
      kind: kind as any,
      search,
      sortBy,
      sortDirection,
    });
    
    logger.info(`成功获取文档列表，返回${result.documents.length}条记录`);
    
    // 返回结果
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error(`获取文档列表失败: ${error instanceof Error ? error.message : String(error)}`);
    
    return new NextResponse(
      JSON.stringify({
        error: '获取文档列表失败',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// 获取错误消息的国际化版本
function getErrorMessage(key: string, locale: string = 'en') {
  const messages = {
    en: {
      unauthorized: 'Unauthorized access',
      missingId: 'Document ID parameter is required',
      deleteFailed: 'Failed to delete document',
      notFound: 'Document not found',
      forbidden: 'You do not have permission to delete this document'
    },
    zh: {
      unauthorized: '未授权访问',
      missingId: '缺少文档ID参数',
      deleteFailed: '删除文档失败',
      notFound: '文档不存在',
      forbidden: '无权限删除此文档'
    },
    ja: {
      unauthorized: '認証されていないアクセス',
      missingId: 'ドキュメントIDパラメータが必要です',
      deleteFailed: 'ドキュメントの削除に失敗しました',
      notFound: 'ドキュメントが見つかりません',
      forbidden: 'このドキュメントを削除する権限がありません'
    }
  };

  return messages[locale as keyof typeof messages]?.[key as keyof typeof messages.en] || messages.en[key as keyof typeof messages.en];
}

export async function DELETE(request: NextRequest) {
  try {
    // 获取语言设置
    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: getErrorMessage('unauthorized', locale) }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取文档ID
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: getErrorMessage('missingId', locale) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`删除文档: ID=${id}, 用户=${session.user.id}`);

    // 调用删除函数
    await deleteDocument(id, session.user.id);

    logger.info(`文档删除成功: ID=${id}`);

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error(`删除文档失败: ${error instanceof Error ? error.message : String(error)}`);

    // 获取语言设置
    const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';

    // 根据错误类型返回不同的状态码和消息
    let statusCode = 500;
    let errorMessage = getErrorMessage('deleteFailed', locale);

    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('文档不存在') || message.includes('not found')) {
        statusCode = 404;
        errorMessage = getErrorMessage('notFound', locale);
      } else if (message.includes('无权限') || message.includes('belongs to another user') || message.includes('forbidden')) {
        statusCode = 403;
        errorMessage = getErrorMessage('forbidden', locale);
      }
    }

    return new NextResponse(
      JSON.stringify({
        error: errorMessage,
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}