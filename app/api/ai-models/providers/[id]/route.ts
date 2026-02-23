import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 删除AI Provider
 * DELETE /api/ai-models/providers/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // 检查provider是否存在
    const existingProvider = await db
      .select()
      .from(schema.aiProvider)
      .where(eq(schema.aiProvider.id, id))
      .limit(1);

    if (existingProvider.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // 先获取要删除的模型ID列表
    const modelsToDelete = await db
      .select({ id: schema.aiModel.id })
      .from(schema.aiModel)
      .where(eq(schema.aiModel.providerId, id));

    // 开始事务删除
    await db.transaction(async (tx) => {
      // 1. 删除相关的usage配置
      for (const model of modelsToDelete) {
        await tx
          .delete(schema.aiModelUsage)
          .where(eq(schema.aiModelUsage.modelId, model.id));
      }

      // 2. 删除相关的模型
      await tx
        .delete(schema.aiModel)
        .where(eq(schema.aiModel.providerId, id));

      // 3. 删除相关的API密钥
      await tx
        .delete(schema.aiApiKey)
        .where(eq(schema.aiApiKey.providerId, id));

      // 4. 最后删除provider本身
      await tx
        .delete(schema.aiProvider)
        .where(eq(schema.aiProvider.id, id));
    });

    return NextResponse.json({
      message: 'Provider deleted successfully',
      deletedId: id
    });

  } catch (error) {
    console.error('Failed to delete provider:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete provider',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
