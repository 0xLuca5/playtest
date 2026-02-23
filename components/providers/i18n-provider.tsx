'use client';

import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { SupportedLocale, getInitialLocale } from '@/lib/i18n/config';
import { useI18nStore } from '@/stores/i18n-store';

// 动态导入语言文件
const loadMessages = async (locale: SupportedLocale) => {
  try {
    console.log('📦 I18nProvider: Loading messages for locale:', locale);
    const messages = await import(`@/lib/i18n/locales/${locale}.json`);
    console.log('📦 I18nProvider: Successfully loaded messages for', locale, 'Keys count:', Object.keys(messages.default).length);
    return messages.default;
  } catch (error) {
    console.warn(`📦 I18nProvider: Failed to load messages for locale: ${locale}`, error);
    // 回退到英语
    console.log('📦 I18nProvider: Falling back to English');
    const fallbackMessages = await import('@/lib/i18n/locales/en.json');
    console.log('📦 I18nProvider: Fallback messages loaded, Keys count:', Object.keys(fallbackMessages.default).length);
    return fallbackMessages.default;
  }
};

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { locale, setLocale } = useI18nStore();
  const [messages, setMessages] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  console.log('🔄 I18nProvider: Render with locale:', locale, 'isLoading:', isLoading, 'isHydrated:', isHydrated);

  // 手动触发 zustand 水合
  useEffect(() => {
    useI18nStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // 初始化语言设置
  useEffect(() => {
    console.log('🔄 I18nProvider: useEffect triggered with isHydrated:', isHydrated, 'locale:', locale);
    if (!isHydrated) return;

    const initializeLocale = async () => {
      console.log('🚀 I18nProvider: Initializing locale...');
      // 获取初始语言设置
      const initialLocale = getInitialLocale();
      console.log('🚀 I18nProvider: Initial locale from config:', initialLocale);
      console.log('🚀 I18nProvider: Current locale from store:', locale);

      // 如果当前 store 中的语言与初始语言不同，更新 store
      if (locale !== initialLocale) {
        console.log('🚀 I18nProvider: Locale mismatch, updating store to:', initialLocale);
        setLocale(initialLocale);
        return; // 等待下一次 useEffect 触发
      }

      // 立即加载对应的翻译文件
      try {
        console.log('🚀 I18nProvider: Loading messages for locale:', locale || initialLocale);
        const localeMessages = await loadMessages(locale || initialLocale);
        console.log('🚀 I18nProvider: Messages loaded successfully, setting messages...');
        setMessages(localeMessages);
      } catch (error) {
        console.error('🚀 I18nProvider: Failed to load initial locale messages:', error);
        // 回退到英语
        console.log('🚀 I18nProvider: Loading fallback messages (en)...');
        const fallbackMessages = await loadMessages('en');
        setMessages(fallbackMessages);
      } finally {
        console.log('🚀 I18nProvider: Setting isLoading to false');
        setIsLoading(false);
      }
    };

    initializeLocale();
  }, [isHydrated, locale, setLocale]);



  // 如果消息还没加载完成，显示加载状态
  if (isLoading || !messages) {
    return (
      <div className="flex items-center justify-center min-h-dvh w-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      defaultLocale="en"
      onError={(error) => {
        // 在开发环境中显示错误，生产环境中静默处理
        if (process.env.NODE_ENV === 'development') {
          console.warn('React Intl Error:', error);
        }
      }}
    >
      {children}
    </IntlProvider>
  );
}
