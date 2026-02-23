'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/lib/i18n/config';
import { useI18nStore } from '@/stores/i18n-store';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  align?: 'start' | 'center' | 'end';
}

export function LanguageSwitcher({
  className,
  variant = 'default',
  align = 'end'
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18nStore();

  const currentLanguage = SUPPORTED_LOCALES[locale];
  const supportedLanguages = Object.values(SUPPORTED_LOCALES);

  const changeLanguage = (newLocale: SupportedLocale) => {
    console.log('🌐 LanguageSwitcher: Attempting to change language from', locale, 'to', newLocale);
    console.log('🌐 LanguageSwitcher: Current language info:', currentLanguage);
    console.log('🌐 LanguageSwitcher: Target language info:', SUPPORTED_LOCALES[newLocale]);
    setLocale(newLocale);
    console.log('🌐 LanguageSwitcher: setLocale called for', newLocale);
  };

  // 紧凑模式 - 只显示语言代码
  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 sm:h-8 px-1 sm:px-2 gap-0.5 sm:gap-1", className)}
          >
            <Languages className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs font-medium uppercase">{locale}</span>
            <ChevronDown className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-32">
          {supportedLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "flex items-center justify-between",
                locale === lang.code && 'bg-accent'
              )}
            >
              <span className="text-sm">{lang.name}</span>
              {locale === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 图标模式 - 只显示图标
  if (variant === 'icon-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 w-8 p-0", className)}
            title="Select Language"
          >
            <Languages className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-40">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Select Language
          </div>
          {supportedLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                "flex items-center justify-between",
                locale === lang.code && 'bg-accent'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </div>
              {locale === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 默认模式 - 显示完整信息
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn("h-9 px-3 gap-2", className)}
        >
          <Languages className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="text-sm font-medium">{currentLanguage.name}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Select Language
        </div>
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex items-center justify-between",
              locale === lang.code && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{lang.code}</span>
              </div>
            </div>
            {locale === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
