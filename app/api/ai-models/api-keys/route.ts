import { NextRequest, NextResponse } from 'next/server';
import {
  getAllApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getApiKeyById,
  checkProviderApiKeyStatus
} from '@/lib/db/queries';
import { encrypt, decrypt } from '@/lib/utils/encryption';

export async function GET() {
  try {
    const keys = await getAllApiKeys();
    return NextResponse.json(keys);
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.apiKey || !body.providerId) {
      return NextResponse.json(
        { error: 'API key and provider ID are required' },
        { status: 400 }
      );
    }

    // 加密API密钥
    const encryptedKey = encrypt(body.apiKey);

    // 使用统一的查询函数创建API密钥
    const apiKey = await createApiKey({
      providerId: body.providerId,
      keyName: body.keyName || 'Default Key',
      encryptedKey,
      isActive: body.isActive ?? true,
      expiresAt: body.expiresAt || null,
    });

    return NextResponse.json(apiKey, { status: 201 });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, apiKey, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // 准备更新数据
    const updatedData: any = { ...updateData };

    // 如果提供了新的API密钥，则加密它
    if (apiKey) {
      updatedData.encryptedKey = encrypt(apiKey);
    }

    // 使用统一的查询函数更新API密钥
    const key = await updateApiKey(id, updatedData);

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(key);
  } catch (error) {
    console.error('Failed to update API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
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
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // 使用统一的查询函数删除API密钥
    const success = await deleteApiKey(id);

    if (!success) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
