import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiModelUsage, aiModel, aiProvider } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// 检查数据库类型
const isSQLite = process.env.DB_PROVIDER === 'sqlite';

export async function GET() {
  try {
    const usages = await db
      .select({
        id: aiModelUsage.id,
        usageType: aiModelUsage.usageType,
        modelId: aiModelUsage.modelId,
        priority: aiModelUsage.priority,
        isActive: aiModelUsage.isActive,
        createdAt: aiModelUsage.createdAt,
        updatedAt: aiModelUsage.updatedAt,
        modelName: aiModel.displayName,
        modelKey: aiModel.modelKey,
        providerId: aiModel.providerId,
        providerName: aiProvider.displayName,
      })
      .from(aiModelUsage)
      .leftJoin(aiModel, eq(aiModelUsage.modelId, aiModel.id))
      .leftJoin(aiProvider, eq(aiModel.providerId, aiProvider.id))
      .orderBy(aiModelUsage.usageType, aiModelUsage.priority);

    return NextResponse.json(usages);
  } catch (error) {
    console.error('Failed to fetch AI model usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI model usage' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newUsage = {
      id: randomUUID(), // 生成UUID
      usageType: body.usageType,
      modelId: body.modelId,
      priority: body.priority || 1,
      isActive: isSQLite ? (body.isActive ?? true ? 1 : 0) : (body.isActive ?? true),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const [usage] = await db
      .insert(aiModelUsage)
      .values(newUsage)
      .returning();

    return NextResponse.json(usage, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI model usage:', error);
    return NextResponse.json(
      { error: 'Failed to create AI model usage' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Usage ID is required' },
        { status: 400 }
      );
    }

    const updatedUsage = {
      ...updateData,
      updatedAt: Date.now(),
    };

    // 确保布尔值类型正确（SQLite中存储为整数）
    if (isSQLite) {
      if (updatedUsage.isActive !== undefined) {
        updatedUsage.isActive = updatedUsage.isActive ? 1 : 0;
      }
    }

    const [usage] = await db
      .update(aiModelUsage)
      .set(updatedUsage)
      .where(eq(aiModelUsage.id, id))
      .returning();

    if (!usage) {
      return NextResponse.json(
        { error: 'Usage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to update AI model usage:', error);
    return NextResponse.json(
      { error: 'Failed to update AI model usage' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 支持从URL参数或请求体获取ID
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    // 如果URL参数中没有ID，尝试从请求体获取
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (error) {
        // 请求体解析失败，忽略错误
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Usage ID is required (provide via URL parameter ?id=xxx or request body)' },
        { status: 400 }
      );
    }

    const [deletedUsage] = await db
      .delete(aiModelUsage)
      .where(eq(aiModelUsage.id, id))
      .returning();

    if (!deletedUsage) {
      return NextResponse.json(
        { error: 'Usage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI model usage:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI model usage' },
      { status: 500 }
    );
  }
}
