import { create } from 'zustand';
import { MenuItem } from './navigation-store';

// 菜单配置数据
export const defaultMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: '仪表板',
    url: '/dashboard',
    icon: 'Home',
    isActive: false,
  },
  {
    id: 'chat',
    title: '聊天',
    url: '/chat',
    icon: 'MessageSquare',
    badge: 'AI',
    isActive: false,
  },
  {
    id: 'test-management',
    title: '测试管理',
    url: '#',
    icon: 'FileText',
    isActive: false,
    children: [
      {
        id: 'test-cases',
        title: '测试用例',
        url: '/test-case',
        isActive: false,
      },
      {
        id: 'test-plans',
        title: '测试计划',
        url: '/test-plan',
        isActive: false,
      },
      {
        id: 'test-reports',
        title: '测试报告',
        url: '/test-report',
        isActive: false,
      },
    ],
  },
  {
    id: 'project-management',
    title: '项目管理',
    url: '#',
    icon: 'BarChart3',
    isActive: false,
    children: [
      {
        id: 'projects',
        title: '项目列表',
        url: '/projects',
        isActive: false,
      },
      {
        id: 'tasks',
        title: '任务管理',
        url: '/tasks',
        isActive: false,
      },
      {
        id: 'milestones',
        title: '里程碑',
        url: '/milestones',
        isActive: false,
      },
    ],
  },
  {
    id: 'team',
    title: '团队',
    url: '/team',
    icon: 'Users',
    isActive: false,
  },
  {
    id: 'calendar',
    title: '日历',
    url: '/calendar',
    icon: 'Calendar',
    isActive: false,
  },
  {
    id: 'settings',
    title: '设置',
    url: '/settings',
    icon: 'Settings',
    isActive: false,
  },
];

// 菜单状态接口
export interface MenuState {
  items: MenuItem[];
  activeItemId: string | null;
  expandedItemIds: string[];
  searchQuery: string;
  filteredItems: MenuItem[];
}

// 菜单操作接口
export interface MenuActions {
  // 菜单项操作
  setItems: (items: MenuItem[]) => void;
  addItem: (item: MenuItem, parentId?: string) => void;
  updateItem: (id: string, updates: Partial<MenuItem>) => void;
  removeItem: (id: string) => void;
  
  // 活跃状态管理
  setActiveItem: (id: string | null) => void;
  setActiveItemByUrl: (url: string) => void;
  
  // 展开状态管理
  setExpandedItems: (ids: string[]) => void;
  toggleItemExpanded: (id: string) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 搜索功能
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // 工具函数
  findItemById: (id: string) => MenuItem | null;
  findItemByUrl: (url: string) => MenuItem | null;
  getItemPath: (id: string) => MenuItem[];
  reset: () => void;
}

// 完整的菜单 Store 类型
export type MenuStore = MenuState & MenuActions;

// 工具函数：递归查找菜单项
const findItemInTree = (items: MenuItem[], predicate: (item: MenuItem) => boolean): MenuItem | null => {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
    if (item.children) {
      const found = findItemInTree(item.children, predicate);
      if (found) return found;
    }
  }
  return null;
};

// 工具函数：递归更新菜单项
const updateItemInTree = (items: MenuItem[], id: string, updates: Partial<MenuItem>): MenuItem[] => {
  return items.map(item => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    if (item.children) {
      return {
        ...item,
        children: updateItemInTree(item.children, id, updates)
      };
    }
    return item;
  });
};

// 工具函数：递归移除菜单项
const removeItemFromTree = (items: MenuItem[], id: string): MenuItem[] => {
  return items.filter(item => {
    if (item.id === id) {
      return false;
    }
    if (item.children) {
      item.children = removeItemFromTree(item.children, id);
    }
    return true;
  });
};

// 工具函数：过滤菜单项
const filterItems = (items: MenuItem[], query: string): MenuItem[] => {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => {
    const matchesTitle = item.title.toLowerCase().includes(lowerQuery);
    const hasMatchingChildren = item.children && filterItems(item.children, query).length > 0;
    
    if (matchesTitle || hasMatchingChildren) {
      return {
        ...item,
        children: item.children ? filterItems(item.children, query) : undefined
      };
    }
    
    return false;
  });
};

// 默认状态
const defaultState: MenuState = {
  items: defaultMenuItems,
  activeItemId: null,
  expandedItemIds: [],
  searchQuery: '',
  filteredItems: defaultMenuItems,
};

// 创建菜单状态管理 Store
export const useMenuStore = create<MenuStore>()((set, get) => ({
      ...defaultState,
    
    // 菜单项操作
    setItems: (items) => {
      set({ 
        items,
        filteredItems: filterItems(items, get().searchQuery)
      });
    },
    
    addItem: (item, parentId) => {
      const { items } = get();
      let newItems: MenuItem[];
      
      if (parentId) {
        // 添加到指定父项
        newItems = updateItemInTree(items, parentId, {
          children: [...(findItemInTree(items, i => i.id === parentId)?.children || []), item]
        });
      } else {
        // 添加到根级别
        newItems = [...items, item];
      }
      
      set({ 
        items: newItems,
        filteredItems: filterItems(newItems, get().searchQuery)
      });
    },
    
    updateItem: (id, updates) => {
      const newItems = updateItemInTree(get().items, id, updates);
      set({ 
        items: newItems,
        filteredItems: filterItems(newItems, get().searchQuery)
      });
    },
    
    removeItem: (id) => {
      const newItems = removeItemFromTree(get().items, id);
      set({ 
        items: newItems,
        filteredItems: filterItems(newItems, get().searchQuery)
      });
    },
    
    // 活跃状态管理
    setActiveItem: (id) => {
      const { items } = get();
      // 清除所有活跃状态
      const clearActiveItems = (items: MenuItem[]): MenuItem[] => {
        return items.map(item => ({
          ...item,
          isActive: item.id === id,
          children: item.children ? clearActiveItems(item.children) : undefined
        }));
      };
      
      const newItems = clearActiveItems(items);
      set({ 
        activeItemId: id,
        items: newItems,
        filteredItems: filterItems(newItems, get().searchQuery)
      });
    },
    
    setActiveItemByUrl: (url) => {
      const item = get().findItemByUrl(url);
      if (item) {
        get().setActiveItem(item.id);
      }
    },
    
    // 展开状态管理
    setExpandedItems: (ids) => set({ expandedItemIds: ids }),
    
    toggleItemExpanded: (id) => {
      const { expandedItemIds } = get();
      const newExpandedIds = expandedItemIds.includes(id)
        ? expandedItemIds.filter(expandedId => expandedId !== id)
        : [...expandedItemIds, id];
      set({ expandedItemIds: newExpandedIds });
    },
    
    expandItem: (id) => {
      const { expandedItemIds } = get();
      if (!expandedItemIds.includes(id)) {
        set({ expandedItemIds: [...expandedItemIds, id] });
      }
    },
    
    collapseItem: (id) => {
      set({ 
        expandedItemIds: get().expandedItemIds.filter(expandedId => expandedId !== id)
      });
    },
    
    expandAll: () => {
      const getAllIds = (items: MenuItem[]): string[] => {
        return items.reduce((acc, item) => {
          if (item.children && item.children.length > 0) {
            acc.push(item.id);
            acc.push(...getAllIds(item.children));
          }
          return acc;
        }, [] as string[]);
      };
      
      set({ expandedItemIds: getAllIds(get().items) });
    },
    
    collapseAll: () => set({ expandedItemIds: [] }),
    
    // 搜索功能
    setSearchQuery: (query) => {
      const { items } = get();
      set({ 
        searchQuery: query,
        filteredItems: filterItems(items, query)
      });
    },
    
    clearSearch: () => {
      const { items } = get();
      set({ 
        searchQuery: '',
        filteredItems: items
      });
    },
    
    // 工具函数
    findItemById: (id) => findItemInTree(get().items, item => item.id === id),
    
    findItemByUrl: (url) => findItemInTree(get().items, item => item.url === url),
    
    getItemPath: (id) => {
      const findPath = (items: MenuItem[], targetId: string, path: MenuItem[] = []): MenuItem[] | null => {
        for (const item of items) {
          const currentPath = [...path, item];
          if (item.id === targetId) {
            return currentPath;
          }
          if (item.children) {
            const found = findPath(item.children, targetId, currentPath);
            if (found) return found;
          }
        }
        return null;
      };
      
      return findPath(get().items, id) || [];
    },
    
    reset: () => set(defaultState),
  }));

// 选择器 Hooks - 使用缓存的选择器函数避免无限循环
const menuItemsSelector = (state: MenuStore) => state.filteredItems;
const activeMenuItemSelector = (state: MenuStore) => state.activeItemId;
const expandedMenuItemsSelector = (state: MenuStore) => state.expandedItemIds;
const menuSearchQuerySelector = (state: MenuStore) => state.searchQuery;

export const useMenuItems = () => useMenuStore(menuItemsSelector);
export const useActiveMenuItem = () => useMenuStore(activeMenuItemSelector);
export const useExpandedMenuItems = () => useMenuStore(expandedMenuItemsSelector);
export const useMenuSearchQuery = () => useMenuStore(menuSearchQuerySelector);

// 操作 Hooks
export const useMenuActions = () => useMenuStore((state) => ({
  setItems: state.setItems,
  addItem: state.addItem,
  updateItem: state.updateItem,
  removeItem: state.removeItem,
  setActiveItem: state.setActiveItem,
  setActiveItemByUrl: state.setActiveItemByUrl,
  setExpandedItems: state.setExpandedItems,
  toggleItemExpanded: state.toggleItemExpanded,
  expandItem: state.expandItem,
  collapseItem: state.collapseItem,
  expandAll: state.expandAll,
  collapseAll: state.collapseAll,
  setSearchQuery: state.setSearchQuery,
  clearSearch: state.clearSearch,
  findItemById: state.findItemById,
  findItemByUrl: state.findItemByUrl,
  getItemPath: state.getItemPath,
  reset: state.reset,
}));
