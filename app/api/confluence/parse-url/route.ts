import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { ConfluenceClient } from '@/lib/services/confluence-client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, email, apiToken } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }

    console.log('[Parse URL] Parsing URL:', url);

    // 解析 URL
    const parsed = ConfluenceClient.parseUrl(url);

    if (!parsed) {
      console.error('[Parse URL] Failed to parse URL');
      return NextResponse.json(
        { error: 'Invalid Confluence URL' },
        { status: 400 }
      );
    }

    console.log('[Parse URL] Parsed result:', parsed);

    // 尝试获取页面信息以验证 URL
    try {
      // 优先使用用户提供的认证信息，其次使用环境变量
      const confluenceEmail = email || process.env.CONFLUENCE_EMAIL || (session.user as any)?.email;
      const confluenceToken = apiToken || process.env.CONFLUENCE_API_TOKEN;

      console.log('[Parse URL] Confluence credentials:', {
        hasEmail: !!confluenceEmail,
        hasToken: !!confluenceToken,
        isExternalLink: parsed.isExternalLink,
        usingProvidedCredentials: !!(email && apiToken),
      });

      // 如果是 external link，先解析获取真实的 pageId
      let actualPageId = parsed.pageId;

      if (parsed.isExternalLink) {
        console.log('[Parse URL] Detected external link, resolving...');

        // 尝试访问 external link 获取重定向后的 URL
        const headers: Record<string, string> = {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (confluenceToken && confluenceEmail) {
          headers['Authorization'] = `Basic ${Buffer.from(`${confluenceEmail}:${confluenceToken}`).toString('base64')}`;
        }

        const redirectResponse = await fetch(url, {
          method: 'GET',
          headers,
          redirect: 'follow',
        });

        const redirectedUrl = redirectResponse.url;
        console.log('[Parse URL] Redirected to:', redirectedUrl);

        // 从重定向后的 URL 解析真实的 pageId
        const redirectedParsed = ConfluenceClient.parseUrl(redirectedUrl);
        if (redirectedParsed && !redirectedParsed.isExternalLink) {
          actualPageId = redirectedParsed.pageId;
          console.log('[Parse URL] Resolved pageId:', actualPageId);
        } else {
          // 如果还是无法解析，尝试从 HTML 中提取
          const html = await redirectResponse.text();
          const pageIdMatch = html.match(/content[Ii]d["\s:=]+(\d+)/);
          if (pageIdMatch) {
            actualPageId = pageIdMatch[1];
            console.log('[Parse URL] Extracted pageId from HTML:', actualPageId);
          }
        }
      }

      if (confluenceEmail && confluenceToken) {
        const client = new ConfluenceClient({
          baseUrl: parsed.baseUrl,
          email: confluenceEmail,
          apiToken: confluenceToken,
        });

        const page = await client.getPage(actualPageId, ['space', 'version']);

        return NextResponse.json({
          pageId: page.id,
          title: page.title,
          spaceKey: page.space.key,
          spaceName: page.space.name,
          baseUrl: parsed.baseUrl,
          url: url,
          lastModified: page.version.when,
          verified: true,
        });
      }
    } catch (error) {
      console.error('[Parse URL] Could not verify Confluence page:', error);
      // 即使验证失败，仍然返回解析的信息
    }

    // 返回解析的信息（未验证）
    console.log('[Parse URL] Returning unverified result');

    const hasCredentials = !!(email && apiToken) || !!(process.env.CONFLUENCE_EMAIL && process.env.CONFLUENCE_API_TOKEN);

    let warningMessage = '';
    let title = parsed.title || 'Confluence Page (Unverified)';

    if (parsed.isExternalLink) {
      warningMessage = hasCredentials
        ? 'External/public link detected but could not be resolved. The page may not exist or credentials are invalid.'
        : 'External/public link detected. Cannot extract title from this URL format - please enter the page title manually. Note: This link type allows viewers to access without Confluence login (if page is public).';
    } else if (parsed.title) {
      // 如果从 URL 中解析出了标题，说明是标准格式的 URL
      warningMessage = hasCredentials
        ? 'Page title extracted from URL. Could not verify with API - credentials may be invalid or page may be private.'
        : 'Page title extracted from URL and ready to use. Note: Viewers will need Confluence login to access this direct URL. For public access, use an external/share link instead.';
    } else {
      warningMessage = hasCredentials
        ? 'Could not access page with provided credentials. The page may not exist or credentials are invalid.'
        : 'Could not extract page title from URL. Please provide API credentials to fetch page information.';
    }

    return NextResponse.json({
      pageId: parsed.pageId,
      title: title,
      spaceKey: parsed.spaceKey || 'Unknown',
      baseUrl: parsed.baseUrl,
      url: url,
      verified: false,
      isExternalLink: parsed.isExternalLink,
      warning: warningMessage,
    });
  } catch (error) {
    console.error('Error parsing Confluence URL:', error);
    return NextResponse.json(
      { error: 'Failed to parse Confluence URL' },
      { status: 500 }
    );
  }
}

