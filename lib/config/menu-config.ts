import {
  Home,
  MessageSquare,
  FileText,
  Search,
  Settings,
  Trash2,
  HelpCircle,
  Code,
  Bot
} from 'lucide-react';

// 菜单项类型定义
export interface MenuItem {
  id: string;
  titleKey: string;
  url: string;
  icon: any;
  badge?: string;
  special?: boolean;
}

// 主菜单配置（支持国际化）
export const mainMenuItems: MenuItem[] = [
  { id: 'dashboard', titleKey: 'menu.dashboard', url: '/dashboard', icon: Home },
  { id: 'ask-ai', titleKey: 'menu.askAI', url: '/chat', icon: MessageSquare, special: true },
  { id: 'search', titleKey: 'menu.search', url: '/search', icon: Search },
  { id: 'test-case', titleKey: 'menu.testCase', url: '/test-case', icon: Code, badge: '' },
  { id: 'documents', titleKey: 'menu.documents', url: '/documents', icon: FileText, badge: '' },
  { id: 'ai-models', titleKey: 'menu.aiModels', url: '/admin/ai-models', icon: Bot, badge: '' },
];

// 底部菜单配置（仅垂直布局使用）
export const bottomMenuItems: MenuItem[] = [
  { id: 'settings', titleKey: 'menu.settings', url: '/settings', icon: Settings },
  { id: 'trash', titleKey: 'menu.trash', url: '/trash', icon: Trash2 },
  { id: 'help', titleKey: 'menu.help', url: '/help', icon: HelpCircle },
];

// 获取翻译后的菜单项
export function getTranslatedMenuItems(
  mainItems: MenuItem[],
  bottomItems: MenuItem[],
  t: (key: string) => string
) {
  const translatedMainItems = mainItems.map(item => ({
    ...item,
    title: t(item.titleKey)
  }));

  const translatedBottomItems = bottomItems.map(item => ({
    ...item,
    title: t(item.titleKey)
  }));

  return {
    mainMenuItems: translatedMainItems,
    bottomMenuItems: translatedBottomItems
  };
}

// 获取所有菜单项（用于面包屑生成等）
export function getAllMenuItems(
  mainItems: MenuItem[],
  bottomItems: MenuItem[],
  t: (key: string) => string
) {
  const { mainMenuItems, bottomMenuItems } = getTranslatedMenuItems(mainItems, bottomItems, t);
  return [...mainMenuItems, ...bottomMenuItems];
}

// 根据URL查找菜单项
export function findMenuItemByUrl(
  url: string,
  mainItems: MenuItem[],
  bottomItems: MenuItem[],
  t: (key: string) => string
) {
  const allItems = getAllMenuItems(mainItems, bottomItems, t);
  return allItems.find(item => item.url === url);
}

// 检查是否是特殊菜单项
export function isSpecialMenuItem(item: MenuItem): boolean {
  return item.special === true;
}

// 处理特殊菜单项点击
export function handleSpecialMenuItemClick(
  item: MenuItem,
  pathname: string,
  e: React.MouseEvent
): boolean {
  if (item.id === 'ask-ai' && pathname.startsWith('/test-case')) {
    e.preventDefault();
    // 在test-case页面时，触发页面内AI助手
    window.dispatchEvent(new CustomEvent('toggle-ai-assistant'));
    return true;
  }
  return false;
} 