'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FileTextIcon, SearchIcon, FilterIcon, FolderPlus, Plus, Menu, X, Loader2, WrapText, Type, ArrowLeft, Edit3, Save, ExternalLink, Info, Target, Trash2, Bot, Link, Database, PlayCircle, Bug, Sparkles, Copy, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

import { useProject } from '@/lib/contexts/project-context';
import { useI18n } from '@/hooks/use-i18n';
import { AIGenerateDialog } from '@/components/test-case/ai-generate-dialog';
import ImportButton from '@/components/test-case/import-button';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigation-store';
import { useResponsive } from '@/hooks/use-responsive';

// Import new component structure
import { TreeNavigationPanel } from './components/tree-navigation-panel';
import { FolderContentPanel } from './components/folder-content-panel';
import { TestCaseContentPanel } from './components/test-case-content-panel';
import { EmptyState } from './components/empty-state';
import { SimpleTreeNode } from './components/simple-tree-node';
import { SortableTreeNode } from './components/sortable-tree-node';
import { TreeSkeleton } from './components/tree-skeleton';
import { KeyboardShortcuts } from './components/keyboard-shortcuts';
import ImproveLoading from './components/improve-loading';

// Import TestCaseAssistant from the detail page
import TestCaseAssistant from './components/testcase-assistant';

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
} from './components';

// Import types
import { TreeNode, ModuleButtonConfig, CreateType } from './types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Label } from '@/components/ui/label';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import TestCase type from the detail page types
import { TestCase as DetailTestCase, TestStep } from './[id]/types';

// 时间格式化工具函数（国际化）
function formatTimeAgo(timestamp: number, intl?: any): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    // 0 ~ 59 秒：使用相对时间 0 秒
    return (intl ?? (globalThis as any).__intl__)
      ?.formatRelativeTime(-seconds, 'second') ?? 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return (intl ?? (globalThis as any).__intl__)
      ?.formatRelativeTime(-minutes, 'minute') ?? `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return (intl ?? (globalThis as any).__intl__)
      ?.formatRelativeTime(-hours, 'hour') ?? `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return (intl ?? (globalThis as any).__intl__)
    ?.formatRelativeTime(-days, 'day') ?? `${days} days ago`;
}

function formatDate(timestamp: number, intl?: any): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) {
    // 使用聊天历史里已有的 today/yesterday 词条，避免重复定义
    return (intl ?? (globalThis as any).__intl__)?.formatMessage?.({ id: 'chat.history.group.today' }) || 'Today';
  } else if (itemDate.getTime() === yesterday.getTime()) {
    return (intl ?? (globalThis as any).__intl__)?.formatMessage?.({ id: 'chat.history.group.yesterday' }) || 'Yesterday';
  } else {
    // 使用本地化日期格式
    return (intl ?? (globalThis as any).__intl__)?.formatDate?.(date) || date.toLocaleDateString();
  }
}

// 键盘快捷键提示组件
const KeyboardShortcuts = ({ t }: { t: (id: string) => string }) => (
  <div className="text-xs text-slate-500 dark:text-slate-400 p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span>{t('testCase.shortcuts.newFolder')}</span>
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+N</kbd>
      </div>
      <div className="flex items-center justify-between">
        <span>{t('testCase.shortcuts.search')}</span>
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+F</kbd>
      </div>
      <div className="flex items-center justify-between">
        <span>{t('testCase.shortcuts.toggleSidebar')}</span>
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+B</kbd>
      </div>
      <div className="flex items-center justify-between">
        <span>{t('testCase.shortcuts.wrapText')}</span>
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+W</kbd>
      </div>
      <div className="flex items-center justify-between">
        <span>{t('testCase.shortcuts.deselect')}</span>
        <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Esc</kbd>
      </div>
    </div>
  </div>
);

// 加载骨架屏组件
function TreeSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
          <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
          <div className={`h-4 bg-zinc-200 dark:bg-zinc-700 rounded-sm ${i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-24' : 'w-28'}`}></div>
        </div>
      ))}
    </div>
  );
}

// 简单的树节点组件（用于服务器端渲染）
function SimpleTreeNode({
  node,
  level = 0,
  onSelect,
  selectedId,
  wrapText = false,
  onDelete,
  onRename,
  onDuplicate
}: {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  wrapText?: boolean;
  onDelete?: (node: TreeNode) => void;
  onRename?: (node: TreeNode) => void;
  onDuplicate?: (node: TreeNode) => void;
}) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.isFolder !== false;

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发背景点击事件
    if (hasChildren) setOpen((v) => !v);
    onSelect(node);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(node);
    }
  };

  const handleRename = () => {
    if (onRename) {
      onRename(node);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(node);
    }
  };

  return (
    <div className="ml-1">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-3 py-2.5 px-3 mx-1 cursor-pointer rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:shadow-sm hover:scale-[1.02] ${
              selectedId === node.id
                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-md ring-1 ring-blue-200 dark:ring-blue-800'
                : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={handleNodeClick}
          >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            open ? (
              <ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" />
            )
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0">
          {isFolder ? (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
              selectedId === node.id
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60'
            }`}>
              <FolderIcon className="w-3 h-3" />
            </div>
          ) : (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
              selectedId === node.id
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800/60'
            }`}>
              <FileTextIcon className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Text with Tooltip and Wrap Option */}
        <span
          className={`text-sm font-medium transition-colors duration-200 ${
            wrapText ? 'break-words leading-relaxed' : 'truncate'
          } ${
            selectedId === node.id
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
          }`}
          title={wrapText ? undefined : node.name} // 只在截断时显示工具提示
        >
          {node.name}
        </span>

            {/* Badge for children count */}
            {hasChildren && node.children.length > 0 && (
              <div className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedId === node.id
                  ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
              }`}>
                {node.children.length}
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          {isFolder ? (
            <>
              <ContextMenuItem onClick={() => console.log('Add folder to', node.name)} className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                新建文件夹
              </ContextMenuItem>
              <ContextMenuItem onClick={() => console.log('Add test case to', node.name)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新建测试用例
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : (
            <>
              <ContextMenuItem onClick={handleDuplicate} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                复制
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename} className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            variant="destructive"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && open && (
        <div className="ml-2 relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-700"></div>
          {node.children.map((child, index) => (
            <SimpleTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              wrapText={wrapText}
              onDelete={onDelete}
              onRename={onRename}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 可拖拽的树节点组件
function SortableTreeNode({
  node,
  level = 0,
  onSelect,
  selectedId,
  isDragging = false,
  wrapText = false,
  onDelete,
  onRename,
  onDuplicate
}: {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  isDragging?: boolean;
  wrapText?: boolean;
  onDelete?: (node: TreeNode) => void;
  onRename?: (node: TreeNode) => void;
  onDuplicate?: (node: TreeNode) => void;
}) {
  const [open, setOpen] = useState(level < 1); // 默认展开前两级
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.isFolder !== false; // 默认为文件夹，除非明确设置为false

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发背景点击事件
    if (hasChildren) setOpen((v) => !v);
    onSelect(node);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(node);
    }
  };

  const handleRename = () => {
    if (onRename) {
      onRename(node);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(node);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="ml-1">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-3 py-2.5 px-3 mx-1 rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:shadow-sm hover:scale-[1.02] ${
              selectedId === node.id
                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-md ring-1 ring-blue-200 dark:ring-blue-800'
                : ''
            } ${isDragging ? 'opacity-60 scale-105 shadow-xl ring-2 ring-blue-400 dark:ring-blue-500 bg-white dark:bg-zinc-800' : ''}`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
        {/* Expand/Collapse Button */}
        <div
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors duration-150"
          onClick={handleNodeClick}
        >
          {hasChildren ? (
            open ? (
              <ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" />
            )
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
          )}
        </div>

        {/* Icon */}
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={handleNodeClick}
        >
          {isFolder ? (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
              selectedId === node.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-primary/10 dark:bg-primary/20 text-primary group-hover:bg-primary/20 dark:group-hover:bg-primary/30'
            }`}>
              <FolderIcon className="w-3 h-3" />
            </div>
          ) : (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
              selectedId === node.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-primary/10 dark:bg-primary/20 text-primary group-hover:bg-primary/20 dark:group-hover:bg-primary/30'
            }`}>
              <FileTextIcon className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Text with Tooltip and Wrap Option */}
        <span
          className={`text-sm font-medium flex-1 cursor-pointer transition-colors duration-200 ${
            wrapText ? 'break-words leading-relaxed' : 'truncate'
          } ${
            selectedId === node.id
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
          }`}
          onClick={handleNodeClick}
          title={wrapText ? undefined : node.name} // 只在截断时显示工具提示
        >
          {node.name}
        </span>

        {/* Children Count Badge */}
        {hasChildren && node.children.length > 0 && (
          <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedId === node.id
              ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
          }`}>
            {node.children.length}
          </div>
        )}

        {/* Enhanced Drag Handle */}
        <div
          className={`flex-shrink-0 cursor-grab active:cursor-grabbing p-2 -m-1 rounded-md transition-all duration-200 ${
            isDragging
              ? 'opacity-100 bg-blue-100 dark:bg-blue-900/40'
              : 'opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          {...attributes}
          {...listeners}
          title="Drag to move"
        >
          <div className="w-3 h-4 flex flex-col justify-center gap-0.5">
            <div className={`w-full h-0.5 rounded transition-colors duration-200 ${
              isDragging ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'
            }`}></div>
            <div className={`w-full h-0.5 rounded transition-colors duration-200 ${
              isDragging ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'
            }`}></div>
            <div className={`w-full h-0.5 rounded transition-colors duration-200 ${
              isDragging ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'
            }`}></div>
          </div>
        </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          {isFolder ? (
            <>
              <ContextMenuItem onClick={() => console.log('Add folder to', node.name)} className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                新建文件夹
              </ContextMenuItem>
              <ContextMenuItem onClick={() => console.log('Add test case to', node.name)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新建测试用例
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : (
            <>
              <ContextMenuItem onClick={handleDuplicate} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                复制
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename} className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            variant="destructive"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && open && (
        <div className="ml-2 relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-700"></div>
          <SortableContext items={node.children.map(child => child.id)} strategy={verticalListSortingStrategy}>
            {node.children.map((child) => (
              <SortableTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedId={selectedId}
                isDragging={isDragging}
                wrapText={wrapText}
                onDelete={onDelete}
                onRename={onRename}
                onDuplicate={onDuplicate}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

export default function TestCasePage() {
  const { t } = useI18n();
  const { currentProject, isLoading: projectLoading } = useProject();
  const navigationLayout = useNavigationStore((state) => state.layout);
  const setGlobalSidebarCollapsed = useNavigationStore((state) => state.setSidebarCollapsed);
  const { isMobile } = useResponsive();
  const [selected, setSelected] = useState<TreeNode | null>(null);

  const [search, setSearch] = useState('');
  const [newCase, setNewCase] = useState('');
  const [testCaseTree, setTestCaseTree] = useState<TreeNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [treeKey, setTreeKey] = useState(0); // 用于强制重新渲染
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // 初始化时读取用户偏好设置
    if (typeof window !== 'undefined') {
      const userPreference = localStorage.getItem('test-case-sidebar-collapsed');
      if (userPreference !== null) {
        return userPreference === 'true';
      }
    }
    return false; // 默认展开
  });
  const [wrapText, setWrapText] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'folder' | 'testcase'>('testcase');
  const [selectedTestCaseDetails, setSelectedTestCaseDetails] = useState<any>(null);
  const [showAIGenerateDialog, setShowAIGenerateDialog] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('information');
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [isImprovingFolder, setIsImprovingFolder] = useState(false);

  // 标题编辑状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // 聊天助手实例缓存 - 避免重复创建导致消息丢失
  const [chatAssistantKey, setChatAssistantKey] = useState(0);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // 处理标题编辑
  const handleStartEditTitle = () => {
    if (selected && !selected.isFolder) {
      setIsEditingTitle(true);
      setEditingTitle(selected.name);
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  const handleSaveTitle = async () => {
    if (!selected || !editingTitle.trim()) {
      toast.error(t('testCase.nameRequired'));
      return;
    }

    try {
      const response = await fetch(`/api/test-case`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          name: editingTitle.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update test case name');
      }

      // 更新本地状态
      setSelected(prev => prev ? { ...prev, name: editingTitle.trim() } : null);

      // 刷新树结构
      await loadTestCaseTree();

      // 如果有详情数据，也更新详情
      if (selectedTestCaseDetails) {
        setSelectedTestCaseDetails(prev => ({ ...prev, name: editingTitle.trim() }));
      }

      setIsEditingTitle(false);
      setEditingTitle('');
      toast.success(t('testCase.informationSaved'));
    } catch (error) {
      console.error('保存测试用例名称失败:', error);
      toast.error(t('testCase.saveFailed'));
    }
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

  // 处理删除节点
  const handleDeleteNode = async (node: TreeNode) => {
    if (confirm(t('testCase.confirmDelete', { name: node.name }))) {
      try {
        if (node.isFolder !== false) {
          // 删除文件夹 - 需要传入projectId
          if (!currentProject?.id) {
            throw new Error('No project selected');
          }

          const response = await fetch(`/api/folder?id=${node.id}&projectId=${currentProject.id}`, { method: 'DELETE' });

          // 如果文件夹不为空，询问是否强制删除
          if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 400 && errorData.hasSubFolders !== undefined) {
              // 文件夹包含内容，询问是否强制删除
              const forceConfirm = window.confirm(
                `文件夹不为空！\n\n包含内容：\n• ${errorData.subFoldersCount} 个子文件夹\n• ${errorData.testCasesCount} 个测试用例\n\n是否强制删除文件夹及其所有内容？\n\n⚠️ 此操作将永久删除所有内容，不可撤销！`
              );

              if (forceConfirm) {
                // 强制删除
                const forceResponse = await fetch(`/api/folder?id=${node.id}&projectId=${currentProject.id}&force=true`, {
                  method: 'DELETE',
                });

                if (!forceResponse.ok) {
                  const newErrorData = await forceResponse.json();
                  throw new Error(newErrorData.message || newErrorData.error || '删除文件夹失败');
                }
              } else {
                return; // 用户取消强制删除
              }
            } else {
              throw new Error(errorData.message || errorData.error || '删除文件夹失败');
            }
          }
        } else {
          // 删除测试用例
          await fetch(`/api/test-case?id=${node.id}`, { method: 'DELETE' });
        }

        // 刷新树结构
        await loadTestCaseTree(currentProject?.id);

        // 如果删除的是当前选中的节点，清空选择
        if (selected?.id === node.id) {
          setSelected(null);
          setSelectedTestCaseDetails(null);
        }

        toast.success(t('testCase.deleteSuccess'));
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error(t('testCase.deleteFailed'));
      }
    }
  };

  // 处理重命名节点
  const handleRenameNode = async (node: TreeNode) => {
    const newName = prompt(t('testCase.enterNewName'), node.name);
    if (newName && newName.trim() && newName.trim() !== node.name) {
      try {
        if (node.isFolder !== false) {
          // 重命名文件夹
          await fetch(`/api/folder/${node.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
          });
        } else {
          // 重命名测试用例
          await fetch(`/api/test-case/${node.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
          });
        }

        // 刷新树结构
        await loadTestCaseTree(currentProject?.id);
        toast.success(t('testCase.renameSuccess'));
      } catch (error) {
        console.error('Rename failed:', error);
        toast.error(t('testCase.renameFailed'));
      }
    }
  };

  // 处理复制节点
  const handleDuplicateNode = async (node: TreeNode) => {
    if (node.isFolder !== false) {
      toast.error(t('testCase.cannotDuplicateFolder'));
      return;
    }

    try {
      const response = await fetch(`/api/test-case/${node.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // 刷新树结构
        await loadTestCaseTree(currentProject?.id);
        toast.success(t('testCase.duplicateSuccess'));
      } else {
        throw new Error('Duplicate failed');
      }
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast.error(t('testCase.duplicateFailed'));
    }
  };

  // 获取模块按钮配置
  const getModuleButtons = () => [
    { id: 'information', label: t('testCase.modules.information'), icon: Info, color: 'blue' },
    { id: 'steps', label: t('testCase.modules.steps'), icon: Target, color: 'green' },
    { id: 'automation', label: t('testCase.modules.automation'), icon: Bot, color: 'purple' },
    { id: 'documents', label: t('testCase.modules.documents'), icon: Link, color: 'orange' },
    { id: 'dataset', label: t('testCase.modules.dataset'), icon: Database, color: 'cyan' },
    { id: 'testruns', label: t('testCase.modules.testRuns'), icon: PlayCircle, color: 'indigo' },
    { id: 'issues', label: t('testCase.modules.issues'), icon: Bug, color: 'red' },
    { id: 'comments', label: t('testCase.modules.comments'), icon: MessageSquare, color: 'purple' }
  ];

  // 渲染模块内容
  const renderModuleContent = () => {
    if (!selectedTestCaseDetails) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading test case details...</p>
        </div>
      );
    }

    switch (activeModule) {
      case 'information':
        return <InformationModule
          testCaseDetails={selectedTestCaseDetails}
          selectedId={selected?.id}
          onUpdate={(updates) => {
            // 更新本地状态
            setSelectedTestCaseDetails((prev: any) => ({ ...prev, ...updates }));
            // 重新加载测试用例详情以确保数据同步
            if (selected?.id) {
              loadTestCaseDetails(selected.id, currentProject?.id);
            }
          }}
        />;

      case 'steps':
        return <StepsModule
          testCaseDetails={selectedTestCaseDetails}
          selectedId={selected?.id}
          onUpdate={(updates: any) => {
            // 更新本地状态
            setSelectedTestCaseDetails((prev: any) => prev ? { ...prev, ...updates } : null);
            // 重新加载测试用例详情以确保数据同步
            if (selected?.id) {
              loadTestCaseDetails(selected.id, currentProject?.id);
            }
          }}
        />;

      case 'automation':
        return <AutomationModule testCaseDetails={selectedTestCaseDetails} />;

      case 'requirements':
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

  // 加载测试用例树数据
  const loadTestCaseTree = useCallback(async (forceProjectId?: string) => {
    try {
      const projectId = forceProjectId || currentProject?.id || 'default-project';
      console.log('📊 Loading test case tree for project:', projectId, '(forced:', !!forceProjectId, ', current:', currentProject?.id, ')');
      setIsLoading(true);
      const response = await fetch(`/api/test-case-tree?projectId=${projectId}&ts=${Date.now()}`,
        {
          // 避免浏览器/中间层缓存导致刚导入后的树数据不一致
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
      if (response.ok) {
        const tree = await response.json();
        console.log('📊 Test case tree loaded:', tree.length, 'items');
        setTestCaseTree([...tree]); // 使用展开运算符确保新数组
        setTreeKey(prev => prev + 1); // 强制重新渲染
      } else {
        console.error('Failed to fetch tree:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load test case tree:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // 移除currentProject依赖，通过参数传递

  // 加载测试用例详情
  const loadTestCaseDetails = useCallback(async (testCaseId: string, forceProjectId?: string) => {
    try {
      console.log('🔍 Loading test case details:', testCaseId);
      const response = await fetch(`/api/test-case/by-id?id=${testCaseId}`);
      if (response.ok) {
        const testCase = await response.json();
        setSelectedTestCaseDetails(testCase);
      } else {
        console.error('Failed to load test case details');
        setSelectedTestCaseDetails(null);
      }
    } catch (error) {
      console.error('Error loading test case details:', error);
      setSelectedTestCaseDetails(null);
    }
  }, []); // 移除currentProject依赖，通过参数传递

  // 确保只在客户端渲染拖拽功能
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始数据加载 - 只在项目加载完成后执行一次
  useEffect(() => {
    if (currentProject?.id && !projectLoading) {
      console.log('🚀 Initial data load for project:', currentProject.name);
      loadTestCaseTree(currentProject.id);
    }
  }, [currentProject?.id, projectLoading]); // 只依赖项目ID和加载状态

  // 监听事件
  useEffect(() => {
    // 监听AI助手切换事件
    const handleToggleAI = () => {
      setIsChatCollapsed(prev => !prev);
    };

    // 监听项目切换事件
    const handleProjectChanged = (event: CustomEvent) => {
      const newProject = event.detail?.project;
      console.log('🔄 Project changed event received, reloading test case tree for project:', newProject?.name, 'ID:', newProject?.id);
      // 清除当前选中的测试用例
      setSelected(null);
      setSelectedTestCaseDetails(null);
      // 重新加载测试用例树，使用事件中的新项目ID
      loadTestCaseTree(newProject?.id);
    };

    window.addEventListener('toggle-ai-assistant', handleToggleAI);
    window.addEventListener('projectChanged', handleProjectChanged as EventListener);

    return () => {
      window.removeEventListener('toggle-ai-assistant', handleToggleAI);
      window.removeEventListener('projectChanged', handleProjectChanged as EventListener);
    };
  }, [loadTestCaseTree, currentProject?.id]);

  // 监听项目变化，清除选中状态
  useEffect(() => {
    if (currentProject?.id && !projectLoading) {
      console.log('🔄 Project changed to:', currentProject.name);
      setSelected(null);
      setSelectedTestCaseDetails(null);
      // 数据加载由上面的useEffect处理，这里只清除状态
    }
  }, [currentProject?.id, projectLoading]);

  // 页面初始化时自动收起垂直导航
  useEffect(() => {
    // 延迟执行以确保导航状态已经初始化
    const timer = setTimeout(() => {
      if (navigationLayout === 'vertical') {
        console.log('🔧 Auto-collapsing vertical navigation on test-case page');

        // 使用多种方法确保侧边栏收起
        setGlobalSidebarCollapsed(true);

        // 直接设置 localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebar-collapsed', 'true');

          // 触发自定义事件
          window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', {
            detail: true
          }));
        }
      }
    }, 200); // 增加延迟时间

    return () => clearTimeout(timer);
  }, [navigationLayout, setGlobalSidebarCollapsed]);

  // 移动端自动收起左侧文件树
  useEffect(() => {
    if (isMobile) {
      console.log('📱 Auto-collapsing file tree on mobile');
      setSidebarCollapsed(true);
    } else {
      // 桌面端恢复用户偏好设置
      const userPreference = localStorage.getItem('test-case-sidebar-collapsed');
      if (userPreference !== null) {
        setSidebarCollapsed(userPreference === 'true');
      } else {
        // 如果没有用户偏好设置，桌面端默认展开
        setSidebarCollapsed(false);
      }
    }
  }, [isMobile]);

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n': // Ctrl+N 新建文件夹
            e.preventDefault();
            handleAddFolder();
            break;
          case 'f': // Ctrl+F 聚焦搜索
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'b': // Ctrl+B 切换侧边栏
            e.preventDefault();
            setSidebarCollapsed(prev => {
              const newCollapsed = !prev;
              // 保存用户偏好设置（仅在桌面端保存）
              if (!isMobile) {
                localStorage.setItem('test-case-sidebar-collapsed', newCollapsed.toString());
              }
              return newCollapsed;
            });
            break;
          case 'w': // Ctrl+W 切换文本换行
            e.preventDefault();
            setWrapText(prev => !prev);
            break;
        }
      }
      // ESC 取消选中
      if (e.key === 'Escape') {
        setSelected(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 查找节点的函数
  const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 查找节点的父节点
  const findParentNode = (nodes: TreeNode[], targetId: string, parent: TreeNode | null = null): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return parent;
      if (node.children) {
        const found = findParentNode(node.children, targetId, node);
        if (found !== null) return found;
      }
    }
    return null;
  };

  // 移除节点的函数
  const removeNode = (nodes: TreeNode[], id: string): TreeNode[] => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = removeNode(node.children, id);
      }
      return true;
    });
  };

  // 添加节点到指定父节点的函数
  const addNodeToParent = (nodes: TreeNode[], parentId: string, newNode: TreeNode): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...node.children, newNode]
        };
      }
      if (node.children) {
        return {
          ...node,
          children: addNodeToParent(node.children, parentId, newNode)
        };
      }
      return node;
    });
  };

  // 创建文件夹
  const handleCreateFolder = async (name: string, description?: string) => {
    try {
      setIsCreating(true);
      const parentId = selected?.isFolder ? selected.id : null;
      const projectId = currentProject?.id || 'default-project';

      const response = await fetch('/api/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          parentId,
          projectId
        }),
      });

      if (response.ok) {
        const newFolder = await response.json();
        await loadTestCaseTree(currentProject?.id); // 重新加载树结构
        setShowCreateDialog(false);
        
        // 从重新加载的树结构中找到新创建的文件夹
        const findNewFolder = (nodes: TreeNode[]): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === newFolder.id) {
              return node;
            }
            if (node.children) {
              const found = findNewFolder(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundFolder = findNewFolder(testCaseTree);
        if (foundFolder) {
          setSelected(foundFolder);
          setActiveId(foundFolder.id);
        } else {
          // 如果找不到，使用API返回的数据（包含时间戳）
          setSelected({
            id: newFolder.id,
            name: newFolder.name,
            children: [],
            isFolder: true,
            createdAt: newFolder.createdAt,
            updatedAt: newFolder.updatedAt
          });
          setActiveId(newFolder.id);
        }
        
        // 显示成功提示
        toast.success(t('testCase.alert.folderCreated', { name: newFolder.name }));
      } else {
        const errorData = await response.json();
        console.error('Failed to create folder:', errorData);
        toast.error('创建文件夹失败，请重试');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // 创建测试用例
  const handleCreateTestCase = async (name: string, description?: string) => {
    try {
      setIsCreating(true);
      const folderId = selected?.isFolder ? selected.id : null;
      const projectId = currentProject?.id || 'default-project';

      const response = await fetch('/api/test-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || `Test case for ${name}`,
          folderId,
          projectId,
          priority: 'medium',
          status: 'draft'
        }),
      });

      if (response.ok) {
        const newTestCase = await response.json();
        await loadTestCaseTree(currentProject?.id); // 重新加载树结构
        setShowCreateDialog(false);
        
        // 从重新加载的树结构中找到新创建的测试用例
        const findNewTestCase = (nodes: TreeNode[]): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === newTestCase.id) {
              return node;
            }
            if (node.children) {
              const found = findNewTestCase(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundTestCase = findNewTestCase(testCaseTree);
        if (foundTestCase) {
          setSelected(foundTestCase);
          setActiveId(foundTestCase.id);
        } else {
          // 如果找不到，使用API返回的数据（包含时间戳）
          setSelected({
            id: newTestCase.id,
            name: newTestCase.name,
            children: [],
            isFolder: false,
            createdAt: newTestCase.createdAt,
            updatedAt: newTestCase.updatedAt
          });
          setActiveId(newTestCase.id);
        }
        
        // 显示成功提示
        toast.success(t('testCase.alert.testCaseCreated', { name: newTestCase.name }));
      } else {
        const errorData = await response.json();
        console.error('Failed to create test case:', errorData);
        toast.error('创建测试用例失败，请重试');
      }
    } catch (error) {
      console.error('Error creating test case:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // 添加新文件夹的函数（为当前选中的folder添加子folder）
  const handleAddFolder = () => {
    setCreateType('folder');
    setShowCreateDialog(true);
  };

  // 添加新测试用例的函数
  const handleAddTestCase = () => {
    setCreateType('testcase');
    setShowCreateDialog(true);
  };

  // AI生成测试用例的函数 - 打开聊天助手并触发AI生成
  const handleAIGenerate = () => {
    setIsChatCollapsed(false);
    // 延迟一点时间确保聊天助手已经打开，然后触发AI生成对话框
    // setTimeout(() => {
    //   setShowAIGenerateDialog(true);
    // }, 100);
  };

  // AI生成成功的回调函数
  const handleAIGenerateSuccess = (result: any) => {
    console.log('🎉 AI generation completed:', result);

    // 显示成功消息
    if (result.message) {
      toast.success(result.message);
    }

    // 重新加载测试用例树以显示新创建的内容
    loadTestCaseTree(currentProject?.id);
  };

  // 删除测试用例的函数
  const handleDeleteTestCase = async (testCaseId: string) => {
    // 找到要删除的测试用例名称
    const testCaseName = selected?.name || '测试用例';

    const confirmed = window.confirm(
      `确定要删除测试用例 "${testCaseName}" 吗？\n\n此操作将永久删除该测试用例及其所有相关数据，包括：\n• 测试步骤\n• 执行历史\n• 版本记录\n\n此操作不可撤销！`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/test-case?id=${testCaseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除测试用例失败');
      }

      // 重新加载测试用例树
      await loadTestCaseTree(currentProject?.id);

      // 如果删除的是当前选中的测试用例，清除选中状态
      if (selected?.id === testCaseId) {
        setSelected(null);
        setSelectedTestCaseDetails(null);
      }

      // 显示成功消息
      console.log(`测试用例 "${testCaseName}" 删除成功`);
    } catch (error) {
      console.error('删除测试用例失败:', error);
      toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // AI 改进文件夹测试用例的函数
  const handleImproveFolder = async (folderId: string) => {
    if (isImprovingFolder) return; // 防止重复点击

    try {
      setIsImprovingFolder(true);
      const projectId = currentProject?.id || 'default-project';
      const locale = (globalThis as any).__intl__?.locale || 'en';

      toast.info(t('testCase.improve.analyzing'));

      const response = await fetch('/api/test-case/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          projectId,
          locale
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI improvement failed');
      }

      // 下载生成的Excel文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `test-case-improvements-${folderId}-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('testCase.improve.complete'));
    } catch (error) {
      console.error('AI improvement failed:', error);
      toast.error(t('testCase.improve.failed', {
        error: error instanceof Error ? error.message : String(error)
      }));
    } finally {
      setIsImprovingFolder(false);
    }
  };

  // 删除文件夹的函数
  const handleDeleteFolder = async (folderId: string) => {
    // 检查是否有选中的项目
    if (!currentProject?.id) {
      throw new Error('No project selected');
    }

    // 找到要删除的文件夹名称
    const folderName = selected?.name || '文件夹';

    // 检查文件夹是否包含子项目
    const folderNode = findNode(testCaseTree, folderId);
    const hasChildren = folderNode && folderNode.children && folderNode.children.length > 0;

    let confirmMessage = `确定要删除文件夹 "${folderName}" 吗？\n\n`;

    if (hasChildren) {
      confirmMessage += `⚠️ 警告：此文件夹包含 ${folderNode.children.length} 个子项目！\n\n此操作将永久删除：\n• 该文件夹\n• 文件夹内的所有子文件夹\n• 文件夹内的所有测试用例\n• 所有相关的测试步骤、执行历史和版本记录\n\n`;
    } else {
      confirmMessage += `此操作将永久删除该文件夹。\n\n`;
    }

    confirmMessage += `此操作不可撤销！`;

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    try {
      // 先尝试普通删除
      let response = await fetch(`/api/folder?id=${folderId}&projectId=${currentProject.id}`, {
        method: 'DELETE',
      });

      // 如果文件夹不为空，询问是否强制删除
      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 400 && errorData.hasSubFolders !== undefined) {
          // 文件夹包含内容，询问是否强制删除
          const forceConfirm = window.confirm(
            `文件夹不为空！\n\n包含内容：\n• ${errorData.subFoldersCount} 个子文件夹\n• ${errorData.testCasesCount} 个测试用例\n\n是否强制删除文件夹及其所有内容？\n\n⚠️ 此操作将永久删除所有内容，不可撤销！`
          );

          if (forceConfirm) {
            // 强制删除
            response = await fetch(`/api/folder?id=${folderId}&projectId=${currentProject.id}&force=true`, {
              method: 'DELETE',
            });
          } else {
            return; // 用户取消强制删除
          }
        }

        if (!response.ok) {
          const newErrorData = await response.json();
          throw new Error(newErrorData.message || newErrorData.error || '删除文件夹失败');
        }
      }

      // 重新加载测试用例树
      await loadTestCaseTree(currentProject?.id);

      // 如果删除的是当前选中的文件夹，清除选中状态
      if (selected?.id === folderId) {
        setSelected(null);
        setSelectedTestCaseDetails(null);
      }

      // 显示成功消息
      console.log(`文件夹 "${folderName}" 删除成功`);
    } catch (error) {
      console.error('删除文件夹失败:', error);
      toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 拖拽结束（保存到数据库）
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeNode = findNode(testCaseTree, active.id as string);
    const overNode = findNode(testCaseTree, over.id as string);

    if (!activeNode || !overNode) return;

    // 防止将节点拖拽到自己的子节点中
    const isDescendant = (parent: TreeNode, childId: string): boolean => {
      if (parent.id === childId) return true;
      return parent.children.some(child => isDescendant(child, childId));
    };

    if (isDescendant(activeNode, overNode.id)) return;

    // 移除原节点
    let newTree = removeNode(testCaseTree, activeNode.id);

    // 计算目标父节点
    let targetParentId: string | null = null;

    // 如果目标是文件夹，添加到其子节点中；否则添加到同级
    if (overNode.isFolder !== false) {
      newTree = addNodeToParent(newTree, overNode.id, activeNode);
      targetParentId = overNode.id;
    } else {
      // 找到目标节点的父节点，添加到同级
      const overParent = findParentNode(testCaseTree, overNode.id);
      if (overParent) {
        newTree = addNodeToParent(newTree, overParent.id, activeNode);
        targetParentId = overParent.id;
      } else {
        // 如果没有父节点，添加到根级别
        newTree = [...newTree, activeNode];
        targetParentId = null;
      }
    }

    setTestCaseTree(newTree);

    // 持久化到数据库
    try {
      await fetch('/api/tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: activeNode.id,
          nodeType: activeNode.isFolder !== false ? 'folder' : 'testCase',
          newParentId: targetParentId,
          projectId: currentProject?.id,
        }),
      });
      // 刷新树，确保与数据库一致
      await loadTestCaseTree(currentProject?.id);
    } catch (e) {
      console.error('Persist move failed:', e);
    }
  };

  // 处理节点选择
  const handleNodeSelect = (node: TreeNode) => {
    setSelected(node);
    // 如果选择的是测试用例，加载详情
    if (!node.isFolder) {
      loadTestCaseDetails(node.id, currentProject?.id);
    } else {
      setSelectedTestCaseDetails(null);
    }
  };

  // 点击空白处取消选中
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 只有点击的是背景元素本身时才取消选中
    if (e.target === e.currentTarget) {
      setSelected(null);
    }
  };

  // 渲染树节点的函数
  const renderTreeNodes = () => {
    if (!isClient) {
      // 服务器端渲染：使用简单的树节点
      return (
        <div key={`tree-${treeKey}`}>
          {testCaseTree.map((node) => (
            <SimpleTreeNode
              key={`${node.id}-${treeKey}`}
              node={node}
              onSelect={handleNodeSelect}
              selectedId={selected?.id}
              wrapText={wrapText}
              onDelete={handleDeleteNode}
              onRename={handleRenameNode}
              onDuplicate={handleDuplicateNode}
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
              onSelect={handleNodeSelect}
              selectedId={selected?.id}
              isDragging={activeId === node.id}
              wrapText={wrapText}
              onDelete={handleDeleteNode}
              onRename={handleRenameNode}
              onDuplicate={handleDuplicateNode}
            />
          ))}
        </div>
      </SortableContext>
    );
  };

  // 如果正在进行AI分析，显示全局loading状态
  if (isImprovingFolder) {
    return <ImproveLoading />;
  }

  const content = (
    <div className="test-case-page force-no-scrollbar flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 relative">

      {/* Main Content Area */}
      <div className="flex flex-1 relative">
        {/* Left: Enhanced Tree Panel */}
        {!sidebarCollapsed && (
          <div
            className="w-80 border-r border-slate-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden"
            onClick={handleBackgroundClick}
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
                    onClick={handleAddFolder}
                    title={t('testCase.createFolder')}
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={handleAddTestCase}
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
                    onClick={() => setWrapText(!wrapText)}
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
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 h-9 text-sm border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-zinc-800/90 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                    onClick={() => setSearch('')}
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
        )}

        {/* Right: Enhanced Main View */}
        <div className="flex-1 relative force-no-scrollbar">
          {/* Collapse Button and Module Buttons - Top Left Corner */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm"
              onClick={() => {
                const newCollapsed = !sidebarCollapsed;
                setSidebarCollapsed(newCollapsed);
                // 保存用户偏好设置（仅在桌面端保存）
                if (!isMobile) {
                  localStorage.setItem('test-case-sidebar-collapsed', newCollapsed.toString());
                }
              }}
              title={sidebarCollapsed ? t('testCase.expandSidebar') : t('testCase.collapseSidebar')}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Module Buttons - Only show when a test case is selected */}
            {selected && selected.isFolder === false && (
              <div className="flex flex-col gap-1">
                {getModuleButtons().map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    size="sm"
                    className={`w-10 h-10 p-0 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 backdrop-blur-sm transition-all duration-200 ${
                      activeModule === module.id
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-white/80 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    onClick={() => setActiveModule(module.id)}
                    title={module.label}
                  >
                    <module.icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {selected ? (
            /* Selected Item Details */
            <div className="p-6 pt-20">
              <Card className="max-w-6xl mx-auto shadow-lg border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm force-no-scrollbar">
                <div className="p-6">
                  <div className="relative">
                    <div className="flex items-start gap-4 mb-6">
                      {selected.isFolder ? (
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FolderIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <FileTextIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      <div className="flex-1 pr-4">
                        {isEditingTitle && !selected.isFolder ? (
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={handleTitleKeyPress}
                              className="text-lg font-bold h-auto py-1 px-2 border-2 border-blue-300 focus:border-blue-500 max-w-md"
                              placeholder={t('testCase.namePlaceholder')}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveTitle}
                              className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditTitle}
                              className="flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mb-2 group max-w-full">
                            <h2
                              className="text-lg font-bold text-slate-800 dark:text-slate-200 flex-shrink min-w-0"
                              title={selected.name}
                            >
                              {selected.name.length > 25 ? `${selected.name.substring(0, 25)}...` : selected.name}
                            </h2>
                            {!selected.isFolder && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleStartEditTitle}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 flex-shrink-0 ml-1"
                                title="编辑名称"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        <p className="text-slate-600 dark:text-slate-400">
                          {selected.isFolder ? t('common.folder') : t('common.testCase')} • {
                            selected.createdAt 
                              ? formatDate(selected.createdAt) 
                              : t('common.createdToday')
                          } • {
                            selected.updatedAt 
                              ? formatTimeAgo(selected.updatedAt) 
                              : t('common.lastModified2HoursAgo')
                          }
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons for Test Case - positioned to align with FileTextIcon */}
                    {!selected.isFolder && (
                      <div className="absolute top-3 right-0 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
                          onClick={() => handleDuplicateNode(selected)}
                          title={t('testCase.duplicate')}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {t('testCase.duplicate')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          onClick={() => handleDeleteTestCase(selected.id)}
                          title="删除测试用例"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Module Navigation for Test Cases */}
                  {selected.isFolder === false && (
                    <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {getModuleButtons().map((module) => (
                        <button
                          key={module.id}
                          onClick={() => setActiveModule(module.id)}
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
                  )}
improve
                  {/* Action Buttons for Folder */}
                  {selected.isFolder && (
                    <div className="flex flex-wrap gap-3 mb-6">
                      <ImportButton
                        projectId={currentProject?.id || ''}
                        parentFolderId={selected.id}
                        onImportComplete={() => {
                          // 刷新测试用例列表（显式传入当前项目ID，避免 useCallback 闭包中的旧值导致请求到 default-project）
                          console.log('🔁 Refresh tree after import, projectId:', currentProject?.id);
                          loadTestCaseTree(currentProject?.id);
                          toast.success(t('testCase.import.successMessage', { count: 0 }));
                        }}
                        className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
                      />
                      <Button
                        variant="outline"
                        className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
                      >
                        <FolderPlus className="w-4 h-4 mr-2" />
                        {t('testCase.addSubFolder')}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary hover:text-primary/80 transition-colors"
                        onClick={() => handleImproveFolder(selected.id)}
                        title={t('testCase.improveWithAI')}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('testCase.improveWithAI')}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        onClick={() => handleDeleteFolder(selected.id)}
                        title={t('testCase.deleteFolder')}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('testCase.deleteFolder')}
                      </Button>
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg p-8 test-case-content">
                    {selected.isFolder ? (
                      <p className="text-slate-600 dark:text-slate-400">
                        {t('testCase.folder.description', { count: selected.children.length })}
                      </p>
                    ) : (
                      /* Test Case Details */
                      <div className="space-y-8">
                        {renderModuleContent()}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* Empty State with Enhanced Add Test Cases */
            <div className="flex flex-col items-center justify-center h-full p-8 pt-20">
              <div className="max-w-2xl mx-auto text-center">
                {/* Illustration */}
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <FolderIcon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">{t('testCase.createFirst')}</h3>
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
                          handleCreateTestCase(newCase.trim());
                          setNewCase('');
                        }
                      }}
                    />
                    <Button
                      className={`h-12 px-8 text-base rounded-lg sm:flex-shrink-0 ${
                        newCase.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (newCase.trim()) {
                          handleCreateTestCase(newCase.trim());
                          setNewCase('');
                        }
                      }}
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
                      onClick={handleAIGenerate}
                    >
                      <span className="text-xl">🤖</span>
                      {t('testCase.generateWithAI')}
                    </Button>
                    <ImportButton
                      projectId={currentProject?.id || ''}
                      parentFolderId={undefined}
                      onImportComplete={() => {
                        // 刷新测试用例列表（显式传入当前项目ID，避免 useCallback 闭包中的旧值导致请求到 default-project）
                        console.log('🔁 Refresh tree after import, projectId:', currentProject?.id);
                        loadTestCaseTree(currentProject?.id);
                        toast.success(t('testCase.import.successMessage', { count: 0 }));
                      }}
                      className="flex items-center gap-3 px-6 h-12 text-base rounded-lg border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 浮动展开按钮 - 收起状态下显示 */}
        {isChatCollapsed && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsChatCollapsed(false)}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 h-12 w-12 p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
            title={t('testCase.assistant.expandTooltip')}
          >
            <Bot className="w-5 h-5 text-primary-foreground" />
          </Button>
        )}

        {/* AI Assistant Sidebar - 只在展开状态下显示 */}
        {!isChatCollapsed && (
          <>
            {/* 背景遮罩 - 点击收起聊天助手 */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 sm:bg-black/10"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                minHeight: '100vh'
              }}
              onClick={() => setIsChatCollapsed(true)}
            />
            <div className="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 shadow-2xl z-50 flex flex-col" style={{ minHeight: '100vh' }}>
              {selectedTestCaseDetails ? (
                <TestCaseAssistant
                  key={`testcase-${selectedTestCaseDetails.id}`}
                  testCase={selectedTestCaseDetails}
                  onTestCaseUpdate={async (updates) => {
                    console.log('🔄 TestCase update received:', updates);
                    console.log('📋 Current testCase:', selectedTestCaseDetails);

                    if (!selectedTestCaseDetails) return;

                    // 检查是否是来自 dataStream 的完整数据（包含 testCaseId 字段且与当前测试用例匹配）
                    const isFromDataStream = (updates as any).testCaseId === selectedTestCaseDetails.id;
                    console.log('🔍 Data source check:', {
                      updatesTestCaseId: (updates as any).testCaseId,
                      selectedTestCaseId: selectedTestCaseDetails.id,
                      isFromDataStream,
                      hasTestCaseId: !!(updates as any).testCaseId
                    });

                    if (isFromDataStream) {
                      console.log('📡 Update from dataStream - merging with existing data, no API call needed');
                      // 来自 dataStream 的数据需要与现有数据合并，确保不丢失关键字段如 id
                      const mergedTestCase = {
                        ...selectedTestCaseDetails,
                        ...updates,
                        id: selectedTestCaseDetails.id, // 确保 id 不被覆盖
                        updatedAt: new Date().toISOString(),
                        updatedBy: 'ai-assistant'
                      };
                      console.log('✅ Merged testCase data:', {
                        originalId: selectedTestCaseDetails.id,
                        updatesTestCaseId: (updates as any).testCaseId,
                        finalId: mergedTestCase.id
                      });
                      setSelectedTestCaseDetails(mergedTestCase);
                      // 只有在不是加载历史记录时才显示toast
                      if (!(updates as any).isFromHistory) {
                        toast.success(t('testCase.updateSuccess'));
                      }
                      return;
                    }

                    // 如果不是来自 dataStream，则是手动更新，需要保存到数据库
                    console.log('✋ Manual update - saving to database');
                    const updatedTestCase = {
                      ...selectedTestCaseDetails,
                      ...updates,
                      updatedAt: new Date().toISOString(),
                      updatedBy: 'ai-assistant' // 标记为AI更新
                    };
                    console.log('✅ Updated testCase:', updatedTestCase);

                    try {
                      // 保存到数据库
                      const response = await fetch(`/api/test-case?id=${selectedTestCaseDetails.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedTestCase),
                      });

                      if (!response.ok) {
                        throw new Error('Failed to save test case');
                      }

                      // 更新本地状态
                      setSelectedTestCaseDetails(updatedTestCase);

                      // 显示成功提示
                      toast.success(t('testCase.updateSuccess'));

                      console.log('✅ Test case saved to database successfully');
                    } catch (error) {
                      console.error('❌ Failed to save test case:', error);
                      toast.error(t('testCase.updateFailed'));
                    }
                  }}
                  onCollapse={() => setIsChatCollapsed(true)}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex flex-col">
                  {/* AI Assistant Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('testCase.assistant.aiAssistant')}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsChatCollapsed(true)}
                      className="h-8 w-8 p-0"
                      title={t('testCase.assistant.collapseTooltip')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Welcome Message and Quick Actions */}
                  <div className="flex-1 flex flex-col p-4 sm:p-6">
                    {/* Welcome Section */}
                    <div className="text-center text-slate-600 dark:text-slate-400 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-medium mb-2">{t('testCase.assistant.welcomeTitle')}</h4>
                      <p className="text-sm">
                        {t('testCase.assistant.welcomeMessage')}
                      </p>
                    </div>

                    {/* Quick Creation Actions */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        {t('testCase.assistant.quickActions')}
                      </h5>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto p-3 sm:p-4"
                        onClick={() => {
                          setShowAIGenerateDialog(true);
                          setIsChatCollapsed(true);
                        }}
                      >
                        <div className="flex items-start gap-3 w-full min-w-0">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium text-sm">{t('testCase.assistant.createWithAI')}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                              {t('testCase.assistant.createWithAIDesc')}
                            </div>
                          </div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto p-3 sm:p-4"
                        onClick={() => {
                          setShowCreateDialog(true);
                          setCreateType('testcase');
                          setIsChatCollapsed(true);
                        }}
                      >
                        <div className="flex items-start gap-3 w-full min-w-0">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium text-sm">{t('testCase.assistant.createManually')}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                              {t('testCase.assistant.createManuallyDesc')}
                            </div>
                          </div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto p-3 sm:p-4"
                        onClick={() => {
                          setShowCreateDialog(true);
                          setCreateType('folder');
                          setIsChatCollapsed(true);
                        }}
                      >
                        <div className="flex items-start gap-3 w-full min-w-0">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FolderPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium text-sm">{t('testCase.assistant.createFolder')}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                              {t('testCase.assistant.createFolderDesc')}
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>

                    {/* Tip */}
                    <div className="mt-8 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        💡 {t('testCase.selectTestCaseToStart')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // 根据是否在客户端决定是否包装DndContext
  if (!isClient) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      {/* Enhanced Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-white dark:bg-zinc-800 border border-primary/20 dark:border-primary/30 rounded-lg p-3 shadow-2xl ring-1 ring-primary/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {findNode(testCaseTree, activeId)?.isFolder !== false ? (
                <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                  <FolderIcon className="w-3 h-3 text-primary-foreground" />
                </div>
              ) : (
                <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                  <FileTextIcon className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {findNode(testCaseTree, activeId)?.name}
              </span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* 创建对话框 */}
      <CreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        type={createType}
        onCreateFolder={handleCreateFolder}
        onCreateTestCase={handleCreateTestCase}
        isCreating={isCreating}
        parentFolder={selected?.isFolder ? selected.name : undefined}
        t={t}
      />

      {/* AI生成测试用例对话框 */}
      <AIGenerateDialog
        open={showAIGenerateDialog}
        onOpenChange={setShowAIGenerateDialog}
        parentFolderId={selected?.isFolder ? selected.id : null}
        onSuccess={handleAIGenerateSuccess}
      />
    </DndContext>
  );
}

// 创建对话框组件
function CreateDialog({
  open,
  onOpenChange,
  type,
  onCreateFolder,
  onCreateTestCase,
  isCreating,
  parentFolder,
  t
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'folder' | 'testcase';
  onCreateFolder: (name: string, description?: string) => void;
  onCreateTestCase: (name: string, description?: string) => void;
  isCreating: boolean;
  parentFolder?: string;
  t: (id: string, values?: Record<string, any>) => string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (type === 'folder') {
      onCreateFolder(name.trim(), description.trim() || undefined);
    } else {
      onCreateTestCase(name.trim(), description.trim() || undefined);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setDescription('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'folder' ? t('testCase.createFolder') : t('testCase.newCase')}
          </DialogTitle>
          <DialogDescription>
            {type === 'folder'
              ? `Create a new folder${parentFolder ? ` inside "${parentFolder}"` : ' at the root level'}.`
              : `Create a new test case${parentFolder ? ` in "${parentFolder}"` : ' at the root level'}.`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {type === 'folder' ? t('testCase.createFolder') : t('testCase.newCase')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'folder' ? t('testCase.createFolder') + '...' : t('testCase.newCase') + '...'}
                disabled={isCreating}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('testCase.descriptionOptional')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'folder'
                  ? t('testCase.enterFolderDescription')
                  : t('testCase.enterTestCaseDescription')
                }
                disabled={isCreating}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              {t('testCase.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="min-w-[100px]"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                type === 'folder' ? t('testCase.createFolder') : t('testCase.newCase')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}