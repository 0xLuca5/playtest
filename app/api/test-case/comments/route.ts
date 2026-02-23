import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { testCaseComment } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET - 获取测试用例的所有评论
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');

    if (!testCaseId) {
      return NextResponse.json({ error: 'testCaseId is required' }, { status: 400 });
    }

    // 从数据库获取评论
    const comments = await db
      .select()
      .from(testCaseComment)
      .where(eq(testCaseComment.testCaseId, testCaseId))
      .orderBy(desc(testCaseComment.createdAt));

    // 处理 tags 字段的 JSON 解析
    const processedComments = comments.map(comment => ({
      ...comment,
      tags: comment.tags ? (typeof comment.tags === 'string' ? JSON.parse(comment.tags) : comment.tags) : []
    }));

    // 返回评论和当前用户信息
    return NextResponse.json({
      comments: processedComments,
      currentUser: session.user.email
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - 创建新评论
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      testCaseId,
      content,
      authorType = 'user',
      commentType = 'general',
      category,
      tags,
      relatedStepId,
      attachments
    } = body;

    if (!testCaseId || !content) {
      return NextResponse.json(
        { error: 'testCaseId and content are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const timestamp = now.getTime();
    
    const newComment = {
      id: uuidv4(),
      testCaseId,
      content,
      author: session.user.email,
      authorType: authorType as 'user' | 'ai',
      commentType: commentType as 'suggestion' | 'issue' | 'risk' | 'improvement' | 'question' | 'approval' | 'general',
      category: category || null,
      tags: tags ? JSON.stringify(tags) : null,
      relatedStepId: relatedStepId || null,
      attachments: attachments ? JSON.stringify(attachments) : null,
      parentId: null,
      isResolved: 0, // SQLite 中布尔值存储为整数
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 创建新评论
    await db.insert(testCaseComment).values(newComment);

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// PUT - 更新评论
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      content,
      commentType,
      category,
      tags,
      relatedStepId,
      attachments
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // 检查评论是否存在且属于当前用户
    const existingComments = await db
      .select()
      .from(testCaseComment)
      .where(eq(testCaseComment.id, id))
      .limit(1);

    if (existingComments.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const existingComment = existingComments[0];

    // 允许用户编辑自己的评论和 AI 评论
    if (existingComment.authorType === 'user' && existingComment.author !== session.user.email) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    // 构建更新对象（只更新提供的字段）
    const now = new Date();
    const timestamp = now.getTime();
    
    const updateData: any = {
      updatedAt: timestamp,
    };

    if (content !== undefined) updateData.content = content;
    if (commentType !== undefined) updateData.commentType = commentType;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;
    if (relatedStepId !== undefined) updateData.relatedStepId = relatedStepId;
    if (attachments !== undefined) updateData.attachments = attachments ? JSON.stringify(attachments) : null;

    // 更新评论
    await db
      .update(testCaseComment)
      .set(updateData)
      .where(eq(testCaseComment.id, id));

    // 获取更新后的评论
    const updatedComments = await db
      .select()
      .from(testCaseComment)
      .where(eq(testCaseComment.id, id))
      .limit(1);

    return NextResponse.json(updatedComments[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - 删除评论
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 检查评论是否存在且属于当前用户
    const existingComments = await db
      .select()
      .from(testCaseComment)
      .where(eq(testCaseComment.id, id))
      .limit(1);

    if (existingComments.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const existingComment = existingComments[0];

    // 允许用户删除自己的评论和 AI 评论
    if (existingComment.authorType === 'user' && existingComment.author !== session.user.email) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // 删除评论
    await db
      .delete(testCaseComment)
      .where(eq(testCaseComment.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

