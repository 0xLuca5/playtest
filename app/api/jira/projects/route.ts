import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { JiraClient } from '@/lib/services/jira-client';
import { logger } from '@/lib/logger';

/**
 * POST /api/jira/projects
 * 获取用户可访问的 Jira 项目列表
 */

interface GetJiraProjectsRequest {
  baseUrl: string;
  email?: string;
  apiToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GetJiraProjectsRequest = await request.json();
    const { baseUrl, apiToken } = body;

    if (!baseUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Base URL and API token are required' },
        { status: 400 }
      );
    }

    // 优先使用前端传递的 email，如果没有则使用当前用户的 email
    let email = body.email?.trim();
    if (!email) {
      email = session.user.email;
    }

    if (!email) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching Jira projects', {
      userId: session.user.id,
      baseUrl,
      email,
    });

    // 创建 Jira 客户端（使用临时 projectKey）
    const jiraClient = new JiraClient({
      baseUrl,
      email,
      apiToken,
      projectKey: 'TEMP', // 临时值，不会被使用
    });

    // 验证连接
    try {
      const user = await jiraClient.verifyConnection();
      logger.info('Jira connection verified for project listing', {
        userId: session.user.id,
        jiraUser: user.emailAddress,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        status: (error as any).status,
        url: (error as any).url,
      };
      logger.error('Failed to verify Jira connection:', errorDetails);
      return NextResponse.json(
        { error: errorMessage },
        { status: (error as any).status || 500 }
      );
    }

    // 获取项目列表
    const projects = await jiraClient.listProjects();

    logger.info(`Found ${projects.length} Jira projects`);

    // 返回项目列表
    return NextResponse.json({
      projects: projects.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description || '',
        projectTypeKey: project.projectTypeKey,
        lead: project.lead?.displayName || '',
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      message: errorMessage,
      status: (error as any).status,
      url: (error as any).url,
      stack: error instanceof Error ? error.stack : undefined,
    };
    logger.error('Failed to fetch Jira projects:', errorDetails);

    return NextResponse.json(
      { error: errorMessage },
      { status: (error as any).status || 500 }
    );
  }
}

