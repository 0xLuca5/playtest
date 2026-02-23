"use client";

import { useState, useEffect } from "react";
import { useIntl } from 'react-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  PanelLeft, 
  PanelTop, 
  Monitor, 
  Palette, 
  Bell, 
  Shield, 
  User,
  Save,
  RotateCcw
} from "lucide-react";
import { useThemeStore, type Theme } from '@/stores/theme-store';
import { toast } from 'sonner';

// 导航布局类型
type NavigationLayout = 'vertical' | 'horizontal';

export default function SettingsPage() {
  const intl = useIntl();

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  // 使用全局主题状态
  const { theme, setTheme: setGlobalTheme } = useThemeStore();

  // 本地设置状态
  const [layout, setLayout] = useState<NavigationLayout>('vertical');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化设置
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

      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications !== null) {
        setNotifications(savedNotifications === 'true');
      }

      const savedAutoSave = localStorage.getItem('auto-save');
      if (savedAutoSave !== null) {
        setAutoSave(savedAutoSave === 'true');
      }

      // 主题现在由全局状态管理，不需要在这里初始化
    }
  }, []);

  // applyTheme函数已移除，现在由全局主题状态管理

  // 保存设置
  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('navigation-layout', layout);
      localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
      localStorage.setItem('notifications', notifications.toString());
      localStorage.setItem('auto-save', autoSave.toString());
      // 主题现在由全局状态管理，会自动持久化

      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('settings-changed', {
        detail: { layout, sidebarCollapsed, notifications, autoSave, theme }
      }));

      setHasChanges(false);

      // 显示保存成功提示
      toast.success(t('settings.settingsSaved'));
    }
  };

  // 处理主题切换
  const handleThemeChange = (newTheme: Theme) => {
    setGlobalTheme(newTheme); // 使用全局主题状态
    setHasChanges(true);

    if (autoSave) {
      // 如果开启自动保存，立即保存其他设置
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // 主题已经由全局状态自动保存
          window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { layout, sidebarCollapsed, notifications, autoSave, theme: newTheme }
          }));
        }
      }, 100);
    }
  };

  // 重置设置
  const resetSettings = () => {
    setLayout('vertical');
    setSidebarCollapsed(false);
    setNotifications(true);
    setAutoSave(true);
    setGlobalTheme('blue'); // 重置为默认蓝色主题
    setHasChanges(true);
  };

  // 处理布局切换
  const handleLayoutChange = (newLayout: NavigationLayout) => {
    setLayout(newLayout);
    setHasChanges(true);
    
    if (autoSave) {
      // 如果开启自动保存，立即保存
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('navigation-layout', newLayout);
          window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { layout: newLayout, sidebarCollapsed, notifications, autoSave }
          }));
        }
      }, 100);
    }
  };

  // 处理侧边栏设置
  const handleSidebarChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    setHasChanges(true);
    
    if (autoSave) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebar-collapsed', collapsed.toString());
          window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { layout, sidebarCollapsed: collapsed, notifications, autoSave }
          }));
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto py-3 sm:py-4 lg:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">{t('settings.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {t('settings.description')}
            </p>
          </div>
          {hasChanges && !autoSave && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs sm:text-sm">
                {t('settings.unsavedChanges')}
              </Badge>
              <Button onClick={saveSettings} className="flex items-center gap-2 w-full sm:w-auto text-sm">
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                {t('settings.saveSettings')}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:gap-6">
        {/* 界面设置 */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('settings.interface.title')}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t('settings.interface.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* 导航布局 */}
            <div className="space-y-3">
              <Label className="text-sm sm:text-base font-medium">{t('settings.interface.navigationLayout')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('settings.interface.navigationLayoutDescription')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-3 sm:p-4 transition-all ${
                    layout === 'vertical'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleLayoutChange('vertical')}
                >
                  <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                    <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">{t('settings.interface.verticalLayout')}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {t('settings.interface.verticalLayoutDescription')}
                      </div>
                    </div>
                  </div>
                  {layout === 'vertical' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>

                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-3 sm:p-4 transition-all ${
                    layout === 'horizontal'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleLayoutChange('horizontal')}
                >
                  <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                    <PanelTop className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">{t('settings.interface.horizontalLayout')}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {t('settings.interface.horizontalLayoutDescription')}
                      </div>
                    </div>
                  </div>
                  {layout === 'horizontal' && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 主题颜色 */}
            <div className="space-y-3">
              <Label className="text-sm sm:text-base font-medium">{t('settings.interface.themeColor')}</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('settings.interface.themeColorDescription')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                {/* 默认主题 */}
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-2 sm:p-3 transition-all ${
                    theme === 'default'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleThemeChange('default')}
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600"></div>
                    <div className="text-[10px] sm:text-xs font-medium text-center">{t('settings.themes.default')}</div>
                  </div>
                  {theme === 'default' && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* 蓝色主题 */}
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-2 sm:p-3 transition-all ${
                    theme === 'blue'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleThemeChange('blue')}
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <div className="text-[10px] sm:text-xs font-medium text-center">{t('settings.themes.blue')}</div>
                  </div>
                  {theme === 'blue' && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* 绿色主题 */}
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-2 sm:p-3 transition-all ${
                    theme === 'green'
                      ? 'border-green-500 bg-green-50'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleThemeChange('green')}
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600"></div>
                    <div className="text-[10px] sm:text-xs font-medium text-center">{t('settings.themes.green')}</div>
                  </div>
                  {theme === 'green' && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* 紫色主题 */}
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-2 sm:p-3 transition-all ${
                    theme === 'purple'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleThemeChange('purple')}
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600"></div>
                    <div className="text-[10px] sm:text-xs font-medium text-center">{t('settings.themes.purple')}</div>
                  </div>
                  {theme === 'purple' && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* 橙色主题 */}
                <div
                  className={`relative cursor-pointer rounded-lg border-2 p-2 sm:p-3 transition-all ${
                    theme === 'orange'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleThemeChange('orange')}
                >
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600"></div>
                    <div className="text-[10px] sm:text-xs font-medium text-center">{t('settings.themes.orange')}</div>
                  </div>
                  {theme === 'orange' && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 侧边栏设置 */}
            {layout === 'vertical' && (
              <div className="space-y-3">
                <Label className="text-base font-medium">{t('settings.interface.sidebarSettings')}</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.interface.defaultCollapseSidebar')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.interface.defaultCollapseSidebarDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={sidebarCollapsed}
                    onCheckedChange={handleSidebarChange}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('settings.notifications.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.notifications.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.notifications.enableNotifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notifications.enableNotificationsDescription')}
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={(checked) => {
                  setNotifications(checked);
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 系统设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('settings.system.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.system.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.system.autoSave')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.system.autoSaveDescription')}
                </p>
              </div>
              <Switch
                checked={autoSave}
                onCheckedChange={(checked) => {
                  setAutoSave(checked);
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={resetSettings}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('settings.resetToDefault')}
              </Button>

              {!autoSave && (
                <Button
                  onClick={saveSettings}
                  disabled={!hasChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('settings.saveAllSettings')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
