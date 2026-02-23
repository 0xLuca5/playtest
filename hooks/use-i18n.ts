'use client';

import { useIntl } from 'react-intl';
import { useI18nStore } from '@/stores/i18n-store';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/lib/i18n/config';

/**
 * 国际化 Hook - 提供翻译和语言切换功能
 */
export function useI18n() {
  const intl = useIntl();
  // 只调用一次store，避免多次selector导致无限循环
  const { locale, setLocale } = useI18nStore();

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch (error) {
      console.warn(`Translation missing for key: ${id}`);
      return id; // 返回 key 作为回退
    }
  };

  // 格式化日期
  const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
    return intl.formatDate(date, options);
  };

  // 格式化时间
  const formatTime = (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
    return intl.formatTime(date, options);
  };

  // 格式化数字
  const formatNumber = (value: number, options?: Parameters<typeof intl.formatNumber>[1]) => {
    return intl.formatNumber(value, options);
  };

  // 格式化货币
  const formatCurrency = (value: number, currency: string, options?: Parameters<typeof intl.formatNumber>[1]) => {
    return intl.formatNumber(value, {
      style: 'currency',
      currency,
      ...options,
    });
  };

  // 格式化相对时间
  const formatRelativeTime = (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => {
    return intl.formatRelativeTime(value, unit, options);
  };

  // 获取当前语言信息
  const currentLanguage = SUPPORTED_LOCALES[locale];

  // 获取所有支持的语言
  const supportedLanguages = Object.values(SUPPORTED_LOCALES);

  // 切换语言
  const changeLanguage = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
  };

  // 检查是否为 RTL 语言
  const isRTL = currentLanguage && String(currentLanguage.dir) === 'rtl';

  return {
    // 翻译函数
    t,
    
    // 格式化函数
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    
    // 语言信息
    locale,
    currentLanguage,
    supportedLanguages,
    isRTL,
    
    // 语言切换
    changeLanguage,
    
    // 原始 intl 对象（用于高级用法）
    intl,
  };
}

/**
 * 简化的翻译 Hook - 只提供翻译功能
 */
export function useTranslation() {
  const { t } = useI18n();
  return { t };
}
