'use client';

import { Button } from '@/components/ui/button';
import {
  PanelLeft,
  PanelTop,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  useNavigationLayout,
  useSidebarCollapsed,
  useNavigationActions
} from '@/stores/simple-navigation-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavigationLayoutSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

export function NavigationLayoutSwitcher({
  className = '',
  showLabels = false
}: NavigationLayoutSwitcherProps) {
  // 使用 Zustand store
  const currentLayout = useNavigationLayout();
  const sidebarCollapsed = useSidebarCollapsed();
  const { toggleLayout, toggleSidebarCollapsed } = useNavigationActions();

  const handleLayoutToggle = () => {
    toggleLayout();
  };

  const handleSidebarToggle = () => {
    toggleSidebarCollapsed();
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* 侧边栏折叠切换 - 仅在垂直布局时显示 */}
        {currentLayout === 'vertical' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSidebarToggle}
                className="h-8 w-8 p-0"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* 导航布局切换 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLayoutToggle}
              className={`h-8 ${showLabels ? 'px-3' : 'w-8 p-0'}`}
            >
              {currentLayout === 'vertical' ? (
                <>
                  <PanelTop className="h-4 w-4" />
                  {showLabels && <span className="ml-2">水平导航</span>}
                </>
              ) : (
                <>
                  <PanelLeft className="h-4 w-4" />
                  {showLabels && <span className="ml-2">垂直导航</span>}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            切换到{currentLayout === 'vertical' ? '水平' : '垂直'}导航
          </TooltipContent>
        </Tooltip>

        {/* 当前布局指示器 */}
        {showLabels && (
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
            {currentLayout === 'vertical' ? (
              <>
                <PanelLeft className="h-3 w-3" />
                <span>垂直布局</span>
              </>
            ) : (
              <>
                <PanelTop className="h-3 w-3" />
                <span>水平布局</span>
              </>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// 简化版本的切换器
export function SimpleNavigationSwitcher() {
  const currentLayout = useNavigationLayout();
  const { toggleLayout } = useNavigationActions();

  const handleToggle = () => {
    toggleLayout();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-8 w-8 p-0"
      title={`切换到${currentLayout === 'vertical' ? '水平' : '垂直'}导航`}
    >
      {currentLayout === 'vertical' ? (
        <PanelTop className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </Button>
  );
}
