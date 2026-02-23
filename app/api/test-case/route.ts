import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { 
  createTestCase, 
  getTestCases, 
  updateTestCase, 
  deleteTestCase,
  getCompleteTestCase 
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as 'updatedAt' | 'createdAt' | 'name' || 'updatedAt';
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' || 'desc';
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (id) {
      // 获取单个测试用例的完整信息
      console.log('🔍 Getting test case:', id, 'for project:', projectId);
      const testCase = await getCompleteTestCase(id);
      if (!testCase) {
        console.log('❌ Test case not found:', id);
        return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
      }

      // 验证测试用例是否属于当前项目
      if (testCase.projectId !== projectId) {
        console.log('❌ Test case belongs to different project:', testCase.projectId, 'vs', projectId);
        return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
      }

      console.log('✅ Test case found:', testCase.name);
      return NextResponse.json(testCase);
    } else {
      // 获取测试用例列表
      console.log('📋 Getting test cases for project:', projectId, 'folder:', folderId, 'search:', search);
      const result = await getTestCases({
        projectId,
        folderId: folderId || undefined,
        search: search || undefined,
        limit,
        offset,
        sortBy,
        sortDirection
      });
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Get test cases error:', error);
    return NextResponse.json(
      { error: 'Failed to get test cases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      folderId,
      name,
      description = '',
      preconditions,
      priority = 'medium',
      status = 'draft',
      weight = 'medium',
      format = 'classic',
      nature = 'functional',
      type = 'regression',
      tags = [],
      projectId
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Test case name is required' },
        { status: 400 }
      );
    }

    // 项目ID必须从前端传递
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const finalProjectId = projectId;

    const newTestCase = await createTestCase({
      projectId: finalProjectId,
      folderId,
      name,
      description,
      preconditions,
      priority,
      status,
      weight,
      format,
      nature,
      type,
      tags,
      createdBy: (session as any).user?.email || 'unknown'
    });

    return NextResponse.json(newTestCase, { status: 201 });
  } catch (error) {
    console.error('Create test case error:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Test case ID is required' },
        { status: 400 }
      );
    }

    await updateTestCase(id, updates, (session as any).user?.email || 'unknown');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update test case error:', error);
    return NextResponse.json(
      { error: 'Failed to update test case' },
      { status: 500 }
    );
  }
}

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
        { error: 'Test case ID is required' },
        { status: 400 }
      );
    }

    await deleteTestCase(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test case error:', error);
    return NextResponse.json(
      { error: 'Failed to delete test case' },
      { status: 500 }
    );
  }
}
