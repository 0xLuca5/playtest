import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { updateTestCase } from '@/lib/db/queries';

/**
 * PATCH /api/test-case/:id
 * Rename or update a single test case.
 * Body: Partial fields, e.g. { name: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Test case ID is required' }, { status: 400 });
    }

    // 仅允许部分字段通过；核心是 name 重命名
    const allowed: any = {};
    if (typeof body?.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Name must not be empty' }, { status: 400 });
      }
      allowed.name = trimmed;
    }

    // 也允许外部按需更新其它简单字段（可扩展）
    const passthroughKeys = [
      'folderId', 'description', 'preconditions', 'priority', 'status',
      'weight', 'format', 'nature', 'type', 'tags', 'executionTime', 'lastRunAt'
    ];
    for (const k of passthroughKeys) {
      if (k in body) allowed[k] = body[k];
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateTestCase(id, allowed, session.user?.email || 'unknown');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rename/Update test case failed:', error);
    return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
  }
}

