import { cookies } from 'next/headers';

import { Chat } from '@/components/chat/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/chat/data-stream-handler';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';

// 强制动态渲染以避免静态生成错误
export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authConfig);
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');
  const projectIdFromCookie = cookieStore.get('current-project');

  const initialChatModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;
  const initialProjectId = projectIdFromCookie?.value || null;

  console.log('🔍 Chat Page - 从 cookie 获取的数据:');
  console.log('  - initialChatModel:', initialChatModel);
  console.log('  - initialProjectId:', initialProjectId);

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={initialChatModel}
        initialProjectId={initialProjectId}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
