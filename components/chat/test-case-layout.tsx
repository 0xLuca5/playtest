'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme-store';
import { ShareIcon } from '@/components/chat/icons';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
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
} from 'lucide-react';

// 导入共享的模块组件
import {
  InformationModule,
  StepsModule,
  AutomationModule,
  DocumentsModule,
  DatasetModule,
  TestRunsModule,
  IssuesModule
} from '@/app/(protected)/test-case/components';
import type { TestStep, TestCase } from '@/app/(protected)/test-case/[id]/types';

// 扩展 TestCase 类型以支持 testCaseId 字段（向后兼容）
interface ExtendedTestCase extends TestCase {
  testCaseId?: string; // 向后兼容字段
}

interface TestCaseLayoutProps {
  testCase: ExtendedTestCase;
}

interface ModuleButtonConfig {
  aiGenerate: boolean;
  edit: boolean;
  runTest: boolean;
}

export function TestCaseLayout({ testCase: initialTestCase }: TestCaseLayoutProps) {
  console.log('TestCaseLayout 渲染开始，initialTestCase:', initialTestCase);

  const { t } = useI18n();
  const { theme, isDarkMode } = useThemeStore();
  const [activeTab, setActiveTab] = useState('information');
  const [isRunning, setIsRunning] = useState(false);
  const [testCase, setTestCase] = useState(initialTestCase);

  // 当 props 中的 testCase 变化时，更新内部状态
  useEffect(() => {
    setTestCase(initialTestCase);
  }, [initialTestCase]);

  // 解析标签
  const parseTags = (tags: string | string[]): string[] => {
    try {
      if (typeof tags === 'string') {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [tags];
      }
      return Array.isArray(tags) ? tags : [];
    } catch {
      return typeof tags === 'string' ? [tags] : [];
    }
  };

  const safeTags = parseTags(testCase.tags);

  // 获取当前模块应该显示的按钮
  const getModuleButtons = (moduleId: string): ModuleButtonConfig => {
    const buttonConfig: Record<string, ModuleButtonConfig> = {
      information: { aiGenerate: false, edit: true, runTest: false },
      steps: { aiGenerate: false, edit: true, runTest: false },
      automation: { aiGenerate: false, edit: true, runTest: true },
      requirements: { aiGenerate: false, edit: true, runTest: false },
      dataset: { aiGenerate: false, edit: true, runTest: false },
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
    { id: 'information', label: t('testCase.information'), icon: Info, color: 'blue' },
    { id: 'steps', label: t('testCase.steps'), icon: Target, color: 'indigo' },
    { id: 'automation', label: t('testCase.automation'), icon: Bot, color: 'purple' },
    { id: 'requirements', label: t('testCase.documents'), icon: Link, color: 'green' },
    { id: 'dataset', label: t('testCase.dataset'), icon: Database, color: 'orange' },
    { id: 'testruns', label: t('testCase.testRuns'), icon: PlayCircle, color: 'teal' },
    { id: 'issues', label: t('testCase.issues'), icon: Bug, color: 'red' }
  ];

  const handleUpdate = (updates: Partial<TestCase>) => {
    console.log('TestCaseLayout handleUpdate called with:', updates);
    // 更新内部状态
    setTestCase(prevTestCase => {
      const updatedTestCase = {
        ...prevTestCase,
        ...updates
      };
      console.log('TestCaseLayout state updated from:', prevTestCase, 'to:', updatedTestCase);
      return updatedTestCase;
    });
  };

  const handleSave = () => {
    console.log('Saving test case:', testCase);
  };

  const handleAIGenerate = () => {
    console.log(`Generating AI content for ${activeTab}`);
  };

  const handleRunTest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      console.log('Test completed');
    }, 3000);
  };

  const renderModule = () => {
    // 确保testCase有正确的id字段，优先使用testCaseId
    const normalizedTestCase = {
      ...testCase,
      id: testCase.testCaseId || testCase.id || 'unknown'
    } as TestCase;

    // 适配器：将数据格式转换为共享模块期望的格式
    const sharedModuleProps = {
      testCaseDetails: normalizedTestCase,
      selectedId: normalizedTestCase.id,
      onUpdate: handleUpdate
    };

    switch (activeTab) {
      case 'information':
        return <InformationModule
          {...sharedModuleProps}
          onUpdate={(updates) => {
            // 在聊天组件中，我们可能需要通过回调通知父组件
            console.log('Information updated in chat:', updates);
            // 这里可以添加更新逻辑，比如通知父组件或刷新数据
          }}
        />;
      case 'steps':
        return <StepsModule {...sharedModuleProps} />;
      case 'automation':
        return <AutomationModule {...sharedModuleProps} />;
      case 'requirements':
        return <DocumentsModule {...sharedModuleProps} />;
      case 'dataset':
        return <DatasetModule {...sharedModuleProps} />;
      case 'testruns':
        return <TestRunsModule {...sharedModuleProps} />;
      case 'issues':
        return <IssuesModule {...sharedModuleProps} />;
      default:
        return <InformationModule {...sharedModuleProps} />;
    }
  };

  const buttons = getModuleButtons(activeTab);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-6 flex-shrink-0">
        <div className="flex items-start gap-4">
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
                ID: {testCase.testCaseId || testCase.id}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
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
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary/10 dark:bg-primary/20 text-primary"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderModule()}
        </div>
      </div>
    </div>
  );
}
