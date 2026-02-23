'use client';

import {
  memo,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArtifactKind, UIArtifact } from '@/components/chat/artifact';
import { FileIcon, FullscreenIcon, ImageIcon, LoaderIcon } from '@/components/chat/icons';
import { cn, fetcher } from '@/lib/utils';
import { Document } from '@/lib/db/schema';
import { InlineDocumentSkeleton } from '@/components/chat/document-skeleton';
import useSWR from 'swr';
import { Editor } from '@/components/chat/text-editor';
import { DocumentToolCall, DocumentToolResult } from '@/components/chat/document';
import { CodeEditor } from '@/components/chat/code-editor';
import { useArtifact } from '@/hooks/use-artifact';
import { SpreadsheetEditor } from '@/components/chat/sheet-editor';
import { ImageEditor } from '@/components/chat/image-editor';
import { DocumentSkeleton } from '@/components/chat/document-skeleton';
import { MIDSCENE_REPORT } from '@/artifacts/types';
import { useTranslation } from '@/hooks/use-i18n';

interface TestingPreviewProps {
  isReadonly: boolean;
  result?: any;
  args?: any;
}

const ensureApiPrefix = (url: string) => {
  if (!url) return '';
  if (url.startsWith('/api/report/')) return url;
  if (url.startsWith('/report/')) return '/api' + url;
  return url;
};

export function TestingPreview({
  isReadonly,
  result,
  args,
}: TestingPreviewProps) {
  const { t } = useTranslation();

  // 工具函数提前
  function parseJson(data: any) {
    if (!data) return {};
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return data;
  }
  function extractDetailError(content: string): string | null {
    if (!content) return null;
    // 匹配 ## 详细错误信息 下的 ``` 代码块
    const match = content.match(/## 详细错误信息\s*```[\s\S]*?([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }
  // 先定义docData、detailError、fallbackError、errorToShow
  const { data: legacyDocuments } = useSWR<Array<Document>>(
    result && result.id ? `/api/document?id=${result.id}` : null, fetcher
  );
  const docData = legacyDocuments && legacyDocuments[0] ? parseJson(legacyDocuments[0].content) : null;
  const detailError = docData && docData.content ? extractDetailError(docData.content) : null;
  const fallbackError = docData && docData.result ? (docData.result.match(/- 错误信息:([\s\S]*?)(?:\n-|$)/)?.[1]?.trim() || '') : '';
  const errorToShow = detailError || fallbackError || (docData && docData.error) || '';

  const { artifact, setArtifact } = useArtifact();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hitboxRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const reportUrlRef = useRef<string>("");

  // 只在需要时获取文档数据，避免使用undefined的ID
  const { data: fetchedDocuments, isLoading: isDocumentsFetching } = useSWR<
    Array<Document>
  >(result && result.id ? `/api/document?id=${result.id}` : null, fetcher);

  const previewDocument = useMemo(() => fetchedDocuments?.[0], [fetchedDocuments]);

  // 提取reportUri，兼容扁平和tool-invocation结构
  function extractReportUri(data: any): string {
    if (!data) return '';

    // 优先查找 reportUri（统一字段名）
    if (data.reportUri) return data.reportUri;

    // 兼容旧的字段名
    if (data.report_uri) return data.report_uri;
    if (data.reportUrl) return data.reportUrl;

    // 兼容 tool-invocation 结构
    if (Array.isArray(data.parts) && data.parts.length > 0) {
      const part = data.parts[0];
      if (part.toolInvocation && part.toolInvocation.result) {
        const result = part.toolInvocation.result;
        if (result.reportUri) return result.reportUri;
        if (result.report_uri) return result.report_uri;
        if (result.reportUrl) return result.reportUrl;
      }
    }

    // 兼容 tool_calls 结构
    if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
      for (const call of data.tool_calls) {
        if (call.function && call.function.arguments) {
          try {
            const args = typeof call.function.arguments === 'string'
              ? JSON.parse(call.function.arguments)
              : call.function.arguments;
            if (args && args.reportUri) return args.reportUri;
            if (args && args.report_uri) return args.report_uri;
            if (args && args.reportUrl) return args.reportUrl;
          } catch {}
        }
      }
    }

    return '';
  }

  const tryGetReportUrl = useCallback((previewDoc?: Document) => {
    if (!result) return;

    console.log('TestingPreview: raw result =', result);
    const data = parseJson(result);
    console.log('TestingPreview: parsed result =', data);

    let url = extractReportUri(data);
    if (!url && previewDoc && previewDoc.content) {
      console.log('TestingPreview: raw previewDoc.content =', previewDoc.content);
      const docData = parseJson(previewDoc.content);
      console.log('TestingPreview: parsed previewDoc.content =', docData);
      url = extractReportUri(docData);
    }
    console.log('TestingPreview: final url =', url);
    const formattedUrl = url && !url.startsWith('/') ? `/${url}` : url;
    const processedUrl = formattedUrl && formattedUrl.startsWith('/api') 
      ? formattedUrl.replace('/api', '') 
      : formattedUrl;
    reportUrlRef.current = processedUrl;
    setReportUrl(ensureApiPrefix(processedUrl));
    // 新增：如果没有报告URL且明确失败，立即结束加载并显示错误卡片
    if (!processedUrl && result) {
      const data = parseJson(result);
      if (data.testResult === '失败' || errorToShow) {
      setIsLoading(false);
        setLoadError('测试失败');
      }
    }
  }, [result, errorToShow]);

  // 处理iframe加载完成事件
  const handleIframeLoad = useCallback(() => {
    console.log('TestingPreview: iframe加载完成');
    setIsLoading(false);
    setLoadError(null);
    retryCountRef.current = 0;
    
    // 尝试调整iframe内容以适应容器
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // 尝试向iframe注入样式，使内容适应容器
        const iframeDoc = iframeRef.current.contentWindow.document;
        
        // 创建样式元素
        const styleEl = iframeDoc.createElement('style');
        styleEl.textContent = `
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100% !important;
            height: 100% !important;
          }
          .page-container {
            overflow: hidden !important;
            height: 100% !important;
          }
          .page-content {
            height: auto !important;
            overflow: visible !important;
          }
          /* 确保内容区域填充整个空间 */
          #root {
            height: 100% !important;
            overflow: hidden !important;
          }
        `;
        
        // 将样式添加到iframe的head中
        iframeDoc.head.appendChild(styleEl);
        
        console.log('TestingPreview: 向iframe注入了适应容器的样式');
      }
    } catch (error) {
      console.error('TestingPreview: 调整iframe内容失败:', error);
    }
  }, []);
  
  // 添加一个useEffect来处理iframe内容的ResizeObserver
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    
    if (!isLoading && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentWindow.document;
        
        // 创建ResizeObserver
        resizeObserver = new ResizeObserver(() => {
          try {
            // 动态调整iframe高度
            if (iframeRef.current && iframeRef.current.contentWindow) {
              const contentHeight = iframeRef.current.contentWindow.document.body.scrollHeight;
              console.log('TestingPreview: 内容高度变化:', contentHeight);
            }
          } catch (error) {
            console.error('TestingPreview: ResizeObserver 错误:', error);
          }
        });
        
        // 观察iframe文档的body元素
        resizeObserver.observe(iframeDoc.body);
        console.log('TestingPreview: 添加了ResizeObserver');
      } catch (error) {
        console.error('TestingPreview: 设置ResizeObserver失败:', error);
      }
    }
    
    // 清理函数
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        console.log('TestingPreview: 清理了ResizeObserver');
      }
    };
  }, [isLoading]);

  // 处理iframe加载错误
  const handleIframeError = useCallback((e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error('TestingPreview: iframe加载失败', e);
    
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      console.log(`TestingPreview: 尝试重新加载，第${retryCountRef.current}次`);
      
      // 简单重试当前URL，添加随机参数避免缓存
      setTimeout(() => {
        if (iframeRef.current && reportUrlRef.current) {
          iframeRef.current.src = ensureApiPrefix(reportUrlRef.current);
        }
      }, 1000);
    } else {
      setIsLoading(false);
      setLoadError('报告加载失败，请刷新页面重试');
    }
  }, [maxRetries]);

  // 当reportUrl更新时，重置iframe的src
  useEffect(() => {
    if (reportUrl && iframeRef.current) {
      console.log('TestingPreview: reportUrl更新，重置iframe src:', reportUrl);
      setIsLoading(true);
      setLoadError(null);
      retryCountRef.current = 0;
      
      // 添加随机参数避免缓存
      if (iframeRef.current) {
        iframeRef.current.src = ensureApiPrefix(reportUrl);
      }
    }
  }, [reportUrl]);

  useEffect(() => {
    // 如果有result，表示测试已完成
    if (result) {
      console.log('TestingPreview: 检测到result，开始尝试获取报告URL');
      tryGetReportUrl(previewDocument);
    }
  }, [result, tryGetReportUrl, previewDocument]);

  // 当previewDocument加载完成后，如果还没有reportUrl，再次尝试获取
  useEffect(() => {
    if (previewDocument && !reportUrl && result) {
      console.log('TestingPreview: previewDocument加载完成，尝试从中提取报告URL');
      tryGetReportUrl(previewDocument);
    }
  }, [previewDocument, reportUrl, result, tryGetReportUrl]);

  // 添加一个超时处理，如果报告长时间未加载完成，显示错误信息
  useEffect(() => {
    if (isLoading && reportUrl) {
      console.log(`TestingPreview: 报告正在加载中，设置10秒超时检查，URL: ${reportUrl}`);
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.log('TestingPreview: 报告加载超时');
          setLoadError('报告加载超时，请刷新页面重试');
          setIsLoading(false);
        }
      }, 10000); // 10秒超时
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, reportUrl]);

  // 如果有reportUrl但是为空字符串，显示错误信息
  useEffect(() => {
    // 只有检测到明确失败（如testResult为'失败'或errorToShow有内容）时，才设置错误信息
    if (result && !isLoading) {
      const data = parseJson(result);
      if (data.testResult === '失败' || errorToShow) {
        setLoadError('测试失败');
      }
    }
  }, [result, isLoading, errorToShow]);

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (boundingBox) {
      setArtifact((draft) => ({
        ...draft,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    }
  }, [setArtifact]);

  // 如果artifact已经可见，则显示工具调用结果
  if (artifact.isVisible) {
    if (result) {
      // 确保result包含必要的属性
      const toolResult = {
        id: result.id || (result.parts?.[0]?.toolInvocation?.result?.id) || "",
        title: result.title || (result.parts?.[0]?.toolInvocation?.result?.title) || t('testCase.testReport'),
        kind: result.kind || (result.parts?.[0]?.toolInvocation?.result?.kind) || MIDSCENE_REPORT
      };
      
      return (
        <DocumentToolResult
          type="create"
          result={toolResult}
          isReadonly={isReadonly}
        />
      );
    }

    if (args) {
      // 确保args包含title属性
      const toolArgs = {
        title: args.title || "执行网页测试"
      };
      
      return (
        <DocumentToolCall
          type="create"
          args={toolArgs}
          isReadonly={isReadonly}
        />
      );
    }
  }

  // 如果正在加载或者没有result，显示骨架屏
  if (!result) {
    return <TestingLoadingSkeleton title={args?.title || "执行网页测试中..."} />;
  }

  // 测试已完成，显示测试报告
  return (
    <div className="relative w-full cursor-pointer" ref={hitboxRef}>
      <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
        <div className="flex flex-row items-start sm:items-center gap-3">
          <div className="text-muted-foreground">
            <FileIcon />
          </div>
          <div className="-translate-y-1 sm:translate-y-0 font-medium">
            {result.title || t('testCase.testReport')}
          </div>
        </div>
        <div 
          className="w-8 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 p-1 rounded-md"
          onClick={() => {
            console.log("点击全屏按钮");
            
            // 从result中获取YAML内容
            let yamlContent = '';
            
            // 尝试从result中获取yaml内容
            if (result && result.parts && result.parts[0] && 
                result.parts[0].toolInvocation && 
                result.parts[0].toolInvocation.result) {
              const toolResult = result.parts[0].toolInvocation.result;
              if (toolResult.yaml) {
                yamlContent = toolResult.yaml;
                console.log("从toolInvocation.result.yaml获取YAML内容");
              } else if (toolResult.yamlResult) {
                yamlContent = toolResult.yamlResult;
                console.log("从toolInvocation.result.yamlResult获取YAML内容");
              }
            }
            
            // 如果没有找到yaml，尝试从fetchedDocuments中获取
            if (!yamlContent && fetchedDocuments && fetchedDocuments[0]) {
              try {
                // 尝试解析document内容为JSON
                const docContent = fetchedDocuments[0].content;
                const docObj = JSON.parse(docContent);
                if (docObj.yaml) {
                  yamlContent = docObj.yaml;
                  console.log("从document内容中获取YAML内容");
                } else if (docObj.yamlResult) {
                  yamlContent = docObj.yamlResult;
                  console.log("从document内容中获取yamlResult内容");
                }
              } catch (e) {
                console.log("解析document内容失败，尝试直接从文本中提取YAML");
                // 尝试从文本中提取YAML
                const yamlMatch = fetchedDocuments[0].content.match(/```yaml\s*([\s\S]*?)```/);
                if (yamlMatch && yamlMatch[1]) {
                  yamlContent = yamlMatch[1].trim();
                  console.log("从document文本中提取YAML内容");
                }
              }
            }
            
            // 构造包含 report URL 和 YAML 的 content
            const contentWithReportUrl = JSON.stringify({
              reportUri: ensureApiPrefix(reportUrlRef.current) || '',
              title: result.title || t('testCase.testReport'),
              id: result.id || "",
              kind: result.kind || MIDSCENE_REPORT,
              result: "测试完成",
              yaml: yamlContent || '' // 添加YAML内容
            });

            console.log("传递给testing-editor的内容:", {
              reportUri: ensureApiPrefix(reportUrlRef.current) || '',
              yaml: yamlContent || '(无YAML内容)'
            });
            
            setArtifact((draft) => ({
              ...draft,
              isVisible: true,
              documentId: result.id || "",
              title: result.title || t('testCase.testReport'),
              kind: result.kind || MIDSCENE_REPORT,
              content: contentWithReportUrl // 传递包含 report URL 和 YAML 的 content
            }));
          }}
        >
          <FullscreenIcon />
        </div>
      </div>
      <div className="h-[500px] overflow-hidden border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700">
        {isLoading && (
          <div className="flex items-center justify-center h-full bg-white dark:bg-muted">
            <div className="animate-spin mr-2">
              <LoaderIcon />
            </div>
            <span>{t('testCase.loadingTestReport')}</span>
          </div>
        )}
        
        {/* 统一无报告uri和有uri但测试失败时的布局 */}
        {(reportUrlRef.current === "" || loadError) && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full p-4 overflow-auto">
            <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">测试失败</div>
            <div className="text-sm text-gray-500 mb-4">
              {reportUrlRef.current ? (
                <div>
                  <span>报告URL: </span>
                  <a
                    href={reportUrlRef.current}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {reportUrlRef.current}
                  </a>
                </div>
              ) : (
                <span>报告URL: 未提供</span>
              )}
            </div>
            <div className="w-full border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 rounded overflow-auto max-h-[250px] text-left">
              <h3 className="font-bold mb-2 text-red-700 dark:text-red-400">详细错误信息:</h3>
              <pre className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-400 min-h-[40px]">{errorToShow || '正在加载错误信息...'}</pre>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setIsLoading(true);
                  setLoadError(null);
                  retryCountRef.current = 0;
                  if (reportUrlRef.current) {
                    iframeRef.current.src = ensureApiPrefix(reportUrlRef.current);
                  } else {
                    setIsLoading(false);
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                {t('testCase.retryLoading')}
              </button>
              {reportUrlRef.current && (
                <button
                  onClick={() => {
                    window.open(reportUrlRef.current, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('testCase.viewDetailedReport')}
                </button>
              )}
            </div>
              </div>
            )}
            
        {/* 1. 只要isLoading为true就显示骨架屏 */}
        {isLoading && (
          <div className="w-full">
            <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-center justify-between dark:bg-muted h-[57px] dark:border-zinc-700 border-b-0">
              <div className="flex flex-row items-center gap-3">
                <div className="text-muted-foreground">
                  <div className="animate-spin">
                    <LoaderIcon />
                  </div>
                </div>
                <div className="font-medium">{t('testCase.loadingTestReport')}</div>
              </div>
              <div className="w-8 cursor-not-allowed opacity-50">
                <FullscreenIcon />
              </div>
            </div>
            <div className="border rounded-b-2xl p-8 pt-4 bg-muted border-t-0 dark:border-zinc-700 h-[400px]">
              <DocumentSkeleton artifactKind={MIDSCENE_REPORT} />
            </div>
          </div>
        )}
        {/* 2. 只有当isLoading为false且reportUrl有值且errorToShow有内容时，才显示失败卡片 */}
        {!isLoading && reportUrlRef.current && errorToShow && (
          <div className="flex flex-col items-center justify-center h-full p-4 overflow-auto">
            <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">测试失败</div>
            <div className="text-sm text-gray-500 mb-4">
              报告URL: {reportUrlRef.current}
            </div>
            <div className="w-full border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 rounded overflow-auto max-h-[250px] text-left">
              <h3 className="font-bold mb-2 text-red-700 dark:text-red-400">详细错误信息:</h3>
              <pre className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-400 min-h-[40px]">{errorToShow}</pre>
            </div>
            <button
              onClick={() => {
                setIsLoading(true);
                setLoadError(null);
                retryCountRef.current = 0;
                if (reportUrlRef.current) {
                  iframeRef.current.src = ensureApiPrefix(reportUrlRef.current);
                } else {
                  setIsLoading(false);
                }
              }}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              {t('testCase.retryLoading')}
            </button>
          </div>
        )}
        
        {reportUrlRef.current && !loadError && (
          <iframe
            ref={iframeRef}
            src={ensureApiPrefix(reportUrlRef.current)}
            className={cn(
              "w-full h-full border-none",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={t('testCase.testReport')}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            key={`iframe-${reportUrlRef.current}`} // 添加key确保URL变更时重新渲染iframe
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              overflow: 'hidden',
              display: 'block'
            }}
          />
        )}
        
        {/* 当没有报告URL时，直接显示测试内容 */}
        {!reportUrlRef.current && !isLoading && !loadError && fetchedDocuments && fetchedDocuments[0] && (
          <div className="p-4 overflow-auto h-full">
            <h2 className="text-xl font-bold mb-4">{t('testCase.testReport')}</h2>
            <div className="mb-4">
              <span className="font-semibold">状态: </span>
              <span className="text-red-500">失败</span> 
              <span className="ml-2 text-sm text-gray-500">(无法获取报告URL)</span>
            </div>
            <div className="border p-4 rounded bg-gray-50 dark:bg-zinc-800 overflow-auto max-h-[300px]">
              <pre className="whitespace-pre-wrap text-sm">
                {fetchedDocuments[0].content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TestingLoadingSkeleton = ({ title }: { title?: string }) => (
  <div className="w-full">
    <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-center justify-between dark:bg-muted h-[57px] dark:border-zinc-700 border-b-0">
      <div className="flex flex-row items-center gap-3">
        <div className="text-muted-foreground">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        </div>
        <div className="font-medium">{title || "执行网页测试中..."}</div>
      </div>
      <div className="w-8 cursor-not-allowed opacity-50">
        <FullscreenIcon />
      </div>
    </div>
    <div className="border rounded-b-2xl p-8 pt-4 bg-muted border-t-0 dark:border-zinc-700 h-[400px]">
      <DocumentSkeleton artifactKind={MIDSCENE_REPORT} />
    </div>
  </div>
);

const PureDocumentHeader = ({
  title,
  kind,
  isStreaming,
  onFullscreen,
}: {
  title: string;
  kind: ArtifactKind;
  isStreaming: boolean;
  onFullscreen?: () => void;
}) => (
  <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 dark:border-zinc-700">
    <div className="flex flex-row items-start sm:items-center gap-3">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : kind === 'image' ? (
          <ImageIcon />
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="-translate-y-1 sm:translate-y-0 font-medium">{title}</div>
    </div>
    <div 
      className={`w-8 ${onFullscreen ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 p-1 rounded-md' : ''}`}
      onClick={onFullscreen}
    >
      {onFullscreen && <FullscreenIcon />}
    </div>
  </div>
);

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  if (prevProps.onFullscreen !== nextProps.onFullscreen) return false;

  return true;
});

const DocumentContent = ({ document }: { document: Document }) => {
  const { artifact } = useArtifact();

  const containerClassName = cn(
    'h-[257px] overflow-y-scroll border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700',
    {
      'p-4 sm:px-14 sm:py-16': document.kind === 'text',
      'p-0': document.kind === 'code',
    },
  );

  const commonProps = {
    content: document.content ?? '',
    isCurrentVersion: true,
    currentVersionIndex: 0,
    status: artifact.status,
    saveContent: () => {},
    suggestions: [],
  };

  return (
    <div className={containerClassName}>
      {document.kind === 'text' ? (
        <Editor {...commonProps} onSaveContent={() => {}} />
      ) : document.kind === 'code' ? (
        <div className="flex flex-1 relative w-full">
          <div className="absolute inset-0">
            <CodeEditor {...commonProps} onSaveContent={() => {}} />
          </div>
        </div>
      ) : document.kind === 'sheet' ? (
        <div className="flex flex-1 relative size-full p-4">
          <div className="absolute inset-0">
            <SpreadsheetEditor {...commonProps} />
          </div>
        </div>
      ) : document.kind === 'image' ? (
        <ImageEditor
          title={document.title}
          content={document.content ?? ''}
          isCurrentVersion={true}
          currentVersionIndex={0}
          status={artifact.status}
          isInline={true}
        />
      ) : null}
    </div>
  );
};
