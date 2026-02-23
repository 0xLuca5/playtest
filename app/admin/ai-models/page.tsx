'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Zap,

  Globe,
  Cpu,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';

// 类型定义
interface Provider {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  baseUrl: string | null;
  apiKeyRequired: boolean;
  supportedFeatures: string[] | null;
  configuration: Record<string, any> | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface Model {
  id: string;
  providerId: string;
  modelKey: string;
  displayName: string;
  description: string;
  modelType: 'chat' | 'image' | 'embedding' | 'reasoning';
  capabilities: string[] | null;
  contextWindow: number;
  maxTokens: number;
  pricing: Record<string, number> | null;
  configuration: Record<string, any> | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface ModelUsage {
  id: string;
  usageType: string;
  modelId: string;
  priority: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  model?: Model;
  provider?: Provider;
}



export default function AIModelsPage() {
  const { t } = useI18n();
  
  // 状态管理
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelUsages, setModelUsages] = useState<ModelUsage[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // 表单状态
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editingUsage, setEditingUsage] = useState<ModelUsage | null>(null);
  const [deletingModel, setDeletingModel] = useState<Model | null>(null);
  const [deletingUsage, setDeletingUsage] = useState<ModelUsage | null>(null);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);

  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false);
  const [showDeleteUsageDialog, setShowDeleteUsageDialog] = useState(false);
  const [showDeleteProviderDialog, setShowDeleteProviderDialog] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');

  // API密钥配置状态
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [configuringProvider, setConfiguringProvider] = useState<Provider | null>(null);
  const [providerApiKeyStatus, setProviderApiKeyStatus] = useState<Record<string, boolean>>({});
  const [apiKeyForm, setApiKeyForm] = useState({
    keyName: '',
    apiKey: '',
  });
  const [apiKeyFormErrors, setApiKeyFormErrors] = useState({
    apiKey: '',
  });
  
  // 提供者表单状态
  const [providerForm, setProviderForm] = useState({
    id: '',
    name: '',
    displayName: '',
    description: '',
    baseUrl: '',
    apiKeyRequired: true,
    supportedFeatures: [] as string[],
    isActive: true,
  });

  // 提供者表单验证错误
  const [providerFormErrors, setProviderFormErrors] = useState({
    name: '',
    displayName: '',
  });



  // 模型表单状态
  const [modelForm, setModelForm] = useState({
    id: '',
    providerId: '',
    modelKey: '',
    displayName: '',
    description: '',
    modelType: 'chat' as 'chat' | 'completion' | 'embedding' | 'image' | 'audio',
    capabilities: [] as string[],
    contextWindow: 4096,
    maxTokens: 2048,
    pricing: {} as Record<string, number>,
    configuration: {} as Record<string, any>,
    isActive: true,
    sortOrder: 0,
  });

  // 模型表单验证错误
  const [modelFormErrors, setModelFormErrors] = useState({
    providerId: '',
    modelKey: '',
    displayName: '',
  });

  // 用途配置表单状态
  const [usageForm, setUsageForm] = useState({
    id: '',
    usageType: '',
    modelId: '',
    priority: 1,
    isActive: true,
  });

  // 用途配置表单验证错误
  const [usageFormErrors, setUsageFormErrors] = useState({
    usageType: '',
    modelId: '',
  });

  // 验证提供者表单
  const validateProviderForm = () => {
    const errors = {
      name: '',
      displayName: '',
    };

    if (!providerForm.name.trim()) {
      errors.name = t('admin.aiModels.providers.nameRequired');
    }

    if (!providerForm.displayName.trim()) {
      errors.displayName = t('admin.aiModels.providers.displayNameRequired');
    }

    setProviderFormErrors(errors);
    return !errors.name && !errors.displayName;
  };

  // 验证模型表单
  const validateModelForm = () => {
    const errors = {
      providerId: '',
      modelKey: '',
      displayName: '',
    };

    if (!modelForm.providerId.trim()) {
      errors.providerId = t('admin.aiModels.models.providerRequired');
    }

    if (!modelForm.modelKey.trim()) {
      errors.modelKey = t('admin.aiModels.models.modelKeyRequired');
    }

    if (!modelForm.displayName.trim()) {
      errors.displayName = t('admin.aiModels.models.displayNameRequired');
    }

    setModelFormErrors(errors);
    return !errors.providerId && !errors.modelKey && !errors.displayName;
  };

  // 验证用途配置表单
  const validateUsageForm = () => {
    const errors = {
      usageType: '',
      modelId: '',
    };

    if (!usageForm.usageType.trim()) {
      errors.usageType = t('admin.aiModels.usage.usageTypeRequired');
    }

    if (!usageForm.modelId.trim()) {
      errors.modelId = t('admin.aiModels.usage.modelRequired');
    }

    setUsageFormErrors(errors);
    return !errors.usageType && !errors.modelId;
  };

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [providersRes, modelsRes, usagesRes] = await Promise.all([
        fetch('/api/ai-models/providers'),
        fetch('/api/ai-models/models'),
        fetch('/api/ai-models/usage')
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        console.log('Loaded providers:', providersData);
        // 过滤掉无效的提供者
        const validProviders = providersData.filter((p: any) => p.id && p.id.trim() !== '');
        setProviders(validProviders);

        // 获取每个provider的API密钥状态
        const apiKeyStatusMap: Record<string, boolean> = {};
        for (const provider of validProviders) {
          try {
            const keyCheckRes = await fetch(`/api/ai-models/api-keys/check?providerId=${provider.id}`);
            if (keyCheckRes.ok) {
              const keyInfo = await keyCheckRes.json();
              apiKeyStatusMap[provider.id] = keyInfo.hasApiKey;
            }
          } catch (error) {
            console.warn(`Failed to check API key for provider ${provider.id}:`, error);
            apiKeyStatusMap[provider.id] = false;
          }
        }
        setProviderApiKeyStatus(apiKeyStatusMap);
      }

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        console.log('Loaded models:', modelsData);
        // 过滤掉无效的模型
        const validModels = modelsData.filter(m => m.id && m.id.trim() !== '');
        setModels(validModels);
      }

      if (usagesRes.ok) {
        const usagesData = await usagesRes.json();
        setModelUsages(usagesData);
      }


    } catch (error) {
      setMessage({ type: 'error', text: t('admin.aiModels.loadError') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 获取提供者的模型数量
  const getProviderModelCount = (providerId: string) => {
    return models.filter(m => m.providerId === providerId && m.isActive).length;
  };



  // 获取模型类型的颜色
  const getModelTypeColor = (type: string) => {
    const colors = {
      chat: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      image: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      embedding: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      reasoning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 处理提供者编辑
  const handleEditProvider = (provider: Provider) => {
    setProviderForm({
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      description: provider.description || '',
      baseUrl: provider.baseUrl || '',
      apiKeyRequired: provider.apiKeyRequired,
      supportedFeatures: Array.isArray(provider.supportedFeatures) ? provider.supportedFeatures : [],
      isActive: provider.isActive,
    });
    setEditingProvider(provider);
    setShowProviderForm(true);
  };

  // 处理新建提供者
  const handleNewProvider = () => {
    setProviderForm({
      id: '',
      name: '',
      displayName: '',
      description: '',
      baseUrl: '',
      apiKeyRequired: true,
      supportedFeatures: [],
      isActive: true,
    });
    setEditingProvider(null);
    setShowProviderForm(true);
  };

  // 处理API密钥配置
  const handleConfigKey = (provider: Provider) => {
    const hasExistingKey = providerApiKeyStatus[provider.id];
    setApiKeyForm({
      keyName: `${provider.displayName} Key`,
      apiKey: hasExistingKey ? '••••••••••••••••' : '', // 如果已有密钥，显示掩码
    });
    setConfiguringProvider(provider);
    setShowApiKeyForm(true);
  };

  // 保存API密钥
  const handleSaveApiKey = async () => {
    if (!configuringProvider) return;

    // 如果是掩码，说明用户没有修改，跳过保存
    if (apiKeyForm.apiKey === '••••••••••••••••') {
      setShowApiKeyForm(false);
      return;
    }

    // 验证表单
    const errors = { apiKey: '' };
    if (!apiKeyForm.apiKey.trim()) {
      errors.apiKey = t('admin.aiModels.apiKeys.keyRequired');
    }

    if (errors.apiKey) {
      setApiKeyFormErrors(errors);
      return;
    }

    setSaving('apiKey');
    try {
      const response = await fetch('/api/ai-models/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: configuringProvider.id,
          keyName: apiKeyForm.keyName,
          apiKey: apiKeyForm.apiKey,
          isActive: true,
        }),
      });

      if (response.ok) {
        toast.success(t('admin.aiModels.apiKeys.saveSuccess'));
        setShowApiKeyForm(false);
        setApiKeyForm({ keyName: '', apiKey: '' });
        setApiKeyFormErrors({ apiKey: '' });
        setConfiguringProvider(null);
        // 更新API密钥状态
        setProviderApiKeyStatus(prev => ({
          ...prev,
          [configuringProvider.id]: true
        }));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.aiModels.apiKeys.saveError'));
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error(t('admin.aiModels.apiKeys.saveError'));
    } finally {
      setSaving(null);
    }
  };

  // 处理删除provider
  const handleDeleteProvider = (provider: Provider) => {
    setDeletingProvider(provider);
    setShowDeleteProviderDialog(true);
  };

  // 确认删除provider
  const confirmDeleteProvider = async () => {
    if (!deletingProvider) return;

    setSaving('provider');
    try {
      const response = await fetch(`/api/ai-models/providers/${deletingProvider.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('admin.aiModels.providers.deleteSuccess'));
        setShowDeleteProviderDialog(false);
        setDeletingProvider(null);
        // 重新加载数据
        loadData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.aiModels.providers.deleteError'));
      }
    } catch (error) {
      console.error('Failed to delete provider:', error);
      toast.error(t('admin.aiModels.providers.deleteError'));
    } finally {
      setSaving(null);
    }
  };

  // 保存提供者
  const handleSaveProvider = async () => {
    try {
      setSaving('provider');

      // 表单验证
      if (!validateProviderForm()) {
        return;
      }

      const method = editingProvider ? 'PUT' : 'POST';
      const body = editingProvider
        ? { ...providerForm, id: editingProvider.id }
        : providerForm;

      const response = await fetch('/api/ai-models/providers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingProvider
            ? t('admin.aiModels.providers.updateSuccess')
            : t('admin.aiModels.providers.createSuccess')
        });
        setShowProviderForm(false);
        setEditingProvider(null);
        await loadData(); // 重新加载数据
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || t('admin.aiModels.providers.saveError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.aiModels.providers.saveError') });
    } finally {
      setSaving(null);
    }
  };



  // 处理模型编辑
  const handleEditModel = (model: Model) => {
    setModelForm({
      id: model.id,
      providerId: model.providerId,
      modelKey: model.modelKey,
      displayName: model.displayName,
      description: model.description || '',
      modelType: model.modelType as 'chat' | 'completion' | 'embedding' | 'image' | 'audio',
      capabilities: Array.isArray(model.capabilities) ? model.capabilities : [],
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
      pricing: model.pricing || {},
      configuration: model.configuration || {},
      isActive: model.isActive,
      sortOrder: model.sortOrder || 0,
    });
    setEditingModel(model);
    setShowModelForm(true);
  };

  // 处理模型删除确认
  const handleDeleteModel = (model: Model) => {
    setDeletingModel(model);
    setShowDeleteModelDialog(true);
  };

  // 处理编辑用途配置
  const handleEditUsage = (usage: ModelUsage) => {
    setUsageForm({
      id: usage.id,
      usageType: usage.usageType,
      modelId: usage.modelId,
      priority: usage.priority,
      isActive: usage.isActive,
    });
    setEditingUsage(usage);
    setShowUsageForm(true);
  };

  // 处理新增用途配置
  const handleNewUsage = () => {
    // 设置默认值
    const defaultUsageType = 'artifact-model'; // 默认选择第一个类型
    const defaultModelId = models.length > 0 ? models[0].id : '';

    setUsageForm({
      id: '',
      usageType: defaultUsageType,
      modelId: defaultModelId,
      priority: 1,
      isActive: true,
    });
    setEditingUsage(null);
    setUsageFormErrors({ usageType: '', modelId: '' });
    setShowUsageForm(true);
  };

  // 处理删除用途配置
  const handleDeleteUsage = (usage: ModelUsage) => {
    setDeletingUsage(usage);
    setShowDeleteUsageDialog(true);
  };

  // 确认删除用途配置
  const confirmDeleteUsage = async () => {
    if (!deletingUsage) return;

    try {
      setSaving('usage');

      const response = await fetch('/api/ai-models/usage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingUsage.id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('admin.aiModels.usage.deleteSuccess') });
        setShowDeleteUsageDialog(false);
        setDeletingUsage(null);
        await loadData(); // 重新加载数据
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || t('admin.aiModels.usage.deleteError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.aiModels.usage.deleteError') });
    } finally {
      setSaving(null);
    }
  };

  // 保存用途配置
  const handleSaveUsage = async () => {
    try {
      setSaving('usage');

      if (!validateUsageForm()) {
        return;
      }

      // 判断是新增还是编辑
      const isEditing = usageForm.id && usageForm.id.trim() !== '';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isEditing
        ? {
            id: usageForm.id,
            usageType: usageForm.usageType,
            modelId: usageForm.modelId,
            priority: usageForm.priority,
            isActive: usageForm.isActive,
          }
        : {
            usageType: usageForm.usageType,
            modelId: usageForm.modelId,
            priority: usageForm.priority,
            isActive: usageForm.isActive,
          };

      const response = await fetch('/api/ai-models/usage', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: isEditing
            ? t('admin.aiModels.usage.updateSuccess')
            : t('admin.aiModels.usage.createSuccess')
        });
        setShowUsageForm(false);
        setEditingUsage(null);
        await loadData(); // 重新加载数据
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || t('admin.aiModels.usage.saveError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.aiModels.usage.saveError') });
    } finally {
      setSaving(null);
    }
  };

  // 确认删除模型
  const confirmDeleteModel = async () => {
    if (!deletingModel) return;

    try {
      setSaving('model');

      const response = await fetch('/api/ai-models/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingModel.id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('admin.aiModels.models.deleteSuccess') });
        setShowDeleteModelDialog(false);
        setDeletingModel(null);
        await loadData(); // 重新加载数据
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || t('admin.aiModels.models.deleteError') });
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      setMessage({ type: 'error', text: t('admin.aiModels.models.deleteError') });
    } finally {
      setSaving(null);
    }
  };

  // 保存模型
  const handleSaveModel = async () => {
    try {
      setSaving('model');

      if (!validateModelForm()) {
        return;
      }

      const method = editingModel ? 'PUT' : 'POST';
      const body = editingModel
        ? {
            id: modelForm.id, // 编辑时需要id
            providerId: modelForm.providerId,
            modelKey: modelForm.modelKey,
            displayName: modelForm.displayName,
            description: modelForm.description,
            modelType: modelForm.modelType,
            capabilities: modelForm.capabilities,
            contextWindow: modelForm.contextWindow,
            maxTokens: modelForm.maxTokens,
            pricing: modelForm.pricing,
            configuration: modelForm.configuration,
            isActive: modelForm.isActive,
            sortOrder: modelForm.sortOrder,
          }
        : {
            providerId: modelForm.providerId,
            modelKey: modelForm.modelKey,
            displayName: modelForm.displayName,
            description: modelForm.description,
            modelType: modelForm.modelType,
            capabilities: modelForm.capabilities,
            contextWindow: modelForm.contextWindow,
            maxTokens: modelForm.maxTokens,
            pricing: modelForm.pricing,
            configuration: modelForm.configuration,
            isActive: modelForm.isActive,
            sortOrder: modelForm.sortOrder,
          };

      const response = await fetch('/api/ai-models/models', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: editingModel ? t('admin.aiModels.models.updateSuccess') : t('admin.aiModels.models.createSuccess') });
        setShowModelForm(false);
        setEditingModel(null);
        setModelForm({
          id: '',
          providerId: '',
          modelKey: '',
          displayName: '',
          description: '',
          modelType: 'chat',
          capabilities: [],
          contextWindow: 4096,
          maxTokens: 2048,
          pricing: {},
          configuration: {},
          isActive: true,
          sortOrder: 0,
        });
        await loadData(); // 重新加载数据
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || t('admin.aiModels.models.saveError') });
      }
    } catch (error) {
      console.error('Failed to save model:', error);
      setMessage({ type: 'error', text: t('admin.aiModels.models.saveError') });
    } finally {
      setSaving(null);
    }
  };



  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('admin.aiModels.title')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t('admin.aiModels.description')}
        </p>
      </div>

      {/* 消息提示 */}
      {message && (
        <Alert className={`mb-6 ${
          message.type === 'error' 
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
            : message.type === 'success'
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
        }`}>
          <AlertDescription className={
            message.type === 'error' 
              ? 'text-red-700 dark:text-red-400'
              : message.type === 'success'
              ? 'text-green-700 dark:text-green-400'
              : 'text-blue-700 dark:text-blue-400'
          }>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* 主要内容 */}
      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('admin.aiModels.tabs.providers')}
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {t('admin.aiModels.tabs.models')}
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('admin.aiModels.tabs.usage')}
          </TabsTrigger>

        </TabsList>

        {/* 提供者管理 */}
        <TabsContent value="providers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('admin.aiModels.providers.title')}</h2>
            <Button onClick={handleNewProvider} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('admin.aiModels.providers.add')}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers
              .filter(provider => provider.id && provider.id.trim() !== '')
              .map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {provider.displayName}
                      {/* 只有配置了API密钥的provider才显示为active */}
                      {provider.isActive && (!provider.apiKeyRequired || providerApiKeyStatus[provider.id]) ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('common.active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          {t('common.inactive')}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {provider.description || t('common.noDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.aiModels.providers.models')}</span>
                    <Badge variant="outline">{getProviderModelCount(provider.id)}</Badge>
                  </div>
                  


                  {provider.baseUrl && (
                    <div className="text-xs text-muted-foreground truncate">
                      {t('admin.aiModels.providers.baseUrl')}: {provider.baseUrl}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProvider(provider)}
                      className="flex-1"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {t('common.edit')}
                    </Button>
                    {provider.apiKeyRequired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigKey(provider)}
                        className="flex-1"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t('common.configure')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProvider(provider)}
                      className="bg-red-50 hover:bg-red-100 border-red-200 text-red-600 hover:text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 模型管理 */}
        <TabsContent value="models" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('admin.aiModels.models.title')}</h2>
            <div className="flex gap-2">
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('admin.aiModels.models.filterByProvider')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.aiModels.models.allProviders')}</SelectItem>
                  {providers
                    .filter(provider => provider.id && provider.id.trim() !== '')
                    .map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowModelForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('admin.aiModels.models.add')}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models
              .filter(model => model.id && model.id.trim() !== '' && (!selectedProviderId || selectedProviderId === 'all' || model.providerId === selectedProviderId))
              .map((model) => {
                const provider = providers.find(p => p.id === model.providerId);
                return (
                  <Card key={model.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{model.displayName}</CardTitle>
                        {model.isActive ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('common.active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t('common.inactive')}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {model.description || t('common.noDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('admin.aiModels.models.provider')}</span>
                        <Badge variant="outline">{provider?.displayName}</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('admin.aiModels.models.type')}</span>
                        <Badge className={getModelTypeColor(model.modelType)}>
                          {t(`admin.aiModels.models.types.${model.modelType}`)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('admin.aiModels.models.contextWindow')}</span>
                        <span className="text-sm font-mono">{formatNumber(model.contextWindow)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('admin.aiModels.models.maxTokens')}</span>
                        <span className="text-sm font-mono">{formatNumber(model.maxTokens)}</span>
                      </div>

                      {Array.isArray(model.capabilities) && model.capabilities.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">{t('admin.aiModels.models.capabilities')}</span>
                          <div className="flex flex-wrap gap-1">
                            {model.capabilities.slice(0, 3).map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                            {model.capabilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{model.capabilities.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditModel(model)}
                          className="flex-1"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 bg-red-500/90 hover:bg-red-600 dark:bg-red-600/90 dark:hover:bg-red-700 border-red-500/90 hover:border-red-600"
                          onClick={() => handleDeleteModel(model)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* 用途配置 */}
        <TabsContent value="usage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('admin.aiModels.usage.title')}</h2>
            <Button onClick={handleNewUsage} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('admin.aiModels.usage.add')}
            </Button>
          </div>

          <div className="grid gap-4">
            {modelUsages
              .filter(usage => usage.id && usage.id.trim() !== '')
              .map((usage) => {
              const model = models.find(m => m.id === usage.modelId);
              const provider = providers.find(p => p.id === model?.providerId);

              return (
                <Card key={usage.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">
                            {usage.usageType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model?.displayName}</span>
                            <Badge variant="outline" className="text-xs">
                              {provider?.displayName}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{t('admin.aiModels.usage.priority')}: {usage.priority}</span>
                          <span>•</span>
                          <span>{t('admin.aiModels.usage.status')}: {usage.isActive ? t('common.active') : t('common.inactive')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={usage.isActive}
                          onCheckedChange={(checked) => {
                            // TODO: 实现状态切换
                            toast.info(t('common.comingSoon'));
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUsage(usage)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUsage(usage)}
                          className="bg-red-500/90 hover:bg-red-600 dark:bg-red-600/90 dark:hover:bg-red-700 border-red-500/90 hover:border-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>


      </Tabs>

      {/* 帮助信息 */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t('admin.aiModels.help.title')}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('admin.aiModels.help.providers')}</li>
              <li>• {t('admin.aiModels.help.models')}</li>
              <li>• {t('admin.aiModels.help.usage')}</li>
              <li>• {t('admin.aiModels.help.security')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 提供者编辑对话框 */}
      <Dialog open={showProviderForm} onOpenChange={setShowProviderForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? t('admin.aiModels.providers.edit') : t('admin.aiModels.providers.add')}
            </DialogTitle>
            <DialogDescription>
              {editingProvider
                ? t('admin.aiModels.providers.editDescription')
                : t('admin.aiModels.providers.addDescription')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  {t('admin.aiModels.providers.name')}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={providerForm.name}
                  onValueChange={(value) => {
                    setProviderForm(prev => ({ ...prev, name: value }));
                    if (providerFormErrors.name) {
                      setProviderFormErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                >
                  <SelectTrigger className={providerFormErrors.name ? 'border-red-500 focus:border-red-500' : ''}>
                    <SelectValue placeholder={t('admin.aiModels.providers.selectProviderType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="qwen">Qwen</SelectItem>
                    <SelectItem value="xai">xAI</SelectItem>
                  </SelectContent>
                </Select>
                {providerFormErrors.name && (
                  <p className="text-sm text-red-500">{providerFormErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-1">
                  {t('admin.aiModels.providers.displayName')}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={providerForm.displayName}
                  onChange={(e) => {
                    setProviderForm(prev => ({ ...prev, displayName: e.target.value }));
                    if (providerFormErrors.displayName) {
                      setProviderFormErrors(prev => ({ ...prev, displayName: '' }));
                    }
                  }}
                  placeholder={t('admin.aiModels.providers.displayNamePlaceholder')}
                  className={providerFormErrors.displayName ? 'border-red-500 focus:border-red-500' : ''}
                />
                {providerFormErrors.displayName && (
                  <p className="text-sm text-red-500">{providerFormErrors.displayName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.aiModels.providers.description')}</Label>
              <Textarea
                id="description"
                value={providerForm.description}
                onChange={(e) => setProviderForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('admin.aiModels.providers.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">{t('admin.aiModels.providers.baseUrl')}</Label>
              <Input
                id="baseUrl"
                value={providerForm.baseUrl}
                onChange={(e) => setProviderForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder={t('admin.aiModels.providers.baseUrlPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="apiKeyRequired"
                  checked={providerForm.apiKeyRequired}
                  onCheckedChange={(checked) => setProviderForm(prev => ({ ...prev, apiKeyRequired: checked }))}
                />
                <Label htmlFor="apiKeyRequired">{t('admin.aiModels.providers.apiKeyRequired')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={providerForm.isActive}
                  onCheckedChange={(checked) => setProviderForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">{t('common.active')}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProviderForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveProvider} disabled={saving === 'provider'}>
              {saving === 'provider' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* 模型表单对话框 */}
      <Dialog open={showModelForm} onOpenChange={setShowModelForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? t('admin.aiModels.models.edit') : t('admin.aiModels.models.add')}
            </DialogTitle>
            <DialogDescription>
              {editingModel ? t('admin.aiModels.models.editDescription') : t('admin.aiModels.models.addDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="providerId" className="flex items-center gap-1">
                  {t('admin.aiModels.models.provider')}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={modelForm.providerId}
                  onValueChange={(value) => {
                    setModelForm(prev => ({ ...prev, providerId: value }));
                    if (modelFormErrors.providerId) {
                      setModelFormErrors(prev => ({ ...prev, providerId: '' }));
                    }
                  }}
                >
                  <SelectTrigger className={modelFormErrors.providerId ? 'border-red-500 focus:border-red-500' : ''}>
                    <SelectValue placeholder={t('admin.aiModels.models.selectProvider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {providers
                      .filter(provider => provider.id && provider.id.trim() !== '')
                      .map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {modelFormErrors.providerId && (
                  <p className="text-sm text-red-500">{modelFormErrors.providerId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelType">{t('admin.aiModels.models.type')} *</Label>
                <Select
                  value={modelForm.modelType}
                  onValueChange={(value) => setModelForm(prev => ({ ...prev, modelType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">{t('admin.aiModels.models.types.chat')}</SelectItem>
                    <SelectItem value="completion">{t('admin.aiModels.models.types.completion')}</SelectItem>
                    <SelectItem value="embedding">{t('admin.aiModels.models.types.embedding')}</SelectItem>
                    <SelectItem value="image">{t('admin.aiModels.models.types.image')}</SelectItem>
                    <SelectItem value="audio">{t('admin.aiModels.models.types.audio')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelKey" className="flex items-center gap-1">
                  {t('admin.aiModels.models.modelKey')}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelKey"
                  value={modelForm.modelKey}
                  onChange={(e) => {
                    setModelForm(prev => ({ ...prev, modelKey: e.target.value }));
                    if (modelFormErrors.modelKey) {
                      setModelFormErrors(prev => ({ ...prev, modelKey: '' }));
                    }
                  }}
                  placeholder={t('admin.aiModels.models.modelKeyPlaceholder')}
                  className={modelFormErrors.modelKey ? 'border-red-500 focus:border-red-500' : ''}
                />
                {modelFormErrors.modelKey && (
                  <p className="text-sm text-red-500">{modelFormErrors.modelKey}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-1">
                  {t('admin.aiModels.models.displayName')}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={modelForm.displayName}
                  onChange={(e) => {
                    setModelForm(prev => ({ ...prev, displayName: e.target.value }));
                    if (modelFormErrors.displayName) {
                      setModelFormErrors(prev => ({ ...prev, displayName: '' }));
                    }
                  }}
                  placeholder={t('admin.aiModels.models.displayNamePlaceholder')}
                  className={modelFormErrors.displayName ? 'border-red-500 focus:border-red-500' : ''}
                />
                {modelFormErrors.displayName && (
                  <p className="text-sm text-red-500">{modelFormErrors.displayName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.aiModels.models.description')}</Label>
              <Input
                id="description"
                value={modelForm.description}
                onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('admin.aiModels.models.descriptionPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contextWindow">{t('admin.aiModels.models.contextWindow')}</Label>
                <Input
                  id="contextWindow"
                  type="number"
                  value={modelForm.contextWindow}
                  onChange={(e) => setModelForm(prev => ({ ...prev, contextWindow: parseInt(e.target.value) || 4096 }))}
                  placeholder="4096"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">{t('admin.aiModels.models.maxTokens')}</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={modelForm.maxTokens}
                  onChange={(e) => setModelForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                  placeholder="2048"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={modelForm.isActive}
                onCheckedChange={(checked) => setModelForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">{t('common.active')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowModelForm(false);
              setEditingModel(null);
              setModelForm({
                id: '',
                providerId: '',
                modelKey: '',
                displayName: '',
                description: '',
                modelType: 'chat',
                capabilities: [],
                contextWindow: 4096,
                maxTokens: 2048,
                pricing: {},
                configuration: {},
                isActive: true,
                sortOrder: 0,
              });
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveModel} disabled={saving === 'model'}>
              {saving === 'model' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用途配置编辑对话框 */}
      <Dialog open={showUsageForm} onOpenChange={setShowUsageForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUsage ? t('admin.aiModels.usage.edit') : t('admin.aiModels.usage.add')}
            </DialogTitle>
            <DialogDescription>
              {editingUsage
                ? t('admin.aiModels.usage.editDescription')
                : t('admin.aiModels.usage.addDescription')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="usageType" className="flex items-center gap-1">
                {t('admin.aiModels.usage.usageType')}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={usageForm.usageType}
                onValueChange={(value) => {
                  setUsageForm(prev => ({ ...prev, usageType: value }));
                  if (usageFormErrors.usageType) {
                    setUsageFormErrors(prev => ({ ...prev, usageType: '' }));
                  }
                }}
              >
                <SelectTrigger className={usageFormErrors.usageType ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={t('admin.aiModels.usage.selectUsageType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artifact-model">{t('admin.aiModels.usage.types.artifactModel')}</SelectItem>
                  <SelectItem value="code-model">{t('admin.aiModels.usage.types.codeModel')}</SelectItem>
                  <SelectItem value="title-model">{t('admin.aiModels.usage.types.titleModel')}</SelectItem>
                  <SelectItem value="chat-model">{t('admin.aiModels.usage.types.chatModel')}</SelectItem>
                </SelectContent>
              </Select>
              {usageFormErrors.usageType && (
                <p className="text-sm text-red-500">{usageFormErrors.usageType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId" className="flex items-center gap-1">
                {t('admin.aiModels.usage.model')}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={usageForm.modelId}
                onValueChange={(value) => {
                  setUsageForm(prev => ({ ...prev, modelId: value }));
                  if (usageFormErrors.modelId) {
                    setUsageFormErrors(prev => ({ ...prev, modelId: '' }));
                  }
                }}
              >
                <SelectTrigger className={usageFormErrors.modelId ? 'border-red-500 focus:border-red-500' : ''}>
                  <SelectValue placeholder={t('admin.aiModels.usage.selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  {models
                    .filter(model => model.id && model.id.trim() !== '')
                    .map((model) => {
                      const provider = providers.find(p => p.id === model.providerId);
                      return (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName} ({provider?.displayName})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {usageFormErrors.modelId && (
                <p className="text-sm text-red-500">{usageFormErrors.modelId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('admin.aiModels.usage.priority')}</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="100"
                value={usageForm.priority}
                onChange={(e) => setUsageForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                placeholder={t('admin.aiModels.usage.priorityPlaceholder')}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={usageForm.isActive}
                onCheckedChange={(checked) => setUsageForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">{t('common.active')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsageForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveUsage} disabled={saving === 'usage'}>
              {saving === 'usage' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除模型确认对话框 */}
      <Dialog open={showDeleteModelDialog} onOpenChange={setShowDeleteModelDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              </div>
              {t('admin.aiModels.models.deleteConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {t('admin.aiModels.models.deleteConfirmDescription', { modelName: deletingModel?.displayName })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    {t('common.warning')}
                  </p>
                  <p className="text-orange-700 dark:text-orange-300 text-sm leading-relaxed">
                    {t('admin.aiModels.models.deleteWarning')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModelDialog(false);
                setDeletingModel(null);
              }}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteModel}
              disabled={saving === 'model'}
              className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {saving === 'model' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用途配置确认对话框 */}
      <Dialog open={showDeleteUsageDialog} onOpenChange={setShowDeleteUsageDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
              </div>
              {t('admin.aiModels.usage.deleteConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {t('admin.aiModels.usage.deleteConfirmDescription', {
                usageType: deletingUsage?.usageType,
                modelName: models.find(m => m.id === deletingUsage?.modelId)?.displayName
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    {t('common.warning')}
                  </p>
                  <p className="text-orange-700 dark:text-orange-300 text-sm leading-relaxed">
                    {t('admin.aiModels.usage.deleteWarning')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteUsageDialog(false);
                setDeletingUsage(null);
              }}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUsage}
              disabled={saving === 'usage'}
              className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {saving === 'usage' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API密钥配置对话框 */}
      <Dialog open={showApiKeyForm} onOpenChange={setShowApiKeyForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('admin.aiModels.apiKeys.configure')}
            </DialogTitle>
            <DialogDescription>
              {configuringProvider?.displayName} - {t('admin.aiModels.apiKeys.configureDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">{t('admin.aiModels.apiKeys.keyName')}</Label>
              <Input
                id="keyName"
                value={apiKeyForm.keyName}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, keyName: e.target.value }))}
                placeholder={t('admin.aiModels.apiKeys.keyNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-1">
                {t('admin.aiModels.apiKeys.apiKey')}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKeyForm.apiKey}
                onChange={(e) => {
                  setApiKeyForm(prev => ({ ...prev, apiKey: e.target.value }));
                  if (apiKeyFormErrors.apiKey) {
                    setApiKeyFormErrors(prev => ({ ...prev, apiKey: '' }));
                  }
                }}
                onFocus={(e) => {
                  // 如果是掩码，点击时清空以便输入新密钥
                  if (e.target.value === '••••••••••••••••') {
                    setApiKeyForm(prev => ({ ...prev, apiKey: '' }));
                  }
                }}
                placeholder={
                  configuringProvider && providerApiKeyStatus[configuringProvider.id]
                    ? t('admin.aiModels.apiKeys.reconfigureDescription')
                    : t('admin.aiModels.apiKeys.apiKeyPlaceholder')
                }
                className={apiKeyFormErrors.apiKey ? 'border-red-500 focus:border-red-500' : ''}
              />
              {apiKeyFormErrors.apiKey && (
                <p className="text-sm text-red-500">{apiKeyFormErrors.apiKey}</p>
              )}
              {configuringProvider && providerApiKeyStatus[configuringProvider.id] && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t('admin.aiModels.apiKeys.reconfigureDescription')}
                </p>
              )}
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 mb-1">{t('admin.aiModels.apiKeys.securityNotice')}</p>
                  <ul className="text-orange-700 space-y-1">
                    <li>• {t('admin.aiModels.apiKeys.securityTip1')}</li>
                    <li>• {t('admin.aiModels.apiKeys.securityTip2')}</li>
                    <li>• {t('admin.aiModels.apiKeys.securityTip3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveApiKey} disabled={saving === 'apiKey'}>
              {saving === 'apiKey' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除Provider确认对话框 */}
      <Dialog open={showDeleteProviderDialog} onOpenChange={setShowDeleteProviderDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {t('common.warning')}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              {t('admin.aiModels.providers.deleteConfirm', { name: deletingProvider?.displayName })}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-2">{t('admin.aiModels.providers.deleteWarning')}</p>
                <ul className="space-y-1 text-orange-700">
                  <li>• {t('admin.aiModels.providers.deleteWarning1')}</li>
                  <li>• {t('admin.aiModels.providers.deleteWarning2')}</li>
                  <li>• {t('admin.aiModels.providers.deleteWarning3')}</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteProviderDialog(false);
                setDeletingProvider(null);
              }}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProvider}
              disabled={saving === 'provider'}
              className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {saving === 'provider' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
