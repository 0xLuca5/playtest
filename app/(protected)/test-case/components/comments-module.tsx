'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MessageSquare, Plus, Save, X, Edit, Trash2, User, Bot, RefreshCw, Lightbulb, AlertTriangle, AlertCircle, Sparkles, HelpCircle, CheckCircle, Clock, Tag, Link2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';
import { useProject } from '@/lib/contexts/project-context';

interface CommentsModuleProps {
  testCaseDetails: any;
}

interface Comment {
  id: string;
  testCaseId: string;
  content: string;
  author: string;
  authorType: 'user' | 'ai';
  commentType?: 'suggestion' | 'issue' | 'risk' | 'improvement' | 'question' | 'approval' | 'general';
  category?: string;
  tags?: string[];
  relatedStepId?: string;
  attachments?: Array<{url: string, name: string, type: string}>;
  createdAt: number;
  updatedAt: number;
}

export default function CommentsModule({ testCaseDetails }: CommentsModuleProps) {
  const { t } = useI18n();
  const { currentProject } = useProject();

  // 评论数据状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Dialog状态管理
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    content: '',
    commentType: 'general' as Comment['commentType'],
    category: '',
    tags: [] as string[],
    relatedStepId: '',
  });

  // 标签输入状态
  const [tagInput, setTagInput] = useState('');

  // 加载评论数据
  const loadComments = async () => {
    if (!testCaseDetails?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-case/comments?testCaseId=${testCaseDetails.id}`);
      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
      setCurrentUser(data.currentUser || null);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 当测试用例变化时加载评论
  useEffect(() => {
    loadComments();
  }, [testCaseDetails?.id]);

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

  // 打开添加评论dialog
  const handleOpenDialog = () => {
    setEditingComment(null);
    setFormData({
      content: '',
      commentType: 'general',
      category: '',
      tags: [],
      relatedStepId: '',
    });
    setTagInput('');
    setDialogOpen(true);
  };

  // 打开编辑dialog
  const handleOpenEditDialog = (comment: Comment) => {
    setEditingComment(comment);
    setFormData({
      content: comment.content,
      commentType: comment.commentType || 'general',
      category: comment.category || '',
      tags: comment.tags || [],
      relatedStepId: comment.relatedStepId || '',
    });
    setTagInput('');
    setDialogOpen(true);
  };

  // 关闭dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingComment(null);
    setFormData({
      content: '',
      commentType: 'general',
      category: '',
      tags: [],
      relatedStepId: '',
    });
    setTagInput('');
  };

  // 处理表单输入
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  // 保存评论
  const handleSaveComment = async () => {
    if (!formData.content.trim()) {
      toast.error(t('testCase.comments.contentRequired'));
      return;
    }

    try {
      setSaving(true);

      // 准备请求数据
      const requestData: any = {
        content: formData.content.trim(),
        commentType: formData.commentType,
      };

      // 只包含非空的可选字段
      if (formData.category) requestData.category = formData.category;
      if (formData.tags.length > 0) requestData.tags = formData.tags;
      if (formData.relatedStepId) requestData.relatedStepId = formData.relatedStepId;

      if (editingComment) {
        // 更新现有评论
        const response = await fetch('/api/test-case/comments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingComment.id,
            ...requestData,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update comment');
        }

        toast.success(t('testCase.comments.updated'));
      } else {
        // 创建新评论
        const response = await fetch('/api/test-case/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testCaseId: testCaseDetails.id,
            authorType: 'user',
            ...requestData,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save comment');
        }

        toast.success(t('testCase.comments.saved'));
      }

      handleCloseDialog();

      // 重新加载评论列表
      await loadComments();

    } catch (error) {
      console.error('Failed to save comment:', error);
      toast.error(t('testCase.comments.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t('testCase.comments.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/test-case/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      toast.success(t('testCase.comments.deleted'));

      // 重新加载评论列表
      await loadComments();

    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error(t('testCase.comments.deleteFailed'));
    }
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? t('testCase.comments.justNow') : t('testCase.comments.minutesAgo', { minutes });
      }
      return t('testCase.comments.hoursAgo', { hours });
    } else if (days === 1) {
      return t('testCase.comments.yesterday');
    } else if (days < 7) {
      return t('testCase.comments.daysAgo', { days });
    } else {
      return date.toLocaleDateString();
    }
  };

  // 获取评论类型图标
  const getCommentTypeIcon = (type?: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-4 h-4" />;
      case 'issue': return <AlertTriangle className="w-4 h-4" />;
      case 'risk': return <AlertCircle className="w-4 h-4" />;
      case 'improvement': return <Sparkles className="w-4 h-4" />;
      case 'question': return <HelpCircle className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // 获取评论类型颜色
  const getCommentTypeColor = (type?: string) => {
    switch (type) {
      case 'suggestion': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800';
      case 'issue': return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800';
      case 'risk': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800';
      case 'improvement': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800';
      case 'question': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800';
      case 'approval': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-950 dark:border-slate-800';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.comments')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.commentsDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadComments}
            disabled={loading}
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
            onClick={handleOpenDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.addComment')}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-600 dark:text-slate-400">{t('testCase.comments.loading')}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">
            {t('testCase.comments.error')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadComments}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('testCase.comments.retry')}
          </Button>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && (
        <div className="space-y-4">
          {comments.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t('testCase.comments.total', { count: comments.length })}
                </h3>
              </div>

              {comments.map((comment) => (
                <div key={comment.id} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      comment.authorType === 'ai'
                        ? 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30'
                        : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30'
                    }`}>
                      {comment.authorType === 'ai' ? (
                        <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      {/* Header with author, type, and time */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{comment.author}</span>
                        <Badge variant="outline" className={`text-xs ${
                          comment.authorType === 'ai'
                            ? 'text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950'
                            : 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950'
                        }`}>
                          {comment.authorType === 'ai' ? t('testCase.comments.ai') : t('testCase.comments.user')}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>

                      {/* Badges for type and category */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {comment.commentType && (
                          <Badge variant="outline" className={`text-xs ${getCommentTypeColor(comment.commentType)}`}>
                            {getCommentTypeIcon(comment.commentType)}
                            <span className="ml-1">
                              {t(`testCase.comments.type.${comment.commentType}`)}
                            </span>
                          </Badge>
                        )}
                        {comment.category && (
                          <Badge variant="outline" className="text-xs text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800">
                            {comment.category}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">
                        {comment.content}
                      </p>

                      {/* Additional info */}
                      {(comment.relatedStepId || (comment.tags && comment.tags.length > 0)) && (
                        <div className="space-y-2 mb-3 text-sm">
                          {comment.relatedStepId && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <Link2 className="w-4 h-4" />
                              <span>{t('testCase.comments.relatedStepLabel')} {
                                testCaseDetails?.steps?.findIndex((s: any) => s.id === comment.relatedStepId) !== -1
                                  ? `${t('testCase.steps')} ${testCaseDetails.steps.findIndex((s: any) => s.id === comment.relatedStepId) + 1}`
                                  : t('testCase.comments.relatedStepUnknown')
                              }</span>
                            </div>
                          )}
                          {comment.tags && comment.tags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              {comment.tags.map((tag, idx) => {
                                // 特殊处理 AI 建议的标签
                                if (typeof tag === 'string' && tag.includes(':')) {
                                  const [key, value] = tag.split(':');
                                  const getTagColor = (key: string, value: string) => {
                                    if (key === 'priority') {
                                      return value === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                             value === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                             'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                                    }
                                    if (key === 'status') {
                                      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                                    }
                                    if (key === 'weight') {
                                      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
                                    }
                                    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
                                  };
                                  
                                  return (
                                    <Badge 
                                      key={idx} 
                                      variant="outline" 
                                      className={`text-xs ${getTagColor(key, value)}`}
                                    >
                                      {key}: {value}
                                    </Badge>
                                  );
                                }
                                
                                return (
                                  <Badge key={idx} variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800">
                                    {tag}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {((comment.authorType === 'user' && comment.author === currentUser) || 
                          (comment.authorType === 'ai' && currentUser)) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditDialog(comment)}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('common.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {t('common.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* Empty state */
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
              <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{t('testCase.noComments')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {t('testCase.noCommentsDescription')}
              </p>
              <Button
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={handleOpenDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('testCase.addFirstComment')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Comment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingComment ? (
                <>
                  <Edit className="w-5 h-5" />
                  {t('testCase.comments.editComment')}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {t('testCase.addComment')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 评论内容 */}
            <div className="space-y-2">
              <Label htmlFor="comment-content">{t('testCase.comments.content')} *</Label>
              <Textarea
                id="comment-content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t('testCase.comments.contentPlaceholder')}
                disabled={saving}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* 第一行：评论类型和分类 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comment-type">{t('testCase.comments.commentType')}</Label>
                <Select
                  value={formData.commentType}
                  onValueChange={(value) => handleInputChange('commentType', value)}
                  disabled={saving}
                >
                  <SelectTrigger id="comment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">💬 {t('testCase.comments.type.general')}</SelectItem>
                    <SelectItem value="suggestion">💡 {t('testCase.comments.type.suggestion')}</SelectItem>
                    <SelectItem value="issue">⚠️ {t('testCase.comments.type.issue')}</SelectItem>
                    <SelectItem value="risk">🚨 {t('testCase.comments.type.risk')}</SelectItem>
                    <SelectItem value="improvement">✨ {t('testCase.comments.type.improvement')}</SelectItem>
                    <SelectItem value="question">❓ {t('testCase.comments.type.question')}</SelectItem>
                    <SelectItem value="approval">✅ {t('testCase.comments.type.approval')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('testCase.comments.category')}</Label>
                <Select
                  value={formData.category || 'none'}
                  onValueChange={(value) => handleInputChange('category', value === 'none' ? '' : value)}
                  disabled={saving}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t('testCase.comments.categorySelect')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('testCase.comments.category.none')}</SelectItem>
                    <SelectItem value="test_coverage">{t('testCase.comments.category.testCoverage')}</SelectItem>
                    <SelectItem value="test_clarity">{t('testCase.comments.category.testClarity')}</SelectItem>
                    <SelectItem value="test_efficiency">{t('testCase.comments.category.testEfficiency')}</SelectItem>
                    <SelectItem value="test_maintainability">{t('testCase.comments.category.testMaintainability')}</SelectItem>
                    <SelectItem value="automation_potential">{t('testCase.comments.category.automationPotential')}</SelectItem>
                    <SelectItem value="data_validation">{t('testCase.comments.category.dataValidation')}</SelectItem>
                    <SelectItem value="performance">{t('testCase.comments.category.performance')}</SelectItem>
                    <SelectItem value="security">{t('testCase.comments.category.security')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 关联步骤 */}
            <div className="space-y-2">
              <Label htmlFor="related-step">{t('testCase.comments.relatedStep')}</Label>
              <Select
                value={formData.relatedStepId || 'none'}
                onValueChange={(value) => handleInputChange('relatedStepId', value === 'none' ? '' : value)}
                disabled={saving}
              >
                <SelectTrigger id="related-step">
                  <SelectValue placeholder={t('testCase.comments.relatedStepSelect')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('testCase.comments.relatedStepNone')}</SelectItem>
                  {testCaseDetails?.steps?.map((step: any, index: number) => (
                    <SelectItem key={step.id} value={step.id}>
                      {t('testCase.steps')} {index + 1}: {step.action?.substring(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 标签输入 */}
            <div className="space-y-2">
              <Label htmlFor="tags">{t('testCase.comments.tags')}</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={t('testCase.comments.tagsPlaceholder')}
                  disabled={saving}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={saving || !tagInput.trim()}
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
                        disabled={saving}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveComment}
              disabled={saving || !formData.content.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

