'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Target,
  Bot,
  Link,
  Database,
  PlayCircle,
  Bug,
  X,
  Sparkles,
  Plus,
  FolderPlus,
  MessageSquare
} from 'lucide-react';

import { useProject } from '@/lib/contexts/project-context';
import { useI18n } from '@/hooks/use-i18n';
import { AIGenerateDialog } from '@/components/test-case/ai-generate-dialog';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigation-store';
import { useResponsive } from '@/hooks/use-responsive';

// Import new component structure
import { TreeNavigationPanel } from './components/tree-navigation-panel';
import { FolderContentPanel } from './components/folder-content-panel';
import { TestCaseContentPanel } from './components/test-case-content-panel';
import { EmptyState } from './components/empty-state';

// Import TestCaseAssistant from the detail page
import TestCaseAssistant from './components/testcase-assistant';

// Import types
import { TreeNode, ModuleButtonConfig, CreateType } from './types';
import { TestCase as DetailTestCase } from './[id]/types';

// DnD Kit imports
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

// Create Dialog Component (simplified)
interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CreateType;
  onCreateFolder: (name: string) => void;
  onCreateTestCase: (name: string) => void;
  isCreating: boolean;
  parentFolder?: string;
  t: (key: string, values?: Record<string, any>) => string;
}

function CreateDialog({ open, onOpenChange, type, onCreateFolder, onCreateTestCase, isCreating, parentFolder, t }: CreateDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    if (type === 'folder') {
      onCreateFolder(name.trim());
    } else {
      onCreateTestCase(name.trim());
    }
    setName('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {type === 'folder' ? t('testCase.createFolder') : t('testCase.newCase')}
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'folder' ? t('testCase.folderName') : t('testCase.testCaseName')}
          className="w-full p-2 border rounded-md mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isCreating}>
            {isCreating ? t('common.creating') : t('common.create')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TestCasePage() {
  const { t } = useI18n();
  const { currentProject, isLoading: projectLoading } = useProject();
  const { isMobile } = useResponsive();
  
  // State management
  const [testCaseTree, setTestCaseTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [selectedTestCaseDetails, setSelectedTestCaseDetails] = useState<DetailTestCase | null>(null);
  const [activeModule, setActiveModule] = useState('information');
  const [search, setSearch] = useState('');
  const [wrapText, setWrapText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Ref to track loaded project to prevent duplicate loads
  const loadedProjectRef = useRef<string | null>(null);

  // Search input ref for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);



  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIGenerateDialog, setShowAIGenerateDialog] = useState(false);
  const [createType, setCreateType] = useState<CreateType>('testCase');
  const [isCreating, setIsCreating] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load test case tree
  const loadTestCaseTree = useCallback(async (projectId?: string) => {
    if (!projectId) return;

    console.log('🌳 loadTestCaseTree called with projectId:', projectId);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/test-case-tree?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received tree data:', data.tree?.length, 'items', data.tree);
        setTestCaseTree(data.tree || []);
        setTreeKey(prev => prev + 1);
      } else {
        console.error('Failed to fetch tree data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load test case tree:', error);
      toast.error('Failed to load test case tree'); // Use static error message to avoid dependency
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove t dependency to prevent infinite loop

  // Load test case details
  const loadTestCaseDetails = useCallback(async (testCaseId: string, projectId?: string) => {
    if (!testCaseId) return;

    try {
      console.log('🔍 Loading test case details:', testCaseId);
      const response = await fetch(`/api/test-case/by-id?id=${testCaseId}`);
      if (response.ok) {
        const testCase = await response.json();
        console.log('✅ Test case details loaded:', testCase.name);
        setSelectedTestCaseDetails(testCase);
      } else {
        console.error('Failed to load test case details:', response.status, response.statusText);
        setSelectedTestCaseDetails(null);
      }
    } catch (error) {
      console.error('Error loading test case details:', error);
      setSelectedTestCaseDetails(null);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    console.log('🔄 Initial data load effect triggered:', {
      projectId: currentProject?.id,
      projectName: currentProject?.name,
      projectLoading,
      hasProject: !!currentProject?.id,
      loadedProject: loadedProjectRef.current
    });

    if (currentProject?.id && !projectLoading && loadedProjectRef.current !== currentProject.id) {
      console.log('📡 Loading test case tree for project:', currentProject.id, 'name:', currentProject.name);
      loadedProjectRef.current = currentProject.id;
      loadTestCaseTree(currentProject.id);
    }
  }, [currentProject?.id, projectLoading]); // Removed loadTestCaseTree from dependencies to prevent infinite loop

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
  }, [isMobile]);

  // Get module buttons configuration
  const getModuleButtons = (): ModuleButtonConfig[] => [
    { id: 'information', label: t('testCase.modules.information'), icon: Info, color: 'blue' },
    { id: 'steps', label: t('testCase.modules.steps'), icon: Target, color: 'green' },
    { id: 'automation', label: t('testCase.modules.automation'), icon: Bot, color: 'purple' },
    { id: 'documents', label: t('testCase.modules.documents'), icon: Link, color: 'orange' },
    { id: 'dataset', label: t('testCase.modules.dataset'), icon: Database, color: 'cyan' },
    { id: 'testruns', label: t('testCase.modules.testRuns'), icon: PlayCircle, color: 'indigo' },
    { id: 'issues', label: t('testCase.modules.issues'), icon: Bug, color: 'red' },
    { id: 'comments', label: t('testCase.modules.comments'), icon: MessageSquare, color: 'purple' }
  ];

  // Event handlers
  const handleNodeSelect = (node: TreeNode) => {
    setSelected(node);

    // 自动收起AI助手聊天框
    setIsChatCollapsed(true);

    if (!node.isFolder) {
      loadTestCaseDetails(node.id, currentProject?.id);
    } else {
      setSelectedTestCaseDetails(null);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null);
    }
  };

  const handleAddFolder = (parentNode?: TreeNode) => {
    if (parentNode) {
      setSelected(parentNode); // 设置父节点为选中状态
    }
    setCreateType('folder');
    setShowCreateDialog(true);
  };

  const handleAddTestCase = (parentNode?: TreeNode) => {
    if (parentNode) {
      setSelected(parentNode); // 设置父节点为选中状态
    }
    setCreateType('testCase');
    setShowCreateDialog(true);
  };

  const handleCreateFolder = async (name: string, description?: string) => {
    setIsCreating(true);
    try {
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

        // 显示成功提示
        toast.success(t('testCase.alert.folderCreated', { name: newFolder.name }));
      } else {
        const errorData = await response.json();
        console.error('Failed to create folder:', errorData);
        toast.error('创建文件夹失败，请重试');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(t('testCase.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTestCase = async (name: string, description?: string) => {
    setIsCreating(true);
    try {
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

        // 显示成功提示
        toast.success(t('testCase.alert.testCaseCreated', { name: newTestCase.name }));
      } else {
        const errorData = await response.json();
        console.error('Failed to create test case:', errorData);
        toast.error('创建测试用例失败，请重试');
      }
    } catch (error) {
      console.error('Error creating test case:', error);
      toast.error(t('testCase.createError'));
    } finally {
      setIsCreating(false);
    }
  };

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

  const handleRenameNode = async (node: TreeNode, newName: string) => {
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

  const handleDuplicateNode = async (node: TreeNode) => {
    if (node.isFolder !== false) {
      toast.error(t('testCase.cannotDuplicateFolder'));
      return;
    }

    try {
      // 首先获取原测试用例的详细信息
      const detailsResponse = await fetch(`/api/test-case/by-id?id=${node.id}`);
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch test case details');
      }

      const originalTestCase = await detailsResponse.json();

      // 创建副本，名称添加 " - copy"
      const copyName = `${originalTestCase.name} - copy`;
      const copyDescription = originalTestCase.description || `Copy of ${originalTestCase.name}`;

      const createResponse = await fetch('/api/test-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: copyName,
          description: copyDescription,
          folderId: originalTestCase.folderId,
          projectId: currentProject?.id || 'default-project',
          priority: originalTestCase.priority || 'medium',
          status: 'draft'
        }),
      });

      if (createResponse.ok) {
        // 刷新树结构
        await loadTestCaseTree(currentProject?.id);
        toast.success(t('testCase.duplicateSuccess'));
      } else {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create copy');
      }
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast.error(t('testCase.duplicateFailed'));
    }
  };

  // 文件夹相关操作
  const handleImproveFolder = async (folderId: string) => {
    try {
      const projectId = currentProject?.id || 'default-project';
      const locale = 'en'; // 可以从i18n获取

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
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!currentProject?.id) {
      throw new Error('No project selected');
    }

    const folderName = selected?.name || '文件夹';
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
    if (!confirmed) return;

    try {
      let response = await fetch(`/api/folder?id=${folderId}&projectId=${currentProject.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.hasSubFolders !== undefined) {
          const forceConfirm = window.confirm(
            `文件夹不为空！\n\n包含内容：\n• ${errorData.subFoldersCount} 个子文件夹\n• ${errorData.testCasesCount} 个测试用例\n\n是否强制删除文件夹及其所有内容？\n\n⚠️ 此操作将永久删除所有内容，不可撤销！`
          );

          if (forceConfirm) {
            response = await fetch(`/api/folder?id=${folderId}&projectId=${currentProject.id}&force=true`, {
              method: 'DELETE',
            });
          } else {
            return;
          }
        }

        if (!response.ok) {
          const newErrorData = await response.json();
          throw new Error(newErrorData.message || newErrorData.error || '删除文件夹失败');
        }
      }

      await loadTestCaseTree(currentProject?.id);
      if (selected?.id === folderId) {
        setSelected(null);
        setSelectedTestCaseDetails(null);
      }
      toast.success('文件夹删除成功');
    } catch (error) {
      console.error('Delete folder failed:', error);
      toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleAddSubFolder = (parentFolderId: string) => {
    // 设置父文件夹为选中状态，然后打开创建对话框
    const parentFolder = findNode(testCaseTree, parentFolderId);
    if (parentFolder) {
      setSelected(parentFolder);
    }
    setCreateType('folder');
    setShowCreateDialog(true);
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    const testCaseName = selectedTestCaseDetails?.name || '测试用例';

    const confirmMessage = `确定要删除测试用例 "${testCaseName}" 吗？\n\n此操作将永久删除：\n• 该测试用例\n• 所有相关的测试步骤\n• 执行历史和版本记录\n\n此操作不可撤销！`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/test-case?id=${testCaseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || '删除测试用例失败');
      }

      // 刷新树结构
      await loadTestCaseTree(currentProject?.id);

      // 清空选中状态
      setSelected(null);
      setSelectedTestCaseDetails(null);

      toast.success('测试用例删除成功');
    } catch (error) {
      console.error('Delete test case failed:', error);
      toast.error(`删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

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
      return parent.children?.some(child => isDescendant(child, childId)) || false;
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
      toast.success(t('testCase.moveSuccess'));
    } catch (error) {
      console.error('移动节点失败:', error);
      toast.error(t('testCase.moveError'));
      // 回滚状态
      loadedProjectRef.current = null;
      loadTestCaseTree(currentProject?.id);
    }
  };

  // Tree utility functions
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

  const findParentNode = (nodes: TreeNode[], childId: string, parent: TreeNode | null = null): TreeNode | null => {
    for (const node of nodes) {
      if (node.children?.some(child => child.id === childId)) {
        return node;
      }
      if (node.children) {
        const found = findParentNode(node.children, childId, node);
        if (found) return found;
      }
    }
    return null;
  };

  const removeNode = (nodes: TreeNode[], id: string): TreeNode[] => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = removeNode(node.children, id);
      }
      return true;
    });
  };

  const addNodeToParent = (nodes: TreeNode[], parentId: string, newNode: TreeNode): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode]
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

  // Utility functions
  const formatDate = (date: string | Date | number) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTimeAgo = (date: string | Date | number) => {
    const now = Date.now();
    const timestamp = typeof date === 'number' ? date : new Date(date).getTime();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Render main content
  const renderMainContent = () => {
    if (!selected) {
      return (
        <EmptyState
          onAddFolder={handleAddFolder}
          onAddTestCase={(name: string) => {
            // Create test case with the provided name
            handleCreateTestCase(name);
          }}
          onAIGenerate={() => setShowAIGenerateDialog(true)}
          onImportComplete={() => {
            loadedProjectRef.current = null;
            loadTestCaseTree(currentProject?.id);
          }}
          currentProject={currentProject}
          isCreating={isCreating}
          t={t}
        />
      );
    }

    if (selected.isFolder) {
      return (
        <FolderContentPanel
          selectedFolder={selected}
          currentProject={currentProject}
          onImportComplete={() => {
            loadedProjectRef.current = null;
            loadTestCaseTree(currentProject?.id);
          }}
          onImproveFolder={handleImproveFolder}
          onDeleteFolder={handleDeleteFolder}
          onAddSubFolder={handleAddSubFolder}
          formatDate={formatDate}
          formatTimeAgo={formatTimeAgo}
          t={t}
        />
      );
    }

    return (
      <TestCaseContentPanel
        selectedTestCase={selected}
        selectedTestCaseDetails={selectedTestCaseDetails}
        activeModule={activeModule}
        moduleButtons={getModuleButtons()}
        onModuleChange={setActiveModule}
        onDuplicateTestCase={handleDuplicateNode}
        onDeleteTestCase={handleDeleteTestCase}
        formatDate={formatDate}
        formatTimeAgo={formatTimeAgo}
        t={t}
      />
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="test-case-page force-no-scrollbar flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 relative">
        {/* Main Content Area */}
        <div className="flex flex-1 relative">
          {/* Left: Tree Navigation Panel */}
          {!sidebarCollapsed && (
            <TreeNavigationPanel
              testCaseTree={testCaseTree}
              selected={selected}
              search={search}
              wrapText={wrapText}
              isLoading={isLoading}
              isClient={isClient}
              treeKey={treeKey}
              activeId={activeId}
              searchInputRef={searchInputRef}
              onNodeSelect={handleNodeSelect}
              onBackgroundClick={handleBackgroundClick}
              onSearchChange={setSearch}
              onWrapTextToggle={() => setWrapText(!wrapText)}
              onAddFolder={handleAddFolder}
              onAddTestCase={handleAddTestCase}
              onDeleteNode={handleDeleteNode}
              onRenameNode={handleRenameNode}
              onDuplicateNode={handleDuplicateNode}
              t={t}
            />
          )}

          {/* Right: Main Content */}
          <div className="flex-1 relative force-no-scrollbar">
            {/* Collapse Button and Module Buttons */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {/* Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? t('testCase.showSidebar') : t('testCase.hideSidebar')}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </Button>

              {/* Module Buttons - Only show when a test case is selected */}
              {selected && !selected.isFolder && (
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

            {/* Main Content */}
            {selected ? (
              /* Selected Item Details - Centered with Card */
              <div className="pt-20">
                <Card className="max-w-6xl mx-auto shadow-lg border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm force-no-scrollbar">
                  {renderMainContent()}
                </Card>
              </div>
            ) : (
              /* Empty State - Full Screen */
              renderMainContent()
            )}
          </div>
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

        {/* AI Assistant */}
        <div className={`fixed right-0 top-0 w-[480px] h-full border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 transition-transform duration-300 z-[60] ${
          isChatCollapsed ? 'translate-x-full' : 'translate-x-0'
        }`}>
          {selected && !selected.isFolder && selectedTestCaseDetails ? (
            <TestCaseAssistant
              testCase={selectedTestCaseDetails}
              onTestCaseUpdate={(updates) => {
                if (selectedTestCaseDetails) {
                  setSelectedTestCaseDetails(prev => prev ? { ...prev, ...updates } : null);
                }
              }}
              onCollapse={() => setIsChatCollapsed(true)}
              className="h-full"
              isVisible={!isChatCollapsed}
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
                      setCreateType('testCase');
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
      </div>

      {/* Create Dialog */}
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

      {/* AI Generate Dialog */}
      <AIGenerateDialog
        open={showAIGenerateDialog}
        onOpenChange={setShowAIGenerateDialog}
        parentFolderId={selected?.isFolder ? selected.id : null}
        onSuccess={() => {
          loadedProjectRef.current = null;
          loadTestCaseTree(currentProject?.id);
          setShowAIGenerateDialog(false);
        }}
      />
    </DndContext>
  );
}
