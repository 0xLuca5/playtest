import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { folder, testCase } from '@/lib/db/schema';
import { eq, asc, isNull, and } from 'drizzle-orm';
import { getCurrentProjectIdOrDefault } from '@/lib/utils/project';

interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
  isFolder: boolean;
  path?: string;
  level?: number;
  createdAt?: number;
  updatedAt?: number;
}

async function buildFolderTree(parentId: string | null = null, projectId: string): Promise<TreeNode[]> {
  console.log('🔍 buildFolderTree called with:', { parentId, projectId });

  // 获取文件夹
  const folderConditions = [eq(folder.projectId, projectId)];
  if (parentId) {
    folderConditions.push(eq(folder.parentId, parentId));
  } else {
    folderConditions.push(isNull(folder.parentId));
  }

  const folders = await db
    .select()
    .from(folder)
    .where(and(...folderConditions))
    .orderBy(asc(folder.sortOrder), asc(folder.name));


  // 获取测试用例
  const testCaseConditions = [eq(testCase.projectId, projectId)];
  if (parentId) {
    testCaseConditions.push(eq(testCase.folderId, parentId));
  } else {
    testCaseConditions.push(isNull(testCase.folderId));
  }

  const testCases = await db
    .select()
    .from(testCase)
    .where(and(...testCaseConditions))
    .orderBy(asc(testCase.name));


  const result: TreeNode[] = [];

  // 添加文件夹节点
  for (const folderItem of folders) {
    const children = await buildFolderTree(folderItem.id, projectId);
    result.push({
      id: folderItem.id,
      name: folderItem.name,
      children,
      isFolder: true,
      path: folderItem.path,
      level: folderItem.level,
      createdAt: folderItem.createdAt,
      updatedAt: folderItem.updatedAt
    });
  }

  // 添加测试用例节点
  for (const testCaseItem of testCases) {
    result.push({
      id: testCaseItem.id,
      name: testCaseItem.name,
      children: [],
      isFolder: false,
      createdAt: testCaseItem.createdAt,
      updatedAt: testCaseItem.updatedAt
    });
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 从查询参数获取项目ID - 必须提供
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const tree = await buildFolderTree(null, projectId);

    // 禁用缓存，避免导入后立即刷新树时拿到旧数据
    return NextResponse.json({ tree }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Get test case tree error:', error);
    return NextResponse.json(
      { error: 'Failed to get test case tree' },
      { status: 500 }
    );
  }
}
