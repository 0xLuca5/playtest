import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;
    
    // 安全检查：只允许访问特定格式的文件名
    if (!filename || !filename.match(/^puppeteer-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-[a-z0-9]+\.html$/)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // 构建文件路径
    const reportPath = path.join(process.cwd(), 'public', 'report', filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(reportPath)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // 读取文件内容
    const content = fs.readFileSync(reportPath, 'utf-8');
    
    // 返回HTML内容
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Failed to get report' },
      { status: 500 }
    );
  }
}
