/**
 * Confluence API Client
 * 用于与 Atlassian Confluence REST API 交互
 */

export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space: {
    id: string;
    key: string;
    name: string;
  };
  version: {
    number: number;
    when: string;
    by: {
      displayName: string;
      email?: string;
    };
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  size: number;
  totalSize: number;
}

export class ConfluenceClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: ConfluenceConfig) {
    // 规范化 baseUrl
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    
    // 创建 Basic Auth header
    this.authHeader = `Basic ${Buffer.from(
      `${config.email}:${config.apiToken}`
    ).toString('base64')}`;
  }

  /**
   * 获取页面详情
   */
  async getPage(pageId: string, expand?: string[]): Promise<ConfluencePage> {
    const expandParam = expand?.join(',') || 'space,version,body.storage,body.view';
    
    const response = await fetch(
      `${this.baseUrl}/wiki/rest/api/content/${pageId}?expand=${expandParam}`,
      {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Confluence API error:', errorText);
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 搜索页面
   */
  async searchPages(query: string, spaceKey?: string, limit: number = 20): Promise<ConfluenceSearchResult> {
    let cql = `text ~ "${query}"`;
    if (spaceKey) {
      cql += ` AND space = ${spaceKey}`;
    }

    const response = await fetch(
      `${this.baseUrl}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&expand=space,version`,
      {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Confluence search error:', errorText);
      throw new Error(`Failed to search: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取页面的 HTML 内容
   */
  async getPageContent(pageId: string): Promise<string> {
    const page = await this.getPage(pageId, ['body.view', 'body.storage']);
    
    // 优先使用 view（渲染后的 HTML），否则使用 storage（原始格式）
    return page.body?.view?.value || page.body?.storage?.value || '';
  }

  /**
   * 解析 Confluence URL
   */
  static parseUrl(url: string): {
    baseUrl: string;
    pageId: string;
    spaceKey?: string;
    title?: string;
    isExternalLink?: boolean;
  } | null {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      // Pattern 1: /wiki/spaces/SPACE/pages/123456/Page+Title
      const match1 = url.match(/\/wiki\/spaces\/([^\/]+)\/pages\/(\d+)(?:\/([^?#]+))?/);
      if (match1) {
        return {
          baseUrl,
          spaceKey: match1[1],
          pageId: match1[2],
          title: match1[3] ? decodeURIComponent(match1[3].replace(/\+/g, ' ')) : undefined,
        };
      }

      // Pattern 2: /wiki/pages/viewpage.action?pageId=123456
      const match2 = url.match(/pageId=(\d+)/);
      if (match2) {
        return {
          baseUrl,
          pageId: match2[1],
        };
      }

      // Pattern 3: /wiki/external/ENCODED_STRING (external/share link)
      const match3 = url.match(/\/wiki\/external\/([^\/\?#]+)/);
      if (match3) {
        return {
          baseUrl,
          pageId: match3[1], // 使用 encoded string 作为 pageId
          isExternalLink: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse Confluence URL:', error);
      return null;
    }
  }

  /**
   * 验证配置是否有效
   */
  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/wiki/rest/api/user/current`,
        {
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to validate Confluence config:', error);
      return false;
    }
  }
}

/**
 * 从环境变量或配置创建 Confluence 客户端
 */
export function createConfluenceClient(config?: Partial<ConfluenceConfig>): ConfluenceClient | null {
  const baseUrl = config?.baseUrl || process.env.CONFLUENCE_BASE_URL;
  const email = config?.email || process.env.CONFLUENCE_EMAIL;
  const apiToken = config?.apiToken || process.env.CONFLUENCE_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    console.warn('Confluence configuration is incomplete');
    return null;
  }

  return new ConfluenceClient({
    baseUrl,
    email,
    apiToken,
  });
}

