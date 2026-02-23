'use client';

import { Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface ImproveLoadingProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function ImproveLoading({ 
  title,
  description,
  className = ''
}: ImproveLoadingProps) {
  const { t } = useI18n();

  return (
    <div className={`h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        <div className="flex items-center justify-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-primary/20 rounded-full"></div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            {title || t('testCase.improve.analyzing')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description || t('testCase.improve.pleaseWait')}
          </p>
        </div>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}

