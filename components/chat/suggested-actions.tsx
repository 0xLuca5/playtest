'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import { useI18n } from '@/hooks/use-i18n';
import { generateUUID } from '@/lib/utils';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: (message: UIMessage) => void;
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const { t } = useI18n();

  const suggestedActions = [
    {
      title: t('chat.suggestions.createTestCase'),
      label: t('chat.suggestions.openNewsExample'),
      action: t('chat.suggestions.createTestCaseAction'),
    },
    {
      title: t('chat.suggestions.generateTestData'),
      label: t('chat.suggestions.userTestDataExample'),
      action: t('chat.suggestions.generateTestDataAction'),
    },
    {
      title: t('chat.suggestions.writeUnitTest'),
      label: t('chat.suggestions.javaUnitTestExample'),
      action: t('chat.suggestions.writeUnitTestAction'),
    },
    {
      title: t('chat.suggestions.executeTest'),
      label: t('chat.suggestions.automationTestExample'),
      action: t('chat.suggestions.executeTestAction'),
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="outline"
            onClick={async () => {
              // 只有在非测试用例页面时才执行URL替换
              if (!window.location.pathname.includes('/test-case/')) {
                window.history.replaceState({}, '', `/chat/${chatId}`);
              }

              sendMessage({
                id: generateUUID(),
                role: 'user',
                parts: [{ type: 'text', text: suggestedAction.action }],
              });
            }}
            className="text-left rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
