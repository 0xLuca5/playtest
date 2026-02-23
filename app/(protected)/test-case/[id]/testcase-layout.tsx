'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useThemeStore } from '@/stores/theme-store';
import {
  ArrowLeft,
  Play,
  Save,
  Edit3,
  Bot,
  Activity,
  FileText,
  Weight,
  Tag,
  Info,
  Target,
  Link,
  Database,
  PlayCircle,
  Bug,
  MessageSquare,
} from 'lucide-react';
import { TestCase, ModuleButtonConfig } from './types';
import TestCaseAssistant from '../components/testcase-assistant';
import { useIntl } from 'react-intl';

interface TestCaseLayoutProps {
  testCase: TestCase;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSave: () => void;
  onAIGenerate: () => void;
  onRunTest: () => void;
  isRunning: boolean;
  onTestCaseUpdate: (updates: Partial<TestCase>) => void;
}

export default function TestCaseLayout({
  testCase,
  children,
  activeTab,
  onTabChange,
  onSave,
  onAIGenerate,
  onRunTest,
  isRunning,
  onTestCaseUpdate
}: TestCaseLayoutProps) {
  const intl = useIntl();
  const router = useRouter();
  const { theme, isDarkMode } = useThemeStore();

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  // AI聊天框收起状态
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // 主题已经由ThemeProvider统一处理，这里不需要重复逻辑

  // 获取当前模块应该显示的按钮
  const getModuleButtons = (moduleId: string): ModuleButtonConfig => {
    const buttonConfig: Record<string, ModuleButtonConfig> = {
      information: { aiGenerate: true, edit: true, runTest: false },
      steps: { aiGenerate: true, edit: true, runTest: false },
      automation: { aiGenerate: true, edit: true, runTest: true },
      documents: { aiGenerate: false, edit: true, runTest: false },
      dataset: { aiGenerate: true, edit: true, runTest: false },
      testruns: { aiGenerate: false, edit: false, runTest: true },
      issues: { aiGenerate: false, edit: true, runTest: false }
    };
    
    return buttonConfig[moduleId] || { aiGenerate: false, edit: false, runTest: false };
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'work-in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'deprecated': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const modules = [
    { id: 'information', label: t('testCase.modules.information'), icon: Info, color: 'blue' },
    { id: 'steps', label: t('testCase.modules.steps'), icon: Target, color: 'indigo' },
    { id: 'automation', label: t('testCase.modules.automation'), icon: Bot, color: 'purple' },
    { id: 'documents', label: t('testCase.modules.documents'), icon: Link, color: 'green' },
    { id: 'dataset', label: t('testCase.modules.dataset'), icon: Database, color: 'orange' },
    { id: 'testruns', label: t('testCase.modules.testRuns'), icon: PlayCircle, color: 'teal' },
    { id: 'issues', label: t('testCase.modules.issues'), icon: Bug, color: 'red' },
    { id: 'comments', label: t('testCase.modules.comments'), icon: MessageSquare, color: 'purple' }
  ];

  const getActiveClasses = (color: string) => {
    // 使用主题色的不同透明度，忽略传入的color参数
    return 'bg-primary/10 dark:bg-primary/20 text-primary';
  };

  const getIconColor = (color: string) => {
    // 使用主题色，忽略传入的color参数
    return 'text-primary';
  };

  const buttons = getModuleButtons(activeTab);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/test-case')}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('testCase.backToTestCases')}
          </Button>
          
          <div className="flex items-center gap-2">
            {/* 只显示 Run Test 按钮 */}
            <Button
              onClick={onRunTest}
              disabled={isRunning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isRunning ? (
                <Activity className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? t('testCase.running') : t('testCase.runTest')}
            </Button>
          </div>
        </div>

        {/* Test Case Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-lg flex items-center justify-center shadow-sm">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              {testCase.name}
            </h1>
            
            <div className="flex items-center gap-3 mb-3">
              <Badge className={getPriorityColor(testCase.priority)}>
                <Weight className="w-3 h-3 mr-1" />
                {testCase.priority.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(testCase.status)}>
                <Activity className="w-3 h-3 mr-1" />
                {testCase.status.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                <Tag className="w-3 h-3 mr-1" />
                ID: {testCase.id}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(() => {
                try {
                  // 处理tags可能是字符串或数组的情况
                  const tags = typeof testCase.tags === 'string'
                    ? JSON.parse(testCase.tags)
                    : testCase.tags;

                  if (Array.isArray(tags) && tags.length > 0) {
                    return tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ));
                  }
                  return <span className="text-xs text-muted-foreground">无标签</span>;
                } catch (error) {
                  console.error('解析标签失败:', error);
                  return (
                    <Badge variant="secondary" className="text-xs">
                      {typeof testCase.tags === 'string' ? testCase.tags : '标签解析失败'}
                    </Badge>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Content with Sidebar Navigation */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-r border-slate-200 dark:border-zinc-700 flex flex-col h-full">
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-4">
              {t('testCase.testCaseModules')}
            </h3>
            <nav className="space-y-2">
              {modules.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? `${getActiveClasses(item.color)} shadow-sm`
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? getIconColor(item.color) : ''}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'steps' && (
                      <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {testCase.steps.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area with Chat Assistant */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Content Area */}
          <div className={`flex-1 overflow-y-auto hide-scrollbar transition-all duration-300 p-6 ${
            isChatCollapsed ? 'mr-0' : 'mr-[480px]'
          }`}>
            {children}
          </div>

          {/* 浮动展开按钮 - 收起状态下显示 */}
          {isChatCollapsed && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsChatCollapsed(false)}
              className="fixed bottom-6 right-6 z-50 h-12 w-12 p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
              title="展开AI助手"
            >
              <Bot className="w-5 h-5 text-primary-foreground" />
            </Button>
          )}

          {/* 背景遮罩 - AI助手展开时模糊背景和header */}
          {!isChatCollapsed && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsChatCollapsed(true)}
            />
          )}

          {/* AI Assistant Sidebar - 固定位置，始终渲染 */}
          <div className={`fixed right-0 top-0 w-[480px] h-full border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 transition-transform duration-300 z-[60] ${
            isChatCollapsed ? 'translate-x-full' : 'translate-x-0'
          }`}>
            <TestCaseAssistant
              testCase={testCase}
              onTestCaseUpdate={onTestCaseUpdate}
              onCollapse={() => setIsChatCollapsed(true)}
              className="h-full"
              isVisible={!isChatCollapsed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
