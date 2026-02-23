import { SupportedLocale } from '@/lib/i18n/config';

// 简单的服务器端国际化函数
export async function getServerTranslation(locale: SupportedLocale = 'en') {
  try {
    console.log('🔍 Loading translations for locale:', locale);
    const messages = await import(`@/lib/i18n/locales/${locale}.json`);
    const translations = messages.default;
    console.log('🔍 Translations loaded successfully, keys count:', Object.keys(translations).length);

    return function t(key: string, values?: Record<string, any>): string {
      console.log('🔍 Looking for translation key:', key);

      // 直接查找扁平键结构
      let result = translations[key];
      console.log('🔍 Direct lookup result:', typeof result, result?.substring ? result.substring(0, 100) : result);

      if (typeof result !== 'string') {
        console.log('🔍 Key not found, returning original key:', key);
        return key;
      }
      
      // 简单的变量替换
      if (values) {
        return result.replace(/\{(\w+)\}/g, (match, varName) => {
          return values[varName] !== undefined ? String(values[varName]) : match;
        });
      }
      
      return result;
    };
  } catch (error) {
    console.error('Failed to load server translations:', error);
    // 返回一个回退函数
    return function t(key: string): string {
      return key;
    };
  }
}

// 从请求头中获取用户的语言偏好
export function getLocaleFromRequest(request: Request): SupportedLocale {
  try {
    const acceptLanguage = request.headers.get('accept-language');
    if (!acceptLanguage) return 'en';
    
    // 简单的语言检测
    if (acceptLanguage.includes('zh')) return 'zh';
    if (acceptLanguage.includes('ja')) return 'ja';
    return 'en';
  } catch {
    return 'en';
  }
}
