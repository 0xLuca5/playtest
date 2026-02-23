/**
 * GitLab API客户端
 * 提供GitLab API的基础调用功能
 */

export interface GitLabConfig {
  baseUrl: string;
  accessToken: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  web_url: string;
  default_branch: string;
}

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    message: string;
    author_name: string;
    author_email: string;
    authored_date: string;
  };
  protected: boolean;
}

export interface CreateBranchRequest {
  branch: string;
  ref: string; // 源分支或commit SHA
}

export interface CreateBranchResponse {
  name: string;
  commit: {
    id: string;
    message: string;
  };
  protected: boolean;
  web_url?: string;
}

export interface CreateFileRequest {
  branch: string;
  content: string;
  commit_message: string;
  encoding?: 'text' | 'base64';
}

export interface UpdateFileRequest {
  branch: string;
  content: string;
  commit_message: string;
  encoding?: 'text' | 'base64';
  last_commit_id?: string;
}

export interface CreateFileResponse {
  file_path: string;
  branch: string;
  commit_id: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  web_url: string;
  created_at: string;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  labels?: string[];
  assignee_ids?: number[];
  milestone_id?: number;
}

/**
 * 重试工具函数
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 如果是超时错误或网络错误，进行重试
      if (error instanceof Error &&
          (error.message.includes('timeout') ||
           error.message.includes('network') ||
           error.message.includes('fetch'))) {
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // 指数退避
      } else {
        // 其他类型的错误直接抛出
        throw error;
      }
    }
  }

  throw lastError!;
}

export interface GitLabError {
  message: string;
  error?: string;
  error_description?: string;
  status?: number;
}

export class GitLabApiError extends Error {
  public status: number;
  public gitlabError?: GitLabError;

  constructor(message: string, status: number, gitlabError?: GitLabError) {
    super(message);
    this.name = 'GitLabApiError';
    this.status = status;
    this.gitlabError = gitlabError;
  }

  static async fromResponse(response: Response): Promise<GitLabApiError> {
    let gitlabError: GitLabError | undefined;
    let responseText = '';

    try {
      responseText = await response.text();

      // 尝试解析为JSON
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        gitlabError = JSON.parse(responseText);
      } else {
        // 如果不是JSON，检查是否是HTML错误页面
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          gitlabError = {
            message: `GitLab server returned HTML page instead of JSON. This usually indicates authentication failure or incorrect server URL. Status: ${response.status}`,
            error: 'html_response'
          };
        } else {
          gitlabError = { message: responseText || `HTTP ${response.status}: ${response.statusText}` };
        }
      }
    } catch (parseError) {
      gitlabError = {
        message: `Failed to parse GitLab response. Status: ${response.status}, Response: ${responseText.substring(0, 200)}...`,
        error: 'parse_error'
      };
    }

    const message = gitlabError?.message ||
                   gitlabError?.error_description ||
                   gitlabError?.error ||
                   `HTTP ${response.status}: ${response.statusText}`;

    return new GitLabApiError(message, response.status, gitlabError);
  }
}

export class GitLabClient {
  private config: GitLabConfig;

  constructor(config: GitLabConfig) {
    this.config = config;
  }

  /**
   * 获取用户有权限的项目列表
   */
  async listProjects(options?: {
    search?: string;
    perPage?: number;
    page?: number;
    membership?: boolean;
  }): Promise<GitLabProject[]> {
    const params = new URLSearchParams();

    if (options?.search) {
      params.append('search', options.search);
    }
    if (options?.perPage) {
      params.append('per_page', options.perPage.toString());
    }
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    if (options?.membership !== false) {
      params.append('membership', 'true'); // 只返回用户是成员的项目
    }
    params.append('simple', 'true'); // 返回简化的项目信息
    params.append('order_by', 'last_activity_at'); // 按最后活动时间排序
    params.append('sort', 'desc');

    const url = `${this.config.baseUrl}/api/v4/projects?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await GitLabApiError.fromResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GitLabApiError) {
        throw error;
      }

      let errorMessage = `Failed to fetch projects from GitLab`;
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to GitLab server at ${this.config.baseUrl}. Please check the server URL and network connection.`;
        } else if (error.message.includes('JSON')) {
          errorMessage = `Invalid response from GitLab server. The server may be returning an error page instead of API response.`;
        } else {
          errorMessage = `GitLab API error: ${error.message}`;
        }
      }

      throw new GitLabApiError(errorMessage, 0);
    }
  }

  /**
   * 获取项目信息
   */
  async getProject(projectId: string | number): Promise<GitLabProject> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw await GitLabApiError.fromResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GitLabApiError) {
        throw error;
      }

      // 网络错误或其他错误
      let errorMessage = `Failed to fetch project from GitLab`;
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to GitLab server at ${this.config.baseUrl}. Please check the server URL and network connection.`;
        } else if (error.message.includes('JSON')) {
          errorMessage = `Invalid response from GitLab server. The server may be returning an error page instead of API response.`;
        } else {
          errorMessage = `GitLab API error: ${error.message}`;
        }
      }

      throw new GitLabApiError(errorMessage, 0);
    }
  }

  /**
   * 获取项目的所有分支
   */
  async getBranches(projectId: string | number): Promise<GitLabBranch[]> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get branches: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * 检查分支是否存在
   */
  async branchExists(projectId: string | number, branchName: string): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branchName)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建新分支
   */
  async createBranch(
    projectId: string | number,
    branchName: string,
    sourceBranch: string = 'main'
  ): Promise<CreateBranchResponse> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`;

    const requestBody: CreateBranchRequest = {
      branch: branchName,
      ref: sourceBranch,
    };

    return await retryOperation(async () => {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await GitLabApiError.fromResponse(response);
        }

        const result = await response.json();

        // 添加web_url（如果GitLab没有返回的话）
        if (!result.web_url && this.config.baseUrl) {
          try {
            const project = await this.getProject(projectId);
            result.web_url = `${project.web_url}/-/tree/${encodeURIComponent(branchName)}`;
          } catch (error) {
            // 如果获取项目信息失败，构造一个基本的URL
            result.web_url = `${this.config.baseUrl}/${projectId}/-/tree/${encodeURIComponent(branchName)}`;
          }
        }

        return result;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof GitLabApiError) {
          throw error;
        }

        // 处理超时错误
        if (error.name === 'AbortError') {
          throw new Error(`GitLab API timeout: Failed to create branch '${branchName}' within 60 seconds`);
        }

        throw new Error(`Network error while creating branch: ${error.message}`);
      }
    }, 3, 2000); // 最多重试3次，初始延迟2秒
  }

  /**
   * 从仓库URL解析项目ID
   * 支持多种GitLab URL格式
   */
  static parseProjectIdFromUrl(repositoryUrl: string): string | null {
    try {
      const url = new URL(repositoryUrl);
      const pathname = url.pathname;
      
      // 移除开头和结尾的斜杠
      const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
      
      // 移除.git后缀
      const pathWithoutGit = cleanPath.replace(/\.git$/, '');
      
      // 返回项目路径作为项目ID（GitLab支持使用路径作为项目ID）
      return pathWithoutGit || null;
    } catch (error) {
      console.error('Failed to parse project ID from URL:', error);
      return null;
    }
  }

  /**
   * 创建文件到仓库
   */
  async createFile(
    projectId: string | number,
    filePath: string,
    request: CreateFileRequest
  ): Promise<CreateFileResponse> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`;

    return await retryOperation(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await GitLabApiError.fromResponse(response);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof GitLabApiError) {
          throw error;
        }

        // 处理超时错误
        if (error.name === 'AbortError') {
          throw new Error(`GitLab API timeout: Failed to upload file '${filePath}' within 30 seconds`);
        }

        let errorMessage = `Failed to create file ${filePath}`;
        if (error instanceof Error) {
          errorMessage = `GitLab API error: ${error.message}`;
        }

        throw new GitLabApiError(errorMessage, 0);
      }
    }, 2, 1000); // 最多重试2次，初始延迟1秒
  }

  /**
   * 更新文件到仓库
   */
  async updateFile(
    projectId: string | number,
    filePath: string,
    request: UpdateFileRequest
  ): Promise<CreateFileResponse> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`;

    return await retryOperation(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await GitLabApiError.fromResponse(response);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof GitLabApiError) {
          throw error;
        }

        // 处理超时错误
        if (error.name === 'AbortError') {
          throw new Error(`GitLab API timeout: Failed to update file '${filePath}' within 30 seconds`);
        }

        let errorMessage = `Failed to update file ${filePath}`;
        if (error instanceof Error) {
          errorMessage = `GitLab API error: ${error.message}`;
        }

        throw new GitLabApiError(errorMessage, 0);
      }
    }, 2, 1000); // 最多重试2次，初始延迟1秒
  }

  /**
   * 创建或更新文件到仓库
   */
  async createOrUpdateFile(
    projectId: string | number,
    filePath: string,
    content: string,
    branch: string,
    commitMessage: string
  ): Promise<CreateFileResponse> {
    try {
      // 先尝试创建文件
      return await this.createFile(projectId, filePath, {
        branch,
        content,
        commit_message: commitMessage,
        encoding: 'text'
      });
    } catch (error) {
      // 如果文件已存在，则更新文件
      if (error instanceof GitLabApiError &&
          (error.message.includes('already exists') || error.status === 400)) {
        console.log(`File ${filePath} already exists, updating instead...`);
        return await this.updateFile(projectId, filePath, {
          branch,
          content,
          commit_message: commitMessage,
          encoding: 'text'
        });
      }
      throw error;
    }
  }

  /**
   * 批量上传文件到仓库
   */
  async uploadFiles(
    projectId: string | number,
    branch: string,
    files: Array<{ path: string; content: string }>,
    commitMessage: string = 'Add template files'
  ): Promise<CreateFileResponse[]> {
    const results: CreateFileResponse[] = [];

    for (const file of files) {
      try {
        const result = await this.createOrUpdateFile(
          projectId,
          file.path,
          file.content,
          branch,
          `${commitMessage}: ${file.path}`
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.path}:`, error);
        // 继续上传其他文件，不中断整个过程
        throw error;
      }
    }

    return results;
  }

  /**
   * 创建 GitLab Issue
   */
  async createIssue(
    projectId: string | number,
    issueData: CreateIssueRequest
  ): Promise<GitLabIssue> {
    const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/issues`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });

      if (!response.ok) {
        throw await GitLabApiError.fromResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GitLabApiError) {
        throw error;
      }

      throw new GitLabApiError(
        `Failed to create GitLab issue: ${error instanceof Error ? error.message : String(error)}`,
        0
      );
    }
  }

  /**
   * 生成基于测试用例的分支名称
   */
  static generateBranchName(testCaseId: string, testCaseName?: string): string {
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const sanitizedName = testCaseName 
      ? testCaseName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : '';
    
    const branchName = sanitizedName 
      ? `test-case/${sanitizedName}-${testCaseId.slice(-8)}-${timestamp}`
      : `test-case/${testCaseId.slice(-8)}-${timestamp}`;
    
    return branchName;
  }
}

/**
 * 创建GitLab客户端实例
 */
export function createGitLabClient(): GitLabClient {
  const baseUrl = process.env.GITLAB_BASE_URL || 'https://gitlab.com';
  const accessToken = process.env.GITLAB_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('GITLAB_ACCESS_TOKEN environment variable is required');
  }

  return new GitLabClient({
    baseUrl,
    accessToken,
  });
}
