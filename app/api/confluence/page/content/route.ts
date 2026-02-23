import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { ConfluenceClient } from '@/lib/services/confluence-client';
import TurndownService from 'turndown';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Confluence API] Request body:', JSON.stringify(body, null, 2));

    const { pageId, url, baseUrl, email, apiToken, repositoryId } = body;

    if (!pageId && !url) {
      console.error('[Confluence API] Missing pageId and url');
      return NextResponse.json(
        { error: 'pageId or url is required' },
        { status: 400 }
      );
    }

    // 解析 URL 获取信息
    let actualPageId: string;
    let actualBaseUrl: string;
    let spaceKey: string | undefined;

    if (url) {
      console.log('[Confluence API] Parsing URL:', url);
      const parsed = ConfluenceClient.parseUrl(url);
      if (!parsed) {
        console.error('[Confluence API] Failed to parse URL:', url);
        return NextResponse.json(
          { error: 'Invalid Confluence URL', url },
          { status: 400 }
        );
      }
      console.log('[Confluence API] Parsed URL:', parsed);
      actualPageId = parsed.pageId;
      actualBaseUrl = parsed.baseUrl;
      spaceKey = parsed.spaceKey;

      // 如果是 external link，需要先解析获取实际的 pageId
      if (parsed.isExternalLink) {
        console.log('[Confluence API] Detected external link, resolving...');

        // 获取 Confluence 配置（如果有的话）
        const tempEmail = email || process.env.CONFLUENCE_EMAIL || session.user.email;
        const tempToken = apiToken || process.env.CONFLUENCE_API_TOKEN;

        // 尝试访问 URL 并跟随重定向（公开访问或认证访问）
        try {
          const headers: Record<string, string> = {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          };

          // 如果有 token，添加认证头
          if (tempToken && tempEmail) {
            headers['Authorization'] = `Basic ${Buffer.from(`${tempEmail}:${tempToken}`).toString('base64')}`;
            console.log('[Confluence API] Using authenticated access for external link');
          } else {
            console.log('[Confluence API] Using public access for external link');
          }

          const redirectResponse = await fetch(url, {
            method: 'GET',
            headers,
            redirect: 'follow', // 跟随重定向
          });

          console.log('[Confluence API] Redirect response URL:', redirectResponse.url);

          // 检查最终的 URL
          if (redirectResponse.url !== url) {
            const redirectParsed = ConfluenceClient.parseUrl(redirectResponse.url);
            if (redirectParsed && !redirectParsed.isExternalLink) {
              actualPageId = redirectParsed.pageId;
              spaceKey = redirectParsed.spaceKey;
              actualBaseUrl = redirectParsed.baseUrl;
              console.log('[Confluence API] Resolved to pageId:', actualPageId);
            }
          } else {
            // 如果没有重定向，尝试从 HTML 中提取 pageId
            const html = await redirectResponse.text();
            const pageIdMatch = html.match(/pageId["\s:=]+(\d+)/i);
            if (pageIdMatch) {
              actualPageId = pageIdMatch[1];
              console.log('[Confluence API] Extracted pageId from HTML:', actualPageId);
            }
          }
        } catch (error) {
          console.error('[Confluence API] Failed to resolve external link:', error);
          // 不要立即返回错误，继续尝试使用原始 URL
          console.log('[Confluence API] Will try to use original URL as fallback');
        }
      }
    } else {
      actualPageId = pageId;
      actualBaseUrl = baseUrl;
    }

    if (!actualBaseUrl) {
      console.error('[Confluence API] Missing baseUrl');
      return NextResponse.json(
        { error: 'baseUrl is required when using pageId' },
        { status: 400 }
      );
    }

    // 获取 Confluence 配置
    // 优先级：请求参数 > 环境变量 > session email
    let confluenceEmail = email || process.env.CONFLUENCE_EMAIL || session.user.email;
    let confluenceToken = apiToken || process.env.CONFLUENCE_API_TOKEN;

    // 对于 public link，尝试直接获取 HTML 内容（不需要认证）
    let page: any;
    let htmlContent: string;

    if (!confluenceToken) {
      console.log('[Confluence API] No API token, trying public access...');

      // 尝试作为公开页面访问
      try {
        const publicUrl = url || `${actualBaseUrl}/wiki/spaces/${spaceKey}/pages/${actualPageId}`;
        console.log('[Confluence API] Fetching public page:', publicUrl);

        const response = await fetch(publicUrl, {
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch public page: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log('[Confluence API] Public page fetched, parsing HTML...');

        // 从 HTML 中提取页面信息
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/ - Confluence$/, '').trim() : 'Untitled';

        // 提取主要内容
        const contentMatch = html.match(/<div[^>]*id="main-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i) ||
                           html.match(/<div[^>]*class="[^"]*wiki-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

        htmlContent = contentMatch ? contentMatch[1] : html;

        // 构建页面对象
        page = {
          id: actualPageId,
          title: title,
          space: {
            key: spaceKey || 'UNKNOWN',
            name: spaceKey || 'Unknown Space',
          },
          version: {
            number: 1,
            when: new Date().toISOString(),
            by: {
              displayName: 'Unknown',
              email: '',
            },
          },
          _links: {
            webui: url || publicUrl,
          },
        };

        console.log('[Confluence API] Public page parsed:', page.title);
      } catch (error) {
        console.error('[Confluence API] Failed to fetch public page:', error);
        return NextResponse.json(
          {
            error: 'Failed to fetch Confluence page',
            details: 'This page may not be publicly accessible. Please configure Confluence API credentials in Repository Settings.',
            isPublicAccessError: true,
          },
          { status: 403 }
        );
      }
    } else {
      // 使用 API token 访问
      console.log('[Confluence API] Using API token for authenticated access');

      if (!confluenceEmail) {
        console.error('[Confluence API] No email found');
        return NextResponse.json(
          {
            error: 'Confluence email not configured',
            details: 'Please provide your Confluence email address'
          },
          { status: 400 }
        );
      }

      // 创建 Confluence 客户端
      const client = new ConfluenceClient({
        baseUrl: actualBaseUrl,
        email: confluenceEmail!,
        apiToken: confluenceToken,
      });

      // 获取页面信息
      console.log('[Confluence API] Fetching page:', actualPageId);
      page = await client.getPage(actualPageId);
      console.log('[Confluence API] Page fetched successfully:', page.id, page.title);

      htmlContent = page.body?.view?.value || page.body?.storage?.value || '';
    }

    // 转换 HTML 为 Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // 添加自定义规则处理 Confluence 特殊元素
    turndownService.addRule('confluenceMacro', {
      filter: (node) => {
        return node.nodeName === 'AC:STRUCTURED-MACRO' || 
               (node as Element).getAttribute?.('data-macro-name') !== null;
      },
      replacement: (content, node: any) => {
        const macroName = node.getAttribute('ac:name') || 
                         node.getAttribute('data-macro-name') || 
                         'unknown';
        return `\n\n> **[Confluence Macro: ${macroName}]**\n> ${content}\n\n`;
      },
    });

    // 处理 Confluence 的状态标签
    turndownService.addRule('confluenceStatus', {
      filter: (node) => {
        return (node as Element).classList?.contains('status-macro');
      },
      replacement: (content) => {
        return `**[${content}]**`;
      },
    });

    // 转换内容
    const markdown = turndownService.turndown(htmlContent);

    // 构建返回的 URL
    const pageUrl = page._links?.webui
      ? (page._links.webui.startsWith('http') ? page._links.webui : `${actualBaseUrl}${page._links.webui}`)
      : url || `${actualBaseUrl}/wiki/spaces/${page.space.key}/pages/${page.id}`;

    return NextResponse.json({
      page: {
        id: page.id,
        title: page.title,
        space: {
          key: page.space.key,
          name: page.space.name,
        },
        version: {
          number: page.version.number,
          when: page.version.when,
          by: {
            displayName: page.version.by.displayName,
            email: page.version.by.email || '',
          },
        },
        url: pageUrl,
      },
      content: markdown,
    });
  } catch (error) {
    console.error('Error fetching Confluence page:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Confluence page',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

