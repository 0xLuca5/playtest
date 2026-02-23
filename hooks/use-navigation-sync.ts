'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  useNavigationStore,
  useNavigationActions,
  useNavigationLayout,
  useSidebarCollapsed,
  useSidebarOpen,
  useBreadcrumbs
} from '@/stores/navigation-store-safe';
import { useMenuStore, useMenuActions } from '@/stores/menu-store';

/**
 * 导航状态同步 Hook
 * 负责同步路由变化、菜单状态和面包屑导航
 */
export function useNavigationSync() {
  const pathname = usePathname();

  // 监听路由变化，更新活跃菜单和面包屑
  useEffect(() => {
    // 获取最新的 actions（避免在依赖项中包含它们）
    const navigationActions = useNavigationStore.getState();
    const menuActions = useMenuStore.getState();

    // 根据当前路径设置活跃菜单
    menuActions.setActiveItemByUrl(pathname);

    // 生成面包屑
    const generateBreadcrumbs = (pathname: string) => {
      const segments = pathname.split('/').filter(Boolean);
      const breadcrumbs: { title: string; url: string }[] = [];

      let currentPath = '';
      segments.forEach((segment) => {
        currentPath += `/${segment}`;

        // 尝试从菜单中找到对应的标题
        const menuItem = menuActions.findItemByUrl(currentPath);
        const title = menuItem?.title || segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');

        breadcrumbs.push({
          title,
          url: currentPath
        });
      });

      return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs(pathname);
    navigationActions.setBreadcrumbs(breadcrumbs);

    // 自动展开包含活跃菜单项的父菜单
    const activeItem = menuActions.findItemByUrl(pathname);
    if (activeItem) {
      const itemPath = menuActions.getItemPath(activeItem.id);
      const parentIds = itemPath.slice(0, -1).map(item => item.id);

      // 合并现有的展开状态和新的父级ID
      const currentExpanded = useMenuStore.getState().expandedItemIds;
      const newExpanded = [...new Set([...currentExpanded, ...parentIds])];
      menuActions.setExpandedItems(newExpanded);
    }
  }, [pathname]); // 只依赖 pathname
  
  // 初始化菜单数据（如果需要从API获取）
  useEffect(() => {
    // 这里可以添加从API获取菜单数据的逻辑
    // const fetchMenuData = async () => {
    //   try {
    //     const response = await fetch('/api/menu');
    //     const menuData = await response.json();
    //     menuActions.setItems(menuData);
    //   } catch (error) {
    //     console.error('Failed to fetch menu data:', error);
    //   }
    // };
    // fetchMenuData();
  }, []);
}

/**
 * 导航状态持久化 Hook
 * 负责与旧的 localStorage 系统保持兼容
 */
export function useNavigationPersistence() {
  const navigationStore = useNavigationStore();
  
  useEffect(() => {
    // 监听 Zustand store 变化，同步到旧的 localStorage 系统
    const unsubscribe = useNavigationStore.subscribe(
      (state) => state.layout,
      (layout) => {
        // 保持与旧系统的兼容性
        if (typeof window !== 'undefined') {
          localStorage.setItem('navigation-layout', layout);
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    // 监听侧边栏折叠状态变化
    const unsubscribe = useNavigationStore.subscribe(
      (state) => state.sidebarCollapsed,
      (collapsed) => {
        // 保持与旧系统的兼容性
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebar-collapsed', collapsed.toString());
        }
      }
    );
    
    return unsubscribe;
  }, []);
}

/**
 * 键盘快捷键 Hook
 * 提供导航相关的键盘快捷键支持
 */
export function useNavigationKeyboard() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 获取最新的 actions（避免在依赖项中包含它们）
      const navigationActions = useNavigationStore.getState();
      const menuActions = useMenuStore.getState();

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

      // Ctrl/Cmd + K: 聚焦搜索
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // 这里可以触发搜索框聚焦
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // ESC: 清除搜索
      if (event.key === 'Escape') {
        menuActions.clearSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // 移除依赖项，在事件处理器内部获取最新状态
}

/**
 * 综合导航 Hook
 * 组合所有导航相关的功能
 */
export function useNavigation() {
  useNavigationSync();
  useNavigationPersistence();
  useNavigationKeyboard();

  // 使用安全的选择器 Hooks
  const layout = useNavigationLayout();
  const sidebarCollapsed = useSidebarCollapsed();
  const sidebarOpen = useSidebarOpen();
  const breadcrumbs = useBreadcrumbs();
  const activeMenuId = useMenuStore((state) => state.activeItemId);
  const searchQuery = useMenuStore((state) => state.searchQuery);

  const navigationActions = useNavigationActions();
  const menuActions = useMenuActions();

  return {
    // 状态 - 使用选择器获取的值
    navigation: {
      layout,
      sidebarCollapsed,
      sidebarOpen,
      breadcrumbs,
      activeMenuId,
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
    hasSearch: searchQuery.length > 0,
  };
}
