'use client';

import React, { useState } from 'react';
import { useProject } from '@/lib/contexts/project-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoaderIcon } from 'lucide-react';
import { useIntl } from 'react-intl';
import { getProjectStatusInfo } from '@/lib/utils/project';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forceMode?: boolean; // 强制模式，不允许关闭
}

const PROJECT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export function CreateProjectDialog({ open, onOpenChange, forceMode = false }: CreateProjectDialogProps) {
  const { refreshProjects, switchProject } = useProject();
  const [loading, setLoading] = useState(false);
  const { formatMessage: t } = useIntl();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    color: PROJECT_COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.key.trim()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { project } = await response.json();
      
      // 刷新项目列表
      await refreshProjects();
      
      // 切换到新创建的项目
      await switchProject(project.id);
      
      // 重置表单
      setFormData({
        name: '',
        description: '',
        key: '',
        status: 'active',
        color: PROJECT_COLORS[0],
      });

      // 关闭对话框
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  const generateKey = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      // 如果key为空或者是根据之前的name生成的，自动生成新的key
      key: !prev.key || prev.key === generateKey(prev.name) ? generateKey(name) : prev.key,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={forceMode ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={forceMode ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle>
            {forceMode ? t({ id: 'project.createFirstProject' }) : t({ id: 'project.createNewProject' })}
          </DialogTitle>
          <DialogDescription>
            {forceMode
              ? t({ id: 'project.createFirstProjectDesc' })
              : t({ id: 'project.createNewProjectDesc' })
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t({ id: 'project.projectName' })} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t({ id: 'project.enterProjectName' })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">{t({ id: 'project.projectKey' })} *</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
              placeholder="PROJECT_KEY"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t({ id: 'project.projectKeyDesc' })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t({ id: 'project.description' })}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t({ id: 'project.enterProjectDescription' })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t({ id: 'project.status' })}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive' | 'archived') =>
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t({ id: getProjectStatusInfo('active').labelKey })}</SelectItem>
                <SelectItem value="inactive">{t({ id: getProjectStatusInfo('inactive').labelKey })}</SelectItem>
                <SelectItem value="archived">{t({ id: getProjectStatusInfo('archived').labelKey })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t({ id: 'project.projectColor' })}</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color 
                      ? 'border-gray-900 dark:border-gray-100' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            {!forceMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t({ id: 'common.cancel' })}
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.key.trim()}
              className={forceMode ? "w-full" : ""}
            >
              {loading && <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />}
              {forceMode ? t({ id: 'project.createProjectAndContinue' }) : t({ id: 'project.createProject' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
