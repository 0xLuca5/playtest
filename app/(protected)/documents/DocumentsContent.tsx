"use client";

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { JSX } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProject } from '@/lib/contexts/project-context';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  FileText,
  Code,
  Image,
  FileSpreadsheet,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const MIDSCENE_REPORT = 'midscene_report';

interface Document {
  id: string;
  title: string;
  kind: string;
  content?: string;
  createdAt: string;
  userId: string;
  projectId?: string;
}

interface DocumentsResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function DocumentsContent() {
  const { t, locale } = useI18n();
  const { currentProject } = useProject();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const searchParams = useSearchParams();
  const limit = 10;

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // 搜索时重置到第一页
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const offset = (currentPage - 1) * limit;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortDirection,
      });

      // 添加项目ID参数
      if (currentProject?.id) {
        params.append('projectId', currentProject.id);
      }

      if (selectedKind !== 'all') {
        params.append('kind', selectedKind);
      }

      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }

      const response = await fetch(`/api/documents/?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DocumentsResponse = await response.json();
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取文档失败:', err);
      setError(err instanceof Error ? err.message : t('documents.fetchFailed'));
      setDocuments([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentProject?.id) {
      fetchDocuments();
    }
  }, [currentPage, selectedKind, sortBy, sortDirection, debouncedSearchTerm, currentProject?.id]);

  // 获取文档图标
  const getDocumentIcon = (kind: string) => {
    switch (kind) {
      case 'text': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'code': return <Code className="w-4 h-4 text-green-600" />;
      case 'midscene_report': return <FileText className="w-4 h-4 text-orange-600" />;
      case 'image': return <Image className="w-4 h-4 text-purple-600" />;
      case 'sheet': return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd');
  };

  // 获取文档类型名称
  const getDocumentTypeName = (kind: string) => {
    switch (kind) {
      case 'text': return t('documents.textDocument');
      case 'code': return t('documents.codeDocument');
      case 'midscene_report': return t('documents.testDocument');
      case 'image': return t('documents.imageDocument');
      case 'sheet': return t('documents.sheetDocument');
      default: return t('documents.unknownType');
    }
  };

  // 获取文档状态徽章
  const getDocumentStatusBadge = (kind: string): JSX.Element => {
    switch (kind) {
      case 'text':
        return <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{t('documents.statusCompleted')}</span>;
      case 'code':
        return <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{t('documents.statusCompleted')}</span>;
      case 'midscene_report':
        return <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{t('documents.statusProcessing')}</span>;
      case 'image':
        return <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">{t('documents.statusCompleted')}</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">{t('documents.statusUnprocessed')}</span>;
    }
  };

  // 删除文档方法
  const handleDelete = async (id: string) => {
    if (!window.confirm(t('documents.deleteConfirm'))) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Accept-Language': locale || 'en'
        }
      });

      if (!res.ok) {
        // 尝试解析错误响应
        let errorMessage = t('documents.deleteFailed');
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // 如果无法解析JSON，使用默认错误消息
          console.error('无法解析错误响应:', parseError);
        }
        throw new Error(errorMessage);
      }

      // 删除成功，刷新列表
      await fetchDocuments();
      toast.success(t('documents.deleteSuccess') || '删除成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算总页数
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-800 p-3 sm:p-4 lg:p-6">
      {/* 页面标题 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('documents.title')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 mt-1">
          {t('documents.description')}
        </p>
      </div>

      {/* 主要内容区域 - 合并的大卡片（工具栏+表格+分页） */}
      <div className="bg-white dark:bg-zinc-900/60 shadow-lg rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 lg:p-6">
        {/* 搜索和筛选区域 */}
        <div className="border-b border-gray-200 dark:border-slate-700 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 左侧搜索框 */}
            <div className="w-full sm:w-80 lg:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Input
                  placeholder={t('documents.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            {/* 右侧筛选器 */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <Select value={selectedKind} onValueChange={setSelectedKind}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t('documents.documentType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('documents.allTypes')}</SelectItem>
                    <SelectItem value="text">{t('documents.textDocument')}</SelectItem>
                    <SelectItem value="code">{t('documents.codeDocument')}</SelectItem>
                    <SelectItem value="midscene_report">{t('documents.testDocument')}</SelectItem>
                    <SelectItem value="image">{t('documents.imageDocument')}</SelectItem>
                    <SelectItem value="sheet">{t('documents.sheetDocument')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto">
                <Select value={`${sortBy}-${sortDirection}`} onValueChange={(value) => {
                  const [field, direction] = value.split('-');
                  setSortBy(field);
                  setSortDirection(direction as 'asc' | 'desc');
                }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t('documents.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">{t('documents.createdAtDesc')}</SelectItem>
                    <SelectItem value="createdAt-asc">{t('documents.createdAtAsc')}</SelectItem>
                    <SelectItem value="title-asc">{t('documents.nameAsc')}</SelectItem>
                    <SelectItem value="title-desc">{t('documents.nameDesc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* 文档表格 */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 p-8 text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <p className="text-lg font-medium">{t('documents.loadFailed')}</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <Button onClick={fetchDocuments} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">{t('documents.retry')}</Button>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/60 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('documents.noDocuments')}</h3>
            <p className="text-gray-500 dark:text-gray-400">{t('documents.noDocumentsDescription')}</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-zinc-900/60 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-10 sm:h-12 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{t('documents.documentName')}</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell">{t('documents.type')}</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">{t('documents.creator')}</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden lg:table-cell">{t('documents.createdAt')}</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{t('documents.status')}</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{t('documents.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="h-12 sm:h-14 hover:bg-blue-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-700 transition-all duration-200 group"
                    >
                      <TableCell className="p-2 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0">
                            {getDocumentIcon(doc.kind)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm sm:text-base truncate">
                            {doc.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">{getDocumentTypeName(doc.kind)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell p-2 sm:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm">
                            {doc.userId?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{doc.userId || t('documents.unknownUser')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">{formatDate(doc.createdAt)}</span>
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">
                        {getDocumentStatusBadge(doc.kind)}
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link href={`/document/${doc.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              title={t('documents.view')}
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                            title={t('documents.delete')}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 分页区域 */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 sm:mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 gap-4">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                {t('documents.showingRecords', {
                  start: (currentPage - 1) * limit + 1,
                  end: Math.min(currentPage * limit, total),
                  total: total
                })}
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('documents.previousPage')}</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8"
                >
                  <span className="hidden sm:inline">{t('documents.nextPage')}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
