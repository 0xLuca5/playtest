import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import {
  createRepositorySetting,
  getRepositorySettingsByProject,
  getRepositorySettingsByFolder,
  updateRepositorySetting,
  deleteRepositorySetting,
} from '@/lib/db/queries';

/**
 * GET /api/repository-settings?projectId=xxx&folderId=xxx
 * 获取项目或文件夹的所有仓库设置
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const folderId = searchParams.get('folderId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 如果提供了 folderId，则查询文件夹级别的设置
    const settings = folderId
      ? await getRepositorySettingsByFolder(projectId, folderId)
      : await getRepositorySettingsByProject(projectId);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get repository settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get repository settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/repository-settings
 * 创建新的仓库设置
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      folderId,
      provider = 'github',
      repoUrl,
      defaultBranch = 'main',
      authType = 'token',
      encryptedAccessToken,
      sshPrivateKey,
      sshPublicKey,
      webhookSecret,
      ciProvider = 'none',
      settings = {},
      isActive = true,
    } = body;

    if (!projectId || !repoUrl) {
      return NextResponse.json(
        { error: 'Project ID and repository URL are required' },
        { status: 400 }
      );
    }

    const newSetting = await createRepositorySetting({
      projectId,
      folderId,
      repoUrl,
      createdBy: session.user?.email || 'unknown',
      provider,
      defaultBranch,
      authType,
      encryptedAccessToken,
      sshPrivateKey,
      sshPublicKey,
      webhookSecret,
      ciProvider,
      settings,
      isActive,
    });

    return NextResponse.json(newSetting, { status: 201 });
  } catch (error) {
    console.error('Create repository setting error:', error);
    return NextResponse.json(
      { error: 'Failed to create repository setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/repository-settings
 * 更新仓库设置
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Repository setting ID is required' },
        { status: 400 }
      );
    }

    await updateRepositorySetting(
      id,
      updates,
      session.user?.email || 'unknown'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update repository setting error:', error);
    return NextResponse.json(
      { error: 'Failed to update repository setting' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/repository-settings?id=xxx
 * 删除仓库设置
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Repository setting ID is required' },
        { status: 400 }
      );
    }

    await deleteRepositorySetting(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete repository setting error:', error);
    return NextResponse.json(
      { error: 'Failed to delete repository setting' },
      { status: 500 }
    );
  }
}

