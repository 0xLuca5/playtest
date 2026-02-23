'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { useChatModels } from '@/hooks/use-chat-models';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

// 客户端cookie设置函数
const setClientCookie = (name: string, value: string) => {
  if (typeof window !== 'undefined') {
    document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
    console.log('🔍 ModelSelector客户端cookie设置完成:', name, '=', value);
  }
};
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const { chatModels: configuredChatModels, loading, error } = useChatModels();

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  // 使用配置的chat models，如果没有配置则fallback到默认的chatModels
  const baseChatModels = configuredChatModels.length > 0 ? configuredChatModels : chatModels;

  // 根据用户权限过滤可用模型
  const availableChatModels = baseChatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId,
      ),
    [optimisticModelId, availableChatModels],
  );

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <Button
        data-testid="model-selector"
        variant="outline"
        className={cn("md:px-2 md:h-[34px]", className)}
        disabled
      >
        Loading models...
        <ChevronDownIcon />
      </Button>
    );
  }

  // 如果有错误，记录警告但继续使用fallback
  if (error) {
    console.warn('Failed to load configured chat models, using fallback:', error);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
        >
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableChatModels.map((chatModel) => {
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);

                console.log('🔍 ModelSelector选择模型:', id);
                setOptimisticModelId(id);

                // 立即设置客户端cookie
                setClientCookie('chat-model', id);

                // 立即触发事件
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('cookieChange', {
                    detail: { name: 'chat-model', value: id }
                  }));
                  console.log('🔍 ModelSelector cookieChange事件已触发:', id);
                }

                // 异步调用服务器端函数
                startTransition(() => {
                  saveChatModelAsCookie(id).catch(error => {
                    console.error('🔍 ModelSelector saveChatModelAsCookie失败:', error);
                  });
                });
              }}
              data-active={id === optimisticModelId}
              asChild
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full"
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
                  </div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}