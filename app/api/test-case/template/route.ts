import { NextRequest, NextResponse } from 'next/server';
import { generateTestCaseTemplateBlob } from '@/lib/excel/test-case-template';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';

/**
 * 下载测试用例导入模板
 * GET /api/test-case/template
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取语言参数
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'zh';

    // 生成Excel模板
    const blob = generateTestCaseTemplateBlob(locale);

    // 根据语言生成文件名
    const fileNames = {
      zh: `测试用例导入模板_${new Date().toISOString().split('T')[0]}.xlsx`,
      en: `TestCase_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`,
      ja: `テストケースインポートテンプレート_${new Date().toISOString().split('T')[0]}.xlsx`
    };
    const fileName = fileNames[locale as keyof typeof fileNames] || fileNames.zh;
    
    // 返回文件
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('生成Excel模板失败:', error);
    return NextResponse.json(
      { error: '生成模板失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
