import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import {
  createKnownIssue,
  getKnownIssues,
  updateKnownIssue,
  deleteKnownIssue,
  getKnownIssueById,
} from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';

const logger = dbLogger.child('known-issues-api');

// GET - 获取测试用例的所有已知问题
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const issueId = searchParams.get('id');

    if (issueId) {
      // 获取单个问题
      const issue = await getKnownIssueById(issueId);
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      return NextResponse.json({ issue });
    }

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId is required' },
        { status: 400 }
      );
    }

    const issues = await getKnownIssues(testCaseId);
    return NextResponse.json({ issues });
  } catch (error) {
    logger.error('获取已知问题失败:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

// POST - 创建新的已知问题
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      testCaseId,
      title,
      description,
      severity,
      status,
      assignee,
      bugUrl,
      workaround,
      category,
      tags,
    } = body;

    if (!testCaseId || !title || !description || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: testCaseId, title, description, severity' },
        { status: 400 }
      );
    }

    const issueId = await createKnownIssue({
      testCaseId,
      title,
      description,
      severity,
      status,
      reporter: session.user?.email || 'unknown',
      assignee,
      bugUrl,
      workaround,
      category,
      tags,
    });

    return NextResponse.json({ id: issueId, success: true }, { status: 201 });
  } catch (error) {
    logger.error('创建已知问题失败:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}

// PATCH - 更新已知问题
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    await updateKnownIssue(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('更新已知问题失败:', error);
    return NextResponse.json(
      { error: 'Failed to update issue' },
      { status: 500 }
    );
  }
}

// DELETE - 删除已知问题
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    await deleteKnownIssue(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('删除已知问题失败:', error);
    return NextResponse.json(
      { error: 'Failed to delete issue' },
      { status: 500 }
    );
  }
}
