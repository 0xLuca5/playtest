/**
 * Jira API Client
 * 用于与 Jira 集成，创建和管理测试用例
 */

export interface JiraConfig {
  baseUrl: string; // Jira 实例 URL，例如：https://your-domain.atlassian.net
  email: string; // Jira 用户邮箱
  apiToken: string; // Jira API Token
  projectKey: string; // Jira 项目 Key
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
      id: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    priority?: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    [key: string]: any;
  };
}

export interface JiraCreateIssueRequest {
  summary: string;
  description: string;
  issueType: string; // 例如：'Test', 'Story', 'Bug'
  priority?: string; // 例如：'High', 'Medium', 'Low'
  labels?: string[];
  customFields?: Record<string, any>;
}

export interface JiraUpdateIssueRequest {
  summary?: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  customFields?: Record<string, any>;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
}

export class JiraClient {
  private config: JiraConfig;
  private authHeader: string;

  constructor(config: JiraConfig) {
    // 确保 baseUrl 有协议前缀
    let baseUrl = config.baseUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/$/, '');

    this.config = {
      ...config,
      baseUrl,
    };

    // Jira API 使用 Basic Auth: base64(email:apiToken)
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  /**
   * 发送 HTTP 请求到 Jira API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/rest/api/3${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Jira API error: ${response.status} ${response.statusText}`;
        let errorDetails: any = {};

        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson;

          if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
            errorMessage = errorJson.errorMessages.join(', ');
          } else if (errorJson.errors) {
            // 格式化字段错误
            const fieldErrors = Object.entries(errorJson.errors)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join('; ');
            errorMessage = fieldErrors;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (e) {
          // 如果不是 JSON，使用原始文本
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        }

        // 添加更详细的错误信息
        if (response.status === 400) {
          errorMessage = `Bad request: ${errorMessage}`;
          // 记录请求体以便调试
          if (options.body) {
            console.error('Request payload:', options.body);
          }
        } else if (response.status === 401) {
          errorMessage = `Authentication failed: ${errorMessage}. Please check your email and API token.`;
        } else if (response.status === 403) {
          errorMessage = `Access denied: ${errorMessage}. Your API token may not have sufficient permissions.`;
        } else if (response.status === 404) {
          errorMessage = `Resource not found: ${errorMessage}. Please check the URL and project key.`;
        }

        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).url = url;
        (error as any).details = errorDetails;
        throw error;
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      // 如果是网络错误或其他错误
      if (error instanceof Error && !(error as any).status) {
        const networkError = new Error(`Network error: ${error.message}. Please check your Jira URL and network connection.`);
        (networkError as any).originalError = error;
        (networkError as any).url = url;
        throw networkError;
      }
      throw error;
    }
  }

  /**
   * 验证连接（获取当前用户信息）
   */
  async verifyConnection(): Promise<any> {
    return this.request('/myself');
  }

  /**
   * 获取所有可访问的项目列表
   */
  async listProjects(): Promise<any[]> {
    const response = await this.request<{ values: any[] }>('/project/search?maxResults=100');
    return response.values || [];
  }

  /**
   * 获取项目信息
   */
  async getProject(): Promise<any> {
    return this.request(`/project/${this.config.projectKey}`);
  }

  /**
   * 获取项目的 Issue Types
   */
  async getIssueTypes(): Promise<any[]> {
    const project = await this.getProject();
    return project.issueTypes || [];
  }

  /**
   * 创建 Issue（测试用例）
   */
  async createIssue(data: JiraCreateIssueRequest): Promise<JiraIssue> {
    const payload: any = {
      fields: {
        project: {
          key: this.config.projectKey,
        },
        summary: data.summary,
        issuetype: {
          name: data.issueType,
        },
      },
    };

    // 添加描述（使用 Atlassian Document Format）
    if (data.description) {
      payload.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: data.description,
              },
            ],
          },
        ],
      };
    }

    // 添加优先级（可选，某些项目可能不支持）
    // 注释掉以避免错误，如果需要可以在项目配置中启用
    // if (data.priority) {
    //   payload.fields.priority = {
    //     name: data.priority,
    //   };
    // }

    // 添加标签（只在有标签时添加，避免空数组错误）
    if (data.labels && data.labels.length > 0) {
      payload.fields.labels = data.labels;
    }

    // 添加自定义字段
    if (data.customFields) {
      Object.assign(payload.fields, data.customFields);
    }

    return this.request<JiraIssue>('/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 更新 Issue
   */
  async updateIssue(issueKey: string, data: JiraUpdateIssueRequest): Promise<void> {
    const payload: any = {
      fields: {},
    };

    if (data.summary) {
      payload.fields.summary = data.summary;
    }

    if (data.description) {
      payload.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: data.description,
              },
            ],
          },
        ],
      };
    }

    if (data.priority) {
      payload.fields.priority = {
        name: data.priority,
      };
    }

    if (data.labels) {
      payload.fields.labels = data.labels;
    }

    if (data.customFields) {
      Object.assign(payload.fields, data.customFields);
    }

    await this.request(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 获取 Issue 详情
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/issue/${issueKey}`);
  }

  /**
   * 删除 Issue
   */
  async deleteIssue(issueKey: string): Promise<void> {
    await this.request(`/issue/${issueKey}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取 Issue 的可用转换（状态变更）
   */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const response = await this.request<{ transitions: JiraTransition[] }>(
      `/issue/${issueKey}/transitions`
    );
    return response.transitions;
  }

  /**
   * 转换 Issue 状态
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(`/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: {
          id: transitionId,
        },
      }),
    });
  }

  /**
   * 搜索 Issues（使用 JQL）
   */
  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    const response = await this.request<{ issues: JiraIssue[] }>(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
    );
    return response.issues;
  }

  /**
   * 添加评论到 Issue
   */
  async addComment(issueKey: string, comment: string): Promise<void> {
    await this.request(`/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      }),
    });
  }
}

