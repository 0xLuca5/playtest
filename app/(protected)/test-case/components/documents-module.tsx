'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, Plus, Save, X, ExternalLink, RefreshCw, Eye, FileText, Trash2, Edit } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';

interface DocumentsModuleProps {
  testCaseDetails: any;
}

interface RelatedDocument {
  id: string;
  testCaseId: string;
  documentId: string;
  type: 'story' | 'epic' | 'task' | 'document' | 'external';
  title: string;
  status: 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid';
  assignee?: string;
  url?: string;
  source?: 'confluence' | 'jira' | 'sharepoint' | 'external';
  sourceMetadata?: any;
  createdAt: number;
  updatedAt: number;
}

export default function DocumentsModule({ testCaseDetails }: DocumentsModuleProps) {
  const { t } = useI18n();

  // 需求数据状态
  const [documents, setDocuments] = useState<RelatedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog状态管理
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDocument, setEditingDocument] = useState<RelatedDocument | null>(null);

  // Confluence 查看器状态
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    uri: '',
    type: 'document' as 'story' | 'epic' | 'task' | 'document' | 'external',
    source: 'external' as 'confluence' | 'jira' | 'sharepoint' | 'external',
    status: 'active' as 'active' | 'deprecated' | 'archived' | 'draft' | 'invalid',
  });

  // Confluence 认证状态
  const [confluenceAuth, setConfluenceAuth] = useState({
    email: '',
    apiToken: '',
  });
  const [showAuthFields, setShowAuthFields] = useState(false);

  // Confluence 解析状态
  const [parsedConfluence, setParsedConfluence] = useState<any>(null);
  const [parsingUrl, setParsingUrl] = useState(false);

  // 加载需求数据
  const loadDocuments = async () => {
    if (!testCaseDetails?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-case/documents?testCaseId=${testCaseDetails.id}`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 当测试用例变化时加载需求
  useEffect(() => {
    loadDocuments();
  }, [testCaseDetails?.id]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950';
      case 'deprecated': return 'text-orange-600 border-orange-200 bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:bg-orange-950';
      case 'archived': return 'text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900';
      case 'draft': return 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950';
      case 'invalid': return 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950';
      default: return 'text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-900';
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

  // 查看 Confluence 文档
  const viewConfluenceDoc = async (doc: RelatedDocument) => {
    console.log('[Confluence] Viewing document:', doc);

    if (!doc.url) {
      toast.error('No URL available for this document');
      return;
    }

    // 直接在 iframe 中打开 Confluence URL
    setViewerTitle(doc.title);
    setViewerUrl(doc.url);
    setIframeLoading(true);
    setIframeError(false);
    setViewerOpen(true);
  };

  // 查看文档
  const viewDocument = async (doc: RelatedDocument) => {
    if (doc.source === 'confluence') {
      await viewConfluenceDoc(doc);
    } else {
      // 其他类型直接在新标签页打开
      if (doc.url) {
        window.open(doc.url, '_blank');
      }
    }
  };

  // 打开添加需求dialog
  const handleOpenDialog = () => {
    setEditingDocument(null);
    setFormData({
      title: '',
      uri: '',
      type: 'document',
      source: 'external',
      status: 'active',
    });
    setConfluenceAuth({ email: '', apiToken: '' });
    setShowAuthFields(false);
    setParsedConfluence(null);
    setDialogOpen(true);
  };

  // 打开编辑dialog
  const handleOpenEditDialog = (doc: RelatedDocument) => {
    setEditingDocument(doc);
    setFormData({
      title: doc.title,
      uri: doc.url || '',
      type: doc.type,
      source: doc.source || 'external',
      status: doc.status,
    });
    setParsedConfluence(null);
    setDialogOpen(true);
  };

  // 关闭dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDocument(null);
    setFormData({
      title: '',
      uri: '',
      type: 'document',
      source: 'external',
      status: 'active',
    });
    setConfluenceAuth({ email: '', apiToken: '' });
    setShowAuthFields(false);
    setParsedConfluence(null);
  };

  // 处理表单输入
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 解析 Confluence URL
  const handleConfluenceUrlBlur = async () => {
    if (!formData.uri || formData.source !== 'confluence') {
      setParsedConfluence(null);
      return;
    }

    try {
      setParsingUrl(true);
      const requestBody: any = { url: formData.uri };

      // 如果提供了认证信息，一起发送
      if (confluenceAuth.email && confluenceAuth.apiToken) {
        requestBody.email = confluenceAuth.email;
        requestBody.apiToken = confluenceAuth.apiToken;
      }

      const response = await fetch('/api/confluence/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Invalid Confluence URL');
      }

      const data = await response.json();
      setParsedConfluence(data);

      // 自动填充标题的条件：
      // 1. 验证成功（最可靠）
      // 2. 或者从 URL 解析出了标题（次可靠）
      if (!formData.title && data.title) {
        if (data.verified) {
          setFormData(prev => ({ ...prev, title: data.title }));
          toast.success('Page verified and title loaded!');
        } else if (data.title !== 'Confluence Page (Unverified)') {
          // 从 URL 解析出了标题
          setFormData(prev => ({ ...prev, title: data.title }));
          toast.info('Title extracted from URL. You can edit it if needed.');
        } else if (data.isExternalLink) {
          // External link - 这是正常的，不需要警告
          toast.info('Public link detected. Please enter the page title manually.');
        } else {
          toast.warning('Could not extract page title. Please enter it manually.');
        }
      }
    } catch (error) {
      toast.error('Invalid Confluence URL');
      setParsedConfluence(null);
    } finally {
      setParsingUrl(false);
    }
  };

  // 保存需求链接
  const handleSaveDocument = async () => {
    if (!formData.title.trim() || !formData.uri.trim()) {
      toast.error(t('testCase.documents.fillAllFields'));
      return;
    }

    try {
      setSaving(true);

      // 构建 sourceMetadata
      let sourceMetadata = null;
      if (formData.source === 'confluence' && parsedConfluence) {
        sourceMetadata = {
          pageId: parsedConfluence.pageId,
          spaceKey: parsedConfluence.spaceKey,
          spaceName: parsedConfluence.spaceName,
          baseUrl: parsedConfluence.baseUrl,
          verified: parsedConfluence.verified,
        };
      }

      if (editingDocument) {
        // 更新现有文档
        const response = await fetch('/api/test-case/documents', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingDocument.id,
            title: formData.title.trim(),
            uri: formData.uri.trim(),
            type: formData.type,
            source: formData.source,
            status: formData.status,
            sourceMetadata: sourceMetadata,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update document');
        }

        toast.success(t('testCase.documents.updated'));
      } else {
        // 创建新文档
        const response = await fetch('/api/test-case/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testCaseId: testCaseDetails.id,
            title: formData.title.trim(),
            uri: formData.uri.trim(),
            type: formData.type,
            source: formData.source,
            status: formData.status,
            sourceMetadata: sourceMetadata,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save document');
        }

        toast.success(t('testCase.documents.saved'));
      }

      handleCloseDialog();

      // 重新加载需求列表
      await loadDocuments();

    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error(t('testCase.documents.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 删除需求链接
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm(t('testCase.documents.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/test-case/documents?id=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success(t('testCase.documents.deleted'));

      // 重新加载需求列表
      await loadDocuments();

    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error(t('testCase.documents.deleteFailed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Link className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.documents')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.documentsDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            disabled={loading}
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={handleOpenDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.linkDocument')}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-600 dark:text-slate-400">{t('testCase.documents.loading')}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">
            {t('testCase.documents.error')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('testCase.documents.retry')}
          </Button>
        </div>
      )}

      {/* documents List */}
      {!loading && !error && (
        <div className="space-y-4">
          {documents.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t('testCase.documents.linked')} ({documents.length})
                </h3>
              </div>

              {documents.map((document) => (
                <div key={document.id} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      {document.source === 'confluence' ? (
                        <img src="/Confluence.png" alt="Confluence" className="w-5 h-5" />
                      ) : (
                        <Link className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">{document.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(document.status)}`}>
                          {t(`testCase.documents.${document.status}`)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t(`testCase.documents.type.${document.type}`)}
                        </Badge>
                        {document.source && document.source !== 'external' && (
                          <Badge variant="secondary" className="text-xs">
                            {document.source}
                          </Badge>
                        )}
                      </div>
                      {document.sourceMetadata?.spaceKey && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          Space: {document.sourceMetadata.spaceKey}
                          {document.sourceMetadata.pageId && ` • Page ID: ${document.sourceMetadata.pageId}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {document.source === 'confluence' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDocument(document)}
                            className="text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Content
                          </Button>
                        )}
                        {document.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(document.url, '_blank')}
                            className="text-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            {document.source === 'confluence' ? 'Open in Confluence' : 'Open Link'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditDialog(document)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDocument(document.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* Empty state */
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
              <Link className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{t('testCase.noAdditionalDocuments')}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {t('testCase.linkDocumentsDescription')}
              </p>
              <Button
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={handleOpenDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('testCase.addDocumentLink')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit document Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl w-[90vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDocument ? (
                <>
                  <Edit className="w-5 h-5" />
                  {t('testCase.documents.editDocument')}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {t('testCase.addDocumentLink')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-x-hidden">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger id="doc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('testCase.documents.active')}</SelectItem>
                    <SelectItem value="deprecated">{t('testCase.documents.deprecated')}</SelectItem>
                    <SelectItem value="archived">{t('testCase.documents.archived')}</SelectItem>
                    <SelectItem value="draft">{t('testCase.documents.draft')}</SelectItem>
                    <SelectItem value="invalid">{t('testCase.documents.invalid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => {
                  handleInputChange('source', value);
                  setParsedConfluence(null);
                }}
              >
                <SelectTrigger id="doc-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confluence">
                    <div className="flex items-center gap-2">
                      <img src="/Confluence.png" alt="Confluence" className="w-4 h-4" />
                      Confluence
                    </div>
                  </SelectItem>
                  <SelectItem value="jira">Jira</SelectItem>
                  <SelectItem value="sharepoint">SharePoint</SelectItem>
                  <SelectItem value="external">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uri">
                {formData.source === 'confluence' ? 'Confluence Page URL' : t('testCase.documents.uri')}
              </Label>
              <Input
                id="uri"
                value={formData.uri}
                onChange={(e) => handleInputChange('uri', e.target.value)}
                onBlur={handleConfluenceUrlBlur}
                placeholder={
                  formData.source === 'confluence'
                    ? 'https://your-domain.atlassian.net/wiki/spaces/PROJ/pages/123456'
                    : t('testCase.documents.uriPlaceholder')
                }
                disabled={saving || parsingUrl}
              />
              {formData.source === 'confluence' && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      💡 <strong>Two ways to link Confluence pages</strong>:
                    </p>
                    <div className="pl-4 space-y-1">
                      <p>
                        <strong>Option 1: Direct URL</strong> (extracts title automatically)
                      </p>
                      <p className="pl-4 text-xs">
                        <code className="bg-muted px-1 rounded break-all">.../wiki/spaces/SPACE/pages/123/Title</code>
                      </p>
                      <p className="pl-4 text-xs">
                        ⚠️ Viewers need Confluence login to access
                      </p>
                    </div>
                    <div className="pl-4 space-y-1 mt-2">
                      <p>
                        <strong>Option 2: Public/External Link</strong> (no login required for viewers)
                      </p>
                      <p className="pl-4 text-xs">
                        <code className="bg-muted px-1 rounded break-all">.../wiki/external/ABC123...</code>
                      </p>
                      <p className="pl-4 text-xs">
                        ℹ️ You'll need to enter the title manually
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuthFields(!showAuthFields)}
                    className="text-xs h-7 px-2"
                  >
                    {showAuthFields ? '🔒 Hide' : '🔓 Show'} API Credentials (Optional - for verification)
                  </Button>
                </div>
              )}
              {parsingUrl && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Parsing URL...
                </p>
              )}
            </div>

            {/* Confluence API 认证字段 */}
            {formData.source === 'confluence' && showAuthFields && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>🔐 Confluence API Credentials</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confluence-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="confluence-email"
                    type="email"
                    value={confluenceAuth.email}
                    onChange={(e) => setConfluenceAuth(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your-email@example.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confluence-token" className="text-xs">
                    API Token
                  </Label>
                  <Input
                    id="confluence-token"
                    type="password"
                    value={confluenceAuth.apiToken}
                    onChange={(e) => setConfluenceAuth(prev => ({ ...prev, apiToken: e.target.value }))}
                    placeholder="Your Confluence API token"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API token from{' '}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Atlassian Account Settings
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Confluence 解析预览 */}
            {parsedConfluence && formData.source === 'confluence' && (
              <div className={`border rounded-lg p-3 ${
                parsedConfluence.verified
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : parsedConfluence.isExternalLink
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                    : parsedConfluence.title && parsedConfluence.title !== 'Confluence Page (Unverified)'
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                      : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
              }`}>
                <div className="flex items-start gap-2">
                  <FileText className={`w-5 h-5 mt-0.5 ${
                    parsedConfluence.verified
                      ? 'text-green-600'
                      : parsedConfluence.isExternalLink
                        ? 'text-blue-600'
                        : parsedConfluence.title && parsedConfluence.title !== 'Confluence Page (Unverified)'
                          ? 'text-blue-600'
                          : 'text-orange-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium break-words">{parsedConfluence.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="text-sm text-muted-foreground break-all">
                        Space: {parsedConfluence.spaceKey} • Page ID: {parsedConfluence.pageId}
                      </div>
                      {parsedConfluence.isExternalLink && (
                        <span className="text-xs bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded flex-shrink-0">
                          Public Link
                        </span>
                      )}
                    </div>
                    {parsedConfluence.verified ? (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Verified - Page exists and title is up-to-date
                      </div>
                    ) : parsedConfluence.isExternalLink ? (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                        <div>ℹ️ Public link - please enter the page title manually</div>
                        <div className="text-xs opacity-75">
                          ✅ Viewers can access without Confluence login (if page is public)
                        </div>
                      </div>
                    ) : parsedConfluence.title && parsedConfluence.title !== 'Confluence Page (Unverified)' ? (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                        <div>ℹ️ Title extracted from URL - ready to use</div>
                        <div className="text-xs opacity-75">
                          📝 Note: Viewers need Confluence login to access this link
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        ⚠️ Could not extract title - please enter manually
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">{t('testCase.documents.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('testCase.documents.titlePlaceholder')}
                disabled={saving}
              />
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
              onClick={handleSaveDocument}
              disabled={saving || !formData.title.trim() || !formData.uri.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
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

      {/* Confluence 查看器 Dialog - 全屏模式 */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className="!w-screen !h-screen !max-w-none !max-h-none !m-0 !p-0 !rounded-none flex flex-col !translate-x-0 !translate-y-0 !top-0 !left-0"
          showCloseButton={false}
        >
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b flex-shrink-0 bg-white dark:bg-slate-900">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                <img src="/Confluence.png" alt="Confluence" className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="truncate text-sm md:text-base">{viewerTitle || 'Confluence Document'}</span>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {viewerUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(viewerUrl, '_blank')}
                    title="Open in New Tab"
                    className="gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewerOpen(false)}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
            <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
              💡 If the page doesn't display properly, click "Open in Tab" button above to view in a new browser tab.
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative">
            {/* 加载动画 */}
            {iframeLoading && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900 z-10">
                <RefreshCw className="w-8 h-8 md:w-12 md:h-12 animate-spin text-blue-500 mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Loading Confluence page...</p>
              </div>
            )}

            {/* 错误提示 */}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900 z-10 p-6 overflow-y-auto">
                <div className="text-center max-w-2xl space-y-4">
                  <div className="text-red-500 text-4xl mb-4">⚠️</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Unable to Display in Embedded Viewer
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    The Confluence page cannot be displayed in the embedded viewer due to security restrictions.
                  </p>
                  
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-left text-xs space-y-2">
                    <div className="font-semibold text-amber-900 dark:text-amber-100">Common Causes:</div>
                    <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                      <li><strong>X-Frame-Options</strong>: Confluence server blocks iframe embedding</li>
                      <li><strong>CSP Policy</strong>: Your domain is not in the allowed frame-ancestors list</li>
                      <li><strong>Authentication</strong>: Login required but cookies blocked in iframe</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700">
                      <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Solution:</div>
                      <p className="text-amber-800 dark:text-amber-200">
                        Contact your Confluence administrator to add your domain to the whitelist, or use the button below to open in a new tab.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => window.open(viewerUrl, '_blank')}
                    className="mt-4"
                    size="lg"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  
                  <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Check browser console (F12) for detailed error messages
                  </div>
                </div>
              </div>
            )}

            {viewerUrl ? (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewerTitle}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
                allow="fullscreen; clipboard-read; clipboard-write"
                onLoad={() => {
                  console.log('✅ Iframe onLoad triggered for:', viewerUrl);
                  setIframeLoading(false);
                  
                  // 等待一小段时间后检查是否有错误
                  setTimeout(() => {
                    const iframe = document.querySelector('iframe[title="' + viewerTitle + '"]') as HTMLIFrameElement;
                    if (iframe) {
                      try {
                        // 尝试访问 iframe 内容
                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (!doc) {
                          console.warn('⚠️ Cannot access iframe content (may be blocked by X-Frame-Options or CSP)');
                        } else {
                          console.log('✅ Iframe content accessible');
                        }
                      } catch (e) {
                        console.log('ℹ️ Cross-origin frame detected (this is normal for external content)');
                      }
                      
                      // 检查 iframe 是否真的加载了内容
                      if (iframe.contentWindow) {
                        try {
                          const hasContent = iframe.contentWindow.location.href;
                          console.log('✅ Iframe has valid content');
                        } catch (e) {
                          // 这是正常的跨域错误
                          console.log('ℹ️ Cross-origin restrictions apply (expected for Confluence)');
                        }
                      }
                    }
                  }, 2000);
                }}
                onError={(e) => {
                  console.error('Iframe loading error:', e);
                  setIframeLoading(false);
                  setIframeError(true);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No URL available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
