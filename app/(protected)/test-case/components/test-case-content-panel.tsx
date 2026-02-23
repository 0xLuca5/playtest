'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FileTextIcon,
  Copy,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react';
import { TreeNode, ModuleButtonConfig } from '../types';

// Import module components
import {
  InformationModule,
  StepsModule,
  AutomationModule,
  DocumentsModule,
  DatasetModule,
  TestRunsModule,
  IssuesModule,
  CommentsModule
} from './index';

interface TestCaseContentPanelProps {
  // 数据状态
  selectedTestCase: TreeNode;
  selectedTestCaseDetails: any;
  activeModule: string;
  moduleButtons: ModuleButtonConfig[];

  // 事件处理
  onModuleChange: (moduleId: string) => void;
  onDuplicateTestCase: (testCase: TreeNode) => void;
  onDeleteTestCase: (testCaseId: string) => void;

  // 工具函数
  formatDate: (date: string | Date) => string;
  formatTimeAgo: (date: string | Date) => string;

  // 翻译函数
  t: (key: string, values?: Record<string, any>) => string;
}

export function TestCaseContentPanel({
  selectedTestCase,
  selectedTestCaseDetails,
  activeModule,
  moduleButtons,
  onModuleChange,
  onDuplicateTestCase,
  onDeleteTestCase,
  formatDate,
  formatTimeAgo,
  t
}: TestCaseContentPanelProps) {
  // 渲染模块内容
  const renderModuleContent = () => {
    if (!selectedTestCaseDetails) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          {t('testCase.loadingDetails')}
        </div>
      );
    }

    switch (activeModule) {
      case 'information':
        return <InformationModule testCaseDetails={selectedTestCaseDetails} />;

      case 'steps':
        return <StepsModule testCaseDetails={selectedTestCaseDetails} />;

      case 'automation':
        return <AutomationModule testCaseDetails={selectedTestCaseDetails} />;

      case 'documents':
        return <DocumentsModule testCaseDetails={selectedTestCaseDetails} />;

      case 'dataset':
        return <DatasetModule testCaseDetails={selectedTestCaseDetails} />;

      case 'testruns':
        return <TestRunsModule testCaseDetails={selectedTestCaseDetails} />;

      case 'issues':
        return <IssuesModule testCaseDetails={selectedTestCaseDetails} />;

      case 'comments':
        return <CommentsModule testCaseDetails={selectedTestCaseDetails} />;

      default:
        return (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            Module content not available.
          </div>
        );
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* Test Case Header */}
      <div className="relative mb-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileTextIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 break-words">
              {selectedTestCase.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {selectedTestCase.createdAt 
                  ? formatDate(selectedTestCase.createdAt) 
                  : t('common.createdToday')
                }
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {selectedTestCase.updatedAt 
                  ? formatTimeAgo(selectedTestCase.updatedAt) 
                  : t('common.lastModified2HoursAgo')
                }
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons for Test Case */}
        <div className="absolute top-3 right-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
            onClick={() => onDuplicateTestCase(selectedTestCase)}
            title={t('testCase.duplicate')}
          >
            <Copy className="w-4 h-4 mr-1" />
            {t('testCase.duplicate')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            onClick={() => onDeleteTestCase(selectedTestCase.id)}
            title="删除测试用例"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Module Navigation for Test Cases */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {moduleButtons.map((module) => (
          <button
            key={module.id}
            onClick={() => onModuleChange(module.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeModule === module.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <module.icon className="w-4 h-4" />
            {module.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg p-8 test-case-content">
        <div className="space-y-8">
          {renderModuleContent()}
        </div>
      </div>
    </div>
  );
}
