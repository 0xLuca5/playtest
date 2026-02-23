'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderIcon, Plus, Sparkles } from 'lucide-react';
import ImportButton from '@/components/test-case/import-button';

interface EmptyStateProps {
  onAddFolder: () => void;
  onAddTestCase: (name: string) => void;
  onAIGenerate: () => void;
  onImportComplete: () => void;
  currentProject: any;
  isCreating: boolean;
  t: (key: string, values?: Record<string, any>) => string;
}

export function EmptyState({
  onAddFolder,
  onAddTestCase,
  onAIGenerate,
  onImportComplete,
  currentProject,
  isCreating,
  t
}: EmptyStateProps) {
  const [newCase, setNewCase] = useState('');

  const handleCreateTestCase = () => {
    if (newCase.trim()) {
      onAddTestCase(newCase.trim());
      setNewCase('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 pt-20">
      <div className="max-w-2xl mx-auto text-center">
        {/* Illustration */}
        <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <FolderIcon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
          {t('testCase.createFirst')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
          {t('testCase.createFirstDesc')}
        </p>

        {/* Quick Add Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-zinc-700 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder={t('testCase.enterName')}
              value={newCase}
              onChange={e => setNewCase(e.target.value)}
              className="flex-1 h-12 text-base border-slate-200 dark:border-slate-700 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCase.trim()) {
                  handleCreateTestCase();
                }
              }}
            />
            <Button
              className={`h-12 px-8 text-base rounded-lg sm:flex-shrink-0 ${
                newCase.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleCreateTestCase}
              disabled={!newCase.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                t('testCase.addTestCase')
              )}
            </Button>
          </div>
        </div>

        {/* Alternative Options */}
        <div className="space-y-4">
          <p className="text-slate-500 dark:text-slate-400">{t('testCase.chooseOptions')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              className="flex items-center gap-3 px-6 h-12 text-base rounded-lg border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
              onClick={onAIGenerate}
            >
              <span className="text-xl">🤖</span>
              {t('testCase.generateWithAI')}
            </Button>
            <ImportButton
              projectId={currentProject?.id || ''}
              parentFolderId={undefined}
              onImportComplete={onImportComplete}
              className="flex items-center gap-3 px-6 h-12 text-base rounded-lg border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
