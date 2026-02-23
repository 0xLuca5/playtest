import { tool } from 'ai';
import { z } from 'zod';
import { ConfluenceClient } from '@/lib/services/confluence-client';

interface ConfluenceToolConfig {
  session: any;
  dataStream?: any;
}

/**
 * 读取 Confluence 页面内容
 */
export function getConfluencePageTool(config: ConfluenceToolConfig) {
  const { session } = config;

  return tool({
    description: `Get content from a Confluence page. Use this tool to read documentation, requirements, or any content stored in Confluence.

You can provide either:
1. A full Confluence URL (e.g., https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Title)
2. Or pageId + baseUrl separately

The tool will return the page title, content (in both storage and view formats), metadata, and space information.

IMPORTANT NOTES:
- For PUBLIC pages with DIRECT URLs (e.g., /wiki/spaces/SPACE/pages/123/Title), the tool can access without credentials
- For EXTERNAL/SHARE links (e.g., /wiki/external/ABC123...), authentication is REQUIRED even if the page is public
- If you encounter an external link and don't have credentials, ask the user for the direct page URL or API credentials`,
    
    parameters: z.object({
      url: z.string().optional().describe('Full Confluence page URL. If provided, pageId and baseUrl are not needed.'),
      pageId: z.string().optional().describe('Confluence page ID. Required if url is not provided.'),
      baseUrl: z.string().optional().describe('Confluence base URL (e.g., https://your-domain.atlassian.net). Required if url is not provided.'),
      email: z.string().optional().describe('Confluence user email for authentication. Optional if configured in environment.'),
      apiToken: z.string().optional().describe('Confluence API token for authentication. Optional if configured in environment.'),
    }),
    
    execute: async ({ url, pageId, baseUrl, email, apiToken }) => {
      try {
        // 验证参数
        if (!url && (!pageId || !baseUrl)) {
          return {
            success: false,
            error: 'Either url or both pageId and baseUrl must be provided',
          };
        }

        let actualPageId = pageId;
        let actualBaseUrl = baseUrl;

        // 如果提供了 URL，解析它
        if (url) {
          const parsed = ConfluenceClient.parseUrl(url);
          if (!parsed) {
            return {
              success: false,
              error: 'Invalid Confluence URL format',
            };
          }
          actualPageId = parsed.pageId;
          actualBaseUrl = parsed.baseUrl;

          // 如果是 external link，需要特殊处理
          if (parsed.isExternalLink) {
            console.log('[Confluence Tool] Detected external link:', url);
            console.log('[Confluence Tool] External links are not fully supported due to Atlassian security restrictions.');

            return {
              success: false,
              error: 'External/Share links are not supported. Please use a direct page URL instead.',
              hint: 'To get the direct URL:\n1. Open the page in Confluence\n2. Copy the URL from the browser address bar\n3. The URL should look like: https://domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title',
              isExternalLink: true,
              alternativeSolution: 'You can also ask the page owner to share the direct URL instead of the external link.',
            } as any;
          }
        }

        // 获取认证信息
        const confluenceEmail = email || process.env.CONFLUENCE_EMAIL || (session?.user as any)?.email;
        const confluenceToken = apiToken || process.env.CONFLUENCE_API_TOKEN;

        console.log('[Confluence Tool] Auth check - Email:', confluenceEmail ? '✓' : '✗', 'Token:', confluenceToken ? '✓' : '✗');

        // 如果有认证信息，使用认证方式获取
        if (confluenceEmail && confluenceToken) {
          // 创建 Confluence 客户端
          const client = new ConfluenceClient({
            baseUrl: actualBaseUrl!,
            email: confluenceEmail,
            apiToken: confluenceToken,
          });

          // 获取页面内容
          const page = await client.getPage(actualPageId!, ['space', 'version', 'body.storage', 'body.view']);

          console.log('[Confluence Tool] Successfully fetched page:', page.id, page.title);
          console.log('[Confluence Tool] Content length - storage:', page.body?.storage?.value?.length || 0, 'view:', page.body?.view?.value?.length || 0);

          // 返回结构化的页面信息
          const result = {
            success: true,
            message: `Successfully fetched Confluence page: "${page.title}"`,
            page: {
              id: page.id,
              title: page.title,
              type: page.type,
              status: page.status,

              // 内容 - 提供两种格式
              content: {
                // Storage format - 原始 Confluence 存储格式（包含宏和特殊标记）
                storage: page.body?.storage?.value || '',
                // View format - HTML 渲染格式（更易读）
                view: page.body?.view?.value || '',
              },

              // 空间信息
              space: {
                id: page.space.id,
                key: page.space.key,
                name: page.space.name,
              },

              // 版本信息
              version: {
                number: page.version.number,
                lastModified: page.version.when,
                lastModifiedBy: page.version.by.displayName,
              },

              // 链接
              links: {
                web: `${actualBaseUrl}${page._links.webui}`,
                api: page._links.self,
              },
            },
          };

          console.log('[Confluence Tool] Returning result with success=true');
          return result as any;
        }

        // 如果没有认证信息，尝试公开访问（仅获取基本信息）
        // 对于公开页面，我们可以尝试抓取 HTML 内容
        const publicUrl = url || `${actualBaseUrl}/wiki/spaces/${actualPageId}`;

        try {
          const response = await fetch(publicUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            redirect: 'follow', // 跟随重定向
          });

          if (!response.ok) {
            return {
              success: false,
              error: 'This Confluence page requires authentication. Please provide your Confluence email and API token.',
              hint: 'Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens',
              isAuthRequired: true,
            };
          }

          const html = await response.text();

          // 尝试从 HTML 中提取标题
          let title = 'Unknown Title';
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1]
              .replace(' - Confluence', '')
              .replace(' - ', '')
              .trim();
          }

          // 尝试从 meta 标签提取标题
          const metaTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
          if (metaTitleMatch) {
            title = metaTitleMatch[1].trim();
          }

          // 尝试提取主要内容 - 多种方式
          let content = '';

          // 方式1: wiki-content div
          let contentMatch = html.match(/<div[^>]*id="main-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
          if (contentMatch) {
            content = contentMatch[1];
          }

          // 方式2: 尝试 wiki-content class
          if (!content) {
            contentMatch = html.match(/<div[^>]*class="[^"]*wiki-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (contentMatch) {
              content = contentMatch[1];
            }
          }

          // 方式3: 尝试 page-content
          if (!content) {
            contentMatch = html.match(/<div[^>]*class="[^"]*page-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (contentMatch) {
              content = contentMatch[1];
            }
          }

          // 清理 HTML 标签，提取纯文本
          const cleanContent = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          return {
            success: true,
            isPublicAccess: true,
            warning: 'Accessed as public page. Content may be limited. For full access, provide API credentials.',
            page: {
              id: actualPageId,
              title: title,
              type: 'page',
              status: 'current',

              // 内容 - 提供 HTML 和纯文本两种格式
              content: {
                storage: '',
                view: content,
                text: cleanContent, // 添加纯文本版本
              },

              // 链接
              links: {
                web: response.url, // 使用最终重定向后的 URL
                api: '',
              },
            },
          };
        } catch (publicError) {
          return {
            success: false,
            error: 'Unable to access this Confluence page. It may be private or require authentication.',
            hint: 'Please provide your Confluence email and API token to access private pages.',
            details: publicError instanceof Error ? publicError.message : undefined,
          } as any;
        }
      } catch (error) {
        console.error('[Confluence Tool] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch Confluence page',
          details: error instanceof Error ? error.stack : undefined,
        } as any;
      }
    },
  } as any);
}

/**
 * 搜索 Confluence 页面
 */
export function searchConfluencePagesTool(config: ConfluenceToolConfig) {
  const { session } = config;

  return tool({
    description: `Search for Confluence pages by text query. Use this to find relevant documentation or requirements.

Returns a list of matching pages with their titles, excerpts, and URLs.

IMPORTANT: If you have related documents in the test case context with Confluence URLs, extract the baseUrl from those URLs.
Example: From "https://domain.atlassian.net/wiki/spaces/..." extract "https://domain.atlassian.net"`,

    parameters: z.object({
      query: z.string().describe('Search query text'),
      baseUrl: z.string().optional().describe('Confluence base URL (e.g., https://your-domain.atlassian.net). If not provided, will try to extract from related documents.'),
      spaceKey: z.string().optional().describe('Optional: Limit search to a specific space'),
      limit: z.number().optional().default(10).describe('Maximum number of results to return (default: 10)'),
      email: z.string().optional().describe('Confluence user email for authentication. Optional if configured in environment.'),
      apiToken: z.string().optional().describe('Confluence API token for authentication. Optional if configured in environment.'),
    }),

    execute: async ({ query, baseUrl, spaceKey, limit = 10, email, apiToken }) => {
      try {
        // 获取认证信息
        const confluenceEmail = email || process.env.CONFLUENCE_EMAIL || (session?.user as any)?.email;
        const confluenceToken = apiToken || process.env.CONFLUENCE_API_TOKEN;

        if (!confluenceEmail || !confluenceToken) {
          return {
            success: false,
            error: 'Confluence authentication required. Please provide email and apiToken, or configure them in environment variables.',
          };
        }

        // 如果没有提供 baseUrl，返回错误
        if (!baseUrl) {
          return {
            success: false,
            error: 'baseUrl is required. Please provide the Confluence base URL (e.g., https://your-domain.atlassian.net)',
            hint: 'You can extract the baseUrl from related document URLs in the test case context.',
          } as any;
        }

        // 创建 Confluence 客户端
        const client = new ConfluenceClient({
          baseUrl,
          email: confluenceEmail,
          apiToken: confluenceToken,
        });

        // 搜索页面
        const searchResult = await client.searchPages(query, spaceKey, limit);

        // 返回搜索结果
        return {
          success: true,
          totalResults: searchResult.totalSize,
          returnedResults: searchResult.size,
          pages: searchResult.results.map(page => ({
            id: page.id,
            title: page.title,
            type: page.type,
            space: {
              key: page.space.key,
              name: page.space.name,
            },
            url: `${baseUrl}${page._links.webui}`,
            lastModified: page.version.when,
            lastModifiedBy: page.version.by.displayName,
          })),
        };
      } catch (error) {
        console.error('[Confluence Search Tool] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search Confluence pages',
        } as any;
      }
    },
  } as any);
}

