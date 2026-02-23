'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Plus, AlertCircle, CheckCircle, XCircle, Activity, Edit, Trash2, ExternalLink, AlertTriangle, X, Save, Tag } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface KnownIssue {
  id: string;
  testCaseId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'wont-fix';
  reporter: string;
  assignee?: string;
  bugUrl?: string;
  workaround?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

interface IssuesModuleProps {
  testCaseDetails: any;
}

// 转换 Markdown 格式为 HTML
const convertToHtml = (content: string): string => {
  if (!content) return '';

  let htmlContent = content;

  // 首先处理可能被转义的换行符（PostgreSQL 有时会将 \n 存储为字符串字面量）
  // 将字符串字面量 "\\n" 转换为真正的换行符
  if (htmlContent.includes('\\n')) {
    htmlContent = htmlContent.replace(/\\n/g, '\n');
  }

  // 处理基本的Markdown格式（从最长的模式开始匹配，避免冲突）
  // 使用 !important 确保样式不被覆盖
  // 使用 gm 标志支持多行匹配，$ 匹配行尾
  htmlContent = htmlContent
    .replace(/^#### (.+)$/gm, '<h4 style="font-size: 1.125rem !important; font-weight: 600 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.75rem !important;">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 1.25rem !important; font-weight: 600 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.75rem !important;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 1.5rem !important; font-weight: 700 !important; margin-top: 1rem !important; margin-bottom: 0.75rem !important; line-height: 2rem !important;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 1.875rem !important; font-weight: 700 !important; margin-top: 1rem !important; margin-bottom: 0.75rem !important; line-height: 2.25rem !important;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // 包装在段落标签中
  if (htmlContent && !htmlContent.startsWith('<h') && !htmlContent.startsWith('<p>')) {
    htmlContent = `<p>${htmlContent}</p>`;
  }

  return htmlContent;
};

// 处理HTML内容，为标题添加样式
const addStylesToHtml = (html: string): string => {
  if (!html) return '';
  
  let processedHtml = html;
  
  // 首先处理可能被转义的换行符
  if (processedHtml.includes('\\n')) {
    processedHtml = processedHtml.replace(/\\n/g, '\n');
  }
  
  // 检查是否已经是 HTML（包含标签）
  const isHtml = html.includes('<') && html.includes('>');
  
  if (!isHtml) {
    // 如果是纯文本或 Markdown，先转换为 HTML
    processedHtml = convertToHtml(processedHtml);
  }
  
  // 为 HTML 标题标签添加内联样式（无论是新转换的还是已有的）
  // 使用 !important 确保样式不被覆盖
  processedHtml = processedHtml
    .replace(/<h1(\s[^>]*)?>|<h1>/g, '<h1 style="font-size: 1.875rem !important; font-weight: 700 !important; margin-top: 1rem !important; margin-bottom: 0.75rem !important; line-height: 2.25rem !important;">')
    .replace(/<h2(\s[^>]*)?>|<h2>/g, '<h2 style="font-size: 1.5rem !important; font-weight: 700 !important; margin-top: 1rem !important; margin-bottom: 0.75rem !important; line-height: 2rem !important;">')
    .replace(/<h3(\s[^>]*)?>|<h3>/g, '<h3 style="font-size: 1.25rem !important; font-weight: 600 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.75rem !important;">')
    .replace(/<h4(\s[^>]*)?>|<h4>/g, '<h4 style="font-size: 1.125rem !important; font-weight: 600 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.75rem !important;">');
  
  return processedHtml;
};

export default function IssuesModule({ testCaseDetails }: IssuesModuleProps) {
  const { t } = useI18n();
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<KnownIssue | null>(null);
  const [deletingIssueId, setDeletingIssueId] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    status: 'open' as 'open' | 'investigating' | 'resolved' | 'wont-fix',
    assignee: '',
    bugUrl: '',
    workaround: '',
    category: '',
    tags: [] as string[],
  });

  // 标签输入状态
  const [tagInput, setTagInput] = useState('');

  // 加载问题列表
  const fetchIssues = async () => {
    if (!testCaseDetails?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/known-issues?testCaseId=${testCaseDetails.id}`);
      if (!response.ok) throw new Error('Failed to fetch issues');
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error(t('testCase.errorFetchingIssues') || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [testCaseDetails?.id]);

  // 打开创建/编辑对话框
  const openDialog = (issue?: KnownIssue) => {
    if (issue) {
      setEditingIssue(issue);
      setFormData({
        title: issue.title,
        description: issue.description || '',
        severity: issue.severity,
        status: issue.status,
        assignee: issue.assignee || '',
        bugUrl: issue.bugUrl || '',
        workaround: issue.workaround || '',
        category: issue.category || '',
        tags: issue.tags || [],
      });
    } else {
      setEditingIssue(null);
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        assignee: '',
        bugUrl: '',
        workaround: '',
        category: '',
        tags: [],
      });
    }
    setTagInput('');
    setIsDialogOpen(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingIssue(null);
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      assignee: '',
      bugUrl: '',
      workaround: '',
      category: '',
      tags: [],
    });
    setTagInput('');
  };

  // 创建或更新问题
  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast.error(t('testCase.titleAndDescriptionRequired') || 'Title and description are required');
      return;
    }

    setLoading(true);
    try {
      if (editingIssue) {
        // 更新
        const response = await fetch('/api/known-issues', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingIssue.id, ...formData }),
        });
        if (!response.ok) throw new Error('Failed to update issue');
        toast.success(t('testCase.issueUpdated') || 'Issue updated successfully');
      } else {
        // 创建
        const response = await fetch('/api/known-issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseId: testCaseDetails.id, ...formData }),
        });
        if (!response.ok) throw new Error('Failed to create issue');
        toast.success(t('testCase.issueCreated') || 'Issue created successfully');
      }
      closeDialog();
      await fetchIssues();
    } catch (error) {
      console.error('Error saving issue:', error);
      toast.error(t('testCase.errorSavingIssue') || 'Failed to save issue');
    } finally {
      setLoading(false);
    }
  };

  // 删除问题
  const handleDelete = async (id: string) => {
    if (!confirm(t('testCase.confirmDeleteIssue') || 'Are you sure you want to delete this issue?')) {
      return;
    }

    setDeletingIssueId(id);
    try {
      const response = await fetch(`/api/known-issues?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete issue');
      toast.success(t('testCase.issueDeleted') || 'Issue deleted successfully');
      await fetchIssues();
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error(t('testCase.errorDeletingIssue') || 'Failed to delete issue');
    } finally {
      setDeletingIssueId(null);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 处理标签输入的回车键
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 计算统计数据
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'open' || i.status === 'investigating').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    critical: issues.filter(i => i.severity === 'critical').length,
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'investigating': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'resolved': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'wont-fix': return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.issues')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.issuesDescription') || 'Track known issues and bugs'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => openDialog()}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('testCase.reportIssue') || 'Report Issue'}
        </Button>
      </div>

      {/* Issue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.totalIssues') || 'Total Issues'}</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.total}</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.open') || 'Open'}</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.resolved') || 'Resolved'}</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.critical') || 'Critical'}</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
      </div>

      {/* Issues List or Empty State */}
      {loading && issues.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <Activity className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : issues.length > 0 ? (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
                  <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                
                <div className="flex-1">
                  {/* Header with title and time */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">{issue.title}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Badges for severity, status, and category */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(issue.status)}`}>
                      {issue.status}
                    </Badge>
                    {issue.category && (
                      <Badge variant="outline" className="text-xs text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800">
                        {issue.category}
                      </Badge>
                    )}
                  </div>

                  {/* Reporter and Assignee info */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Reporter: {issue.reporter}</span>
                    {issue.assignee && (
                      <span>→ Assignee: {issue.assignee}</span>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div className="mb-3 -mx-3">
                    <div className="minimal-tiptap-editor">
                      <div 
                        className="ProseMirror p-3 text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: addStylesToHtml(issue.description) }}
                      />
                    </div>
                  </div>
                  {/* Workaround */}
                  {issue.workaround && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Workaround:</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">{issue.workaround}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional info: Bug URL and Tags */}
                  {(issue.bugUrl || (issue.tags && issue.tags.length > 0)) && (
                    <div className="space-y-2 mb-3 text-sm">
                      {issue.bugUrl && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <ExternalLink className="w-4 h-4" />
                          <a
                            href={issue.bugUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Bug Tracker
                          </a>
                        </div>
                      )}
                      {issue.tags && issue.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          {issue.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(issue)}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(issue.id)}
                      disabled={deletingIssueId === issue.id}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      {deletingIssueId === issue.id ? (
                        <Activity className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 mr-1" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">
            {t('testCase.noKnownIssues') || 'No Known Issues'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {t('testCase.noKnownIssuesDescription') || 'There are no reported issues for this test case.'}
          </p>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => openDialog()}
          >
            <Bug className="w-4 h-4 mr-2" />
            {t('testCase.reportNewIssue') || 'Report First Issue'}
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="!max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingIssue ? (
                <>
                  <Edit className="w-5 h-5" />
                  {t('testCase.editIssue') || 'Edit Issue'}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {t('testCase.createIssue') || 'Create Issue'}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingIssue
                ? (t('testCase.editIssueDescription') || 'Update the issue details below.')
                : (t('testCase.createIssueDescription') || 'Fill in the details to report a new issue.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-2">
              <Label htmlFor="title">{t('testCase.title') || 'Title'} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter issue title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">{t('testCase.description') || 'Description'} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail. Supports Markdown: ## Heading, **bold**, - list"
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Supports Markdown: # H1, ## H2, ### H3, **bold**, *italic*, - list, ``` code
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">{t('testCase.severity') || 'Severity'} *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {t('testCase.severity.low') || 'Low'}
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        {t('testCase.severity.medium') || 'Medium'}
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        {t('testCase.severity.high') || 'High'}
                      </span>
                    </SelectItem>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        {t('testCase.severity.critical') || 'Critical'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">{t('testCase.status') || 'Status'}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('testCase.status.open') || 'Open'}</SelectItem>
                    <SelectItem value="investigating">{t('testCase.status.investigating') || 'Investigating'}</SelectItem>
                    <SelectItem value="resolved">{t('testCase.status.resolved') || 'Resolved'}</SelectItem>
                    <SelectItem value="reopen">{t('testCase.status.reopen') || "Reopen"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">{t('testCase.category') || 'Category'}</Label>
              <Select
                value={formData.category || 'none'}
                onValueChange={(value) => setFormData({ ...formData, category: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                  <SelectItem value="bug">{t('testCase.category.bug') || 'Bug'}</SelectItem>
                  <SelectItem value="performance">{t('testCase.category.performance') || 'Performance'}</SelectItem>
                  <SelectItem value="security">{t('testCase.category.security') || 'Security'}</SelectItem>
                  <SelectItem value="ui">{t('testCase.category.ui') || 'UI/UX'}</SelectItem>
                  <SelectItem value="data">{t('testCase.category.data') || 'Data'}</SelectItem>
                  <SelectItem value="integration">{t('testCase.category.integration') || 'Integration'}</SelectItem>
                  <SelectItem value="automation">{t('testCase.category.automation') || 'Automation'}</SelectItem>
                  <SelectItem value="documentation">{t('testCase.category.documentation') || 'Documentation'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignee">{t('testCase.assignee') || 'Assignee'}</Label>
              <Input
                id="assignee"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder="Assignee email or name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bugUrl">{t('testCase.bugUrl') || 'Bug Tracker URL'}</Label>
              <Input
                id="bugUrl"
                type="url"
                value={formData.bugUrl}
                onChange={(e) => setFormData({ ...formData, bugUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">{t('testCase.tags') || 'Tags'}</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add a tag and press Enter"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={loading || !tagInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-slate-100 dark:bg-slate-800"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workaround">{t('testCase.workaround') || 'Workaround'}</Label>
              <Textarea
                id="workaround"
                value={formData.workaround}
                onChange={(e) => setFormData({ ...formData, workaround: e.target.value })}
                placeholder="Describe any temporary workaround"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingIssue ? (t('common.update') || 'Update') : (t('common.create') || 'Create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
