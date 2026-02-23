import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { getMessagesByTestCaseAndUser } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import type { DBMessage } from '@/lib/db/schema';
import type { UIMessage } from 'ai';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 30; // 默认最多30条

    if (!testCaseId) {
      return new Response('testCaseId is required', { status: 400 });
    }

    // 验证limit参数
    if (limit < 1 || limit > 100) {
      return new Response('limit must be between 1 and 100', { status: 400 });
    }

    // 获取该用户在该测试用例下的聊天历史消息
    const messagesFromDb = await getMessagesByTestCaseAndUser({
      testCaseId,
      userId: session.user.id,
      limit: limit
    });

    const uiMessages = convertToUIMessages(messagesFromDb);

    return Response.json(uiMessages);
  } catch (error) {
    console.error('Get testcase chat history error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
