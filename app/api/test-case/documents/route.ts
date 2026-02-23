import { NextRequest, NextResponse } from 'next/server';
import { createRelatedDocuments, getRelatedDocuments, deleteRelatedDocument, updateRelatedDocument } from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';

const logger = dbLogger.child('test-case-documents-api');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId parameter is required' },
        { status: 400 }
      );
    }

    logger.info(`获取测试用例需求: testCaseId=${testCaseId}`);

    const documents = await getRelatedDocuments(testCaseId);

    return NextResponse.json(documents);
  } catch (error) {
    logger.error(`获取测试用例需求失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCaseId, title, uri, type = 'external', source = 'external', status = 'active', sourceMetadata } = body;

    if (!testCaseId || !title || !uri) {
      return NextResponse.json(
        { error: 'testCaseId, title, and uri are required' },
        { status: 400 }
      );
    }

    logger.info(`创建测试用例需求关联: testCaseId=${testCaseId}, title=${title}, source=${source}, status=${status}`);

    const documentData = {
      testCaseId,
      documentId: `REQ-${Date.now()}`, // 生成一个简单的ID
      type: type as 'story' | 'epic' | 'task' | 'document' | 'external',
      title,
      status: status as 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid',
      assignee: '', // 可选
      url: uri,
      source: source as 'confluence' | 'jira' | 'sharepoint' | 'external',
      sourceMetadata: sourceMetadata || null,
    };

    await createRelatedDocuments(documentData);

    return NextResponse.json({
      success: true,
      message: 'documents linked successfully'
    });
  } catch (error) {
    logger.error(`创建测试用例需求关联失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to create documents link' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, uri, type, source, status, sourceMetadata } = body;

    if (!id || !title || !uri) {
      return NextResponse.json(
        { error: 'id, title, and uri are required' },
        { status: 400 }
      );
    }

    logger.info(`更新测试用例需求关联: id=${id}, title=${title}, status=${status}`);

    const updateData = {
      title,
      url: uri,
      type: type as 'story' | 'epic' | 'task' | 'document' | 'external',
      source: source as 'confluence' | 'jira' | 'sharepoint' | 'external',
      status: status as 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid',
      sourceMetadata: sourceMetadata || null,
    };

    await updateRelatedDocument(id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Document link updated successfully'
    });
  } catch (error) {
    logger.error(`更新测试用例需求关联失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to update document link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    logger.info(`删除测试用例需求关联: id=${id}`);

    await deleteRelatedDocument(id);

    return NextResponse.json({
      success: true,
      message: 'Document link deleted successfully'
    });
  } catch (error) {
    logger.error(`删除测试用例需求关联失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to delete document link' },
      { status: 500 }
    );
  }
}
