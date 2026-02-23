'use client';

import { useEffect } from 'react';
import { useThemeStore, useThemeInitializer } from '@/stores/theme-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, isDarkMode, applyTheme } = useThemeStore();

  // 使用主题初始化hook
  useThemeInitializer();

  // 确保主题状态变化时同步到DOM
  useEffect(() => {
    console.log('🎨 ThemeProvider: Theme state changed:', { theme, isDarkMode });
    applyTheme();
  }, [theme, isDarkMode, applyTheme]);

  useEffect(() => {
    // 监听系统深色模式变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用户没有手动设置深色模式时才跟随系统
      const hasManualDarkMode = localStorage.getItem('theme-store')?.includes('isDarkMode');
      if (!hasManualDarkMode) {
        console.log('🎨 Following system dark mode:', e.matches);
        useThemeStore.getState().setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // 监听主题变化，确保DOM同步
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      const { theme: newTheme, isDarkMode: newIsDark } = event.detail;
      console.log('🎨 Theme changed event:', { theme: newTheme, isDarkMode: newIsDark });
    };

    window.addEventListener('theme-changed', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener);
    };
  }, []);

  return <>{children}</>;
}
