import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { folder } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/folder/:id
 * Rename a folder and cascade-update path of all descendants.
 * Body: { name: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name } = body as { name?: string };

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Folder ID and new name are required' }, { status: 400 });
    }

    const rows = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const moving = rows[0];
    const now = Date.now();

    // Compute new path by replacing last segment
    const oldPath = (moving.path as string) || '';
    const lastSlash = oldPath.lastIndexOf('/');
    const basePath = lastSlash >= 0 ? oldPath.slice(0, lastSlash) : '';
    const newPath = `${basePath}/${name}`;

    // Update current folder name and path
    await db
      .update(folder)
      .set({ name: name.trim(), path: newPath, updatedAt: now, updatedBy: session.user.id })
      .where(eq(folder.id, id));

    // Update descendants' path (same project, prefix match)
    const allFolders = await db.select().from(folder);
    for (const f of allFolders) {
      if (f.projectId !== moving.projectId) continue;
      if (typeof f.path !== 'string') continue;
      if (!f.path.startsWith(oldPath + '/')) continue;

      const subNewPath = (f.path as string).replace(oldPath + '/', newPath + '/');
      await db
        .update(folder)
        .set({ path: subNewPath, updatedAt: now, updatedBy: session.user.id })
        .where(eq(folder.id, f.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rename folder failed:', error);
    return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  }
}

