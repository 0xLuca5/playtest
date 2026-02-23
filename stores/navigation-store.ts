import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import React from 'react';

// 导航布局类型
export type NavigationLayout = 'vertical' | 'horizontal';

// 菜单项类型
export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  badge?: string;
  isActive?: boolean;
  children?: MenuItem[];
}

// 导航状态接口
export interface NavigationState {
  // 布局状态
  layout: NavigationLayout;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  
  // 菜单状态
  activeMenuId: string | null;
  expandedMenuIds: string[];
  menuItems: MenuItem[];
  
  // 面包屑
  breadcrumbs: Array<{ title: string; url: string }>;
  
  // 主题和UI状态
  showBreadcrumb: boolean;
  showSearch: boolean;
}

// 导航操作接口
export interface NavigationActions {
  // 布局操作
  setLayout: (layout: NavigationLayout) => void;
  toggleLayout: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // 菜单操作
  setActiveMenu: (menuId: string | null) => void;
  toggleMenuExpanded: (menuId: string) => void;
  setExpandedMenus: (menuIds: string[]) => void;
  updateMenuItems: (items: MenuItem[]) => void;
  
  // 面包屑操作
  setBreadcrumbs: (breadcrumbs: Array<{ title: string; url: string }>) => void;
  
  // UI操作
  setShowBreadcrumb: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  
  // 重置操作
  reset: () => void;
}

// 完整的 Store 类型
export type NavigationStore = NavigationState & NavigationActions;

// 默认状态
const defaultState: NavigationState = {
  layout: 'vertical',
  sidebarCollapsed: false,
  sidebarOpen: true,
  activeMenuId: null,
  expandedMenuIds: [],
  menuItems: [],
  breadcrumbs: [{ title: 'Home', url: '/' }],
  showBreadcrumb: true,
  showSearch: true,
};

// 创建导航状态管理 Store
export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set, get) => ({
        ...defaultState,

        // 布局操作
        setLayout: (layout) => {
          set({ layout });
          // 触发自定义事件以保持向后兼容
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('navigation-layout-change', {
              detail: layout
            }));
          }
        },
        
        toggleLayout: () => {
          const currentLayout = get().layout;
          const newLayout = currentLayout === 'vertical' ? 'horizontal' : 'vertical';
          get().setLayout(newLayout);
        },
        
        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed });
          // 触发自定义事件以保持向后兼容
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', {
              detail: collapsed
            }));
          }
        },
        
        toggleSidebarCollapsed: () => {
          const current = get().sidebarCollapsed;
          get().setSidebarCollapsed(!current);
        },
        
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        // 菜单操作
        setActiveMenu: (menuId) => set({ activeMenuId: menuId }),
        
        toggleMenuExpanded: (menuId) => {
          const { expandedMenuIds } = get();
          const newExpandedIds = expandedMenuIds.includes(menuId)
            ? expandedMenuIds.filter(id => id !== menuId)
            : [...expandedMenuIds, menuId];
          set({ expandedMenuIds: newExpandedIds });
        },
        
        setExpandedMenus: (menuIds) => set({ expandedMenuIds: menuIds }),
        
        updateMenuItems: (items) => set({ menuItems: items }),
        
        // 面包屑操作
        setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
        
        // UI操作
        setShowBreadcrumb: (show) => set({ showBreadcrumb: show }),
        setShowSearch: (show) => set({ showSearch: show }),
        
        // 重置操作
        reset: () => set(defaultState),
      }),
    {
      name: 'navigation-store', // localStorage 键名
      storage: createJSONStorage(() => localStorage),
      // 只持久化需要的状态
      partialize: (state) => ({
        layout: state.layout,
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenuIds: state.expandedMenuIds,
        showBreadcrumb: state.showBreadcrumb,
        showSearch: state.showSearch,
      }),
      // 添加 skipHydration 以避免 SSR 问题
      skipHydration: true,
    }
  )
);

// 客户端 hydration Hook
export const useNavigationStoreHydration = () => {
  React.useEffect(() => {
    useNavigationStore.persist.rehydrate();
  }, []);
};

// 选择器 Hooks - 用于性能优化，使用缓存的选择器函数
const layoutSelector = (state: NavigationStore) => state.layout;
const sidebarCollapsedSelector = (state: NavigationStore) => state.sidebarCollapsed;
const sidebarOpenSelector = (state: NavigationStore) => state.sidebarOpen;
const activeMenuSelector = (state: NavigationStore) => state.activeMenuId;
const expandedMenusSelector = (state: NavigationStore) => state.expandedMenuIds;
const menuItemsSelector = (state: NavigationStore) => state.menuItems;
const breadcrumbsSelector = (state: NavigationStore) => state.breadcrumbs;

// 安全的选择器 Hooks，处理 SSR
export const useNavigationLayout = () => {
  const layout = useNavigationStore(layoutSelector);
  return typeof window === 'undefined' ? 'vertical' : layout;
};

export const useSidebarCollapsed = () => {
  const collapsed = useNavigationStore(sidebarCollapsedSelector);
  return typeof window === 'undefined' ? false : collapsed;
};

export const useSidebarOpen = () => {
  const open = useNavigationStore(sidebarOpenSelector);
  return typeof window === 'undefined' ? true : open;
};

export const useActiveMenu = () => {
  const activeMenu = useNavigationStore(activeMenuSelector);
  return typeof window === 'undefined' ? null : activeMenu;
};

export const useExpandedMenus = () => {
  const expandedMenus = useNavigationStore(expandedMenusSelector);
  return typeof window === 'undefined' ? [] : expandedMenus;
};

export const useMenuItems = () => {
  const menuItems = useNavigationStore(menuItemsSelector);
  return typeof window === 'undefined' ? [] : menuItems;
};

export const useBreadcrumbs = () => {
  const breadcrumbs = useNavigationStore(breadcrumbsSelector);
  return typeof window === 'undefined' ? [{ title: 'Home', url: '/' }] : breadcrumbs;
};

// 操作 Hooks
export const useNavigationActions = () => useNavigationStore((state) => ({
  setLayout: state.setLayout,
  toggleLayout: state.toggleLayout,
  setSidebarCollapsed: state.setSidebarCollapsed,
  toggleSidebarCollapsed: state.toggleSidebarCollapsed,
  setSidebarOpen: state.setSidebarOpen,
  setActiveMenu: state.setActiveMenu,
  toggleMenuExpanded: state.toggleMenuExpanded,
  setExpandedMenus: state.setExpandedMenus,
  updateMenuItems: state.updateMenuItems,
  setBreadcrumbs: state.setBreadcrumbs,
  setShowBreadcrumb: state.setShowBreadcrumb,
  setShowSearch: state.setShowSearch,
  reset: state.reset,
}));

// 订阅状态变化的工具函数
export const subscribeToNavigationChanges = (
  callback: (state: NavigationState) => void
) => {
  return useNavigationStore.subscribe(callback);
};
