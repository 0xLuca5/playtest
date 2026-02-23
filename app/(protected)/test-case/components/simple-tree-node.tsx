'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FileTextIcon,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TreeNode } from '../types';

interface SimpleTreeNodeProps {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  wrapText?: boolean;
  onDelete?: (node: TreeNode) => void;
  onRename?: (node: TreeNode, newName: string) => void;
  onDuplicate?: (node: TreeNode) => void;
}

export function SimpleTreeNode({
  node,
  level = 0,
  onSelect,
  selectedId,
  wrapText = false,
  onDelete,
  onRename,
  onDuplicate
}: SimpleTreeNodeProps) {
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
      const newName = prompt('Enter new name:', node.name);
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

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 shadow-sm'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleNodeClick}
      >
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
            <DropdownMenuItem onClick={handleRename}>
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {!isFolder && (
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="ml-2 relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-700"></div>
          {node.children.map((child) => (
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
