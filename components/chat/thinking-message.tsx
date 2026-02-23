import { motion } from 'framer-motion';
import { SparklesIcon, Bot } from 'lucide-react';
import { cx } from 'class-variance-authority';

interface ThinkingMessageProps {
  locale?: string;
  status?: 'thinking' | 'processing' | 'updating' | 'executing' | 'analyzing';
  message?: string;
  details?: string;
  className?: string;
}

// 国际化文本
const getLocalizedText = (locale: string = 'en', key: string): string => {
  const texts: Record<string, Record<string, string>> = {
    en: {
      thinking: '🤔 AI is thinking',
      processing: '⚙️ Processing request',
      updating: '✏️ Updating test case',
      executing: '🚀 Executing automation',
      analyzing: '🔍 Analyzing request',
      defaultDetails: 'Analyzing your request and preparing the appropriate actions...',
      thinkingDetails: 'Analyzing...',
      processingDetails: 'Processing your request, please wait...',
      updatingDetails: 'Updating test case data, please wait...',
      executingDetails: 'Executing automation test, this may take a few minutes...',
      analyzingDetails: 'Analyzing the request and determining the best approach...'
    },
    zh: {
      thinking: '🤔 AI正在思考中',
      processing: '⚙️ 正在处理请求',
      updating: '✏️ 正在更新测试用例',
      executing: '🚀 正在执行自动化测试',
      analyzing: '🔍 正在分析请求',
      defaultDetails: '正在分析您的请求并准备相应的操作...',
      thinkingDetails: '分析中...',
      processingDetails: '正在处理您的请求，请稍候...',
      updatingDetails: '正在更新测试用例数据，请稍候...',
      executingDetails: '正在执行自动化测试，这可能需要几分钟时间...',
      analyzingDetails: '正在分析请求并确定最佳方案...'
    },
    ja: {
      thinking: '🤔 AIが思考中',
      processing: '⚙️ リクエストを処理中',
      updating: '✏️ テストケースを更新中',
      executing: '🚀 自動化テストを実行中',
      analyzing: '🔍 リクエストを分析中',
      defaultDetails: 'リクエストを分析し、適切なアクションを準備しています...',
      thinkingDetails: '分析中...',
      processingDetails: 'リクエストを処理中です。お待ちください...',
      updatingDetails: 'テストケースデータを更新中です。お待ちください...',
      executingDetails: '自動化テストを実行中です。数分かかる場合があります...',
      analyzingDetails: 'リクエストを分析し、最適なアプローチを決定しています...'
    }
  };

  return texts[locale]?.[key] || texts.en[key] || key;
};

export const ThinkingMessage = ({ 
  locale = 'en', 
  status = 'thinking', 
  message, 
  details,
  className 
}: ThinkingMessageProps) => {
  const displayMessage = message || getLocalizedText(locale, status);
  const displayDetails = details || getLocalizedText(locale, `${status}Details`);

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className={cx(
        "w-full mx-auto max-w-3xl px-4 group/message",
        className
      )}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
      data-role="assistant"
    >
      <div className="flex gap-4 w-full">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm">
            <div className="text-slate-700 dark:text-slate-200 flex items-center gap-3">
              <div className="relative">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {displayMessage}
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {displayDetails}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 专门用于测试用例更新的ThinkingMessage
export const TestCaseUpdatingMessage = ({ 
  locale = 'en', 
  updateType,
  className 
}: { 
  locale?: string; 
  updateType?: string;
  className?: string;
}) => {
  const getUpdateMessage = (type?: string) => {
    if (!type) return getLocalizedText(locale, 'updating');
    
    const updateMessages: Record<string, Record<string, string>> = {
      en: {
        'generate-steps': '📝 Generating test steps',
        'generate-config': '⚙️ Generating automation config',
        'update-steps': '✏️ Updating test steps',
        'analyze-coverage': '📊 Analyzing test coverage',
        'execute-automation': '🚀 Executing automation test'
      },
      zh: {
        'generate-steps': '📝 正在生成测试步骤',
        'generate-config': '⚙️ 正在生成自动化配置',
        'update-steps': '✏️ 正在更新测试步骤',
        'analyze-coverage': '📊 正在分析测试覆盖率',
        'execute-automation': '🚀 正在执行自动化测试'
      },
      ja: {
        'generate-steps': '📝 テストステップを生成中',
        'generate-config': '⚙️ 自動化設定を生成中',
        'update-steps': '✏️ テストステップを更新中',
        'analyze-coverage': '📊 テストカバレッジを分析中',
        'execute-automation': '🚀 自動化テストを実行中'
      }
    };

    return updateMessages[locale]?.[type] || updateMessages.en[type] || getLocalizedText(locale, 'updating');
  };

  const getUpdateDetails = (type?: string) => {
    const detailMessages: Record<string, Record<string, string>> = {
      en: {
        'generate-steps': 'Analyzing test case documents and generating detailed test steps...',
        'generate-config': 'Creating automation configuration based on test case documents...',
        'update-steps': 'Updating test case steps with new information...',
        'analyze-coverage': 'Analyzing test coverage and identifying gaps...',
        'execute-automation': 'Running automation test, this may take several minutes...'
      },
      zh: {
        'generate-steps': '正在分析测试用例需求并生成详细的测试步骤...',
        'generate-config': '正在基于测试用例需求创建自动化配置...',
        'update-steps': '正在使用新信息更新测试用例步骤...',
        'analyze-coverage': '正在分析测试覆盖率并识别缺口...',
        'execute-automation': '正在运行自动化测试，这可能需要几分钟时间...'
      },
      ja: {
        'generate-steps': 'テストケース要件を分析し、詳細なテストステップを生成しています...',
        'generate-config': 'テストケース要件に基づいて自動化設定を作成しています...',
        'update-steps': '新しい情報でテストケースステップを更新しています...',
        'analyze-coverage': 'テストカバレッジを分析し、ギャップを特定しています...',
        'execute-automation': '自動化テストを実行中です。数分かかる場合があります...'
      }
    };

    return detailMessages[locale]?.[type || 'default'] || getLocalizedText(locale, 'updatingDetails');
  };

  return (
    <ThinkingMessage
      locale={locale}
      status="updating"
      message={getUpdateMessage(updateType)}
      details={getUpdateDetails(updateType)}
      className={className}
    />
  );
};

export default ThinkingMessage;
