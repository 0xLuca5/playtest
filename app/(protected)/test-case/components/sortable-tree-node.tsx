'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FileTextIcon,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  GripVertical,
  FolderPlus,
  FilePlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TreeNode } from '../types';
import { useI18n } from '@/hooks/use-i18n';

interface SortableTreeNodeProps {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  isDragging?: boolean;
  wrapText?: boolean;
  onDelete?: (node: TreeNode) => void;
  onRename?: (node: TreeNode, newName: string) => void;
  onDuplicate?: (node: TreeNode) => void;
  onAddFolder?: (parentNode: TreeNode) => void;
  onAddTestCase?: (parentNode: TreeNode) => void;
}

export function SortableTreeNode({
  node,
  level = 0,
  onSelect,
  selectedId,
  isDragging = false,
  wrapText = false,
  onDelete,
  onRename,
  onDuplicate,
  onAddFolder,
  onAddTestCase
}: SortableTreeNodeProps) {
  const { t } = useI18n();
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
    e.stopPropagation();
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
      const newName = prompt(t('testCase.tree.renamePrompt'), node.name);
      if (newName && newName.trim() !== node.name) {
        onRename(node, newName.trim());
      }
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(node);
    }
  };

  const isSelected = selectedId === node.id;

  // 提取公共的菜单项组件
  const MenuItems = ({ inContextMenu = false }: { inContextMenu?: boolean }) => (
    <>
      {isFolder && inContextMenu && (
        <>
          <ContextMenuItem onClick={() => onAddFolder?.(node)} className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            {t('testCase.tree.newFolder')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onAddTestCase?.(node)} className="flex items-center gap-2">
            <FilePlus className="w-4 h-4" />
            {t('testCase.tree.newTestCase')}
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      
      {!inContextMenu ? (
        <>
          <DropdownMenuItem onClick={handleRename}>
            <Edit className="w-4 h-4 mr-2" />
            {t('common.rename')}
          </DropdownMenuItem>
          {!isFolder && (
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              {t('common.duplicate')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('common.delete')}
          </DropdownMenuItem>
        </>
      ) : (
        <>
          {!isFolder && (
            <>
              <ContextMenuItem onClick={handleDuplicate} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                {t('common.duplicate')}
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename} className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            {t('common.rename')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </ContextMenuItem>
        </>
      )}
    </>
  );

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            } ${isDragging ? 'shadow-lg ring-2 ring-blue-500/20' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={handleNodeClick}
          >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        </div>

        {/* Expand/Collapse Icon */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            open ? (
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            )
          ) : null}
        </div>

        {/* Node Icon */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isFolder ? (
            <FolderIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          ) : (
            <FileTextIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
          )}
        </div>

        {/* Node Name */}
        <span
          className={`flex-1 text-sm font-medium ${
            wrapText ? 'break-words' : 'truncate'
          } ${isSelected ? 'text-blue-900 dark:text-blue-100' : ''}`}
          title={node.name}
        >
          {node.name}
        </span>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <MenuItems inContextMenu={false} />
          </DropdownMenuContent>
        </DropdownMenu>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <MenuItems inContextMenu={true} />
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
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
