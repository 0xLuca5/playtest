// 导航布局配置系统
export type NavigationLayout = 'vertical' | 'horizontal';

export interface NavigationLayoutConfig {
  layout: NavigationLayout;
  showSidebar: boolean;
  showTopNav: boolean;
  sidebarCollapsed?: boolean;
  topNavHeight?: string;
  sidebarWidth?: string;
  collapsedSidebarWidth?: string;
}

// 导航布局配置
export const navigationLayouts: Record<NavigationLayout, NavigationLayoutConfig> = {
  vertical: {
    layout: 'vertical',
    showSidebar: true,
    showTopNav: false,
    sidebarCollapsed: false,
    sidebarWidth: 'w-64',
    collapsedSidebarWidth: 'w-16',
    topNavHeight: 'h-16'
  },
  horizontal: {
    layout: 'horizontal',
    showSidebar: false,
    showTopNav: true,
    sidebarCollapsed: false,
    sidebarWidth: 'w-64',
    collapsedSidebarWidth: 'w-16',
    topNavHeight: 'h-16'
  }
};

// 本地存储键
const NAVIGATION_LAYOUT_KEY = 'navigation-layout';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

// 获取当前导航布局
export function getCurrentNavigationLayout(): NavigationLayout {
  if (typeof window === 'undefined') return 'vertical';
  
  const stored = localStorage.getItem(NAVIGATION_LAYOUT_KEY);
  return (stored as NavigationLayout) || 'vertical';
}

// 设置导航布局
export function setNavigationLayout(layout: NavigationLayout): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(NAVIGATION_LAYOUT_KEY, layout);
  
  // 触发自定义事件
  window.dispatchEvent(new CustomEvent('navigation-layout-change', {
    detail: layout
  }));
}

// 获取侧边栏折叠状态
export function getSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return stored === 'true';
}

// 设置侧边栏折叠状态
export function setSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed.toString());
  
  // 触发自定义事件
  window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', {
    detail: collapsed
  }));
}

// 切换导航布局
export function toggleNavigationLayout(): NavigationLayout {
  const current = getCurrentNavigationLayout();
  const newLayout = current === 'vertical' ? 'horizontal' : 'vertical';
  setNavigationLayout(newLayout);
  return newLayout;
}

// 切换侧边栏折叠状态
export function toggleSidebarCollapsed(): boolean {
  const current = getSidebarCollapsed();
  const newState = !current;
  setSidebarCollapsed(newState);
  return newState;
}

// 获取导航布局配置
export function getNavigationLayoutConfig(layout: NavigationLayout): NavigationLayoutConfig {
  return {
    ...navigationLayouts[layout],
    sidebarCollapsed: getSidebarCollapsed()
  };
}
