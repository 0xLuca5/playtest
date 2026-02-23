import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import {
  createFolder,
  getFolders,
  getTestCases,
  deleteTestCase,
  deleteFolder,
} from '@/lib/db/queries';
import { db } from '@/lib/db';
import { folder } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const folders = await getFolders(projectId, parentId || undefined);
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { error: 'Failed to get folders' },
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
    const { name, description, parentId, projectId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
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

    const newFolder = await createFolder({
      projectId: finalProjectId,
      name,
      description,
      parentId,
      createdBy: session.user?.email || 'unknown'
    });

    return NextResponse.json(newFolder, { status: 201 });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
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
    const { id, name, description } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Folder ID and name are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    // 统一使用整数时间戳（毫秒）
    const timestamp = now.getTime();

    await db
      .update(folder)
      .set({
        name,
        description,
        updatedAt: timestamp,
        updatedBy: session.user?.email || 'unknown'
      })
      .where(eq(folder.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
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
    const force = searchParams.get('force') === 'true'; // 是否强制删除（递归删除）
    const projectId = searchParams.get('projectId');

    if (!id) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 递归删除文件夹及其所有内容的函数
    const deleteFolderRecursively = async (folderId: string) => {
      console.log(`🗑️ 开始递归删除文件夹: ${folderId}, 项目: ${projectId}`);

      try {
        // 1. 删除文件夹内的所有测试用例
        const testCasesResult = await getTestCases({ projectId, folderId });
        const testCases = testCasesResult.testCases;
        console.log(`📋 找到 ${testCases.length} 个测试用例需要删除`);

        for (const testCase of testCases) {
          console.log(`🗑️ 删除测试用例: ${testCase.id} - ${testCase.name}`);
          await deleteTestCase(testCase.id);
        }

        // 2. 递归删除子文件夹
        const subFolders = await getFolders(projectId, folderId);
        console.log(`📁 找到 ${subFolders.length} 个子文件夹需要删除`);

        for (const subFolder of subFolders) {
          console.log(`🗑️ 递归删除子文件夹: ${subFolder.id} - ${subFolder.name}`);
          await deleteFolderRecursively(subFolder.id);
        }

        // 3. 删除文件夹本身
        console.log(`🗑️ 删除文件夹本身: ${folderId}`);
        await db.delete(folder).where(eq(folder.id, folderId));
        console.log(`✅ 文件夹删除成功: ${folderId}`);
      } catch (error) {
        console.error(`❌ 删除文件夹失败: ${folderId}`, error);
        throw error;
      }
    };



    if (force) {
      // 强制删除：递归删除文件夹及其所有内容
      console.log(`🗑️ 强制删除文件夹: ${id}`);
      await deleteFolder(id, projectId);
    } else {
      // 普通删除：只删除空文件夹
      const subFolders = await getFolders(projectId, id);
      const testCasesResult = await getTestCases({ projectId, folderId: id });
      const testCases = testCasesResult.testCases;

      console.log(`🔍 检查文件夹内容: ${subFolders.length} 个子文件夹, ${testCases.length} 个测试用例`);

      if (subFolders.length > 0 || testCases.length > 0) {
        console.log(`❌ 文件夹不为空: ${subFolders.length} 个子文件夹, ${testCases.length} 个测试用例`);
        return NextResponse.json(
          {
            error: 'Cannot delete folder with content',
            message: `文件夹包含 ${subFolders.length} 个子文件夹和 ${testCases.length} 个测试用例。请使用强制删除或先清空文件夹。`,
            hasSubFolders: subFolders.length > 0,
            hasTestCases: testCases.length > 0,
            subFoldersCount: subFolders.length,
            testCasesCount: testCases.length
          },
          { status: 400 }
        );
      }

      // 检查是否有其他文件夹引用这个文件夹作为父文件夹
      const referencingFolders = await db
        .select()
        .from(folder)
        .where(eq(folder.parentId, id));

      console.log(`🔍 检查引用此文件夹的其他文件夹: ${referencingFolders.length} 个`);

      if (referencingFolders.length > 0) {
        console.log(`❌ 有其他文件夹引用此文件夹作为父文件夹:`, referencingFolders.map(f => f.name));
        return NextResponse.json(
          {
            error: 'Cannot delete folder with references',
            message: `有 ${referencingFolders.length} 个文件夹引用此文件夹作为父文件夹，无法删除。`,
            referencingFolders: referencingFolders.map(f => ({ id: f.id, name: f.name }))
          },
          { status: 400 }
        );
      }

      console.log(`🗑️ 删除空文件夹: ${id}`);
      await db.delete(folder).where(eq(folder.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
