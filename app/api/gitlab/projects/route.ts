import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { GitLabClient, GitLabApiError } from '@/lib/services/gitlab-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/gitlab/projects
 * 获取用户有权限的 GitLab 项目列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');
    const accessToken = searchParams.get('accessToken');
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const perPage = searchParams.get('perPage') ? parseInt(searchParams.get('perPage')!) : 20;

    // 验证必需参数
    if (!baseUrl || !accessToken) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters: baseUrl and accessToken' 
        },
        { status: 400 }
      );
    }

    logger.info('GitLab projects list request', {
      baseUrl,
      search,
      page,
      perPage,
      userId: session.user.id
    });

    // 创建 GitLab 客户端
    let gitlabClient: GitLabClient;
    try {
      gitlabClient = new GitLabClient({
        baseUrl,
        accessToken
      });
    } catch (error) {
      logger.error('Failed to create GitLab client', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return NextResponse.json(
        { error: 'Invalid GitLab configuration' },
        { status: 500 }
      );
    }

    // 获取项目列表
    try {
      const projects = await gitlabClient.listProjects({
        search,
        page,
        perPage,
        membership: true
      });

      logger.info(`Found ${projects.length} GitLab projects`, {
        userId: session.user.id,
        search,
        page
      });

      return NextResponse.json({
        success: true,
        projects,
        page,
        perPage,
        count: projects.length
      });

    } catch (error) {
      logger.error('Failed to get GitLab projects', {
        error: error instanceof Error ? error.message : String(error),
        status: error instanceof GitLabApiError ? error.status : undefined
      });

      if (error instanceof GitLabApiError) {
        const status = error.status;
        let message = 'Failed to fetch GitLab projects.';

        if (status === 401) {
          message = 'GitLab authentication failed. Please check the access token.';
        } else if (status === 403) {
          message = 'Access denied. Please check your GitLab permissions.';
        } else {
          message = `GitLab API error: ${error.message}`;
        }

        return NextResponse.json(
          { error: message },
          { status: status >= 500 ? 500 : 400 }
        );
      }

      return NextResponse.json(
        { error: 'Network error while accessing GitLab.' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('GitLab projects GET error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

