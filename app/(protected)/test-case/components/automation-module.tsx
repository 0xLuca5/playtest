'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Settings, Activity, Clock, RefreshCw, Play, Edit, Plus, ExternalLink, GitBranch, Terminal, CheckCircle, XCircle, ArrowRight, Github, Save, X, Trash2, Copy } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import { useProject } from '@/lib/contexts/project-context';
import { useIntl } from 'react-intl';
import { useChatModels } from '@/hooks/use-chat-models';
import YamlEditor from '@/components/ui/yaml-editor';
import { useTheme } from 'next-themes';

interface AutomationConfig {
  id: string;
  testCaseId: string;
  repository: string;
  branch: string;
  commands: string[];
  parameters: Record<string, any>;
  framework: 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  environment: 'dev' | 'test' | 'staging' | 'prod';
  environmentVariables: Record<string, string>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AutomationModuleProps {
  testCaseDetails: any;
}

// 配置卡片组件
function AutomationConfigCard({
  config,
  t,
  onRun,
  isRunning,
  onEdit,
  onSyncToGitlab,
  isSyncingToGitlab,
  onDelete,
  isDeleting
}: {
  config: AutomationConfig;
  t: (key: string) => string;
  onRun: (framework: string) => void;
  isRunning: boolean;
  onEdit: (config: AutomationConfig) => void;
  onSyncToGitlab: (config: AutomationConfig) => void;
  isSyncingToGitlab: boolean;
  onDelete: (config: AutomationConfig) => void;
  isDeleting: boolean;
}) {
  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'midscene': return { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-100', imageSrc: '/midscene-icon.png' };
      case 'playwright': return { icon: Bot, color: 'text-blue-600', bg: 'bg-blue-100', imageSrc: '/Playwrite.png' };
      case 'cypress': return { icon: Bot, color: 'text-green-600', bg: 'bg-green-100', imageSrc: '/Cypress.png' };
      case 'selenium': return { icon: Bot, color: 'text-orange-600', bg: 'bg-orange-100', imageSrc: '/Selenium.png' };
      case 'karate': return { icon: Bot, color: 'text-red-600', bg: 'bg-red-100', imageSrc: '/Karate Labs.png' };
      default: return { icon: Bot, color: 'text-gray-600', bg: 'bg-gray-100', imageSrc: null };
    }
  };

  const { icon: FrameworkIcon, color, bg, imageSrc } = getFrameworkIcon(config.framework);

  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-1 rounded-lg ${bg} border border-slate-200`}>
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={config.framework}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <FrameworkIcon className={`w-4 h-4 ${color}`} />
            )}
          </div>
          <div>
            <h4 className="font-medium text-slate-800 dark:text-slate-200 capitalize">
              {config.framework}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {config.browser}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {config.environment}
              </Badge>
              {config.isActive ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">{t('testCase.automation.active')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-600">{t('testCase.automation.inactive')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          {/* <Button 
            variant="outline" 
            size="sm" 
            title={t('testCase.automation.syncToGithub')}
            className="border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <Github className="w-4 h-4" />
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSyncToGitlab(config)}
            disabled={isSyncingToGitlab || isRunning}
            title={isSyncingToGitlab ? t('testCase.automation.syncToGitlab.syncing') : t('testCase.automation.syncToGitlab')}
            className={`border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700 transition-all duration-200 ${
              isSyncingToGitlab ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'
            }`}
          >
            {isSyncingToGitlab ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <img src="/GitLab.png" alt="GitLab" className="w-4 h-4" />
            )}
          </Button>
          {(config.framework === 'midscene' || config.framework === 'karate') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(config)}
              title={t('testCase.automation.editConfiguration')}
              className="border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(config)}
            disabled={isDeleting || isRunning}
            title={isDeleting ? t('testCase.automation.deletingConfig') : t('testCase.automation.deleteConfig')}
            className={`border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700 transition-all duration-200 ${
              isDeleting || isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'
            }`}
          >
            {isDeleting ? (
              <Activity className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-600" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRun(config.framework)}
            disabled={isRunning || isDeleting || config.framework.toLowerCase() !== 'midscene'}
            title={
              config.framework.toLowerCase() !== 'midscene' 
                ? t('testCase.automation.onlyMidsceneSupported') || 'Only Midscene framework is currently supported for execution'
                : isRunning 
                  ? t('testCase.automation.runningTest') 
                  : t('testCase.automation.runTest')
            }
            className={`border-green-300 hover:border-green-600 hover:bg-green-50 dark:border-green-600 dark:hover:border-green-500 dark:hover:bg-green-900/30 transition-all duration-200 ${
              isRunning || isDeleting || config.framework.toLowerCase() !== 'midscene' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'
            }`}
          >
            {isRunning ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Repository */}
        <div className="flex items-center gap-2 text-sm">
          <ExternalLink className="w-4 h-4 text-slate-500" />
          <a
            href={config.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-mono truncate"
          >
            {config.repository}
          </a>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-slate-500" />
          <span className="font-mono text-slate-600 dark:text-slate-400">{config.branch}</span>
        </div>

        {/* Commands */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('testCase.automation.commands')} ({config.commands.length})
            </span>
          </div>
          <div className="bg-slate-900 dark:bg-slate-800 rounded-md p-2 space-y-1 max-h-20 overflow-y-auto">
            {config.commands.slice(0, 2).map((command, index) => (
              <div key={index} className="text-green-400 font-mono text-xs">
                <span className="text-slate-500">$ </span>{command}
              </div>
            ))}
            {config.commands.length > 2 && (
              <div className="text-slate-500 text-xs">
                ... +{config.commands.length - 2} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AutomationModule({ testCaseDetails }: AutomationModuleProps) {
  const { t } = useI18n();
  const { currentProject } = useProject();
  const intl = useIntl();
  const { chatModels: configuredChatModels, getDefaultChatModelId } = useChatModels();
  const { theme } = useTheme();

  // 获取当前语言
  const currentLocale = intl.locale;

  // 从cookie中获取当前选择的聊天模型
  const getCurrentChatModel = () => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const chatModelCookie = cookies.find(cookie => cookie.trim().startsWith('chat-model='));
      if (chatModelCookie) {
        const modelId = chatModelCookie.split('=')[1]?.trim();
        return modelId || getDefaultChatModelId();
      }
    }
    return getDefaultChatModelId();
  };
  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningFramework, setRunningFramework] = useState<string | null>(null);

  // 编辑dialog状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AutomationConfig | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [saving, setSaving] = useState(false);

  // GitLab同步状态
  const [syncingToGitlab, setSyncingToGitlab] = useState(false);

  // 删除配置状态
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);

  // GitLab配置状态
  const [gitlabConfig, setGitlabConfig] = useState({
    baseUrl: 'https://gitlab.com',
    accessToken: ''
  });

  // GitLab配置对话框状态
  const [gitlabConfigDialogOpen, setGitlabConfigDialogOpen] = useState(false);
  const [pendingSyncConfig, setPendingSyncConfig] = useState<AutomationConfig | null>(null);

  // 标签页状态
  const [activeTab, setActiveTab] = useState('basic');

  // 框架选择对话框状态
  const [frameworkSelectionOpen, setFrameworkSelectionOpen] = useState(false);
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);

  // 处理框架选择
  const handleFrameworkSelect = async (framework: 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate') => {
    setFrameworkSelectionOpen(false);

    if (!testCaseDetails?.id) {
      toast.error(t('testCase.automation.testCaseIncomplete'));
      return;
    }

    try {
      // 设置loading状态
      setIsGeneratingConfig(true);

      // 显示加载提示
      toast.info(t('testCase.automation.generatingConfig', { framework }));

      // 调用新的自动化配置生成API
      const response = await fetch('/api/automation-config/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: testCaseDetails.id,
          projectId: currentProject?.id,
          framework: framework,
          testCaseName: testCaseDetails.name || testCaseDetails.id,
          locale: currentLocale,
          selectedChatModel: getCurrentChatModel(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
      }

      // 清理并解析响应文本
      let cleanText = fullText.trim();
      
      // 移除可能的 markdown 代码块标记
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // 尝试提取 JSON 对象
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanText);

      // 检查生成结果
      if (result.success && result.config) {
        toast.success(t('testCase.automation.configGenerated', { framework }));

        // 重新加载配置以确保数据同步
        await loadAutomationConfigs();
      } else {
        throw new Error(result.error || 'Failed to generate configuration');
      }

    } catch (error) {
      console.error('生成自动化配置失败:', error);

      // 根据错误类型显示不同的提示
      let errorMessage = '';
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('负载已饱和') || error.message.includes('稍后再试')) {
          errorMessage = 'AI服务当前负载较高，请稍后重试';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = '认证失败，请刷新页面重试';
        } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
          errorMessage = '服务器内部错误，请稍后重试';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = '请求超时，请检查网络连接后重试';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = '未知错误，请稍后重试';
      }

      toast.error(t('testCase.automation.configGenerationFailed', {
        framework,
        error: errorMessage
      }));
    } finally {
      setIsGeneratingConfig(false);
    }
  };

  // 基本配置表单状态
  const [basicConfig, setBasicConfig] = useState({
    repository: '',
    branch: 'main',
    commands: [''],
    parameters: {} as Record<string, any>,
    framework: 'midscene' as 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate',
    browser: 'chrome' as 'chrome' | 'firefox' | 'safari' | 'edge',
    environment: 'test' as 'dev' | 'test' | 'staging' | 'prod',
    environmentVariables: {} as Record<string, string>,
    isActive: true
  });

  // 加载自动化配置
  const loadAutomationConfigs = async () => {
    if (!testCaseDetails?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/automation-config?testCaseId=${testCaseDetails.id}`);
      if (!response.ok) {
        throw new Error('Failed to load automation configs');
      }

      const data = await response.json();

      // 将对象格式转换为数组格式
      const configsArray: AutomationConfig[] = [];
      if (data && typeof data === 'object') {
        Object.values(data).forEach((config: any) => {
          if (config && config.id) {
            configsArray.push(config);
          }
        });
      }

      setAutomationConfigs(configsArray);
    } catch (err) {
      console.error('Failed to load automation configs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 当测试用例变化时加载配置
  useEffect(() => {
    loadAutomationConfigs();
  }, [testCaseDetails?.id]);


  // 处理编辑配置
  const handleEditConfig = (config: AutomationConfig) => {
    setEditingConfig(config);

    // 初始化基本配置表单数据
    const parsedParams = typeof config.parameters === 'string' ? JSON.parse(config.parameters) : (config.parameters || {});
    setBasicConfig({
      repository: config.repository,
      branch: config.branch,
      commands: Array.isArray(config.commands) ? config.commands : [],
      parameters: parsedParams,
      framework: config.framework,
      browser: config.browser,
      environment: config.environment,
      environmentVariables: config.environmentVariables || {},
      isActive: config.isActive
    });

    // 初始化YAML内容 - 只显示parameters.yaml的内容
    const yamlText = parsedParams.yaml || '# YAML configuration\n# Add your custom YAML configuration here\n';
    console.log('原始YAML内容:', yamlText);
    setYamlContent(yamlText);

    // 设置默认标签页
    setActiveTab('basic');
    setEditDialogOpen(true);
  };

  // 保存配置（统一处理基本配置和YAML配置）
  const handleSaveConfig = async () => {
    if (!editingConfig) return;

    try {
      setSaving(true);

      let configData;

      if (activeTab === 'basic') {
        // 保存基本配置
        configData = {
          repository: basicConfig.repository,
          branch: basicConfig.branch,
          commands: basicConfig.commands.filter(cmd => cmd.trim() !== ''),
          parameters: basicConfig.parameters,
          framework: basicConfig.framework,
          browser: basicConfig.browser,
          environment: basicConfig.environment,
          environmentVariables: basicConfig.environmentVariables,
          isActive: basicConfig.isActive,
        };
      } else {
        // 保存YAML配置 - 将YAML内容保存到parameters.yaml
        configData = {
          parameters: {
            ...basicConfig.parameters,
            yaml: yamlContent
          }
        };
      }

      // 调用API保存配置
      const response = await fetch(`/api/automation-config/${editingConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      // 获取API返回的更新后数据
      const updatedConfig = await response.json();

      // 立即更新本地状态
      setAutomationConfigs(prevConfigs =>
        prevConfigs.map(config =>
          config.id === editingConfig.id
            ? {
                ...updatedConfig,
                updatedAt: Date.now()
              }
            : config
        )
      );

      toast.success(t('testCase.automation.configSaved'));

      // 重置所有编辑状态
      setEditDialogOpen(false);
      setEditingConfig(null);
      setYamlContent('');
      setActiveTab('basic');

      // 重置基本配置表单
      setBasicConfig({
        repository: '',
        branch: 'main',
        commands: [''],
        parameters: {} as Record<string, any>,
        framework: 'midscene' as 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate',
        browser: 'chrome' as 'chrome' | 'firefox' | 'safari' | 'edge',
        environment: 'test' as 'dev' | 'test' | 'staging' | 'prod',
        environmentVariables: {} as Record<string, string>,
        isActive: true
      });

      // 重新加载配置以确保数据同步
      await loadAutomationConfigs();

    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error(t('testCase.automation.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 处理标签页切换
  const handleTabChange = (newTab: string) => {
    if (newTab === 'yaml' && activeTab === 'basic') {
      // 从基本配置切换到YAML，显示当前的parameters.yaml内容
      const currentYaml = basicConfig.parameters.yaml || '# YAML configuration\n# Add your custom YAML configuration here\n';
      setYamlContent(currentYaml);
    } else if (newTab === 'basic' && activeTab === 'yaml') {
      // 从YAML切换到基本配置，将YAML内容保存到parameters.yaml
      setBasicConfig(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          yaml: yamlContent
        }
      }));
    }
    setActiveTab(newTab);
  };

  // 关闭编辑dialog
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingConfig(null);
    setYamlContent('');
    setActiveTab('basic');

    // 重置基本配置表单
    setBasicConfig({
      repository: '',
      branch: 'main',
      commands: [''],
      parameters: {} as Record<string, any>,
      framework: 'midscene' as 'selenium' | 'playwright' | 'cypress' | 'midscene' | 'karate',
      browser: 'chrome' as 'chrome' | 'firefox' | 'safari' | 'edge',
      environment: 'test' as 'dev' | 'test' | 'staging' | 'prod',
      environmentVariables: {} as Record<string, string>,
      isActive: true
    });
  };

  // 复制YAML内容到剪贴板
  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      toast.success(t('common.copied'));
    } catch (error) {
      console.error('Failed to copy YAML content:', error);
      toast.error(t('common.copyFailed'));
    }
  };

  // 处理GitLab同步
  const handleSyncToGitlab = async (config: AutomationConfig) => {
    if (!testCaseDetails?.id || !config.repository) {
      toast.error(t('testCase.automation.syncError.missingInfo'));
      return;
    }

    // 检查是否有GitLab访问令牌
    if (!gitlabConfig.accessToken) {
      // 如果没有配置，打开配置对话框
      setPendingSyncConfig(config);
      setGitlabConfigDialogOpen(true);
      return;
    }

    await performGitlabSync(config);
  };

  // 执行GitLab同步
  const performGitlabSync = async (config: AutomationConfig) => {
    try {
      setSyncingToGitlab(true);
      toast.info(t('testCase.automation.syncToGitlab.starting'));

      const requestBody: any = {
        testCaseId: testCaseDetails!.id,
        repositoryUrl: config.repository,
        sourceBranch: config.branch || 'main',
      };

      // 如果有GitLab配置，添加到请求中
      if (gitlabConfig.accessToken) {
        requestBody.gitlabConfig = {
          baseUrl: gitlabConfig.baseUrl,
          accessToken: gitlabConfig.accessToken
        };
      }

      const response = await fetch('/api/gitlab/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to sync to GitLab');
      }

      if (result.success) {
        // 检查消息中是否包含模板文件上传信息
        const hasTemplateFiles = result.message && result.message.includes('template files');
        const fileCountMatch = result.message?.match(/uploaded (\d+) template files/);
        const fileCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;

        if (hasTemplateFiles && fileCount > 0) {
          toast.success(t('testCase.automation.syncToGitlab.successWithFiles', {
            branchName: result.branchName,
            fileCount: fileCount
          }));
        } else {
          toast.success(t('testCase.automation.syncToGitlab.success', {
            branchName: result.branchName
          }));
        }

        // 如果有分支URL，可以选择性地打开
        if (result.branchUrl) {
          const shouldOpen = window.confirm(
            t('testCase.automation.syncToGitlab.openBranch', {
              branchName: result.branchName
            })
          );
          if (shouldOpen) {
            window.open(result.branchUrl, '_blank');
          }
        }
      } else {
        throw new Error(result.message || 'Sync failed');
      }

    } catch (error) {
      console.error('GitLab sync error:', error);

      let errorMessage = t('testCase.automation.unknownError');

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // 根据错误消息内容判断错误类型
        if (message.includes('html page') || message.includes('doctype') || message.includes('html_response')) {
          errorMessage = t('testCase.automation.syncError.htmlResponse');
        } else if (message.includes('network') || message.includes('fetch') || message.includes('cannot connect')) {
          errorMessage = t('testCase.automation.syncError.invalidUrl');
        } else if (message.includes('authentication') || message.includes('401') || message.includes('invalid') || message.includes('token')) {
          errorMessage = t('testCase.automation.syncError.tokenInvalid');
        } else if (message.includes('permission') || message.includes('403')) {
          errorMessage = t('testCase.automation.syncError.permissionError');
        } else if (message.includes('not found') || message.includes('404')) {
          errorMessage = t('testCase.automation.syncError.notFoundError');
        } else if (message.includes('already exists') || message.includes('409')) {
          errorMessage = t('testCase.automation.syncError.branchExistsError');
        } else if (message.includes('configuration') || message.includes('config')) {
          errorMessage = t('testCase.automation.syncError.configError');
        } else {
          errorMessage = t('testCase.automation.syncToGitlab.error', { error: error.message });
        }
      }

      toast.error(errorMessage);
    } finally {
      setSyncingToGitlab(false);
    }
  };

  // 处理GitLab配置保存
  const handleSaveGitlabConfig = async () => {
    if (!gitlabConfig.accessToken.trim()) {
      toast.error(t('testCase.automation.gitlabConfig.accessTokenRequired'));
      return;
    }

    // 关闭配置对话框
    setGitlabConfigDialogOpen(false);

    // 如果有待同步的配置，执行同步
    if (pendingSyncConfig) {
      await performGitlabSync(pendingSyncConfig);
      setPendingSyncConfig(null);
    }
  };

  // 关闭GitLab配置对话框
  const handleCloseGitlabConfigDialog = () => {
    setGitlabConfigDialogOpen(false);
    setPendingSyncConfig(null);
  };

  // 删除自动化配置
  const handleDeleteConfig = async (config: AutomationConfig) => {
    if (!window.confirm(t('testCase.automation.confirmDelete', { framework: config.framework }))) {
      return;
    }

    try {
      setDeletingConfig(config.id);

      const response = await fetch('/api/automation-config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: config.testCaseId,
          framework: config.framework
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete automation config');
      }

      const result = await response.json();
      if (result.success) {
        toast.success(t('testCase.automation.deleteSuccess', { framework: config.framework }));
        // 重新加载配置列表
        await loadAutomationConfigs();
      } else {
        throw new Error(result.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Delete automation config error:', error);
      toast.error(t('testCase.automation.deleteError', {
        framework: config.framework,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      setDeletingConfig(null);
    }
  };

  // 运行自动化测试
  const handleRun = async (framework: string) => {
    // 检查是否只支持 midscene（在设置状态之前检查）
    if (framework.toLowerCase() !== 'midscene') {
      toast.error(t('testCase.automation.onlyMidsceneSupported') || 'Only Midscene framework is currently supported for execution');
      return;
    }

    // 检查testCase是否存在（在设置loading状态之前检查）
    if (!testCaseDetails || !testCaseDetails.id) {
      toast.error(t('testCase.automation.testCaseIncomplete'));
      return;
    }

    // 检查是否有对应的配置（在设置loading状态之前检查）
    const config = automationConfigs.find(c => c.framework === framework);
    if (!config) {
      toast.error(t('testCase.automation.configNotFound', { framework }));
      return;
    }

    try {
      setRunningFramework(framework);

      // 调试信息
      console.log('handleRun called with:', { framework, testCaseId: testCaseDetails?.id, testCaseDetails });

      toast.info(t('testCase.automation.startingTest', { framework }));

      // 调用automation-config/execute API来执行自动化测试
      const response = await fetch('/api/automation-config/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: testCaseDetails.id,
          projectId: currentProject?.id,
          framework: framework,
          locale: currentLocale,
          selectedChatModel: getCurrentChatModel(),
        }),
      });

      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // 如果无法解析JSON，使用默认错误信息
        }
        throw new Error(errorMessage);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(t('testCase.automation.cannotReadResponse'));
      }

      let fullResponse = '';
      let hasError = false;
      let errorMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;

        // 检查流式响应中的错误信息
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'error' || data.error) {
                hasError = true;
                errorMessage = data.error?.message || data.message || data.data || 'Unknown error';
              }
              if (data.type === 'data-textDelta' && data.data) {
                if (data.data.includes('错误') || data.data.includes('失败') || data.data.includes('Error') ||
                    data.data.includes('Failed') || data.data.includes('负载已饱和') || data.data.includes('稍后再试')) {
                  hasError = true;
                  errorMessage = data.data;
                }
              }
            } catch (e) {
              // 如果JSON解析失败，检查原始文本
              if (line.includes('error') || line.includes('Error') || line.includes('错误') || line.includes('失败')) {
                hasError = true;
                errorMessage = line.replace('data: ', '');
              }
            }
          }
        }
      }

      // 检查是否有错误
      if (hasError || fullResponse.includes('Oops, an error occurred!') ||
          fullResponse.includes('负载已饱和') || fullResponse.includes('稍后再试')) {
        throw new Error(errorMessage || 'AI服务暂时不可用，请稍后重试');
      }

      // 解析响应中的成功/失败信息
      if (fullResponse.includes('✅') || fullResponse.includes('成功')) {
        toast.success(t('testCase.automation.testSuccess', { framework }));
      } else if (fullResponse.includes('❌') || fullResponse.includes('失败')) {
        toast.error(t('testCase.automation.testFailed', { framework }));
      } else {
        toast.info(t('testCase.automation.testSubmitted', { framework }));
      }

    } catch (error) {
      console.error(`Run ${framework} test error:`, error);

      // 根据错误类型显示不同的提示
      let errorMessage = '';
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('负载已饱和') || error.message.includes('稍后再试')) {
          errorMessage = 'AI服务当前负载较高，请稍后重试';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = '认证失败，请刷新页面重试';
        } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
          errorMessage = '服务器内部错误，请稍后重试';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = '请求超时，请检查网络连接后重试';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = '未知错误，请稍后重试';
      }

      toast.error(t('testCase.automation.runError', {
        framework,
        error: errorMessage
      }));
    } finally {
      setRunningFramework(null);
    }
  };

  // 确保组件在 testCaseDetails 更新时重新渲染
  if (!testCaseDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">
          {t('testCase.noTestCaseSelected')}
        </div>
      </div>
    );
  }

  // 获取配置统计信息
  const getConfigStats = () => {
    const activeConfigs = automationConfigs.filter(config => config.isActive);
    const frameworks = [...new Set(automationConfigs.map(config => config.framework))];
    const lastRun = automationConfigs.length > 0
      ? Math.max(...automationConfigs.map(config => config.updatedAt))
      : null;

    return {
      total: automationConfigs.length,
      active: activeConfigs.length,
      frameworks: frameworks.length,
      lastRun: lastRun ? new Date(lastRun).toLocaleDateString() : null
    };
  };

  const stats = getConfigStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.automation')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.automationDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAutomationConfigs}
            disabled={loading}
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          {/* {automationConfigs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const activeConfigs = automationConfigs.filter(c => c.isActive);
                if (activeConfigs.length > 0) {
                  activeConfigs.forEach(config => handleRun(config.framework));
                } else {
                  toast.info(t('testCase.automation.noActiveConfigs'));
                }
              }}
              disabled={runningFramework !== null}
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {t('testCase.automation.runAll')}
            </Button>
          )} */}
          {/* <Button
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
            onClick={() => {
              if (testCaseDetails?.id) {
                window.open(`/test-case/${testCaseDetails.id}?tab=automation`, '_blank');
              }
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('testCase.automation.manageConfigs')}
          </Button> */}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-600 dark:text-slate-400">{t('testCase.automation.loading')}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">
            {t('testCase.automation.error')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAutomationConfigs}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('testCase.automation.retry')}
          </Button>
        </div>
      )}

      {/* Automation Status */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.automation.total')}</span>
            </div>
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {stats.total}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.automation.active')}</span>
            </div>
            <div className="text-lg font-semibold text-green-600">
              {stats.active}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.automation.frameworks')}</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {stats.frameworks}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.automation.lastUpdated')}</span>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {stats.lastRun || t('testCase.never')}
            </div>
          </div>
        </div>
      )}

      {/* Automation Configurations */}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {t('testCase.automation.configurations')}
            </h3>
            <div className="flex items-center gap-2">
              {automationConfigs.length > 0 && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {automationConfigs.length} {t('testCase.automation.configured')}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFrameworkSelectionOpen(true)}
                    disabled={isGeneratingConfig}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                  >
                    {isGeneratingConfig ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t('testCase.automation.generating')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('testCase.automation.addConfiguration')}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {automationConfigs.length === 0 ? (
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
              <Bot className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-md font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('testCase.automation.noConfigurations')}
              </h4>
              <p className="text-slate-500 dark:text-slate-500 mb-4 text-sm">
                {t('testCase.automation.noConfigurationsDescription')}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => setFrameworkSelectionOpen(true)}
                  disabled={isGeneratingConfig}
                >
                  {isGeneratingConfig ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('testCase.automation.generating')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('testCase.automation.createFirst')}
                    </>
                  )}
                </Button>
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (testCaseDetails?.id) {
                      window.open(`/test-case/${testCaseDetails.id}?tab=automation`, '_blank');
                    }
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {t('testCase.automation.openDetailPage')}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button> */}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {automationConfigs.map((config) => (
                <AutomationConfigCard
                  key={config.id}
                  config={config}
                  t={t}
                  onRun={handleRun}
                  isRunning={runningFramework === config.framework}
                  onEdit={handleEditConfig}
                  onSyncToGitlab={handleSyncToGitlab}
                  isSyncingToGitlab={syncingToGitlab}
                  onDelete={handleDeleteConfig}
                  isDeleting={deletingConfig === config.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 编辑配置Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className={`${activeTab === 'yaml' ? '!max-w-7xl w-[95vw]' : 'max-w-4xl w-[80vw]'} max-h-[85vh] overflow-hidden flex flex-col`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {t('testCase.automation.editConfiguration')} - {editingConfig?.framework}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">{t('testCase.automation.tabs.basicConfig')}</TabsTrigger>
                <TabsTrigger value="yaml">{t('testCase.automation.tabs.yamlConfig')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="flex-1 overflow-auto mt-4">
                <div className="space-y-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('testCase.automation.basicConfigDescription')}
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repository">{t('testCase.automation.repository')}</Label>
                      <Input
                        id="repository"
                        value={basicConfig.repository}
                        onChange={(e) => setBasicConfig(prev => ({ ...prev, repository: e.target.value }))}
                        placeholder="https://gitlab.com/username/project"
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branch">{t('testCase.automation.branch')}</Label>
                      <Input
                        id="branch"
                        value={basicConfig.branch}
                        onChange={(e) => setBasicConfig(prev => ({ ...prev, branch: e.target.value }))}
                        placeholder="main"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="browser">{t('testCase.automation.browser')}</Label>
                      <Select
                        value={basicConfig.browser}
                        onValueChange={(value: 'chrome' | 'firefox' | 'safari' | 'edge') =>
                          setBasicConfig(prev => ({ ...prev, browser: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="environment">{t('testCase.automation.environment')}</Label>
                      <Select
                        value={basicConfig.environment}
                        onValueChange={(value: 'dev' | 'test' | 'staging' | 'prod') =>
                          setBasicConfig(prev => ({ ...prev, environment: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dev">Development</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="prod">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div> */}

                  {/* 命令配置 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t('testCase.automation.commands')}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBasicConfig(prev => ({
                          ...prev,
                          commands: [...prev.commands, '']
                        }))}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('testCase.automation.addCommand')}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {basicConfig.commands.map((command, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={command}
                            onChange={(e) => {
                              const newCommands = [...basicConfig.commands];
                              newCommands[index] = e.target.value;
                              setBasicConfig(prev => ({ ...prev, commands: newCommands }));
                            }}
                            placeholder={`${t('testCase.automation.command')} ${index + 1}`}
                            className="font-mono text-sm"
                          />
                          {basicConfig.commands.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newCommands = basicConfig.commands.filter((_, i) => i !== index);
                                setBasicConfig(prev => ({ ...prev, commands: newCommands }));
                              }}
                              className="px-2"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 环境变量配置 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t('testCase.automation.environmentVariables')}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newKey = `VAR_${Object.keys(basicConfig.environmentVariables).length + 1}`;
                          setBasicConfig(prev => ({
                            ...prev,
                            environmentVariables: { ...prev.environmentVariables, [newKey]: '' }
                          }));
                        }}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('testCase.automation.addEnvironmentVariable')}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(basicConfig.environmentVariables).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <Input
                            value={key}
                            onChange={(e) => {
                              const newVars = { ...basicConfig.environmentVariables };
                              delete newVars[key];
                              newVars[e.target.value] = value;
                              setBasicConfig(prev => ({ ...prev, environmentVariables: newVars }));
                            }}
                            placeholder={t('testCase.automation.variableName')}
                            className="font-mono text-sm flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => {
                              setBasicConfig(prev => ({
                                ...prev,
                                environmentVariables: { ...prev.environmentVariables, [key]: e.target.value }
                              }));
                            }}
                            placeholder={t('testCase.automation.variableValue')}
                            className="font-mono text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newVars = { ...basicConfig.environmentVariables };
                              delete newVars[key];
                              setBasicConfig(prev => ({ ...prev, environmentVariables: newVars }));
                            }}
                            className="px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {Object.keys(basicConfig.environmentVariables).length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                          {t('testCase.automation.noEnvironmentVariables')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={basicConfig.isActive}
                      onChange={(e) => setBasicConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <Label htmlFor="isActive" className="text-sm">
                      {t('testCase.automation.isActive')}
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="yaml" className="flex-1 overflow-hidden mt-4">
                <div className="h-full flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t('testCase.automation.editYamlDescription')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyYaml}
                      disabled={!yamlContent.trim()}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {t('common.copy')}
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 max-h-[500px] border border-slate-200 dark:border-slate-700 rounded-md overflow-auto">
                    <YamlEditor
                      value={yamlContent}
                      onChange={setYamlContent}
                      className="w-full h-full border-0"
                      placeholder={t('testCase.automation.yamlPlaceholder')}
                      theme={theme === 'dark' ? 'dark' : 'light'}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseEditDialog}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saving || (activeTab === 'yaml' && !yamlContent.trim()) || (activeTab === 'basic' && !basicConfig.repository.trim())}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GitLab配置Dialog */}
      <Dialog open={gitlabConfigDialogOpen} onOpenChange={setGitlabConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/GitLab.png" alt="GitLab" className="w-5 h-5" />
              {t('testCase.automation.gitlabConfig.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('testCase.automation.gitlabConfig.description')}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gitlab-base-url">{t('testCase.automation.gitlabConfig.baseUrl')}</Label>
                <Input
                  id="gitlab-base-url"
                  value={gitlabConfig.baseUrl}
                  onChange={(e) => setGitlabConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://gitlab.com 或 https://git.epam.com"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('testCase.automation.gitlabConfig.baseUrlHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gitlab-access-token">{t('testCase.automation.gitlabConfig.accessToken')}</Label>
                <Input
                  id="gitlab-access-token"
                  type="password"
                  value={gitlabConfig.accessToken}
                  onChange={(e) => setGitlabConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder={t('testCase.automation.gitlabConfig.accessTokenPlaceholder')}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('testCase.automation.gitlabConfig.tokenHint')}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseGitlabConfigDialog}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveGitlabConfig}
              disabled={!gitlabConfig.accessToken.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <img src="/GitLab.png" alt="GitLab" className="w-4 h-4 mr-2" />
              {t('testCase.automation.gitlabConfig.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 框架选择对话框 */}
      <Dialog open={frameworkSelectionOpen} onOpenChange={setFrameworkSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {isGeneratingConfig ? t('testCase.automation.generating') : t('testCase.automation.selectFramework')}
            </DialogTitle>
            <DialogDescription>
              {isGeneratingConfig
                ? t('testCase.automation.generatingDescription')
                : t('testCase.automation.selectFrameworkDescription')
              }
            </DialogDescription>
          </DialogHeader>

          <div className={`space-y-3 ${isGeneratingConfig ? 'opacity-50' : ''}`}>
            {isGeneratingConfig && (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mr-2" />
                <span className="text-sm text-slate-600">{t('testCase.automation.generatingConfig', { framework: 'Midscene' })}</span>
              </div>
            )}
            {[
              { value: 'midscene', label: 'Midscene', description: t('testCase.automation.frameworks.midscene'), color: 'text-purple-600', bg: 'bg-purple-100', enabled: true, icon: '/midscene-icon.png' },
              { value: 'karate', label: 'Karate', description: t('testCase.automation.frameworks.karate'), color: 'text-red-600', bg: 'bg-red-100', enabled: true, icon: '/Karate Labs.png' },
              { value: 'playwright', label: 'Playwright', description: t('testCase.automation.frameworks.playwright'), color: 'text-blue-600', bg: 'bg-blue-100', enabled: false, icon: '/Playwrite.png' },
              { value: 'cypress', label: 'Cypress', description: t('testCase.automation.frameworks.cypress'), color: 'text-green-600', bg: 'bg-green-100', enabled: false, icon: '/Cypress.png' },
              { value: 'selenium', label: 'Selenium', description: t('testCase.automation.frameworks.selenium'), color: 'text-orange-600', bg: 'bg-orange-100', enabled: false, icon: '/Selenium.png' }
            ].map((framework) => {
              // 检查该框架是否已经有配置
              const hasExistingConfig = automationConfigs.some(config => config.framework === framework.value);
              const isFrameworkEnabled = framework.enabled && !hasExistingConfig;

              return (
                <Button
                  key={framework.value}
                  variant="outline"
                  disabled={!isFrameworkEnabled || isGeneratingConfig}
                  className="w-full h-auto p-4 justify-start"
                  onClick={() => handleFrameworkSelect(framework.value as any)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-1 rounded-lg ${framework.bg} border border-slate-200`}>
                      {framework.icon ? (
                        <img
                          src={framework.icon}
                          alt={framework.label}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <Bot className={`w-4 h-4 ${framework.color}`} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {framework.label}
                        {!framework.enabled && (
                          <span className="ml-2 text-xs text-slate-500">
                            ({t('testCase.automation.comingSoon')})
                          </span>
                        )}
                        {hasExistingConfig && (
                          <span className="ml-2 text-xs text-green-600">
                            ({t('testCase.automation.alreadyConfigured')})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {framework.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFrameworkSelectionOpen(false)}
              disabled={isGeneratingConfig}
            >
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
