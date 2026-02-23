'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FolderIcon,
  FolderPlus,
  Plus,
  Type,
  WrapText,
  SearchIcon,
  X
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TreeNode } from '../types';
import { SortableTreeNode } from '../components/sortable-tree-node';
import { SimpleTreeNode } from '../components/simple-tree-node';
import { TreeSkeleton } from '../components/tree-skeleton';
import { KeyboardShortcuts } from '../components/keyboard-shortcuts';

interface TreeNavigationPanelProps {
  // 数据状态
  testCaseTree: TreeNode[];
  selected: TreeNode | null;
  search: string;
  wrapText: boolean;
  isLoading: boolean;
  isClient: boolean;
  treeKey: number;
  activeId: string | null;
  searchInputRef?: React.RefObject<HTMLInputElement>;

  // 事件处理
  onNodeSelect: (node: TreeNode) => void;
  onBackgroundClick: (e: React.MouseEvent) => void;
  onSearchChange: (value: string) => void;
  onWrapTextToggle: () => void;
  onAddFolder: (parentNode?: TreeNode) => void;
  onAddTestCase: (parentNode?: TreeNode) => void;
  onDeleteNode: (node: TreeNode) => void;
  onRenameNode: (node: TreeNode, newName: string) => void;
  onDuplicateNode: (node: TreeNode) => void;

  // 翻译函数
  t: (key: string, values?: Record<string, any>) => string;
}

export function TreeNavigationPanel({
  testCaseTree,
  selected,
  search,
  wrapText,
  isLoading,
  isClient,
  treeKey,
  activeId,
  searchInputRef,
  onNodeSelect,
  onBackgroundClick,
  onSearchChange,
  onWrapTextToggle,
  onAddFolder,
  onAddTestCase,
  onDeleteNode,
  onRenameNode,
  onDuplicateNode,
  t
}: TreeNavigationPanelProps) {

  // 渲染树节点的函数
  const renderTreeNodes = () => {
    console.log('🌲 TreeNavigationPanel renderTreeNodes:', {
      isLoading,
      treeLength: testCaseTree.length,
      tree: testCaseTree,
      isClient
    });

    if (isLoading) {
      return <TreeSkeleton />;
    }

    if (testCaseTree.length === 0) {
      return (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          <p className="text-sm">{t('testCase.noTestCases')}</p>
        </div>
      );
    }

    if (!isClient) {
      // 服务器端渲染：使用简单的树节点
      return (
        <div key={`tree-${treeKey}`}>
          {testCaseTree.map((node) => (
            <SimpleTreeNode
              key={`${node.id}-${treeKey}`}
              node={node}
              onSelect={onNodeSelect}
              selectedId={selected?.id}
              wrapText={wrapText}
              onDelete={onDeleteNode}
              onRename={onRenameNode}
              onDuplicate={onDuplicateNode}
            />
          ))}
        </div>
      );
    }

    // 客户端渲染：使用可拖拽的树节点
    return (
      <SortableContext items={testCaseTree.map(node => node.id)} strategy={verticalListSortingStrategy}>
        <div key={`sortable-tree-${treeKey}`}>
          {testCaseTree.map((node) => (
            <SortableTreeNode
              key={`${node.id}-${treeKey}`}
              node={node}
              onSelect={onNodeSelect}
              selectedId={selected?.id}
              isDragging={activeId === node.id}
              wrapText={wrapText}
              onDelete={onDeleteNode}
              onRename={onRenameNode}
              onDuplicate={onDuplicateNode}
              onAddFolder={onAddFolder}
              onAddTestCase={onAddTestCase}
            />
          ))}
        </div>
      </SortableContext>
    );
  };

  return (
    <div
      className="w-80 border-r border-slate-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden"
      onClick={onBackgroundClick}
    >
      {/* Sidebar Header with Search and Tools */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-700 space-y-3">
        {/* Header Title and Tools */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{t('testCase.title')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onAddFolder}
              title={t('testCase.createFolder')}
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onAddTestCase}
              title={t('testCase.newCase')}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 rounded-md transition-colors ${
                wrapText
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={onWrapTextToggle}
              title={t('testCase.wrapText')}
            >
              {wrapText ? <Type className="w-4 h-4" /> : <WrapText className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            ref={searchInputRef}
            placeholder={t('testCase.searchPlaceholder')}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 pr-4 h-9 text-sm border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-zinc-800/90 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
              onClick={() => onSearchChange('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-4 overflow-y-auto h-full">
        {isLoading ? <TreeSkeleton /> : renderTreeNodes()}
        <KeyboardShortcuts t={t} />
      </div>
    </div>
  );
}
