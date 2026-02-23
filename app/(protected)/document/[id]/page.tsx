'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// 导入组件
import { CodeEditor } from '@/components/chat/code-editor';
import { SpreadsheetEditor } from '@/components/chat/sheet-editor';
import { TestingEditor } from '@/components/chat/testing-editor';
import { MIDSCENE_REPORT } from '@/artifacts/types';

// 文档类型定义
interface Document {
  id: string;
  title: string;
  kind: string;
  content: string;
  userId: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// 空的建议数组，用于CodeEditor
const emptySuggestions: any[] = [];

export default function DocumentPage() {
  const intl = useIntl();
  const params = useParams();
  const id = params.id as string;

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/document?id=${id}`);
        
        if (!response.ok) {
          throw new Error(`${t('document.fetchFailed')}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("获取到的文档数据:", data);
        console.log("文档内容:", data?.content);

        // 处理返回的数据是数组的情况
        if (Array.isArray(data) && data.length > 0) {
          console.log("设置文档数据 (数组):", data[0]);
          setDocument(data[0]);
        } else {
          console.log("设置文档数据 (对象):", data);
          setDocument(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('document.fetchFailed'));
        console.error('获取文档失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  // 渲染文档内容
  const renderDocumentContent = () => {
    if (!document) return null;

    switch (document.kind) {
      case 'code':
        return (
          <div className="w-full h-[calc(100vh-120px)]">
            <CodeEditor 
              content={document.content} 
              onSaveContent={(content) => console.log('保存内容', content)} 
              status="idle"
              isCurrentVersion={true}
              currentVersionIndex={0}
              suggestions={emptySuggestions}
            />
          </div>
        );
      case 'sheet':
        return (
          <div className="w-full h-[calc(100vh-120px)]">
            <SpreadsheetEditor 
              content={document.content} 
              saveContent={(content) => console.log('保存内容', content)} 
              status="idle"
              isCurrentVersion={true}
              currentVersionIndex={0}
            />
          </div>
        );
      case MIDSCENE_REPORT:
        return (
          <div className="w-full h-[calc(100vh-120px)]">
            <TestingEditor 
              content={document.content}
              status="idle"
              isCurrentVersion={true}
              currentVersionIndex={0}
              saveContent={(content) => console.log('保存内容', content)}
              mode="edit"
              getDocumentContentById={() => document.content}
              isLoading={false}
            />
          </div>
        );
      case 'text':
        return (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full h-[calc(100vh-120px)] overflow-auto">
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: document.content }} />
          </div>
        );
      case 'image':
        return (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 flex justify-center items-center w-full h-[calc(100vh-120px)]">
            <img
              src={document.content.startsWith('http') ? document.content : `/api/images/${document.id}`}
              alt={document.title}
              className="max-h-full max-w-full object-contain rounded-md shadow-lg"
            />
          </div>
        );
      default:
        return (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full h-[calc(100vh-120px)] flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">{t('document.cannotPreview')}</p>
          </div>
        );
    }
  };

  return (
    <div className="container-fluid w-full h-screen flex flex-col bg-slate-50 dark:bg-zinc-800">
      <div className="flex items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800">
        <Link href="/documents">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('document.backToList')}
          </Button>
        </Link>
        
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : error ? (
          <span className="text-red-500 dark:text-red-400">{error}</span>
        ) : document ? (
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{document.title}</h1>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">{t('document.notFound')}</span>
        )}
      </div>

      <div className="flex-grow overflow-hidden">
        {isLoading ? (
          <div className="bg-white dark:bg-zinc-800 p-6 h-full">
            <div className="animate-pulse space-y-4 h-full">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-[calc(100%-32px)] w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-zinc-800 p-6 text-center h-full flex flex-col items-center justify-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t('document.retry')}</Button>
          </div>
        ) : document ? (
          renderDocumentContent()
        ) : (
          <div className="bg-white dark:bg-zinc-800 p-6 text-center h-full flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">{t('document.notFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
} 