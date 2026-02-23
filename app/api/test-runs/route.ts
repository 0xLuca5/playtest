import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { getTestRunsByTestCaseId, createTestRun } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'Test case ID is required' },
        { status: 400 }
      );
    }

    const testRuns = await getTestRunsByTestCaseId(testCaseId, limit);
    return NextResponse.json(testRuns);
  } catch (error) {
    console.error('Get test runs error:', error);
    return NextResponse.json(
      { error: 'Failed to get test runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      testCaseId,
      status,
      duration,
      environment,
      executor,
      logs,
      screenshots,
      reportUrl
    } = body;

    if (!testCaseId || !status) {
      return NextResponse.json(
        { error: 'Test case ID and status are required' },
        { status: 400 }
      );
    }

    const testRunId = await createTestRun({
      testCaseId,
      status,
      duration,
      environment,
      executor,
      logs,
      screenshots,
      reportUrl
    });

    return NextResponse.json({ id: testRunId, success: true });
  } catch (error) {
    console.error('Create test run error:', error);
    return NextResponse.json(
      { error: 'Failed to create test run' },
      { status: 500 }
    );
  }
}
