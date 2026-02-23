import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { JiraClient } from '@/lib/services/jira-client';
import { getCompleteTestCase, getTestCases } from '@/lib/db/queries';
import { logger } from '@/lib/logger';

/**
 * POST /api/jira/sync
 * 同步测试用例到 Jira
 * 
 * 支持两种模式：
 * 1. 单个测试用例同步：传入 testCaseId
 * 2. 文件夹批量同步：传入 folderId + projectId
 */

interface SyncToJiraRequest {
  // 单个测试用例同步
  testCaseId?: string;
  
  // 文件夹批量同步
  folderId?: string;
  projectId?: string;
  
  // Jira 配置
  jiraConfig: {
    baseUrl: string;
    email?: string; // 可选，如果不提供则使用当前登录用户的 email
    apiToken: string;
    projectKey: string;
  };
  
  // 可选配置
  issueType?: string; // 默认为 'Test'
  priority?: string; // 例如：'High', 'Medium', 'Low'
  labels?: string[];
}

interface SyncToJiraResponse {
  success: boolean;
  message: string;
  issueKey?: string;
  issueUrl?: string;
  
  // 批量同步结果
  results?: Array<{
    testCaseId: string;
    testCaseName: string;
    success: boolean;
    issueKey?: string;
    issueUrl?: string;
    error?: string;
  }>;
  successCount?: number;
  failedCount?: number;
  totalCount?: number;
}

/**
 * 将测试用例转换为 Jira Issue 描述
 */
function formatTestCaseDescription(testCase: any): string {
  let description = '';

  // 基本信息
  description += `📋 Test Case ID: ${testCase.id}\n`;
  description += `🎯 Priority: ${testCase.priority || 'Medium'}\n`;
  description += `📝 Type: ${testCase.type || 'Functional'}\n`;
  description += `\n${'='.repeat(50)}\n\n`;

  // 描述
  if (testCase.description) {
    description += `📄 Description:\n${testCase.description}\n\n`;
  }

  // 前置条件
  if (testCase.preconditions) {
    description += `⚙️ Preconditions:\n${testCase.preconditions}\n\n`;
  }

  // 测试步骤 - 尝试多个可能的字段名
  const steps = testCase.steps || testCase.testSteps || [];
  if (steps && steps.length > 0) {
    description += `🔢 Test Steps:\n`;
    description += `${'─'.repeat(50)}\n`;
    steps.forEach((step: any, index: number) => {
      // 尝试不同的字段名
      const action = step.action || step.description || step.step || '';
      const expected = step.expected || step.expectedResult || step.expectedOutcome || '';

      description += `\nStep ${index + 1}:\n`;
      description += `  Action: ${action}\n`;
      if (expected) {
        description += `  Expected Result: ${expected}\n`;
      }
    });
    description += `\n${'─'.repeat(50)}\n\n`;
  } else {
    description += `⚠️ No test steps defined\n\n`;
  }

  // 标签
  if (testCase.tags && testCase.tags.length > 0) {
    description += `🏷️ Tags: ${testCase.tags.map((t: any) => t.name).join(', ')}\n`;
  }

  return description;
}

/**
 * 同步单个测试用例到 Jira
 */
async function syncSingleTestCase(
  testCaseId: string,
  jiraClient: JiraClient,
  options: {
    issueType: string;
    priority?: string;
    labels?: string[];
  }
): Promise<{ success: boolean; issueKey?: string; issueUrl?: string; error?: string }> {
  try {
    // 获取完整的测试用例信息
    const testCase = await getCompleteTestCase(testCaseId);

    if (!testCase) {
      throw new Error(`Test case not found: ${testCaseId}`);
    }

    // 调试：查看测试用例数据
    logger.info(`Test case data for ${testCaseId}`, {
      name: testCase.name,
      hasDescription: !!testCase.description,
      hasPreconditions: !!testCase.preconditions,
      stepsCount: testCase.steps?.length || 0,
      steps: testCase.steps,
    });

    // 准备 Jira Issue 数据
    const description = formatTestCaseDescription(testCase);

    // 构建 labels：包含测试用例的属性
    const labels: string[] = ['test']; // 基础标签

    // 添加测试用例属性作为标签（确保值存在且是字符串）
    if (testCase.nature && typeof testCase.nature === 'string') {
      labels.push(`nature-${testCase.nature}`.replace(/\s+/g, '-'));
    }
    if (testCase.type && typeof testCase.type === 'string') {
      labels.push(`type-${testCase.type}`.replace(/\s+/g, '-'));
    }
    if (testCase.priority && typeof testCase.priority === 'string') {
      labels.push(`priority-${testCase.priority}`.replace(/\s+/g, '-'));
    }
    if (testCase.status && typeof testCase.status === 'string') {
      labels.push(`status-${testCase.status}`.replace(/\s+/g, '-'));
    }
    if (testCase.weight) {
      // weight 可能是数字，转换为字符串
      labels.push(`weight-${String(testCase.weight)}`.replace(/\s+/g, '-'));
    }

    // 添加用户定义的标签
    if (testCase.tags && testCase.tags.length > 0) {
      testCase.tags.forEach((tag: any) => {
        if (tag && tag.name && typeof tag.name === 'string') {
          const tagName = tag.name.replace(/\s+/g, '-');
          if (!labels.includes(tagName)) {
            labels.push(tagName);
          }
        }
      });
    }

    const issueData = {
      summary: testCase.name,
      description: description,
      issueType: options.issueType,
      priority: options.priority || testCase.priority,
      labels: labels,
    };

    logger.info(`Creating Jira issue for test case ${testCaseId}`, {
      summary: issueData.summary,
      issueType: issueData.issueType,
      priority: issueData.priority,
      labels: issueData.labels,
      descriptionLength: description.length,
      descriptionPreview: description.substring(0, 200),
    });

    // 创建 Jira Issue
    const issue = await jiraClient.createIssue(issueData);

    logger.info(`Test case ${testCaseId} synced to Jira: ${issue.key}`);

    return {
      success: true,
      issueKey: issue.key,
      issueUrl: `${jiraClient['config'].baseUrl}/browse/${issue.key}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      testCaseId,
      message: errorMessage,
      status: (error as any).status,
      url: (error as any).url,
      details: (error as any).details,
    };
    logger.error(`Failed to sync test case ${testCaseId} to Jira:`, errorDetails);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 批量同步文件夹下的测试用例到 Jira
 */
async function syncFolderTestCases(
  folderId: string,
  projectId: string,
  jiraClient: JiraClient,
  options: {
    issueType: string;
    priority?: string;
    labels?: string[];
  }
): Promise<{
  results: Array<{
    testCaseId: string;
    testCaseName: string;
    success: boolean;
    issueKey?: string;
    issueUrl?: string;
    error?: string;
  }>;
  successCount: number;
  failedCount: number;
  totalCount: number;
}> {
  // 获取文件夹下的所有测试用例
  // getTestCases 返回一个对象，包含 testCases 数组
  const result = await getTestCases({
    projectId,
    folderId,
    limit: 1000, // 获取所有测试用例
    offset: 0,
  });

  const testCases = result.testCases;

  logger.info(`Found ${testCases.length} test cases in folder ${folderId}`);

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  // 逐个同步测试用例
  for (const testCase of testCases) {
    const syncResult = await syncSingleTestCase(testCase.id, jiraClient, options);

    results.push({
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      ...syncResult,
    });

    if (syncResult.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return {
    results,
    successCount,
    failedCount,
    totalCount: testCases.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncToJiraRequest = await request.json();
    const { testCaseId, folderId, projectId, jiraConfig, issueType = 'Test', priority, labels } = body;

    // 验证参数
    if (!jiraConfig || !jiraConfig.baseUrl || !jiraConfig.apiToken || !jiraConfig.projectKey) {
      return NextResponse.json(
        { error: 'Jira configuration is required (baseUrl, apiToken, projectKey)' },
        { status: 400 }
      );
    }

    // 优先使用前端传递的 email，如果没有则使用当前登录用户的 email
    let jiraEmail = jiraConfig.email?.trim();
    if (!jiraEmail) {
      jiraEmail = session.user.email;
    }

    if (!jiraEmail) {
      return NextResponse.json(
        { error: 'User email is required for Jira authentication' },
        { status: 400 }
      );
    }

    // 更新 jiraConfig 使用实际的 email
    jiraConfig.email = jiraEmail;
    
    const isFolderSync = !!folderId && !!projectId;
    const isSingleSync = !!testCaseId;
    
    if (!isFolderSync && !isSingleSync) {
      return NextResponse.json(
        { error: 'Either testCaseId or (folderId + projectId) is required' },
        { status: 400 }
      );
    }
    
    logger.info('Jira sync request', {
      userId: session.user.id,
      userEmail: session.user.email,
      testCaseId,
      folderId,
      projectId,
      jiraBaseUrl: jiraConfig.baseUrl,
      jiraProjectKey: jiraConfig.projectKey,
      jiraEmail: jiraEmail,
    });
    
    // 创建 Jira 客户端
    const jiraClient = new JiraClient(jiraConfig);

    // 验证 Jira 连接（使用 /myself API，不需要 projectKey）
    try {
      const user = await jiraClient.verifyConnection();
      logger.info('Jira connection verified', {
        userId: session.user.id,
        jiraUser: user.emailAddress,
        jiraDisplayName: user.displayName,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        status: (error as any).status,
        url: (error as any).url,
        stack: error instanceof Error ? error.stack : undefined,
      };
      logger.error('Failed to connect to Jira:', errorDetails);
      return NextResponse.json(
        { error: `Failed to connect to Jira: ${errorMessage}` },
        { status: 400 }
      );
    }

    // 验证项目是否存在
    try {
      const project = await jiraClient.getProject();
      logger.info('Jira project verified', {
        userId: session.user.id,
        projectKey: project.key,
        projectName: project.name,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        status: (error as any).status,
        url: (error as any).url,
        projectKey: jiraConfig.projectKey,
      };
      logger.error('Failed to access Jira project:', errorDetails);
      return NextResponse.json(
        { error: `Failed to access Jira project "${jiraConfig.projectKey}": ${errorMessage}` },
        { status: 400 }
      );
    }
    
    // 单个测试用例同步
    if (isSingleSync) {
      const result = await syncSingleTestCase(testCaseId!, jiraClient, {
        issueType,
        priority,
        labels,
      });
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Test case synced to Jira successfully',
          issueKey: result.issueKey,
          issueUrl: result.issueUrl,
        });
      } else {
        return NextResponse.json(
          { error: result.error || 'Failed to sync test case to Jira' },
          { status: 500 }
        );
      }
    }
    
    // 文件夹批量同步
    if (isFolderSync) {
      const result = await syncFolderTestCases(folderId!, projectId!, jiraClient, {
        issueType,
        priority,
        labels,
      });
      
      return NextResponse.json({
        success: true,
        message: `Synced ${result.successCount} of ${result.totalCount} test cases to Jira`,
        results: result.results,
        successCount: result.successCount,
        failedCount: result.failedCount,
        totalCount: result.totalCount,
      });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    logger.error('Jira sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync to Jira' },
      { status: 500 }
    );
  }
}

