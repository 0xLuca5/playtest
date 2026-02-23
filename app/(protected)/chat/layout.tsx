import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import type { Session } from 'next-auth';
import { ChatLayoutClient } from '@/components/chat/chat-layout-client';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: ChatLayoutProps) {
  const session: Session | null = await getServerSession(authConfig);
  const user = session?.user;

  return (
    <ChatLayoutClient user={user}>
      {children}
    </ChatLayoutClient>
  );
}
