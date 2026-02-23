import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { Chat } from '@/components/chat/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/chat/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { convertToUIMessages } from '@/lib/utils';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await getServerSession(authConfig);

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (chat.visibility === 'private') {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');
  const projectIdFromCookie = cookieStore.get('current-project');

  const initialChatModel = chatModelFromCookie?.value || DEFAULT_CHAT_MODEL;
  const initialProjectId = projectIdFromCookie?.value || null;

  console.log('🔍 Chat [id] Page - 从 cookie 获取的数据:');
  console.log('  - initialChatModel:', initialChatModel);
  console.log('  - initialProjectId:', initialProjectId);

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={uiMessages}
        initialChatModel={initialChatModel}
        initialProjectId={initialProjectId}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        session={session}
        autoResume={true}
      />
      <DataStreamHandler />
    </>
  );
}