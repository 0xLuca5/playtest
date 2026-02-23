'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  FolderIcon,
  FolderOpen,
  FolderPlus,
  Sparkles,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react';
import { TreeNode } from '../types';
import ImportButton from '@/components/test-case/import-button';
import { RepositorySettings } from './repository-settings';
import ImproveLoading from './improve-loading';
import { toast } from 'sonner';

interface FolderContentPanelProps {
  // 数据状态
  selectedFolder: TreeNode;
  currentProject: { id: string; name: string } | null;

  // 事件处理
  onImportComplete: () => void;
  onImproveFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddSubFolder: (parentFolderId: string) => void;

  // 工具函数
  formatDate: (date: string | Date) => string;
  formatTimeAgo: (date: string | Date) => string;

  // 翻译函数
  t: (key: string, values?: Record<string, any>) => string;
}

export function FolderContentPanel({
  selectedFolder,
  currentProject,
  onImportComplete,
  onImproveFolder,
  onDeleteFolder,
  onAddSubFolder,
  formatDate,
  formatTimeAgo,
  t
}: FolderContentPanelProps) {
  const [isImproving, setIsImproving] = useState(false);

  // 递归检查文件夹及其子文件夹是否包含测试用例
  const hasTestCases = (folder: TreeNode): boolean => {
    if (!folder.children) return false;

    // 检查直接子项中是否有测试用例
    const hasDirectTestCases = folder.children.some(child => !child.isFolder);
    if (hasDirectTestCases) return true;

    // 递归检查子文件夹
    return folder.children.some(child => child.isFolder && hasTestCases(child));
  };

  const folderHasTestCases = hasTestCases(selectedFolder);

  // 处理 improve 按钮点击
  const handleImproveClick = async () => {
    if (!folderHasTestCases) return;
    
    setIsImproving(true);
    try {
      await onImproveFolder(selectedFolder.id);
    } catch (error) {
      console.error('Improve folder failed:', error);
      toast.error(t('testCase.improve.error'));
    } finally {
      setIsImproving(false);
    }
  };

  // 如果正在进行AI分析，显示loading状态
  if (isImproving) {
    return <ImproveLoading />;
  }
  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* Folder Header */}
      <div className="relative mb-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <FolderIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 break-words">
              {selectedFolder.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {selectedFolder.createdAt 
                  ? formatDate(new Date(selectedFolder.createdAt)) 
                  : t('common.createdToday')
                }
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {selectedFolder.updatedAt 
                  ? formatTimeAgo(new Date(selectedFolder.updatedAt)) 
                  : t('common.lastModified2HoursAgo')
                }
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons for Folder */}
      <div className="flex flex-wrap gap-3 mb-6">
        <ImportButton
          projectId={currentProject?.id || ''}
          parentFolderId={selectedFolder.id}
          onImportComplete={() => {
            onImportComplete();
            toast.success(t('testCase.import.successMessage', { count: 0 }));
          }}
          className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
        />
        <Button
          variant="outline"
          className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
          onClick={() => onAddSubFolder(selectedFolder.id)}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          {t('testCase.addSubFolder')}
        </Button>
        <Button
          variant="outline"
          className={`transition-colors ${
            folderHasTestCases
              ? "border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary hover:text-primary/80"
              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          }`}
          onClick={handleImproveClick}
          disabled={!folderHasTestCases || isImproving}
          title={folderHasTestCases ? t('testCase.improveWithAI') : t('testCase.noTestCasesToImprove')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isImproving ? t('testCase.improve.analyzing') : t('testCase.improveWithAI')}
        </Button>
        <Button
          variant="outline"
          className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          onClick={() => onDeleteFolder(selectedFolder.id)}
          title={t('testCase.deleteFolder')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('testCase.deleteFolder')}
        </Button>
      </div>

      {/* Folder Overview */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          {t('testCase.folderOverview')}
        </h3>

        {/* Folder Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {selectedFolder.children?.filter(child => !child.isFolder).length || 0}
            </div>
            <div className="text-sm text-blue-600/80 dark:text-blue-400/80">
              {t('testCase.testCases')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {selectedFolder.children?.filter(child => child.isFolder).length || 0}
            </div>
            <div className="text-sm text-purple-600/80 dark:text-purple-400/80">
              {t('testCase.subFolders')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {selectedFolder.children?.length || 0}
            </div>
            <div className="text-sm text-green-600/80 dark:text-green-400/80">
              {t('testCase.totalItems')}
            </div>
          </div>
        </div>

        {/* Folder Description */}
        {/* <div className="text-slate-600 dark:text-slate-400">
          <p className="mb-4">
            {t('testCase.folderDescription', { folderName: selectedFolder.name })}
          </p>
          <p className="text-sm">
            {t('testCase.folderInstructions')}
          </p>
        </div> */}
      </div>

      {/* Repository Settings Card */}
      <div className="mt-6">
        <RepositorySettings
          folderId={selectedFolder.id}
          folderName={selectedFolder.name}
        />
      </div>
    </div>
  );
}
