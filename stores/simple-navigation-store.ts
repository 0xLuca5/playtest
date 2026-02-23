'use client';

import { create } from 'zustand';

// 导航布局类型
export type NavigationLayout = 'vertical' | 'horizontal';

// 简化的导航状态
interface NavigationState {
  layout: NavigationLayout;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
}

// 导航操作
interface NavigationActions {
  setLayout: (layout: NavigationLayout) => void;
  toggleLayout: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;
}

// 完整的 Store 类型
type NavigationStore = NavigationState & NavigationActions;

// 创建简单的导航状态管理
export const useSimpleNavigationStore = create<NavigationStore>((set, get) => ({
  // 初始状态
  layout: 'vertical',
  sidebarCollapsed: false,
  sidebarOpen: true,

  // 操作
  setLayout: (layout) => {
    set({ layout });
    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('navigation-layout', layout);
      // 触发自定义事件以保持向后兼容
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
    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', collapsed.toString());
      // 触发自定义事件以保持向后兼容
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
}));

// 初始化函数 - 从 localStorage 恢复状态
export const initializeNavigationStore = () => {
  if (typeof window === 'undefined') return;

  const store = useSimpleNavigationStore.getState();
  
  // 恢复布局状态
  const savedLayout = localStorage.getItem('navigation-layout') as NavigationLayout;
  if (savedLayout && (savedLayout === 'vertical' || savedLayout === 'horizontal')) {
    store.setLayout(savedLayout);
  }

  // 恢复侧边栏状态
  const savedCollapsed = localStorage.getItem('sidebar-collapsed');
  if (savedCollapsed !== null) {
    store.setSidebarCollapsed(savedCollapsed === 'true');
  }
};

// 选择器 Hooks
export const useNavigationLayout = () => useSimpleNavigationStore((state) => state.layout);
export const useSidebarCollapsed = () => useSimpleNavigationStore((state) => state.sidebarCollapsed);
export const useSidebarOpen = () => useSimpleNavigationStore((state) => state.sidebarOpen);

// 操作 Hooks
export const useNavigationActions = () => useSimpleNavigationStore((state) => ({
  setLayout: state.setLayout,
  toggleLayout: state.toggleLayout,
  setSidebarCollapsed: state.setSidebarCollapsed,
  toggleSidebarCollapsed: state.toggleSidebarCollapsed,
  setSidebarOpen: state.setSidebarOpen,
}));

// 简化的菜单状态管理
interface MenuState {
  activeMenuId: string | null;
  expandedMenuIds: string[];
  breadcrumbs: Array<{ title: string; url: string }>;
}

interface MenuActions {
  setActiveMenu: (menuId: string | null) => void;
  setExpandedMenus: (menuIds: string[]) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ title: string; url: string }>) => void;
}

type MenuStore = MenuState & MenuActions;

export const useSimpleMenuStore = create<MenuStore>((set) => ({
  // 初始状态
  activeMenuId: null,
  expandedMenuIds: [],
  breadcrumbs: [{ title: 'Home', url: '/' }],

  // 操作
  setActiveMenu: (menuId) => set({ activeMenuId: menuId }),
  setExpandedMenus: (menuIds) => set({ expandedMenuIds: menuIds }),
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}));

// 菜单选择器 Hooks
export const useActiveMenu = () => useSimpleMenuStore((state) => state.activeMenuId);
export const useExpandedMenus = () => useSimpleMenuStore((state) => state.expandedMenuIds);
export const useBreadcrumbs = () => useSimpleMenuStore((state) => state.breadcrumbs);

// 菜单操作 Hooks
export const useMenuActions = () => useSimpleMenuStore((state) => ({
  setActiveMenu: state.setActiveMenu,
  setExpandedMenus: state.setExpandedMenus,
  setBreadcrumbs: state.setBreadcrumbs,
}));
