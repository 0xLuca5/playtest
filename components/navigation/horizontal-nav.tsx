'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { useIntl } from 'react-intl';
import { 
  mainMenuItems as mainMenuItemsBase, 
  getTranslatedMenuItems 
} from '@/lib/config/menu-config';

interface HorizontalNavProps {
  className?: string;
}

export function HorizontalNav({ className = '' }: HorizontalNavProps) {
  const pathname = usePathname();
  const intl = useIntl();

  // 翻译函数
  const t = (id: string) => {
    try {
      return intl.formatMessage({ id });
    } catch {
      return id;
    }
  };

  // 获取翻译后的菜单项
  const { mainMenuItems } = getTranslatedMenuItems(mainMenuItemsBase, [], t);

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  return (
    <nav className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">AI Run</span>
            </div>
          </div>

          {/* 主导航菜单 */}
          <div className="flex items-center space-x-1">
            {mainMenuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                asChild
                className={`h-10 px-3 text-sm font-medium transition-colors ${
                  isActive(item.url)
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Link href={item.url} className="flex items-center">
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.title}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </Button>
            ))}
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
