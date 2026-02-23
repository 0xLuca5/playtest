import { getServerSession } from 'next-auth';
import { authConfig } from '../auth/auth.config';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authConfig);
  if (!session) {
    redirect('/login');
  }
  return <>{children}</>;
} 