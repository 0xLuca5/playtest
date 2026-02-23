'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  SupportedLocale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getInitialLocale,
  setStoredLocale
} from '@/lib/i18n/config';

// 国际化状态接口
interface I18nState {
  locale: SupportedLocale;
  isLoading: boolean;
}

// 国际化操作接口
interface I18nActions {
  setLocale: (locale: SupportedLocale) => void;
  setLoading: (loading: boolean) => void;
}

// 完整的 Store 类型
export type I18nStore = I18nState & I18nActions;

// 默认状态
const defaultState: I18nState = {
  locale: DEFAULT_LOCALE,
  isLoading: false,
};

// 创建国际化状态管理 Store
export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      // 初始化时使用正确的语言
      locale: typeof window !== 'undefined' ? getInitialLocale() : DEFAULT_LOCALE,

      // 设置语言
      setLocale: (locale) => {
        console.log('🏪 I18nStore: setLocale called with:', locale);
        console.log('🏪 I18nStore: Current state before update:', get());
        set({ locale });
        console.log('🏪 I18nStore: State after update:', get());
        setStoredLocale(locale);
        console.log('🏪 I18nStore: Locale saved to localStorage:', locale);
      },

      // 设置加载状态
      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: LOCALE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ locale: state.locale }),
      skipHydration: true, // 跳过水合，避免 SSR 问题
    }
  )
);

// 选择器 Hooks
export const useLocale = () => useI18nStore((state) => state.locale);
export const useI18nLoading = () => useI18nStore((state) => state.isLoading);

// 操作 Hooks
export const useI18nActions = () => useI18nStore((state) => ({
  setLocale: state.setLocale,
  setLoading: state.setLoading,
}));
