"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Clock, FileText, Users, MessageSquare, Loader2, TestTube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIntl } from 'react-intl';
import { useResponsive } from '@/hooks/use-responsive';
import { useCurrentProjectId } from '@/lib/contexts/project-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// 搜索结果类型定义
interface SearchResult {
  id: string;
  title: string;
  type: 'document' | 'test-case';
  description?: string;
  content?: string;
  lastModified: string;
  author?: string;
  tags?: string[];
  kind?: string;
  status?: string;
  priority?: string;
}

export default function SearchPage() {
  const intl = useIntl();
  const { isMobile, isTablet } = useResponsive();
  const currentProjectId = useCurrentProjectId();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  // 获取类型的翻译标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'test-case':
        return t('search.types.testCase');
      case 'document':
        return t('search.types.document');
      case 'chat':
        return t('search.types.chat');
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test-case':
        return <TestTube className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'test-case':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'document':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // 搜索文档
  const searchDocuments = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!currentProjectId) return [];

    try {
      const params = new URLSearchParams({
        projectId: currentProjectId,
        search: query,
        limit: '50'
      });

      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Failed to search documents');

      const data = await response.json();
      return (data.documents || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        type: 'document' as const,
        description: doc.content?.substring(0, 200) + (doc.content?.length > 200 ? '...' : ''),
        content: doc.content,
        lastModified: new Date(doc.updatedAt).toLocaleDateString(),
        kind: doc.kind,
        tags: doc.kind ? [doc.kind] : []
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }, [currentProjectId]);

  // 搜索测试用例
  const searchTestCases = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!currentProjectId) return [];

    try {
      const params = new URLSearchParams({
        projectId: currentProjectId,
        search: query,
        limit: '50'
      });

      const response = await fetch(`/api/test-case?${params}`);
      if (!response.ok) throw new Error('Failed to search test cases');

      const data = await response.json();
      return (data.testCases || []).map((testCase: any) => ({
        id: testCase.id,
        title: testCase.name,
        type: 'test-case' as const,
        description: testCase.description || '',
        lastModified: new Date(testCase.updatedAt).toLocaleDateString(),
        status: testCase.status,
        priority: testCase.priority,
        tags: [testCase.status, testCase.priority].filter(Boolean)
      }));
    } catch (error) {
      console.error('Error searching test cases:', error);
      return [];
    }
  }, [currentProjectId]);

  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error(t('search.emptyQuery'));
      return;
    }

    if (!currentProjectId) {
      toast.error(t('search.noProject'));
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results: SearchResult[] = [];

      // 搜索文档和测试用例
      const documentResults = await searchDocuments(searchQuery);
      results.push(...documentResults);

      const testCaseResults = await searchTestCases(searchQuery);
      results.push(...testCaseResults);

      // 按最后修改时间排序
      results.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error(t('search.error'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentProjectId, searchDocuments, searchTestCases, t]);

  // 处理结果点击
  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.type === 'document') {
      router.push(`/documents?id=${result.id}`);
    } else if (result.type === 'test-case') {
      router.push(`/test-case?id=${result.id}`);
    }
  }, [router]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('search.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t('search.subtitle')}
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card className="dark:bg-zinc-900/60">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 sm:h-9"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="flex-1 sm:flex-none h-10 sm:h-9"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {t('search.button')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* 搜索结果 */}
      {hasSearched && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">{t('search.results')}</h2>
            <span className="text-sm text-muted-foreground">
              {t('search.resultsCount', { count: searchResults.length })}
            </span>
          </div>

          {isLoading ? (
            <Card className="dark:bg-zinc-900/60">
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>{t('search.searching')}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            searchResults.map((result) => (
              <Card
                key={result.id}
                className="hover:shadow-md transition-shadow cursor-pointer dark:bg-zinc-900/60"
                onClick={() => handleResultClick(result)}
              >
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <CardTitle className="text-base sm:text-lg break-words">
                            {result.title}
                          </CardTitle>
                          <Badge className={`${getTypeColor(result.type)} flex-shrink-0`}>
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                      <Clock className="w-4 h-4" />
                      <span className="whitespace-nowrap">{result.lastModified}</span>
                    </div>
                  </div>
                  {result.description && (
                    <CardDescription className="mt-2 text-sm sm:text-base">
                      {result.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {result.tags && result.tags.length > 0 && (
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="flex flex-wrap gap-1">
                      {result.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* 空状态 */}
      {hasSearched && !isLoading && searchResults.length === 0 && (
        <Card className="dark:bg-zinc-900/60">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('search.noResults')}</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                {t('search.noResultsDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 初始状态 */}
      {!hasSearched && (
        <Card className="dark:bg-zinc-900/60">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('search.welcome')}</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                {t('search.welcomeDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
