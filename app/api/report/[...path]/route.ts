import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArr } = await context.params; // 关键修正
  try {
    // 构建文件路径
    const filePath = path.join(process.cwd(), 'public', 'report', ...pathArr);
    
    // 安全检查：确保路径在public/report目录内
    const normalizedPath = path.normalize(filePath);
    const publicReportDir = path.join(process.cwd(), 'public', 'report');
    
    if (!normalizedPath.startsWith(publicReportDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(normalizedPath)) {
      return new NextResponse('Not Found', { status: 404 });
    }
    
    // 读取文件
    const fileBuffer = fs.readFileSync(normalizedPath);
    
    // 根据文件扩展名设置正确的Content-Type
    const ext = path.extname(normalizedPath).toLowerCase();
    let contentType = 'text/html'; // 默认HTML
    
    switch (ext) {
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.ico':
        contentType = 'image/x-icon';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.xml':
        contentType = 'application/xml';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
    }
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    // 对于HTML文件，设置适当的CSP头以允许iframe嵌入
    if (contentType === 'text/html') {
      headers.set('Content-Security-Policy', "frame-ancestors 'self'");
      headers.set('X-Frame-Options', 'SAMEORIGIN');
    }
    
    // 设置缓存头
    headers.set('Cache-Control', 'public, max-age=3600'); // 1小时缓存
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving report file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 