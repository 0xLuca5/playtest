'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  ChevronRight,
  Building2,
  LoaderIcon,
  CheckIcon,
  PlusIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/lib/contexts/project-context';
import { CreateProjectDialog } from './create-project-dialog';
import { getProjectStatusInfo } from '@/lib/utils/project';
import { useIntl } from 'react-intl';

interface ProjectSwitcherProps {
  variant?: 'horizontal' | 'vertical';
  collapsed?: boolean;
  className?: string;
}

export function ProjectSwitcher({
  variant = 'horizontal',
  collapsed = false,
  className
}: ProjectSwitcherProps) {
  const {
    currentProject,
    projects,
    isLoading,
    error,
    switchProject
  } = useProject();

  const { formatMessage: t } = useIntl();

  const [switching, setSwitching] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [forceCreateDialog, setForceCreateDialog] = useState(false);

  // 检查是否需要强制创建项目
  useEffect(() => {
    if (!isLoading && projects.length === 0 && !showCreateDialog) {
      setForceCreateDialog(true);
      setShowCreateDialog(true);
    }
  }, [isLoading, projects.length, showCreateDialog]);

  const handleProjectSwitch = async (projectId: string) => {
    if (projectId === currentProject?.id) return;

    try {
      setSwitching(projectId);
      await switchProject(projectId);
    } catch (error) {
      console.error('Failed to switch project:', error);
    } finally {
      setSwitching(null);
    }
  };

  const handleCreateProject = () => {
    setShowCreateDialog(true);
  };

  const handleCreateDialogClose = (open: boolean) => {
    // 如果是强制创建模式且没有项目，不允许关闭
    if (forceCreateDialog && projects.length === 0) {
      return;
    }
    setShowCreateDialog(open);
    if (!open) {
      setForceCreateDialog(false);
    }
  };



  // 渲染触发按钮
  const renderTrigger = () => {
    if (isLoading) {
      return (
        <Button
          variant="ghost"
          disabled
          className={cn(
            "flex items-center gap-2",
            variant === 'vertical' ? "w-full p-2 text-sm" : "px-3 py-2",
            collapsed ? "justify-center" : "",
            className
          )}
        >
          <LoaderIcon className="w-4 h-4 animate-spin" />
          {!collapsed && <span className="text-sm">{t({ id: 'project.loading' })}</span>}
        </Button>
      );
    }

    if (!currentProject) {
      return (
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 text-muted-foreground",
            variant === 'vertical' ? "w-full p-2 text-sm" : "px-3 py-2",
            collapsed ? "justify-center" : "",
            className
          )}
        >
          <Building2 className="w-4 h-4" />
          {!collapsed && <span className="text-sm">{t({ id: 'project.noProject' })}</span>}
        </Button>
      );
    }

    if (variant === 'vertical') {
      return (
        <Button
          variant="ghost"
          className={cn(
            "flex items-center w-full p-2 text-sm rounded-md hover:bg-accent h-10",
            collapsed ? "justify-center" : "gap-2",
            className
          )}
        >
          {/* 项目图标 */}
          <div
            className={cn(
              "rounded-md flex items-center justify-center flex-shrink-0",
              collapsed ? "w-6 h-6" : "w-8 h-8"
            )}
            style={{
              backgroundColor: `${currentProject.color}20`,
              color: currentProject.color
            }}
          >
            <Command className={cn(collapsed ? "w-3 h-3" : "w-4 h-4")} />
          </div>

          {!collapsed && (
            <>
              {/* 项目信息 */}
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium leading-tight text-foreground truncate text-left">
                  {currentProject.name}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 leading-tight text-left">
                  {t({ id: getProjectStatusInfo(currentProject.status).labelKey })}
                </span>
              </div>

              {/* 箭头指示器 */}
              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </Button>
      );
    }

    // 水平布局
    return (
      <Button
        variant="ghost"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent",
          className
        )}
      >
        {/* 项目图标 */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${currentProject.color}20`,
            color: currentProject.color
          }}
        >
          <Command className="w-4 h-4" />
        </div>

        {/* 项目信息 */}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-sm font-medium leading-tight text-foreground text-left">
            {currentProject.name}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5 leading-tight text-left">
            {t({ id: getProjectStatusInfo(currentProject.status).labelKey })}
          </span>
        </div>

        {/* 箭头指示器 */}
        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </Button>
    );
  };

  // 渲染下拉菜单内容
  const renderDropdownContent = () => (
    <DropdownMenuContent align="start" className="w-64">
      <div className="p-3">
        <div className="text-sm font-medium mb-2">{t({ id: 'project.switchProject' })}</div>

        {projects.length === 0 ? (
          <div className="text-center py-4">
            <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{t({ id: 'project.noProjectsFound' })}</p>
            <Button
              size="sm"
              onClick={handleCreateProject}
              className="w-full"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {t({ id: 'project.createProject' })}
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectSwitch(project.id)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                  currentProject?.id === project.id
                    ? "bg-primary/10"
                    : "hover:bg-accent"
                )}
              >
                {/* 项目图标 */}
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{
                    backgroundColor: `${project.color}20`,
                    color: project.color
                  }}
                >
                  <Command className="w-4 h-4" />
                </div>

                {/* 项目信息 */}
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <div className="font-medium text-sm truncate leading-tight text-left">
                    {project.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight text-left">
                    {t({ id: getProjectStatusInfo(project.status).labelKey })}
                  </div>
                </div>

                {/* 状态指示器 */}
                <div className="flex items-center gap-2">
                  {switching === project.id && (
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                  )}
                  {currentProject?.id === project.id && (
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-2" />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCreateProject}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {t({ id: 'project.createProject' })}
            </Button>
          </>
        )}
      </div>
    </DropdownMenuContent>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        {renderDropdownContent()}
      </DropdownMenu>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={handleCreateDialogClose}
        forceMode={forceCreateDialog}
      />
    </>
  );
}

// 简化版项目指示器（只显示当前项目，不可点击）
export function ProjectIndicator({
  variant = 'horizontal',
  collapsed = false,
  className
}: ProjectSwitcherProps) {
  const { currentProject, isLoading } = useProject();
  const { formatMessage: t } = useIntl();

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        variant === 'vertical' ? "w-full p-2 text-sm" : "",
        collapsed ? "justify-center" : "",
        className
      )}>
        <LoaderIcon className="w-4 h-4 animate-spin" />
        {!collapsed && <span className="text-sm text-muted-foreground">{t({ id: 'project.loading' })}</span>}
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        variant === 'vertical' ? "w-full p-2 text-sm" : "",
        collapsed ? "justify-center" : "",
        className
      )}>
        <Building2 className="w-4 h-4 text-muted-foreground" />
        {!collapsed && <span className="text-sm text-muted-foreground">{t({ id: 'project.noProject' })}</span>}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={cn(
        "flex items-center gap-2 w-full p-2 text-sm",
        collapsed ? "justify-center" : "",
        className
      )}>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: `${currentProject.color}20`, color: currentProject.color }}
        >
          <Command className="w-6 h-6" />
        </div>
        {!collapsed && (
          <div className="flex flex-col items-start flex-1">
            <span className="text-sm font-medium leading-tight text-foreground">{currentProject.name}</span>
            <Badge
              variant={currentProject.status === 'active' ? 'default' :
                      currentProject.status === 'inactive' ? 'secondary' : 'outline'}
              className="text-xs h-5"
            >
              {t({ id: getProjectStatusInfo(currentProject.status).labelKey })}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // 水平布局
  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1",
      className
    )}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${currentProject.color}20`, color: currentProject.color }}
      >
        <Command className="w-6 h-6" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-base font-medium leading-tight">{currentProject.name}</span>
        <Badge
          variant={currentProject.status === 'active' ? 'default' :
                  currentProject.status === 'inactive' ? 'secondary' : 'outline'}
          className="text-xs h-5"
        >
          {t({ id: getProjectStatusInfo(currentProject.status).labelKey })}
        </Badge>
      </div>
    </div>
  );
}
