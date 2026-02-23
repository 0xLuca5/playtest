import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiProvider } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// 检查数据库类型
const isSQLite = process.env.DB_PROVIDER === 'sqlite';

export async function GET() {
  try {
    const rawProviders = await db
      .select()
      .from(aiProvider)
      .orderBy(aiProvider.sortOrder, aiProvider.displayName);

    // 解析JSON字段
    const providers = rawProviders.map(provider => {
      let supportedFeatures = [];
      let configuration = {};

      try {
        supportedFeatures = typeof provider.supportedFeatures === 'string'
          ? JSON.parse(provider.supportedFeatures)
          : (Array.isArray(provider.supportedFeatures) ? provider.supportedFeatures : []);
      } catch (e) {
        console.warn('Failed to parse supportedFeatures for provider:', provider.id, e);
        supportedFeatures = [];
      }

      try {
        configuration = typeof provider.configuration === 'string'
          ? JSON.parse(provider.configuration)
          : (provider.configuration || {});
      } catch (e) {
        console.warn('Failed to parse configuration for provider:', provider.id, e);
        configuration = {};
      }

      return {
        ...provider,
        supportedFeatures,
        configuration,
      };
    });

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Failed to fetch AI providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newProvider = {
      id: randomUUID(), // 生成UUID
      name: body.name,
      displayName: body.displayName,
      description: body.description || null,
      baseUrl: body.baseUrl || null,
      apiKeyRequired: isSQLite ? (body.apiKeyRequired ?? true ? 1 : 0) : (body.apiKeyRequired ?? true),
      supportedFeatures: JSON.stringify(Array.isArray(body.supportedFeatures) ? body.supportedFeatures : []),
      configuration: JSON.stringify(body.configuration || {}),
      isActive: isSQLite ? (body.isActive ?? true ? 1 : 0) : (body.isActive ?? true),
      sortOrder: body.sortOrder || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const [provider] = await db
      .insert(aiProvider)
      .values(newProvider)
      .returning();

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to create AI provider' },
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
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const updatedProvider = {
      ...updateData,
      updatedAt: Date.now(),
    };

    // 确保布尔值类型正确（SQLite中存储为整数）
    if (isSQLite) {
      if (updatedProvider.apiKeyRequired !== undefined) {
        updatedProvider.apiKeyRequired = updatedProvider.apiKeyRequired ? 1 : 0;
      }
      if (updatedProvider.isActive !== undefined) {
        updatedProvider.isActive = updatedProvider.isActive ? 1 : 0;
      }
    }

    // 确保JSON字段正确序列化
    if (updatedProvider.supportedFeatures !== undefined) {
      updatedProvider.supportedFeatures = JSON.stringify(
        Array.isArray(updatedProvider.supportedFeatures) ? updatedProvider.supportedFeatures : []
      );
    }
    if (updatedProvider.configuration !== undefined) {
      updatedProvider.configuration = JSON.stringify(updatedProvider.configuration || {});
    }

    const [provider] = await db
      .update(aiProvider)
      .set(updatedProvider)
      .where(eq(aiProvider.id, id))
      .returning();

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Failed to update AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const [deletedProvider] = await db
      .delete(aiProvider)
      .where(eq(aiProvider.id, id))
      .returning();

    if (!deletedProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    );
  }
}
