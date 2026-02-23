import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { createGitLabClient, GitLabClient, GitLabApiError } from '@/lib/services/gitlab-client';
import { getCompleteTestCase, getTestCases, getKnownIssues, updateKnownIssue } from '@/lib/db/queries';
import { logger } from '@/lib/logger';
import { readTemplateFiles, generateTemplateVariables, processTemplateContent, hasTemplateFiles } from '@/lib/services/template-reader';

export const maxDuration = 60; // 增加超时时间以支持批量同步

interface SyncToGitLabRequest {
  // 单个测试用例同步
  testCaseId?: string;
  // 文件夹批量同步
  folderId?: string;
  projectId?: string;
  // 共同参数
  repositoryUrl: string;
  sourceBranch?: string;
  customBranchName?: string;
  // GitLab配置参数（可选，如果不提供则使用环境变量）
  gitlabConfig?: {
    baseUrl?: string;
    accessToken: string;
  };
}

interface SyncToGitLabResponse {
  success: boolean;
  branchName?: string;
  branchUrl?: string;
  message: string;
  projectId?: string;
  // 批量同步结果
  results?: Array<{
    testCaseId: string;
    testCaseName: string;
    success: boolean;
    branchName?: string;
    branchUrl?: string;
    message: string;
  }>;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
}

/**
 * POST /api/gitlab/sync
 * 同步测试用例到GitLab，创建新分支
 * 支持两种模式：
 * 1. 单个测试用例同步：传入 testCaseId
 * 2. 文件夹批量同步：传入 folderId 和 projectId
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body: SyncToGitLabRequest = await request.json();
    const { testCaseId, folderId, projectId, repositoryUrl, sourceBranch = 'main', customBranchName, gitlabConfig } = body;

    // 验证必需参数
    if (!repositoryUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: repositoryUrl'
        },
        { status: 400 }
      );
    }

    // 验证同步模式参数
    if (!testCaseId && (!folderId || !projectId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Must provide either testCaseId or both folderId and projectId'
        },
        { status: 400 }
      );
    }

    // 判断同步模式
    const isFolderSync = !!folderId && !!projectId;

    if (isFolderSync) {
      // 文件夹批量同步模式
      return await handleFolderSync(session, body);
    } else {
      // 单个测试用例同步模式
      return await handleSingleTestCaseSync(session, body);
    }

  } catch (error) {
    logger.error('GitLab sync error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error occurred during GitLab sync'
      },
      { status: 500 }
    );
  }
}

/**
 * 处理单个测试用例同步
 */
async function handleSingleTestCaseSync(session: any, body: SyncToGitLabRequest): Promise<NextResponse> {
  const { testCaseId, repositoryUrl, sourceBranch = 'main', customBranchName, gitlabConfig } = body;

  if (!testCaseId) {
    return NextResponse.json(
      { success: false, message: 'testCaseId is required for single test case sync' },
      { status: 400 }
    );
  }

  logger.info('GitLab single test case sync request', {
    testCaseId,
    repositoryUrl,
    sourceBranch,
    customBranchName,
    userId: session.user.id
  });

  // 获取测试用例信息
  const testCase = await getCompleteTestCase(testCaseId);
  if (!testCase) {
    return NextResponse.json(
      { success: false, message: 'Test case not found' },
      { status: 404 }
    );
  }

    // 创建GitLab客户端
    let gitlabClient: GitLabClient;
    try {
      if (gitlabConfig?.accessToken) {
        // 使用请求参数中的GitLab配置
        gitlabClient = new GitLabClient({
          baseUrl: gitlabConfig.baseUrl || 'https://gitlab.com',
          accessToken: gitlabConfig.accessToken
        });
      } else {
        // 使用环境变量配置
        gitlabClient = createGitLabClient();
      }
    } catch (error) {
      logger.error('Failed to create GitLab client', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        {
          success: false,
          message: gitlabConfig?.accessToken ?
            'Invalid GitLab configuration provided in request.' :
            'GitLab configuration error. Please provide GitLab access token in request or check server configuration.'
        },
        { status: 500 }
      );
    }

    // 解析项目ID
    const projectId = GitLabClient.parseProjectIdFromUrl(repositoryUrl);
    if (!projectId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid repository URL format' 
        },
        { status: 400 }
      );
    }

    // 验证项目是否存在
    let project;
    try {
      project = await gitlabClient.getProject(projectId);
    } catch (error) {
      logger.error('Failed to get GitLab project', {
        projectId,
        error: error.message,
        status: error instanceof GitLabApiError ? error.status : undefined
      });

      if (error instanceof GitLabApiError) {
        const status = error.status;
        let message = 'Failed to access GitLab project.';

        if (status === 401) {
          message = 'GitLab authentication failed. Please check the access token.';
        } else if (status === 403) {
          message = 'Access denied to GitLab project. Please check permissions.';
        } else if (status === 404) {
          message = 'GitLab project not found. Please check the repository URL.';
        } else {
          message = `GitLab API error: ${error.message}`;
        }

        return NextResponse.json(
          { success: false, message },
          { status: status >= 500 ? 500 : 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Network error while accessing GitLab project.'
        },
        { status: 500 }
      );
    }

    // 生成分支名称
    const branchName = customBranchName || GitLabClient.generateBranchName(
      testCaseId, 
      testCase.name
    );

    // 检查分支是否已存在
    const branchExists = await gitlabClient.branchExists(projectId, branchName);
    if (branchExists) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Branch '${branchName}' already exists in the repository` 
        },
        { status: 409 }
      );
    }

    // 验证源分支是否存在
    const sourceBranchExists = await gitlabClient.branchExists(projectId, sourceBranch);
    if (!sourceBranchExists) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Source branch '${sourceBranch}' does not exist in the repository` 
        },
        { status: 400 }
      );
    }

    // 创建新分支
    let newBranch;
    try {
      newBranch = await gitlabClient.createBranch(projectId, branchName, sourceBranch);
    } catch (error) {
      logger.error('Failed to create GitLab branch', {
        projectId,
        branchName,
        sourceBranch,
        error: error.message,
        status: error instanceof GitLabApiError ? error.status : undefined
      });

      if (error instanceof GitLabApiError) {
        const status = error.status;
        let message = `Failed to create branch: ${error.message}`;

        if (status === 400) {
          message = 'Invalid branch name or source branch. Please check the parameters.';
        } else if (status === 403) {
          message = 'Permission denied to create branch. Please check your GitLab permissions.';
        } else if (status === 409) {
          message = `Branch '${branchName}' already exists in the repository.`;
        }

        return NextResponse.json(
          { success: false, message },
          { status: status >= 500 ? 500 : 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Network error while creating branch.'
        },
        { status: 500 }
      );
    }

    logger.info('GitLab branch created successfully', {
      projectId,
      branchName,
      sourceBranch,
      testCaseId,
      userId: (session as any).user.id
    });

    // 如果是midscene框架，上传模板文件
    let uploadedFiles: string[] = [];

    logger.info('Checking for automation configs', {
      hasAutomationConfigs: !!(testCase.automationConfigs && testCase.automationConfigs.length > 0),
      configCount: testCase.automationConfigs?.length || 0,
      frameworks: testCase.automationConfigs?.map((config: any) => config.framework) || []
    });

    if (testCase.automationConfigs && testCase.automationConfigs.length > 0) {
      const midsceneConfig = testCase.automationConfigs.find((config: any) => config.framework === 'midscene');

      logger.info('Midscene config check', {
        hasMidsceneConfig: !!midsceneConfig,
        hasTemplateFiles: hasTemplateFiles('midscene')
      });

      if (midsceneConfig && hasTemplateFiles('midscene')) {
        try {
          logger.info('Uploading midscene template files', { projectId, branchName });

          // 读取模板文件
          const templateFiles = await readTemplateFiles('midscene');

          // 生成模板变量
          const templateVariables = generateTemplateVariables({
            id: testCase.id,
            name: testCase.name,
            description: testCase.description
          });

          // 处理模板文件内容并上传
          const filesToUpload = templateFiles.map(file => ({
            path: file.path,
            content: processTemplateContent(file.content, templateVariables)
          }));

          // 如果midscene配置中有parameters.yaml内容，也要上传
          if (midsceneConfig.parameters && midsceneConfig.parameters.yaml) {
            // 使用与模板变量一致的文件名
            const testCaseFileName = templateVariables.testCaseFileName;

            filesToUpload.push({
              path: `midscene-scripts/${testCaseFileName}.yaml`,
              content: processTemplateContent(midsceneConfig.parameters.yaml, templateVariables)
            });

            logger.info('Adding test case YAML file', {
              originalName: testCase.name,
              fileName: `${testCaseFileName}.yaml`,
              hasYamlContent: !!midsceneConfig.parameters.yaml
            });
          }

          const uploadResults = await gitlabClient.uploadFiles(
            projectId,
            branchName,
            filesToUpload,
            `Add midscene files for test case: ${testCase.name}`
          );

          uploadedFiles = uploadResults.map(result => result.file_path);

          logger.info('Template files uploaded successfully', {
            projectId,
            branchName,
            uploadedFiles
          });

        } catch (uploadError) {
          logger.error('Failed to upload template files', {
            projectId,
            branchName,
            error: uploadError instanceof Error ? uploadError.message : String(uploadError)
          });

          // 不中断整个流程，只记录错误
          // 分支已经创建成功，模板文件上传失败不应该影响整体结果
        }
      }
    }

    // 同步测试用例关联的 issues 到 GitLab
    let createdIssuesCount = 0;
    try {
      const issues = await getKnownIssues(testCaseId);
      logger.info(`Total issues found for test case ${testCaseId}: ${issues.length}`);
      logger.info(`Issues data:`, JSON.stringify(issues, null, 2));
      
      const issuesWithoutUri = issues.filter((issue: any) => !issue.uri);

      logger.info(`Found ${issuesWithoutUri.length} issues without URI for test case ${testCaseId}`);

      for (const issue of issuesWithoutUri) {
        try {
          const gitlabIssue = await gitlabClient.createIssue(projectId, {
            title: issue.title,
            description: issue.description,
            labels: issue.tags || []
          });

          // 更新数据库中的 issue，设置 bugUrl 为 GitLab issue 的 web_url
          await updateKnownIssue(issue.id, {
            bugUrl: gitlabIssue.web_url
          });

          createdIssuesCount++;
          logger.info(`Created GitLab issue #${gitlabIssue.iid} for known issue ${issue.id}`);
        } catch (issueError) {
          logger.error(`Failed to create GitLab issue for known issue ${issue.id}`, {
            error: issueError instanceof Error ? issueError.message : String(issueError)
          });
          // 不中断整个流程，继续创建其他 issues
        }
      }
    } catch (error) {
      logger.error(`Failed to sync issues for test case ${testCaseId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      // 不中断整个流程，issues 同步失败不影响分支创建
    }

    const response: SyncToGitLabResponse = {
      success: true,
      branchName: newBranch.name,
      branchUrl: newBranch.web_url,
      message: uploadedFiles.length > 0
        ? `Successfully created branch '${newBranch.name}', uploaded ${uploadedFiles.length} template files${createdIssuesCount > 0 ? `, and created ${createdIssuesCount} issues` : ''} for test case '${testCase.name}'`
        : `Successfully created branch '${newBranch.name}'${createdIssuesCount > 0 ? ` and created ${createdIssuesCount} issues` : ''} for test case '${testCase.name}'`,
      projectId: projectId.toString()
    };

    return NextResponse.json(response);
}

/**
 * 处理文件夹批量同步
 */
async function handleFolderSync(session: any, body: SyncToGitLabRequest): Promise<NextResponse> {
  const { folderId, projectId, repositoryUrl, sourceBranch = 'main', gitlabConfig } = body;

  if (!folderId || !projectId) {
    return NextResponse.json(
      { success: false, message: 'folderId and projectId are required for folder sync' },
      { status: 400 }
    );
  }

  logger.info('GitLab folder sync request', {
    folderId,
    projectId,
    repositoryUrl,
    sourceBranch,
    userId: session.user.id
  });

  // 获取文件夹下的所有测试用例
  const testCasesResult = await getTestCases({
    projectId,
    folderId,
    limit: 1000, // 设置一个较大的限制
    offset: 0
  });

  const testCases = testCasesResult.testCases;

  if (!testCases || testCases.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: 'No test cases found in the specified folder'
      },
      { status: 404 }
    );
  }

  logger.info(`Found ${testCases.length} test cases in folder ${folderId}`);

  // 创建GitLab客户端
  let gitlabClient: GitLabClient;
  try {
    if (gitlabConfig?.accessToken) {
      gitlabClient = new GitLabClient({
        baseUrl: gitlabConfig.baseUrl || 'https://gitlab.com',
        accessToken: gitlabConfig.accessToken
      });
    } else {
      gitlabClient = createGitLabClient();
    }
  } catch (error) {
    logger.error('Failed to create GitLab client', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        message: gitlabConfig?.accessToken ?
          'Invalid GitLab configuration provided in request.' :
          'GitLab configuration error. Please provide GitLab access token in request or check server configuration.'
      },
      { status: 500 }
    );
  }

  // 解析项目ID
  const gitlabProjectId = GitLabClient.parseProjectIdFromUrl(repositoryUrl);
  if (!gitlabProjectId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid repository URL format'
      },
      { status: 400 }
    );
  }

  // 验证GitLab项目是否存在
  try {
    await gitlabClient.getProject(gitlabProjectId);
  } catch (error) {
    logger.error('Failed to get GitLab project', {
      projectId: gitlabProjectId,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { success: false, message: 'Failed to access GitLab project' },
      { status: 400 }
    );
  }

  // 验证源分支是否存在
  const sourceBranchExists = await gitlabClient.branchExists(gitlabProjectId, sourceBranch);
  if (!sourceBranchExists) {
    return NextResponse.json(
      {
        success: false,
        message: `Source branch '${sourceBranch}' does not exist in the repository`
      },
      { status: 400 }
    );
  }

  // 批量同步测试用例
  const results: Array<{
    testCaseId: string;
    testCaseName: string;
    success: boolean;
    branchName?: string;
    branchUrl?: string;
    message: string;
  }> = [];

  let successCount = 0;
  let failureCount = 0;

  for (const testCase of testCases) {
    try {
      // 获取完整的测试用例信息（包含自动化配置）
      const completeTestCase = await getCompleteTestCase(testCase.id);

      if (!completeTestCase) {
        results.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          success: false,
          message: 'Test case not found'
        });
        failureCount++;
        continue;
      }

      // 检查是否有自动化配置
      if (!completeTestCase.automationConfigs || completeTestCase.automationConfigs.length === 0) {
        results.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          success: false,
          message: 'No automation configuration found'
        });
        failureCount++;
        continue;
      }

      // 生成分支名称
      const branchName = GitLabClient.generateBranchName(testCase.id, testCase.name);

      // 检查分支是否已存在
      const branchExists = await gitlabClient.branchExists(gitlabProjectId, branchName);
      if (branchExists) {
        results.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          success: false,
          message: `Branch '${branchName}' already exists`
        });
        failureCount++;
        continue;
      }

      // 创建新分支
      const newBranch = await gitlabClient.createBranch(gitlabProjectId, branchName, sourceBranch);

      // 上传模板文件（如果是midscene框架）
      let uploadedFiles: string[] = [];
      const midsceneConfig = completeTestCase.automationConfigs.find((config: any) => config.framework === 'midscene');

      if (midsceneConfig && hasTemplateFiles('midscene')) {
        try {
          const templateFiles = await readTemplateFiles('midscene');
          const templateVariables = generateTemplateVariables({
            id: completeTestCase.id,
            name: completeTestCase.name,
            description: completeTestCase.description
          });

          const filesToUpload = templateFiles.map(file => ({
            path: file.path,
            content: processTemplateContent(file.content, templateVariables)
          }));

          // 添加YAML配置文件
          if (midsceneConfig.parameters && midsceneConfig.parameters.yaml) {
            const testCaseFileName = templateVariables.testCaseFileName;
            filesToUpload.push({
              path: `midscene-scripts/${testCaseFileName}.yaml`,
              content: processTemplateContent(midsceneConfig.parameters.yaml, templateVariables)
            });
          }

          const uploadResults = await gitlabClient.uploadFiles(
            gitlabProjectId,
            branchName,
            filesToUpload,
            `Add midscene files for test case: ${completeTestCase.name}`
          );

          uploadedFiles = uploadResults.map(result => result.file_path);
        } catch (uploadError) {
          logger.error('Failed to upload template files', {
            testCaseId: testCase.id,
            error: uploadError instanceof Error ? uploadError.message : String(uploadError)
          });
        }
      }

      // 同步测试用例关联的 issues 到 GitLab
      let createdIssuesCount = 0;
      try {
        const issues = await getKnownIssues(testCase.id);
        logger.info(`Total issues found for test case ${testCase.id}: ${issues.length}`);
        
        const issuesWithoutUri = issues.filter((issue: any) => !issue.uri);
        logger.info(`Found ${issuesWithoutUri.length} issues without URI for test case ${testCase.id}`);

        for (const issue of issuesWithoutUri) {
          try {
            const gitlabIssue = await gitlabClient.createIssue(gitlabProjectId, {
              title: issue.title,
              description: issue.description,
              labels: issue.tags || []
            });

            // 更新数据库中的 issue，设置 bugUrl 为 GitLab issue 的 web_url
            await updateKnownIssue(issue.id, {
              bugUrl: gitlabIssue.web_url
            });

            createdIssuesCount++;
            logger.info(`Created GitLab issue #${gitlabIssue.iid} for known issue ${issue.id}`);
          } catch (issueError) {
            logger.error(`Failed to create GitLab issue for known issue ${issue.id}`, {
              error: issueError instanceof Error ? issueError.message : String(issueError)
            });
            // 不中断整个流程，继续创建其他 issues
          }
        }
      } catch (error) {
        logger.error(`Failed to sync issues for test case ${testCase.id}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        // 不中断整个流程，issues 同步失败不影响分支创建
      }

      results.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        success: true,
        branchName: newBranch.name,
        branchUrl: newBranch.web_url,
        message: uploadedFiles.length > 0
          ? `Created branch, uploaded ${uploadedFiles.length} files${createdIssuesCount > 0 ? `, and created ${createdIssuesCount} issues` : ''}`
          : `Created branch successfully${createdIssuesCount > 0 ? ` and created ${createdIssuesCount} issues` : ''}`
      });
      successCount++;

      logger.info(`Successfully synced test case ${testCase.id} to branch ${branchName}${createdIssuesCount > 0 ? ` with ${createdIssuesCount} issues` : ''}`);

    } catch (error) {
      logger.error(`Failed to sync test case ${testCase.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      results.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      failureCount++;
    }
  }

  const response: SyncToGitLabResponse = {
    success: successCount > 0,
    message: `Folder sync completed: ${successCount} succeeded, ${failureCount} failed out of ${testCases.length} test cases`,
    projectId: gitlabProjectId.toString(),
    results,
    totalCount: testCases.length,
    successCount,
    failureCount
  };

  return NextResponse.json(response);
}

/**
 * GET /api/gitlab/sync
 * 获取GitLab同步状态或配置信息
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'config') {
      // 返回GitLab配置状态
      const hasToken = !!process.env.GITLAB_ACCESS_TOKEN;
      const baseUrl = process.env.GITLAB_BASE_URL || 'https://gitlab.com';
      
      return NextResponse.json({
        configured: hasToken,
        baseUrl: hasToken ? baseUrl : null,
        message: hasToken 
          ? 'GitLab integration is configured' 
          : 'GitLab access token is not configured'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('GitLab sync GET error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
