import { NextRequest, NextResponse } from 'next/server';
import { checkProviderApiKeyStatus } from '@/lib/db/queries';

/**
 * 检查API密钥配置状态（不返回实际密钥内容）
 * GET /api/ai-models/api-keys/check?providerId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // 使用统一的查询函数检查API密钥状态
    const result = await checkProviderApiKeyStatus(providerId);

    return NextResponse.json({
      providerId,
      ...result,
    });

  } catch (error) {
    console.error('Failed to check API key:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check API key',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
