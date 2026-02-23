import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { JiraClient } from '@/lib/services/jira-client';
import { logger } from '@/lib/logger';

/**
 * POST /api/jira/issue-types
 * 获取 Jira 项目的 Issue Types
 */

interface GetJiraIssueTypesRequest {
  baseUrl: string;
  email?: string;
  apiToken: string;
  projectKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GetJiraIssueTypesRequest = await request.json();
    const { baseUrl, apiToken, projectKey } = body;

    if (!baseUrl || !apiToken || !projectKey) {
      return NextResponse.json(
        { error: 'Base URL, API token, and project key are required' },
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

    logger.info('Fetching Jira issue types', {
      userId: session.user.id,
      baseUrl,
      email,
      projectKey,
    });

    // 创建 Jira 客户端
    const jiraClient = new JiraClient({
      baseUrl,
      email,
      apiToken,
      projectKey,
    });

    // 验证连接
    try {
      await jiraClient.verifyConnection();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to verify Jira connection:', { message: errorMessage });
      return NextResponse.json(
        { error: errorMessage },
        { status: (error as any).status || 500 }
      );
    }

    // 获取项目信息
    const project = await jiraClient.getProject();
    
    // 获取 Issue Types
    const issueTypes = project.issueTypes || [];

    logger.info(`Found ${issueTypes.length} issue types for project ${projectKey}`);

    // 返回 Issue Types 列表
    return NextResponse.json({
      issueTypes: issueTypes.map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description || '',
        subtask: type.subtask || false,
        iconUrl: type.iconUrl || '',
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
    logger.error('Failed to fetch Jira issue types:', errorDetails);

    return NextResponse.json(
      { error: errorMessage },
      { status: (error as any).status || 500 }
    );
  }
}

