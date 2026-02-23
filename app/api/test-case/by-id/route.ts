import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { getCompleteTestCase } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Test case ID is required' }, { status: 400 });
    }

    // 直接从数据库获取测试用例，不进行项目验证
    console.log('🔍 Getting test case by ID (no project restriction):', id);
    const testCase = await getCompleteTestCase(id);
    
    if (!testCase) {
      console.log('❌ Test case not found:', id);
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    console.log('✅ Test case found:', testCase.name, 'in project:', testCase.projectId);
    return NextResponse.json(testCase);

  } catch (error) {
    console.error('Get test case by ID error:', error);
    return NextResponse.json(
      { error: 'Failed to get test case' },
      { status: 500 }
    );
  }
}
