'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, User, CheckCircle, Activity, Plus, Edit3, Save, X, FileText, Bot, Copy, Edit } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { MinimalTiptapEditor } from '@/components/ui/minimal-tiptap';
import { toast } from 'sonner';

interface StepsModuleProps {
  testCaseDetails: any;
  selectedId?: string;
  onUpdate?: (updates: any) => void;
}

// 转换特殊标记格式为HTML格式
const convertToHtml = (content: string, isEditing: boolean = false): string => {
  if (!content) return '';

  // 根据是否编辑模式决定图片大小
  const imageStyle = isEditing
    ? "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 8px 0;"
    : "max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 8px 0; cursor: pointer;";

  // 处理特殊的截图标记，转换为HTML img标签
  let htmlContent = content.replace(
    /---SCREENSHOT-START---\n(data:image\/[^;]+;base64,[^\n]+)\n---SCREENSHOT-END---/g,
    (match, base64Data) => {
      return `<img src="${base64Data}" alt="执行截图" style="${imageStyle}" ${!isEditing ? 'onclick="this.style.maxWidth=this.style.maxWidth===\'100%\'?\'200px\':\'100%\'"' : ''} />`;
    }
  );

  // 处理普通的Markdown图片语法
  htmlContent = htmlContent.replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
    (match, alt, src) => {
      return `<img src="${src}" alt="${alt}" style="${imageStyle}" ${!isEditing ? 'onclick="this.style.maxWidth=this.style.maxWidth===\'100%\'?\'200px\':\'100%\'"' : ''} />`;
    }
  );

  // 处理基本的Markdown格式（从最长的模式开始匹配，避免冲突）
  // 使用内联样式确保在 dangerouslySetInnerHTML 中也能正确显示
  // 使用 gm 标志支持多行匹配，^ 匹配行首，$ 匹配行尾
  htmlContent = htmlContent
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.75rem;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 1.5rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.75rem;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // 包装在段落标签中
  if (htmlContent && !htmlContent.startsWith('<')) {
    htmlContent = `<p>${htmlContent}</p>`;
  }

  return htmlContent;
};

// Status colors for steps
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="w-3 h-3" />;
    case 'failed':
      return <Activity className="w-3 h-3" />;
    default:
      return <Activity className="w-3 h-3" />;
  }
};

const getStepTypeIcon = (type?: string) => {
  switch (type) {
    case 'automated':
      return <Bot className="w-4 h-4 text-purple-600" title="Automated Step" />;
    case 'optional':
      return <Target className="w-4 h-4 text-yellow-600" title="Optional Step" />;
    case 'manual':
    default:
      return <User className="w-4 h-4 text-blue-600" title="Manual Step" />;
  }
};

const getStepTypeColor = (type?: string) => {
  switch (type) {
    case 'automated':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'optional':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'manual':
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  }
};

export default function StepsModule({ testCaseDetails, selectedId, onUpdate }: StepsModuleProps) {
  const { t } = useI18n();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'action' | 'expected' | 'notes' | null>(null);
  const [editingStepData, setEditingStepData] = useState<any>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [showAddStepForm, setShowAddStepForm] = useState(false);
  const [newStepData, setNewStepData] = useState({
    action: '',
    expected: '',
    type: 'manual' as const,
    notes: ''
  });
  const [currentTestCaseData, setCurrentTestCaseData] = useState<any>(testCaseDetails);

  // 当 testCaseDetails 变化时更新本地状态
  useEffect(() => {
    setCurrentTestCaseData(testCaseDetails);
  }, [testCaseDetails]);

  // 复制步骤到剪贴板
  const handleCopyStep = async (step: any) => {
    try {
      const stepText = `${t('testCase.action')}: ${step.action}\n${t('testCase.expectedResult')}: ${step.expected}${step.notes ? `\n${t('testCase.notes')}: ${step.notes}` : ''}`;
      await navigator.clipboard.writeText(stepText);
      toast.success(t('testCase.stepCopied'));
    } catch (error) {
      console.error('复制失败:', error);
      toast.error(t('testCase.copyFailed'));
    }
  };

  // 开始编辑步骤
  const handleEditStep = (step: any) => {
    setEditingStepId(step.id);
    setEditingStepData({ ...step });
    setEditingField(null);
  };

  // 保存步骤编辑
  const handleSaveStep = async () => {
    if (!editingStepData || !currentTestCaseData?.id) return;

    try {
      // 更新本地步骤数据
      const updatedSteps = currentTestCaseData.steps.map((step: any) =>
        step.id === editingStepData.id ? editingStepData : step
      );

      // 直接调用API保存（参考 information-module 的做法）
      const response = await fetch(`/api/test-case`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTestCaseData.id,
          steps: updatedSteps
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save step');
      }

      // 立即更新本地显示状态
      setCurrentTestCaseData({ ...currentTestCaseData, steps: updatedSteps });

      // 如果有onUpdate回调，调用它来更新父组件状态
      if (onUpdate) {
        onUpdate({ steps: updatedSteps });
      }

      // 重置编辑状态
      setEditingStepId(null);
      setEditingStepData(null);
      setEditingField(null);

      toast.success(t('testCase.stepSaved'));
    } catch (error) {
      console.error('保存步骤失败:', error);
      toast.error(t('testCase.saveFailed'));
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditingStepData(null);
    setEditingField(null);
  };

  // 转换编辑器内容为字符串
  const convertContentToString = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      // 如果是JSON对象，转换为HTML字符串
      return JSON.stringify(content);
    }
    return '';
  };

  // 处理HTML内容，为标题添加样式
  const addStylesToHtml = (html: string): string => {
    if (!html) return '';
    
    // 为HTML标题标签添加内联样式
    return html
      .replace(/<h1>/g, '<h1 style="font-size: 1.875rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.75rem; line-height: 2.25rem;">')
      .replace(/<h2>/g, '<h2 style="font-size: 1.5rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.75rem; line-height: 2rem;">')
      .replace(/<h3>/g, '<h3 style="font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; line-height: 1.75rem;">')
      .replace(/<h4>/g, '<h4 style="font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">')
      .replace(/<h5>/g, '<h5 style="font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">')
      .replace(/<h6>/g, '<h6 style="font-size: 0.875rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">');
  };

  // 更新编辑中的步骤数据
  const updateEditingStepField = (field: string, value: any) => {
    if (editingStepData) {
      setEditingStepData({
        ...editingStepData,
        [field]: convertContentToString(value)
      });
    }
  };

  // 显示添加步骤表单
  const handleShowAddStepForm = () => {
    setShowAddStepForm(true);
    setNewStepData({
      action: '',
      expected: '',
      type: 'manual',
      notes: ''
    });
  };

  // 取消添加步骤
  const handleCancelAddStep = () => {
    setShowAddStepForm(false);
    setNewStepData({
      action: '',
      expected: '',
      type: 'manual',
      notes: ''
    });
  };

  // 保存新步骤
  const handleSaveNewStep = async () => {
    if (!currentTestCaseData?.id) return;

    // 验证必填字段
    if (!newStepData.action.trim() || !newStepData.expected.trim()) {
      toast.error(t('testCase.actionAndExpectedRequired'));
      return;
    }

    try {
      setIsAddingStep(true);

      // 创建新步骤对象
      const stepNumber = (currentTestCaseData.steps?.length || 0) + 1;
      const newStep = {
        id: `step-${Date.now()}`,
        step: stepNumber,
        action: newStepData.action.trim(),
        expected: newStepData.expected.trim(),
        type: newStepData.type,
        notes: newStepData.notes.trim()
      };

      // 更新步骤数组
      const updatedSteps = [...(currentTestCaseData.steps || []), newStep];

      // 直接调用API保存（参考 information-module 的做法）
      const response = await fetch(`/api/test-case`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTestCaseData.id,
          steps: updatedSteps
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add step');
      }

      // 立即更新本地显示状态
      setCurrentTestCaseData({ ...currentTestCaseData, steps: updatedSteps });

      // 通知父组件更新
      if (onUpdate) {
        onUpdate({ steps: updatedSteps });
      }

      // 关闭表单并重置数据
      setShowAddStepForm(false);
      setNewStepData({
        action: '',
        expected: '',
        type: 'manual',
        notes: ''
      });

      toast.success(t('testCase.stepAdded'));
    } catch (error) {
      console.error('添加步骤失败:', error);
      toast.error(t('testCase.addStepFailed'));
    } finally {
      setIsAddingStep(false);
    }
  };

  // 确保组件在 testCaseDetails 更新时重新渲染
  if (!currentTestCaseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">
          {t('testCase.noTestCaseSelected')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.steps')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.stepsCount', { count: currentTestCaseData?.steps?.length || 0 })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`${isEditMode
              ? 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditMode ? t('testCase.exitEdit') : t('testCase.editSteps')}
          </Button>
          <Button
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
            onClick={handleShowAddStepForm}
            disabled={isAddingStep || showAddStepForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.addStep')}
          </Button>
        </div>
      </div>

      {/* Add Step Form */}
      {showAddStepForm && (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center text-sm font-semibold text-green-600 dark:text-green-400 shadow-sm">
                {(currentTestCaseData?.steps?.length || 0) + 1}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {t('testCase.addNewStep')}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Action Field */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('testCase.action')} *
                  </span>
                </label>
                <MinimalTiptapEditor
                  value={newStepData.action}
                  onChange={(content) => {
                    setNewStepData(prev => ({ ...prev, action: convertContentToString(content) }));
                  }}
                  placeholder={t('testCase.actionPlaceholder')}
                  className="min-h-[80px]"
                  editorContentClassName="min-h-[60px] p-3"
                />
              </div>

              {/* Expected Result Field */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('testCase.expectedResult')} *
                  </span>
                </label>
                <MinimalTiptapEditor
                  value={newStepData.expected}
                  onChange={(content) => {
                    setNewStepData(prev => ({ ...prev, expected: convertContentToString(content) }));
                  }}
                  placeholder={t('testCase.expectedResultPlaceholder')}
                  className="min-h-[80px]"
                  editorContentClassName="min-h-[60px] p-3"
                />
              </div>

              {/* Notes Field */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('testCase.notes')}
                  </span>
                </label>
                <MinimalTiptapEditor
                  value={newStepData.notes}
                  onChange={(content) => {
                    setNewStepData(prev => ({ ...prev, notes: convertContentToString(content) }));
                  }}
                  placeholder={t('testCase.notesPlaceholder')}
                  className="min-h-[100px]"
                  editorContentClassName="min-h-[80px] p-3"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCancelAddStep}
                disabled={isAddingStep}
              >
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveNewStep}
                disabled={isAddingStep || !newStepData.action.trim() || !newStepData.expected.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isAddingStep ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Steps List */}
      {currentTestCaseData?.steps?.length > 0 ? (
        <div className="space-y-4">
          {currentTestCaseData.steps.map((step: any, index: number) => (
            <div key={step.id || index} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-8">
                <div className="flex items-start gap-4">
                  {/* Step Number and Type */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center text-sm font-semibold text-green-600 dark:text-green-400 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex items-center">
                      {getStepTypeIcon(step.type)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Action */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.action')}</span>
                      </div>
                      {editingStepId === step.id && editingField === 'action' ? (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-md">
                          <MinimalTiptapEditor
                            value={convertToHtml(editingStepData?.action || step.action, true)}
                            onChange={(content) => {
                              updateEditingStepField('action', content);
                            }}
                            placeholder={t('testCase.actionPlaceholder')}
                            className="min-h-[80px]"
                            editorContentClassName="min-h-[60px] p-3"
                          />
                        </div>
                      ) : (
                        <div
                          className={`test-case-step-view text-slate-800 dark:text-slate-200 leading-relaxed p-3 rounded transition-colors ${
                            isEditMode
                              ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                              : 'cursor-default'
                          }`}
                          onClick={() => {
                            if (isEditMode) {
                              if (editingStepId !== step.id) {
                                handleEditStep(step);
                              }
                              setEditingField('action');
                            }
                          }}
                          dangerouslySetInnerHTML={{ __html: addStylesToHtml(convertToHtml(editingStepId === step.id ? editingStepData?.action || step.action : step.action, false)) }}
                        />
                      )}
                    </div>

                    {/* Expected Result */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.expectedResult')}</span>
                      </div>
                      {editingStepId === step.id && editingField === 'expected' ? (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-md">
                          <MinimalTiptapEditor
                            value={convertToHtml(editingStepData?.expected || step.expected, true)}
                            onChange={(content) => {
                              updateEditingStepField('expected', content);
                            }}
                            placeholder={t('testCase.expectedResultPlaceholder')}
                            className="min-h-[80px]"
                            editorContentClassName="min-h-[60px] p-3"
                          />
                        </div>
                      ) : (
                        <div
                          className={`test-case-step-view text-slate-700 dark:text-slate-300 leading-relaxed p-3 rounded transition-colors ${
                            isEditMode
                              ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                              : 'cursor-default'
                          }`}
                          onClick={() => {
                            if (isEditMode) {
                              if (editingStepId !== step.id) {
                                handleEditStep(step);
                              }
                              setEditingField('expected');
                            }
                          }}
                          dangerouslySetInnerHTML={{ __html: addStylesToHtml(convertToHtml(editingStepId === step.id ? editingStepData?.expected || step.expected : step.expected, false)) }}
                        />
                      )}
                    </div>

                    {/* Notes */}
                    {(step.notes || editingStepId === step.id && editingField === 'notes') && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.notes')}</span>
                        </div>
                        {editingStepId === step.id && editingField === 'notes' ? (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-md">
                            <MinimalTiptapEditor
                              value={convertToHtml(editingStepData?.notes || step.notes || '', true)}
                              onChange={(content) => {
                                updateEditingStepField('notes', content);
                              }}
                              placeholder={t('testCase.notesPlaceholder')}
                              className="min-h-[120px]"
                              editorContentClassName="min-h-[80px] p-3"
                            />
                          </div>
                        ) : (step.notes || (editingStepId === step.id && editingStepData?.notes)) ? (
                          <div
                            className={`test-case-step-view text-slate-500 dark:text-slate-500 text-sm leading-relaxed p-3 rounded transition-colors ${
                              isEditMode
                                ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                : 'cursor-default'
                            }`}
                            onClick={() => {
                              if (isEditMode) {
                                if (editingStepId !== step.id) {
                                  handleEditStep(step);
                                }
                                setEditingField('notes');
                              }
                            }}
                            dangerouslySetInnerHTML={{ __html: addStylesToHtml(convertToHtml(editingStepId === step.id ? editingStepData?.notes || step.notes || '' : step.notes || '', false)) }}
                          />
                        ) : null}
                      </div>
                    )}

                    {/* Status */}
                    {step.status && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.status')}:</span>
                        <Badge className={`${statusColors[step.status as keyof typeof statusColors]}`}>
                          {getStatusIcon(step.status)}
                          <span className="ml-1 capitalize">{step.status}</span>
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Step Type Badge */}
                    <Badge className={getStepTypeColor(step.type)}>
                      {t(`testCase.stepType.${step.type || 'manual'}`)}
                    </Badge>

                    <div className="flex gap-1">
                      {editingStepId === step.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveStep}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title={t('common.save')}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            title={t('common.cancel')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyStep(step)}
                          className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                          title={t('testCase.copyStep')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
          <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{t('testCase.noTestSteps')}</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {t('testCase.noTestStepsDescription')}
          </p>
          <Button
            onClick={handleShowAddStepForm}
            disabled={isAddingStep || showAddStepForm}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.addTestSteps')}
          </Button>
        </div>
      )}
    </div>
  );
}
