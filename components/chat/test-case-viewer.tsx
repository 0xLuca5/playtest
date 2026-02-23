'use client';

import { useState, useEffect } from 'react';
import { LoaderIcon, WarningIcon } from '@/components/chat/icons';
import { TestCaseLayout } from '@/components/chat/test-case-layout';
import { cn } from '@/lib/utils';

interface TestCaseViewerProps {
  content: string;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  saveContent: (content: string, debounce: boolean) => void;
  mode: 'edit' | 'diff';
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
}

interface TestCase {
  testCaseId: string; // 添加testCaseId字段
  id?: string; // 保持向后兼容
  name: string;
  description: string;
  preconditions?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'work-in-progress' | 'active' | 'deprecated' | 'draft';
  weight: 'high' | 'medium' | 'low';
  format: 'classic' | 'bdd' | 'exploratory';
  nature: 'functional' | 'non-functional' | 'performance' | 'security' | 'usability';
  type: 'regression' | 'smoke' | 'integration' | 'unit' | 'e2e' | 'performance';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author?: string;
  modifier?: string;
  executionTime?: number;
  lastRun?: string;
  steps?: any[]; // 添加steps字段
  relatedRequirements?: any[]; // 添加relatedRequirements字段
  datasets?: any[]; // 添加datasets字段
  knownIssues?: any[]; // 添加knownIssues字段
}

interface ParsedContent {
  testCaseId: string;
  testCase?: TestCase;
  status: 'loading' | 'loaded' | 'error';
  message?: string;
  error?: string;
}

// 解析内容
function parseContent(content: string): ParsedContent | null {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);

    // 检查是否是直接的测试用例数据格式（从dataStream发送的格式）
    if (parsed.testCaseId && parsed.name && !parsed.testCase) {
      return {
        testCaseId: parsed.testCaseId,
        testCase: parsed, // 整个parsed对象就是测试用例数据
        status: 'loaded'
      };
    }

    // 检查是否是包装过的格式
    if (parsed.testCaseId && parsed.testCase) {
      return parsed as ParsedContent;
    }

    // 如果都不匹配，返回错误
    console.error('未知的测试用例数据格式:', parsed);
    return {
      testCaseId: parsed.testCaseId || '',
      status: 'error',
      message: '未知的数据格式'
    };

  } catch (error) {
    console.error('解析测试用例内容失败:', error);

    // 如果JSON解析失败，可能是Markdown格式的错误信息
    if (content.includes('# 错误')) {
      return {
        testCaseId: '',
        status: 'error',
        message: '解析测试用例数据失败'
      };
    }

    return null;
  }
}

// 这些常量已移动到TestCaseLayout组件中

export function TestCaseViewer({
  content,
  status,
  isLoading,
}: TestCaseViewerProps) {
  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);

  useEffect(() => {
    if (content) {
      const parsed = parseContent(content);
      setParsedContent(parsed);
    }
  }, [content]);

  // 如果正在加载且没有解析到数据，显示加载状态
  if ((isLoading || status === 'streaming') && !parsedContent) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div className="text-sm text-muted-foreground">加载测试用例数据...</div>
        </div>
      </div>
    );
  }

  // 如果解析失败
  if (!parsedContent) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
          <WarningIcon size={40} />
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            无法解析测试用例数据
          </p>
          <p className="text-sm text-muted-foreground">
            请检查数据格式是否正确
          </p>
        </div>
      </div>
    );
  }

  // 如果是错误状态
  if (parsedContent.status === 'error') {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
          <WarningIcon size={40} />
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {parsedContent.message || '加载测试用例失败'}
          </p>
          {parsedContent.error && (
            <p className="text-sm text-muted-foreground">
              错误详情: {parsedContent.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 如果正在加载
  if (parsedContent.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div className="text-sm text-muted-foreground">
            {parsedContent.message || '正在加载测试用例数据...'}
          </div>
        </div>
      </div>
    );
  }

  const testCase = parsedContent.testCase;

  if (!testCase) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
          <WarningIcon size={40} />
          <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            测试用例数据不完整
          </p>
        </div>
      </div>
    );
  }

  // 确保 testCase 有必需的字段
  const normalizedTestCase = {
    ...testCase,
    id: testCase.id || testCase.testCaseId || 'unknown',
    steps: testCase.steps || [],
    testRuns: (testCase as any).testRuns || [],
    relatedRequirements: (testCase as any).relatedRequirements || [],
    datasets: (testCase as any).datasets || [],
    knownIssues: (testCase as any).knownIssues || []
  } as any;

  // 使用新的TestCaseLayout组件
  return (
    <TestCaseLayout testCase={normalizedTestCase} />
  );
}
