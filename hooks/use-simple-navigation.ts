'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  useNavigationLayout,
  useSidebarCollapsed,
  useSidebarOpen,
  useNavigationActions,
  useActiveMenu,
  useExpandedMenus,
  useBreadcrumbs,
  useMenuActions,
  initializeNavigationStore
} from '@/stores/simple-navigation-store';

// 菜单数据
const menuItems = [
  {
    id: 'dashboard',
    title: '仪表板',
    url: '/dashboard',
  },
  {
    id: 'chat',
    title: '聊天',
    url: '/chat',
  },
  {
    id: 'test-case',
    title: '测试用例',
    url: '/test-case',
  },
  {
    id: 'test-plan',
    title: '测试计划',
    url: '/test-plan',
  },
  {
    id: 'test-report',
    title: '测试报告',
    url: '/test-report',
  },
  {
    id: 'projects',
    title: '项目列表',
    url: '/projects',
  },
  {
    id: 'tasks',
    title: '任务管理',
    url: '/tasks',
  },
  {
    id: 'team',
    title: '团队',
    url: '/team',
  },
  {
    id: 'calendar',
    title: '日历',
    url: '/calendar',
  },
  {
    id: 'settings',
    title: '设置',
    url: '/settings',
  },
];

/**
 * 简化的导航同步 Hook
 */
export function useSimpleNavigationSync() {
  const pathname = usePathname();
  const menuActions = useMenuActions();

  // 初始化状态（只在客户端执行一次）
  useEffect(() => {
    initializeNavigationStore();
  }, []);

  // 监听路由变化，更新活跃菜单和面包屑
  useEffect(() => {
    // 根据当前路径设置活跃菜单
    const activeItem = menuItems.find(item => item.url === pathname);
    if (activeItem) {
      menuActions.setActiveMenu(activeItem.id);
    } else {
      menuActions.setActiveMenu(null);
    }

    // 生成面包屑
    const generateBreadcrumbs = (pathname: string) => {
      const segments = pathname.split('/').filter(Boolean);
      const breadcrumbs: { title: string; url: string }[] = [];

      let currentPath = '';
      segments.forEach((segment) => {
        currentPath += `/${segment}`;

        // 尝试从菜单中找到对应的标题
        const menuItem = menuItems.find(item => item.url === currentPath);
        const title = menuItem?.title || segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');

        breadcrumbs.push({
          title,
          url: currentPath
        });
      });

      return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs(pathname);
    menuActions.setBreadcrumbs(breadcrumbs);
  }, [pathname, menuActions]);
}

/**
 * 键盘快捷键 Hook
 */
export function useNavigationKeyboard() {
  const navigationActions = useNavigationActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B: 切换侧边栏折叠
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        navigationActions.toggleSidebarCollapsed();
      }
      
      // Ctrl/Cmd + Shift + L: 切换布局
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        navigationActions.toggleLayout();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigationActions]);
}

/**
 * 综合导航 Hook
 */
export function useSimpleNavigation() {
  useSimpleNavigationSync();
  useNavigationKeyboard();
  
  // 获取状态
  const layout = useNavigationLayout();
  const sidebarCollapsed = useSidebarCollapsed();
  const sidebarOpen = useSidebarOpen();
  const activeMenuId = useActiveMenu();
  const expandedMenuIds = useExpandedMenus();
  const breadcrumbs = useBreadcrumbs();
  
  // 获取操作
  const navigationActions = useNavigationActions();
  const menuActions = useMenuActions();
  
  return {
    // 状态
    navigation: {
      layout,
      sidebarCollapsed,
      sidebarOpen,
      activeMenuId,
      expandedMenuIds,
      breadcrumbs,
    },
    
    // 操作
    actions: {
      ...navigationActions,
      ...menuActions,
    },
    
    // 便捷方法
    isVerticalLayout: layout === 'vertical',
    isHorizontalLayout: layout === 'horizontal',
    isSidebarCollapsed: sidebarCollapsed,
    isSidebarOpen: sidebarOpen,
    activeMenuItem: activeMenuId,
  };
}
