import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiModel, aiProvider } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// 检查数据库类型
const isSQLite = process.env.DB_PROVIDER === 'sqlite';

export async function GET() {
  try {
    const rawModels = await db
      .select({
        id: aiModel.id,
        providerId: aiModel.providerId,
        modelKey: aiModel.modelKey,
        displayName: aiModel.displayName,
        description: aiModel.description,
        modelType: aiModel.modelType,
        capabilities: aiModel.capabilities,
        contextWindow: aiModel.contextWindow,
        maxTokens: aiModel.maxTokens,
        pricing: aiModel.pricing,
        configuration: aiModel.configuration,
        isActive: aiModel.isActive,
        sortOrder: aiModel.sortOrder,
        createdAt: aiModel.createdAt,
        updatedAt: aiModel.updatedAt,
        providerName: aiProvider.displayName,
      })
      .from(aiModel)
      .leftJoin(aiProvider, eq(aiModel.providerId, aiProvider.id))
      .orderBy(aiModel.sortOrder, aiModel.displayName);

    // 解析JSON字段
    const models = rawModels.map(model => {
      let capabilities = [];
      let pricing = {};
      let configuration = {};

      try {
        capabilities = typeof model.capabilities === 'string'
          ? JSON.parse(model.capabilities)
          : (Array.isArray(model.capabilities) ? model.capabilities : []);
      } catch (e) {
        console.warn('Failed to parse capabilities for model:', model.id, e);
        capabilities = [];
      }

      try {
        pricing = typeof model.pricing === 'string'
          ? JSON.parse(model.pricing)
          : (model.pricing || {});
      } catch (e) {
        console.warn('Failed to parse pricing for model:', model.id, e);
        pricing = {};
      }

      try {
        configuration = typeof model.configuration === 'string'
          ? JSON.parse(model.configuration)
          : (model.configuration || {});
      } catch (e) {
        console.warn('Failed to parse configuration for model:', model.id, e);
        configuration = {};
      }

      return {
        ...model,
        capabilities,
        pricing,
        configuration,
      };
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('Failed to fetch AI models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newModel = {
      id: randomUUID(), // 生成UUID
      providerId: body.providerId,
      modelKey: body.modelKey,
      displayName: body.displayName,
      description: body.description || null,
      modelType: body.modelType || 'chat',
      capabilities: JSON.stringify(Array.isArray(body.capabilities) ? body.capabilities : []),
      contextWindow: body.contextWindow || 4096,
      maxTokens: body.maxTokens || 2048,
      pricing: JSON.stringify(body.pricing || {}),
      configuration: JSON.stringify(body.configuration || {}),
      isActive: isSQLite ? (body.isActive ?? true ? 1 : 0) : (body.isActive ?? true),
      sortOrder: body.sortOrder || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const [model] = await db
      .insert(aiModel)
      .values(newModel)
      .returning();

    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI model:', error);
    return NextResponse.json(
      { error: 'Failed to create AI model' },
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
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // 从updateData中移除id字段，避免在set()中包含主键
    const { id: _, ...cleanUpdateData } = updateData;

    // 处理SQLite的布尔值转换
    const updatedModel = {
      ...cleanUpdateData,
      updatedAt: Date.now(),
    };

    // 确保布尔值类型正确（SQLite中存储为整数）
    if (isSQLite) {
      if (updatedModel.isActive !== undefined) {
        updatedModel.isActive = updatedModel.isActive ? 1 : 0;
      }
    }

    // 确保JSON字段正确序列化
    if (updatedModel.capabilities !== undefined) {
      updatedModel.capabilities = JSON.stringify(
        Array.isArray(updatedModel.capabilities) ? updatedModel.capabilities : []
      );
    }
    if (updatedModel.pricing !== undefined) {
      updatedModel.pricing = JSON.stringify(updatedModel.pricing || {});
    }
    if (updatedModel.configuration !== undefined) {
      updatedModel.configuration = JSON.stringify(updatedModel.configuration || {});
    }

    const [model] = await db
      .update(aiModel)
      .set(updatedModel)
      .where(eq(aiModel.id, id))
      .returning();

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('Failed to update AI model:', error);
    return NextResponse.json(
      { error: 'Failed to update AI model' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 支持两种方式：URL参数和请求体
    let id: string | null = null;

    // 首先尝试从URL参数获取
    const { searchParams } = new URL(request.url);
    id = searchParams.get('id');

    // 如果URL参数没有，尝试从请求体获取
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {
        // 忽略JSON解析错误
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const [deletedModel] = await db
      .delete(aiModel)
      .where(eq(aiModel.id, id))
      .returning();

    if (!deletedModel) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI model:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI model' },
      { status: 500 }
    );
  }
}
