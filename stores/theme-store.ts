import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 主题类型定义
export type Theme = 'default' | 'blue' | 'green' | 'purple' | 'orange';

// 主题状态接口
interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
}

// 主题操作接口
interface ThemeActions {
  setTheme: (theme: Theme) => void;
  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;
  applyTheme: (theme?: Theme) => void;
  initializeTheme: () => void;
  reset: () => void;
}

// 主题Store类型
export type ThemeStore = ThemeState & ThemeActions;

// 默认状态
const defaultState: ThemeState = {
  theme: 'blue', // 默认使用蓝色主题
  isDarkMode: true,
};

// 应用主题到DOM的函数
const applyThemeToDOM = (theme: Theme, isDark: boolean) => {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  const beforeClasses = html.className;

  // 移除所有主题类
  html.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');

  // 应用新主题类
  if (theme !== 'default') {
    html.classList.add(`theme-${theme}`);
  }

  // 应用深色模式
  if (isDark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  const afterClasses = html.className;

  // 调试日志
  console.log('🎨 Applied theme to DOM:', {
    theme,
    isDark,
    beforeClasses,
    afterClasses,
    hasDarkClass: html.classList.contains('dark'),
    hasThemeClass: html.classList.contains(`theme-${theme}`)
  });
};

// 创建主题状态管理Store
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // 设置主题
      setTheme: (theme) => {
        set({ theme });
        const { isDarkMode } = get();
        applyThemeToDOM(theme, isDarkMode);
        
        // 触发自定义事件通知其他组件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme, isDarkMode }
          }));
        }
      },

      // 设置深色模式
      setDarkMode: (isDark) => {
        set({ isDarkMode: isDark });
        const { theme } = get();
        applyThemeToDOM(theme, isDark);
        
        // 触发自定义事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme, isDarkMode: isDark }
          }));
        }
      },

      // 切换深色模式
      toggleDarkMode: () => {
        const { isDarkMode } = get();
        get().setDarkMode(!isDarkMode);
      },

      // 应用主题（用于初始化或强制应用）
      applyTheme: (theme) => {
        const currentTheme = theme || get().theme;
        const { isDarkMode } = get();
        applyThemeToDOM(currentTheme, isDarkMode);
      },

      // 初始化主题（从localStorage读取并应用）
      initializeTheme: () => {
        if (typeof window === 'undefined') return;

        console.log('🎨 Initializing theme...');

        // 先尝试从localStorage手动读取，因为persist可能还没有hydrate
        let savedTheme: Theme = 'blue';
        let savedDarkMode = true;

        try {
          const savedData = localStorage.getItem('theme-store');
          console.log('🎨 Raw localStorage data:', savedData);

          if (savedData) {
            const parsed = JSON.parse(savedData);
            console.log('🎨 Parsed localStorage data:', parsed);

            if (parsed.state) {
              savedTheme = parsed.state.theme || 'blue';
              savedDarkMode = parsed.state.isDarkMode || false;
            }
          }
        } catch (error) {
          console.warn('🎨 读取主题设置失败:', error);
        }

        console.log('🎨 Theme to apply:', { savedTheme, savedDarkMode });

        // 应用主题到DOM
        applyThemeToDOM(savedTheme, savedDarkMode);

        // 更新store状态（如果不同的话）
        const { theme, isDarkMode } = get();
        if (theme !== savedTheme || isDarkMode !== savedDarkMode) {
          console.log('🎨 Updating store state:', { from: { theme, isDarkMode }, to: { savedTheme, savedDarkMode } });
          set({ theme: savedTheme, isDarkMode: savedDarkMode });
        }
      },

      // 重置到默认状态
      reset: () => {
        set(defaultState);
        applyThemeToDOM(defaultState.theme, defaultState.isDarkMode);
      },
    }),
    {
      name: 'theme-store', // localStorage 键名
      storage: createJSONStorage(() => localStorage),
      // 持久化所有状态
      partialize: (state) => ({
        theme: state.theme,
        isDarkMode: state.isDarkMode,
      }),
      // 添加 skipHydration 以避免 SSR 问题
      skipHydration: true,
      // 添加版本控制以处理数据结构变化
      version: 1,
      // 添加迁移函数
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // 从旧版本迁移
          return {
            theme: persistedState.theme || 'blue',
            isDarkMode: persistedState.isDarkMode || false,
          };
        }
        return persistedState;
      },
    }
  )
);

// 主题初始化Hook（用于在应用启动时调用）
export const useThemeInitializer = () => {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  // 在客户端初始化主题
  if (typeof window !== 'undefined') {
    // 使用 requestAnimationFrame 确保在下一个渲染周期执行
    // 这样可以确保DOM已经准备好，并且在Zustand hydration之后
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initializeTheme();
      });
    });
  }
};
