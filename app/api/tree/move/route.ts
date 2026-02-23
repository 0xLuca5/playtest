import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { folder, testCase } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * 移动树节点（文件夹或测试用例）到新的父节点
 * POST /api/tree/move
 * body: { nodeId: string, nodeType: 'folder' | 'testCase', newParentId: string | null, projectId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, nodeType, newParentId, projectId } = body as {
      nodeId: string;
      nodeType: 'folder' | 'testCase';
      newParentId: string | null;
      projectId?: string;
    };

    if (!nodeId || !nodeType) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const now = Date.now();

    if (nodeType === 'testCase') {
      // 仅更新所属文件夹
      await db
        .update(testCase)
        .set({ folderId: newParentId, updatedAt: now, updatedBy: session.user.id })
        .where(eq(testCase.id, nodeId));

      return NextResponse.json({ success: true });
    }

    // 处理文件夹移动：需要更新 parentId、path、level 以及所有后代的 path/level
    // 1. 读取被移动文件夹
    const folders = await db.select().from(folder).where(eq(folder.id, nodeId)).limit(1);
    if (folders.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    const moving = folders[0];

    // 2. 读取新父级信息（可能为 null）
    let newParentPath = '';
    let newLevelBase = 0;
    if (newParentId) {
      const parents = await db.select().from(folder).where(eq(folder.id, newParentId)).limit(1);
      if (parents.length === 0) {
        return NextResponse.json({ error: 'New parent folder not found' }, { status: 404 });
      }
      newParentPath = parents[0].path || '';
      newLevelBase = (parents[0].level || 0) + 1;
    }

    const oldPath = moving.path as string;
    const newPath = `${newParentPath}/${moving.name}`;
    const levelDelta = newLevelBase - (moving.level || 0);

    // 3. 更新当前文件夹自身
    await db
      .update(folder)
      .set({
        parentId: newParentId,
        path: newPath,
        level: newLevelBase,
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(eq(folder.id, nodeId));

    // 4. 同步更新所有子孙节点的 path/level（以旧path为前缀的所有记录）
    // SQLite/PG 里没有内置的 startsWith 操作符，这里简单读取同项目的所有文件夹并手动更新（规模通常较小）
    const allFolders = await db.select().from(folder);

    for (const f of allFolders) {
      if (f.id === nodeId) continue;
      if (f.projectId !== moving.projectId) continue;
      if (typeof f.path !== 'string') continue;
      if (!f.path.startsWith(oldPath + '/')) continue;

      const subOldPath = f.path as string;
      const subNewPath = subOldPath.replace(oldPath + '/', newPath + '/');
      const subNewLevel = (f.level || 0) + levelDelta;

      await db
        .update(folder)
        .set({ path: subNewPath, level: subNewLevel, updatedAt: now, updatedBy: session.user.id })
        .where(eq(folder.id, f.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Move node failed:', error);
    return NextResponse.json({ error: 'Failed to move node' }, { status: 500 });
  }
}

