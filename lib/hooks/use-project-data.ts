'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentProjectId } from '@/lib/contexts/project-context';

interface UseProjectDataOptions {
  enabled?: boolean;
  refetchOnProjectChange?: boolean;
}

interface UseProjectDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// 通用的项目数据获取Hook
export function useProjectData<T>(
  fetchFn: (projectId: string) => Promise<T>,
  deps: any[] = [],
  options: UseProjectDataOptions = {}
): UseProjectDataResult<T> {
  const { enabled = true, refetchOnProjectChange = true } = options;
  const currentProjectId = useCurrentProjectId();
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentProjectId || !enabled) {
      setData(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn(currentProjectId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, enabled, fetchFn]);

  // 初始加载和依赖变化时重新获取
  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  // 监听项目切换事件
  useEffect(() => {
    if (!refetchOnProjectChange) return;

    const handleProjectChanged = () => {
      fetchData();
    };

    window.addEventListener('projectChanged', handleProjectChanged);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChanged);
    };
  }, [fetchData, refetchOnProjectChange]);

  return { data, loading, error, refetch: fetchData };
}

// 文件夹数据Hook
export function useFolders(parentId?: string) {
  return useProjectData(
    async (projectId: string) => {
      const response = await fetch(`/api/folders?projectId=${projectId}${parentId ? `&parentId=${parentId}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      const data = await response.json();
      return data.folders || [];
    },
    [parentId]
  );
}

// 测试用例数据Hook
export function useTestCases(folderId?: string) {
  return useProjectData(
    async (projectId: string) => {
      const response = await fetch(`/api/test-cases?projectId=${projectId}${folderId ? `&folderId=${folderId}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch test cases');
      }
      const data = await response.json();
      return data.testCases || [];
    },
    [folderId]
  );
}

// 文档数据Hook
export function useDocuments(options: {
  kind?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: string;
} = {}) {
  const { kind, limit = 20, offset = 0, sortBy = 'createdAt', sortDirection = 'desc' } = options;
  
  return useProjectData(
    async (projectId: string) => {
      const params = new URLSearchParams({
        projectId,
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortDirection,
      });
      
      if (kind) {
        params.append('kind', kind);
      }
      
      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      return data.documents || [];
    },
    [kind, limit, offset, sortBy, sortDirection]
  );
}

// 项目统计数据Hook
export function useProjectStats() {
  return useProjectData(
    async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch project stats');
      }
      const data = await response.json();
      return data.stats;
    }
  );
}

// 通用的项目感知API调用Hook
export function useProjectApi() {
  const currentProjectId = useCurrentProjectId();

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!currentProjectId) {
      throw new Error('No project selected');
    }

    const url = new URL(endpoint, window.location.origin);
    
    // 如果URL中没有projectId参数，自动添加
    if (!url.searchParams.has('projectId')) {
      url.searchParams.set('projectId', currentProjectId);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }, [currentProjectId]);

  return { apiCall, currentProjectId };
}
