// 支持的语言配置
export const SUPPORTED_LOCALES = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  zh: {
    code: 'zh',
    name: '中文',
    flag: '🇨🇳',
    dir: 'ltr'
  },
  ja: {
    code: 'ja',
    name: '日本語',
    flag: '🇯🇵',
    dir: 'ltr'
  }
} as const;

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

// 默认语言
export const DEFAULT_LOCALE: SupportedLocale = 'en';

// 本地存储键
export const LOCALE_STORAGE_KEY = 'app-locale';

// 获取浏览器语言
export function getBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  // 获取浏览器语言列表，按优先级排序
  const languages = navigator.languages || [navigator.language];
  console.log('🔍 Config: getBrowserLocale - navigator.languages:', languages);

  // 遍历语言列表，找到第一个支持的语言
  for (const lang of languages) {
    const browserLang = lang.split('-')[0] as SupportedLocale;
    if (SUPPORTED_LOCALES[browserLang]) {
      console.log('🔍 Config: Found supported browser language:', browserLang);
      return browserLang;
    }
  }

  console.log('🔍 Config: No supported browser language found, using default:', DEFAULT_LOCALE);
  return DEFAULT_LOCALE;
}

// 获取存储的语言
export function getStoredLocale(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale;
  console.log('🔍 Config: getStoredLocale - raw value:', stored, 'is supported:', !!SUPPORTED_LOCALES[stored]);
  return SUPPORTED_LOCALES[stored] ? stored : null;
}

// 保存语言到本地存储
export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;

  console.log('💾 Config: Saving locale to localStorage:', locale);
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  console.log('💾 Config: Locale saved successfully');
}

// 获取初始语言（优先级：存储 > 浏览器 > 默认）
export function getInitialLocale(): SupportedLocale {
  const stored = getStoredLocale();
  console.log('🔍 Config: getInitialLocale - stored:', stored, 'DEFAULT_LOCALE:', DEFAULT_LOCALE);

  // 如果有存储的语言且是支持的语言，直接返回
  if (stored && SUPPORTED_LOCALES[stored]) {
    console.log('🔍 Config: Using stored locale:', stored);
    return stored;
  }

  // 否则使用浏览器语言
  const browserLocale = getBrowserLocale();
  console.log('🔍 Config: Using browser locale:', browserLocale);
  return browserLocale;
}
