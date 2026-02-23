'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import TestCaseLayout from './testcase-layout';
import { toast } from 'sonner';
// 使用共享的模块组件
import {
  InformationModule,
  StepsModule,
  AutomationModule,
  DocumentsModule,
  DatasetModule,
  TestRunsModule,
  IssuesModule,
  CommentsModule
} from '../components';
import { TestCase } from './types';
import { useProject } from '@/lib/contexts/project-context';
import { useIntl } from 'react-intl';

export default function TestCasePage() {
  const intl = useIntl();
  const params = useParams();
  const id = params.id as string;
  const { currentProject, isLoading: projectLoading } = useProject();

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [activeTab, setActiveTab] = useState('information');
  const [isRunning, setIsRunning] = useState(false);
  const [automationRefreshTrigger, setAutomationRefreshTrigger] = useState(0);

  // 加载自动化配置数据
  const loadAutomationConfigs = async (testCaseId: string) => {
    try {
      const response = await fetch(`/api/automation-config?testCaseId=${testCaseId}`);
      if (response.ok) {
        const configs = await response.json();
        return configs;
      }
    } catch (error) {
      console.error('Error loading automation configs:', error);
    }
    return {};
  };

  useEffect(() => {
    const loadTestCase = async () => {
      try {
        // 首先尝试从API加载真实数据（不需要项目ID验证）
        console.log('🔍 Loading test case:', id);
        const response = await fetch(`/api/test-case/by-id?id=${id}`);
        console.log('📡 API Response status:', response.status, 'ok:', response.ok);
        if (response.ok) {
          const apiTestCase = await response.json();
          console.log('API returned test case data:', apiTestCase);
          console.log('API returned steps:', apiTestCase.steps);
          console.log('Steps count from API:', apiTestCase.steps?.length);

          // 加载自动化配置
          const automationConfigs = await loadAutomationConfigs(id);

          // 转换API数据格式为组件期望的格式
          const formattedTestCase: TestCase = {
            id: apiTestCase.id,
            name: apiTestCase.name,
            description: apiTestCase.description || '',
            preconditions: apiTestCase.preconditions || '',
            priority: apiTestCase.priority || 'medium',
            status: apiTestCase.status || 'draft',
            weight: apiTestCase.weight || 'medium',
            format: apiTestCase.format || 'classic',
            nature: apiTestCase.nature || 'functional',
            type: apiTestCase.type || 'regression',
            tags: Array.isArray(apiTestCase.tags) ? apiTestCase.tags :
                  (typeof apiTestCase.tags === 'string' ?
                    (() => {
                      try {
                        return JSON.parse(apiTestCase.tags);
                      } catch (e) {
                        console.warn('Failed to parse tags JSON:', apiTestCase.tags);
                        return [];
                      }
                    })() : []),
            createdAt: new Date(apiTestCase.createdAt).toISOString(),
            updatedAt: new Date(apiTestCase.updatedAt).toISOString(),
            author: apiTestCase.createdBy || 'Unknown',
            modifier: apiTestCase.updatedBy || 'Unknown',
            executionTime: apiTestCase.executionTime || 0,
            lastRun: apiTestCase.lastRunAt ? new Date(apiTestCase.lastRunAt).toISOString() : undefined,
            steps: apiTestCase.steps || [], // 使用API返回的步骤数据
            automationConfigs: Object.keys(automationConfigs).length > 0 ? automationConfigs : undefined,
            relatedDocuments: apiTestCase.relatedDocuments || [],
            datasets: apiTestCase.datasets || [],
            testRuns: apiTestCase.testRuns || [],
            knownIssues: apiTestCase.knownIssues || []
          };
          console.log('Formatted test case:', formattedTestCase);
          console.log('Formatted steps:', formattedTestCase.steps);
          console.log('Formatted steps count:', formattedTestCase.steps?.length);
          setTestCase(formattedTestCase);
        }
      } catch (error) {
        console.error('Error loading test case:', error);
      }
    };

    // 只有在项目上下文加载完成且有当前项目时才执行API请求
    if (!projectLoading && currentProject) {
      loadTestCase();
    }
  }, [id, currentProject?.id, projectLoading]);

  const handleUpdate = async (updates: Partial<TestCase>) => {
    // 检查是否需要刷新自动化配置
    if ('refreshAutomation' in updates) {
      // 触发自动化配置刷新
      setAutomationRefreshTrigger(prev => prev + 1);
      // 不要将 refreshAutomation 添加到 testCase 状态中
      const { refreshAutomation, ...otherUpdates } = updates as any;
      if (Object.keys(otherUpdates).length > 0 && testCase) {
        const updatedTestCase = {
          ...testCase,
          ...otherUpdates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'ai-assistant'
        };
        setTestCase(updatedTestCase);
      }
      return;
    }
    
    if (testCase) {
      const updatedTestCase = {
        ...testCase,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user'
      };

      try {
        // 保存到数据库
        const response = await fetch(`/api/test-case?id=${testCase.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTestCase),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to save test case: ${JSON.stringify(errorData)}`);
        }

        // 更新本地状态
        setTestCase(updatedTestCase);

        // 显示成功提示
        toast.success('测试用例已成功保存');
      } catch (error) {
        console.error('保存测试用例失败:', error);
        toast.error('保存测试用例失败: ' + (error as Error).message);
      }
    }
  };

  const handleSave = () => {
    // 保存逻辑
    console.log('Saving test case:', testCase);
  };

  const handleAIGenerate = () => {
    // AI生成逻辑
    console.log(`Generating AI content for ${activeTab}`);
  };

  const handleRunTest = () => {
    setIsRunning(true);
    // 模拟测试运行
    setTimeout(() => {
      setIsRunning(false);
      console.log('Test completed');
    }, 3000);
  };

  if (!testCase) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('testCase.loading')}</p>
        </div>
      </div>
    );
  }

  const renderModule = () => {
    // 适配器：将详情页的数据格式转换为共享模块期望的格式
    const sharedModuleProps = {
      testCaseDetails: testCase,
      selectedId: testCase?.id,
      onUpdate: handleUpdate
    };

    switch (activeTab) {
      case 'information':
        return <InformationModule
          {...sharedModuleProps}
          onUpdate={(updates) => {
            // 立即更新本地状态以刷新UI
            setTestCase((prev: any) => ({ ...prev, ...updates }));
            // 调用父组件的更新方法保存到数据库
            handleUpdate(updates);
          }}
        />;
      case 'steps':
        return <StepsModule
          {...sharedModuleProps}
          onUpdate={(updates) => {
            // 立即更新本地状态以刷新UI
            setTestCase((prev: any) => ({ ...prev, ...updates }));
            // 调用父组件的更新方法保存到数据库
            handleUpdate(updates);
          }}
        />;
      case 'automation':
        return <AutomationModule {...sharedModuleProps} />;
      case 'documents':
        return <DocumentsModule {...sharedModuleProps} />;
      case 'dataset':
        return <DatasetModule {...sharedModuleProps} />;
      case 'testruns':
        return <TestRunsModule {...sharedModuleProps} />;
      case 'issues':
        return <IssuesModule {...sharedModuleProps} />;
      case 'comments':
        return <CommentsModule {...sharedModuleProps} />;
      default:
        return <InformationModule {...sharedModuleProps} />;
    }
  };

  return (
    <TestCaseLayout
      testCase={testCase}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={handleSave}
      onAIGenerate={handleAIGenerate}
      onRunTest={handleRunTest}
      isRunning={isRunning}
      onTestCaseUpdate={handleUpdate}
    >
      {renderModule()}
    </TestCaseLayout>
  );
}