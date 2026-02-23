"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SidebarHistory } from '@/components/chat/sidebar-history';
import { SidebarProvider } from '@/components/navigation/sidebar-main';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DataStreamProvider } from '@/components/chat/data-stream-provider';
import type { Session } from 'next-auth';

interface ChatLayoutClientProps {
  children: React.ReactNode;
  user: Session['user'] | undefined;
}

export function ChatLayoutClient({ children, user }: ChatLayoutClientProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  return (
    <DataStreamProvider>
      <div className="flex w-full min-h-dvh">
        {/* Desktop sidebar - 只在桌面端显示 */}
        {isSidebarVisible && (
          <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 dark:bg-zinc-900/60 bg-sidebar">
            <SidebarProvider>
              <SidebarHistory user={user} />
            </SidebarProvider>
          </aside>
        )}

        {/* Main chat area */}
        <div className="flex-1 min-w-0 relative">
          {/* Desktop toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="hidden md:block absolute top-4 left-4 z-10 h-8 w-8 p-0 hover:bg-accent"
            title={isSidebarVisible ? "隐藏聊天历史" : "显示聊天历史"}
          >
            {isSidebarVisible ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          {/* Mobile sidebar trigger */}
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden absolute top-4 left-4 z-10 h-8 w-8 p-0 hover:bg-accent"
                title="显示聊天历史"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarProvider>
                <SidebarHistory user={user} />
              </SidebarProvider>
            </SheetContent>
          </Sheet>

          {children}
        </div>
      </div>
    </DataStreamProvider>
  );
}
