/**
 * AI模型配置管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getActiveAiProviders, 
  getModelsByProvider, 
  getModelForUsage,
  setModelUsage,
  createAiProvider,
  createAiModel
} from '@/lib/db/queries';
import { logger } from '@/lib/logger';

// GET /api/ai-models - 获取AI模型配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const providerId = searchParams.get('providerId');
    const usageType = searchParams.get('usageType');
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    switch (action) {
      case 'providers':
        const providers = await getActiveAiProviders();
        return NextResponse.json({ providers });

      case 'models':
        if (!providerId) {
          return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
        }
        const models = await getModelsByProvider(providerId);
        return NextResponse.json({ models });

      case 'usage':
        if (!usageType) {
          return NextResponse.json({ error: 'Usage type required' }, { status: 400 });
        }
        const usage = await getModelForUsage(usageType, userId || undefined, projectId || undefined);
        return NextResponse.json({ usage });

      case 'all':
      default:
        const allProviders = await getActiveAiProviders();
        const allModels = await Promise.all(
          allProviders.map(async (provider) => {
            const models = await getModelsByProvider(provider.id);
            return { provider, models };
          })
        );
        return NextResponse.json({ data: allModels });
    }
  } catch (error) {
    logger.error('Failed to get AI models:', error);
    return NextResponse.json(
      { error: 'Failed to get AI models' },
      { status: 500 }
    );
  }
}

// POST /api/ai-models - 创建AI提供者或模型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    switch (type) {
      case 'provider':
        const providerId = await createAiProvider(data);
        return NextResponse.json({ id: providerId, message: 'Provider created successfully' });

      case 'model':
        const modelId = await createAiModel(data);
        return NextResponse.json({ id: modelId, message: 'Model created successfully' });

      case 'usage':
        const usageId = await setModelUsage(data);
        return NextResponse.json({ id: usageId, message: 'Model usage set successfully' });

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Failed to create AI model configuration:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/ai-models - 更新模型用途映射
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { usageType, modelId, userId, projectId, priority } = body;

    if (!usageType || !modelId) {
      return NextResponse.json(
        { error: 'Usage type and model ID are required' },
        { status: 400 }
      );
    }

    const id = await setModelUsage({
      usageType,
      modelId,
      userId,
      projectId,
      priority
    });

    return NextResponse.json({ 
      id, 
      message: 'Model usage updated successfully' 
    });
  } catch (error) {
    logger.error('Failed to update model usage:', error);
    return NextResponse.json(
      { error: 'Failed to update model usage' },
      { status: 500 }
    );
  }
}
