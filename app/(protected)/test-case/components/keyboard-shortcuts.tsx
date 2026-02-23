'use client';

import React from 'react';

interface KeyboardShortcutsProps {
  t: (key: string, values?: Record<string, any>) => string;
}

export function KeyboardShortcuts({ t }: KeyboardShortcutsProps) {
  return (
    <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="font-medium mb-2">{t('testCase.keyboardShortcuts')}</div>
        <div className="flex justify-between">
          <span>Ctrl + N</span>
          <span>{t('testCase.newCase')}</span>
        </div>
        <div className="flex justify-between">
          <span>Ctrl + Shift + N</span>
          <span>{t('testCase.createFolder')}</span>
        </div>
        <div className="flex justify-between">
          <span>Ctrl + F</span>
          <span>{t('testCase.search')}</span>
        </div>
        <div className="flex justify-between">
          <span>Delete</span>
          <span>{t('testCase.delete')}</span>
        </div>
        <div className="flex justify-between">
          <span>F2</span>
          <span>{t('testCase.rename')}</span>
        </div>
      </div>
    </div>
  );
}
