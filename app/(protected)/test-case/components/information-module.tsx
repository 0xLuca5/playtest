'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Target, User, Weight, Tag, Info, CheckCircle, Edit, Save, X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';

interface InformationModuleProps {
  testCaseDetails: any;
  selectedId?: string;
  onUpdate?: (updates: any) => void;
}

export default function InformationModule({ testCaseDetails, selectedId, onUpdate }: InformationModuleProps) {
  const { t } = useI18n();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [currentTestCaseData, setCurrentTestCaseData] = useState<any>(testCaseDetails);

  // 当 testCaseDetails 变化时更新本地状态
  useEffect(() => {
    setCurrentTestCaseData(testCaseDetails);
  }, [testCaseDetails]);

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditMode(true);
    setEditingData({ ...currentTestCaseData });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingData(null);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingData || !testCaseDetails?.id) return;

    try {
      // 调用API保存测试用例信息
      const response = await fetch(`/api/test-case`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTestCaseData.id,
          description: editingData.description,
          preconditions: editingData.preconditions,
          status: editingData.status,
          priority: editingData.priority,
          weight: editingData.weight,
          nature: editingData.nature,
          type: editingData.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save test case information');
      }

      // 立即更新本地显示状态
      setCurrentTestCaseData({ ...currentTestCaseData, ...editingData });

      // 如果有onUpdate回调，调用它来更新父组件状态
      if (onUpdate) {
        onUpdate(editingData);
      }

      // 重置编辑状态
      setIsEditMode(false);
      setEditingData(null);

      toast.success(t('testCase.informationSaved'));
    } catch (error) {
      console.error('保存测试用例信息失败:', error);
      toast.error(t('testCase.saveFailed'));
    }
  };

  // 更新编辑数据
  const updateEditingData = (field: string, value: any) => {
    setEditingData((prev: any) => ({ ...prev, [field]: value }));
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



  // 处理状态值映射（数据库中是 kebab-case，翻译 key 是 camelCase）
  const getStatusKey = (status: string) => {
    const statusMap: Record<string, string> = {
      'work-in-progress': 'workInProgress',
      'active': 'active',
      'deprecated': 'deprecated',
      'draft': 'draft'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.information')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.informationDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveEdit}
                className="border-green-200 text-green-600 bg-green-50 hover:bg-green-100"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleStartEdit}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('testCase.editInformation')}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.status')}</span>
          </div>
          {isEditMode ? (
            <Select value={editingData?.status || 'draft'} onValueChange={(value) => updateEditingData('status', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('testCase.status.draft')}</SelectItem>
                <SelectItem value="active">{t('testCase.status.active')}</SelectItem>
                <SelectItem value="deprecated">{t('testCase.status.deprecated')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={`${currentTestCaseData.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'}`}>
              {t(`testCase.status.${getStatusKey(currentTestCaseData.status)}`)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.priority')}</span>
          </div>
          {isEditMode ? (
            <Select value={editingData?.priority || 'medium'} onValueChange={(value) => updateEditingData('priority', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('testCase.priority.low')}</SelectItem>
                <SelectItem value="medium">{t('testCase.priority.medium')}</SelectItem>
                <SelectItem value="high">{t('testCase.priority.high')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={`${currentTestCaseData.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : currentTestCaseData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
              {t(`testCase.priority.${currentTestCaseData.priority || 'medium'}`)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.weight')}</span>
          </div>
          {isEditMode ? (
            <Select value={editingData?.weight || 'medium'} onValueChange={(value) => updateEditingData('weight', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('testCase.weight.low')}</SelectItem>
                <SelectItem value="medium">{t('testCase.weight.medium')}</SelectItem>
                <SelectItem value="high">{t('testCase.weight.high')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              {t(`testCase.weight.${currentTestCaseData.weight || 'medium'}`)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.nature')}</span>
          </div>
          {isEditMode ? (
            <Select value={editingData?.nature || 'unit'} onValueChange={(value) => updateEditingData('nature', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">{t('testCase.nature.unit')}</SelectItem>
                <SelectItem value="integration">{t('testCase.nature.integration')}</SelectItem>
                <SelectItem value="system">{t('testCase.nature.system')}</SelectItem>
                <SelectItem value="e2e">{t('testCase.nature.e2e')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
              {t(`testCase.nature.${currentTestCaseData.nature || 'functional'}`)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.type')}</span>
          </div>
          {isEditMode ? (
            <Select value={editingData?.type || 'functional'} onValueChange={(value) => updateEditingData('type', value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">{t('testCase.type.functional')}</SelectItem>
                <SelectItem value="non-functional">{t('testCase.type.nonFunctional')}</SelectItem>
                <SelectItem value="regression">{t('testCase.type.regression')}</SelectItem>
                <SelectItem value="smoke">{t('testCase.type.smoke')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
              {t(`testCase.type.${currentTestCaseData.type || 'regression'}`)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.author')}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">{currentTestCaseData.createdBy || 'Unknown'}</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          {t('testCase.description')}
        </h3>
        {isEditMode ? (
          <Textarea
            value={editingData?.description || ''}
            onChange={(e) => updateEditingData('description', e.target.value)}
            placeholder={t('testCase.information.descriptionPlaceholder')}
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {currentTestCaseData.description || t('testCase.noDescriptionAvailable')}
          </p>
        )}
      </div>

      {/* Preconditions */}
      <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          {t('testCase.preconditions')}
        </h3>
        {isEditMode ? (
          <Textarea
            value={editingData?.preconditions || ''}
            onChange={(e) => updateEditingData('preconditions', e.target.value)}
            placeholder={t('testCase.information.preconditionsPlaceholder')}
            className="min-h-[100px]"
          />
        ) : (
          currentTestCaseData.preconditions ? (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentTestCaseData.preconditions}
            </p>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">{t('testCase.noPreconditionsDefined')}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
