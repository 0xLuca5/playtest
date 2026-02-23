'use client';

import React, { useState } from 'react';
import { useProject } from '@/lib/contexts/project-context';
import { Project } from '@/lib/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDownIcon,
  FolderIcon,
  PlusIcon,
  CheckIcon,
  LoaderIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectStatusInfo } from '@/lib/utils/project';
import { useIntl } from 'react-intl';

interface ProjectSelectorProps {
  className?: string;
  showCreateButton?: boolean;
  onCreateProject?: () => void;
}

export function ProjectSelector({ 
  className, 
  showCreateButton = true,
  onCreateProject 
}: ProjectSelectorProps) {
  const { 
    currentProject, 
    projects, 
    isLoading, 
    error, 
    switchProject 
  } = useProject();
  
  const [switching, setSwitching] = useState<string | null>(null);
  const { formatMessage: t } = useIntl();

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



  if (error) {
    return (
      <div className={cn("flex items-center text-red-600 dark:text-red-400", className)}>
        <span className="text-sm">{t({ id: 'project.errorLoadingProjects' })}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 min-w-[200px] justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {currentProject ? (
                <>
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentProject.color }}
                  />
                  <span className="truncate">{currentProject.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", getProjectStatusInfo(currentProject.status).color)}
                  >
                    {t({ id: getProjectStatusInfo(currentProject.status).labelKey })}
                  </Badge>
                </>
              ) : (
                <>
                  <FolderIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t({ id: 'project.selectProject' })}</span>
                </>
              )}
            </div>
            {isLoading ? (
              <LoaderIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[300px]">
          <DropdownMenuLabel>{t({ id: 'project.projects' })}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {projects.length === 0 ? (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">{t({ id: 'project.noProjectsAvailable' })}</span>
            </DropdownMenuItem>
          ) : (
            projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectSwitch(project.id)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{project.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", getProjectStatusInfo(project.status).color)}
                      >
                        {t({ id: getProjectStatusInfo(project.status).labelKey })}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {project.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t({ id: 'project.key' })}: {project.key}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {switching === project.id && (
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                  )}
                  {currentProject?.id === project.id && (
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          {showCreateButton && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onCreateProject}
                className="flex items-center gap-2 p-3 cursor-pointer text-blue-600 dark:text-blue-400"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t({ id: 'project.createNewProject' })}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// 简化版项目选择器，只显示当前项目名称
export function ProjectIndicator({ className }: { className?: string }) {
  const { currentProject, isLoading } = useProject();
  const { formatMessage: t } = useIntl();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <LoaderIcon className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">{t({ id: 'project.loading' })}</span>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <FolderIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t({ id: 'project.noProject' })}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: currentProject.color }}
      />
      <span className="text-sm font-medium">{currentProject.name}</span>
    </div>
  );
}
