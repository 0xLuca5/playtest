"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { ProjectSwitcher } from "@/components/project/project-switcher";
import { useThemeStore } from "@/stores/theme-store";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useIntl } from 'react-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  PanelLeft,
  Menu,
  ChevronLeft,
  Trash2,
  HelpCircle,
  User,
  LogOut,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Settings
} from "lucide-react";
import { 
  mainMenuItems as mainMenuItemsBase, 
  bottomMenuItems as bottomMenuItemsBase,
  getTranslatedMenuItems,
  getAllMenuItems,
  handleSpecialMenuItemClick
} from "@/lib/config/menu-config";

// 导航布局类型
type NavigationLayout = 'vertical' | 'horizontal';

interface MinimalLayoutManagerProps {
  children: React.ReactNode;
}

export function MinimalLayoutManager({ children }: MinimalLayoutManagerProps) {
  const pathname = usePathname();
  const [layout, setLayout] = useState<NavigationLayout>('vertical');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const intl = useIntl();

  // 翻译函数
  const t = (id: string) => {
    try {
      return intl.formatMessage({ id });
    } catch {
      return id;
    }
  };

  // 创建翻译后的菜单项
  const { mainMenuItems, bottomMenuItems } = getTranslatedMenuItems(
    mainMenuItemsBase, 
    bottomMenuItemsBase, 
    t
  );

  // 处理特殊按钮点击
  const handleSpecialClick = (item: any, e: React.MouseEvent) => {
    return handleSpecialMenuItemClick(item, pathname, e);
  };

  // 初始化状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayout = localStorage.getItem('navigation-layout') as NavigationLayout;
      if (savedLayout && (savedLayout === 'vertical' || savedLayout === 'horizontal')) {
        setLayout(savedLayout);
      }

      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === 'true');
      }
    }
  }, []);

  // 监听设置页面的更改事件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSettingsChange = (event: CustomEvent) => {
        const { layout: newLayout, sidebarCollapsed: newCollapsed } = event.detail;
        setLayout(newLayout);
        setSidebarCollapsed(newCollapsed);
      };

      window.addEventListener('settings-changed', handleSettingsChange as EventListener);

      return () => {
        window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
      };
    }
  }, []);

  // 保存状态到 localStorage
  const saveLayout = (newLayout: NavigationLayout) => {
    setLayout(newLayout);
    if (typeof window !== 'undefined') {
      localStorage.setItem('navigation-layout', newLayout);
    }
  };

  const saveSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', collapsed.toString());
    }
  };

  // 切换布局
  const toggleLayout = () => {
    const newLayout = layout === 'vertical' ? 'horizontal' : 'vertical';
    saveLayout(newLayout);
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    saveSidebarCollapsed(!sidebarCollapsed);
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };



  // 生成面包屑
  const generateBreadcrumbs = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: { title: string; url: string }[] = [];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      // 尝试从主菜单和底部菜单中找到对应的标题
      const allMenuItems = getAllMenuItems(mainMenuItemsBase, bottomMenuItemsBase, t);
      const menuItem = allMenuItems.find(item => item.url === currentPath);
      const title = menuItem?.title || segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      breadcrumbs.push({ title, url: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(pathname);

  // 检查是否是特殊路由
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthRoute) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        {children}
      </div>
    );
  }

  // 垂直布局
  if (layout === 'vertical') {
    return (
      <>
        <div className="flex h-screen w-full max-w-full overflow-hidden">
        {/* 侧边栏 */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-dvh bg-sidebar border-r border-slate-200 dark:border-slate-700 transition-all duration-300",
            // 在小屏幕上完全隐藏，在大屏幕及以上显示
            "max-lg:!hidden lg:block",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex h-full flex-col">
            {/* 侧边栏头部 - 项目切换按钮 */}
            <div className="p-4 border-b border-sidebar-border">
              <ProjectSwitcher variant="vertical" collapsed={sidebarCollapsed} />
            </div>
            
            {/* 主导航菜单 */}
            <div className="flex-1 flex flex-col">
              <nav className="flex flex-col gap-1 p-2">
                {mainMenuItems.map((item) => {
                  const exactMatch = pathname === item.url;
                  const subPathMatch = item.url !== "/" && pathname.startsWith(item.url);
                  const isActive = exactMatch || subPathMatch;

                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={(e) => item.special ? handleSpecialClick(item, e) : undefined}
                      className={cn(
                        "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full",
                        sidebarCollapsed ? "justify-center py-2 px-2" : "py-2 px-3",
                        "hover:bg-primary/10",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:text-primary"
                      )}
                    >
                      <span className="flex items-center justify-center flex-shrink-0 size-5">
                        <item.icon className="size-4" />
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span className={cn(
                              "ml-auto text-xs rounded-full px-2 py-0.5",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Recent Chat 区域 */}
              {!sidebarCollapsed && (
                <div className="px-2 py-4">
                  {/* <div className="text-xs text-muted-foreground mb-2">Recent Chat</div> */}
                  {/* 这里可以添加最近聊天记录 */}
                </div>
              )}
            </div>
            
            {/* 侧边栏底部 */}
            <div className="border-t border-sidebar-border">
              {/* 底部菜单 */}
              <nav className="flex flex-col gap-1 p-2">
                {bottomMenuItems.map((item) => {
                  const exactMatch = pathname === item.url;
                  const subPathMatch = item.url !== "/" && pathname.startsWith(item.url);
                  const isActive = exactMatch || subPathMatch;

                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full",
                        sidebarCollapsed ? "justify-center py-2 px-2" : "py-2 px-3",
                        "hover:bg-primary/10",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:text-primary"
                      )}
                    >
                      <span className="flex items-center justify-center flex-shrink-0 size-5">
                        <item.icon className="size-4" />
                      </span>
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>


            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0 max-w-full transition-all duration-300 bg-slate-50 dark:bg-zinc-800",
            // 在小屏幕上不留边距（因为侧边栏隐藏），在大屏幕及以上根据折叠状态调整边距
            sidebarCollapsed ? "ml-0 lg:ml-16" : "ml-0 lg:ml-64"
          )}
        >
          {/* 第一层Header - 公共工具栏 */}
          <header className="flex h-12 sm:h-14 lg:h-16 shrink-0 items-center justify-between border-b px-3 sm:px-4 lg:px-6 bg-sidebar border-slate-200 dark:border-slate-700 z-40 relative">
            {/* 移动端导航菜单按钮 */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-8 w-8 p-0 flex-shrink-0"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 h-dvh sheet-content [&>button]:hidden">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex h-dvh flex-col bg-sidebar">
                  {/* 侧边栏头部 - 项目切换按钮 */}
                  <div className="p-4 border-b border-sidebar-border">
                    <ProjectSwitcher variant="vertical" collapsed={false} />
                  </div>

                  {/* 主菜单 */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <nav className="space-y-1">
                      {mainMenuItems.map((item) => {
                        const exactMatch = pathname === item.url;
                        const subPathMatch = item.url !== "/" && pathname.startsWith(item.url);
                        const isActive = exactMatch || subPathMatch;

                        return (
                          <Link
                            key={item.id}
                            href={item.url}
                            className={cn(
                              "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full py-2 px-3",
                              "hover:bg-primary/10",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-sidebar-foreground hover:text-primary"
                            )}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <span className="flex items-center justify-center flex-shrink-0 size-5">
                              <item.icon className="size-4" />
                            </span>
                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {/* 底部菜单 */}
                  <div className="p-4 border-t border-sidebar-border">
                    <nav className="space-y-1">
                      {bottomMenuItems.map((item) => {
                        const isActive = pathname === item.url;
                        return (
                          <Link
                            key={item.id}
                            href={item.url}
                            className={cn(
                              "flex items-center gap-3 text-sm font-medium rounded-md transition-all duration-200 w-full py-2 px-3",
                              "hover:bg-primary/10",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-sidebar-foreground hover:text-primary"
                            )}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <span className="flex items-center justify-center flex-shrink-0 size-5">
                              <item.icon className="size-4" />
                            </span>
                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* 左侧：侧边栏切换按钮 + 面包屑导航 */}
            <div className="flex items-center gap-2 ml-12 lg:ml-0 flex-1 min-w-0">
              {/* 侧边栏切换按钮 - 只在大屏幕显示 */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex h-7 w-7 p-0 flex-shrink-0"
                onClick={toggleSidebar}
                title="切换侧边栏"
              >
                <PanelLeft className="w-4 h-4" />
              </Button>

              {/* 面包屑 - 只在大屏幕显示完整面包屑，小屏幕完全隐藏 */}
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                {breadcrumbs.map((bc, idx) => (
                  <div key={bc.url} className="flex items-center gap-2 flex-shrink-0 min-w-0">
                    {idx > 0 && <span className="flex-shrink-0">/</span>}
                    {idx < breadcrumbs.length - 1 ? (
                      <Link href={bc.url} className="hover:text-foreground truncate min-w-0">
                        {bc.title}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium truncate min-w-0">{bc.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 中间：搜索栏 - 绝对居中，小屏幕隐藏 */}
            {/* <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('menu.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div> */}

            {/* 右侧：工具栏 */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 语言选择 */}
              <LanguageSwitcher variant="compact" />

              {/* 全屏切换 - 在小屏幕下隐藏 */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>

              {/* 暗黑模式切换 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                onClick={toggleDarkMode}
              >
                {isDarkMode ? (
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <Moon className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>

              {/* 用户头像下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-7 h-7 sm:w-8 sm:h-8 p-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full hover:shadow-md transition-shadow"
                  >
                    <span className="text-white font-semibold text-xs sm:text-sm">U</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('user.myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('user.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('user.settings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('user.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {/* 主内容 */}
          <main className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-zinc-800 w-full scrollbar-hide">
            {children}
          </main>
        </div>
        </div>
      </>
    );
  }

  // 水平布局
  return (
    <>
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
        {/* 第一层Header - 公共工具栏 */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6 bg-sidebar border-slate-200 dark:border-slate-700">
          {/* 左侧：项目切换按钮 */}
          <div className="flex items-center gap-4">
            <ProjectSwitcher variant="horizontal" />
          </div>

          {/* 中间：搜索框 */}
          {/* <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder={t('menu.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div> */}

          {/* 右侧：用户头像和工具 */}
          <div className="flex items-center gap-2">
            {/* 语言选择 */}
            <LanguageSwitcher variant="compact" />

            {/* 全屏切换 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>

            {/* 暗黑模式切换 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* 用户头像下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-8 h-8 p-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full hover:shadow-md transition-shadow"
                >
                  <span className="text-white font-semibold text-sm">U</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">U</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{t('common.user')}</span>
                    <span className="text-xs text-muted-foreground">user@example.com</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/settings" className="flex items-center gap-3 w-full">
                    <Settings className="w-4 h-4" />
                    <span>{t('menu.settings')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/trash" className="flex items-center gap-3 w-full">
                    <Trash2 className="w-4 h-4" />
                    <span>{t('menu.trash')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/help" className="flex items-center gap-3 w-full">
                    <HelpCircle className="w-4 h-4" />
                    <span>{t('menu.help')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-3 p-3 text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4" />
                  <span>{t('common.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 第二层Header - 导航菜单 */}
         <header className="flex h-12 shrink-0 items-center gap-4 border-b px-6 bg-sidebar shadow-sm border-slate-200 dark:border-slate-700">
          <nav className="flex items-center gap-1">
            {mainMenuItems.map((item) => {
              const exactMatch = pathname === item.url;
              const subPathMatch = item.url !== "/" && pathname.startsWith(item.url);
              const isActive = exactMatch || subPathMatch;

              return (
                <Link
                  key={item.id}
                  href={item.url}
                  className={cn(
                    "flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.title}</span>
                  {item.badge && (
                    <span className="hidden sm:inline text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* 主内容 */}
        <main className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </>
  );
}
