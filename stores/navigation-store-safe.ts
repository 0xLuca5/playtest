import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';

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
const navigationStore = create<NavigationStore>()(
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
      name: 'navigation-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        layout: state.layout,
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenuIds: state.expandedMenuIds,
        showBreadcrumb: state.showBreadcrumb,
        showSearch: state.showSearch,
      }),
    }
  )
);

// 安全的选择器 Hooks，使用 useSyncExternalStore
export const useNavigationLayout = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().layout,
    () => 'vertical' // SSR fallback
  );
};

export const useSidebarCollapsed = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().sidebarCollapsed,
    () => false // SSR fallback
  );
};

export const useSidebarOpen = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().sidebarOpen,
    () => true // SSR fallback
  );
};

export const useActiveMenu = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().activeMenuId,
    () => null // SSR fallback
  );
};

export const useExpandedMenus = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().expandedMenuIds,
    () => [] // SSR fallback
  );
};

export const useMenuItems = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().menuItems,
    () => [] // SSR fallback
  );
};

export const useBreadcrumbs = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => navigationStore.getState().breadcrumbs,
    () => [{ title: 'Home', url: '/' }] // SSR fallback
  );
};

// 操作 Hooks
export const useNavigationActions = () => {
  return useSyncExternalStore(
    navigationStore.subscribe,
    () => ({
      setLayout: navigationStore.getState().setLayout,
      toggleLayout: navigationStore.getState().toggleLayout,
      setSidebarCollapsed: navigationStore.getState().setSidebarCollapsed,
      toggleSidebarCollapsed: navigationStore.getState().toggleSidebarCollapsed,
      setSidebarOpen: navigationStore.getState().setSidebarOpen,
      setActiveMenu: navigationStore.getState().setActiveMenu,
      toggleMenuExpanded: navigationStore.getState().toggleMenuExpanded,
      setExpandedMenus: navigationStore.getState().setExpandedMenus,
      updateMenuItems: navigationStore.getState().updateMenuItems,
      setBreadcrumbs: navigationStore.getState().setBreadcrumbs,
      setShowBreadcrumb: navigationStore.getState().setShowBreadcrumb,
      setShowSearch: navigationStore.getState().setShowSearch,
      reset: navigationStore.getState().reset,
    }),
    () => ({
      setLayout: () => {},
      toggleLayout: () => {},
      setSidebarCollapsed: () => {},
      toggleSidebarCollapsed: () => {},
      setSidebarOpen: () => {},
      setActiveMenu: () => {},
      toggleMenuExpanded: () => {},
      setExpandedMenus: () => {},
      updateMenuItems: () => {},
      setBreadcrumbs: () => {},
      setShowBreadcrumb: () => {},
      setShowSearch: () => {},
      reset: () => {},
    }) // SSR fallback
  );
};

// 导出 store 实例
export const useNavigationStore = navigationStore;

// 订阅状态变化的工具函数
export const subscribeToNavigationChanges = (
  callback: (state: NavigationState) => void
) => {
  return navigationStore.subscribe(callback);
};
