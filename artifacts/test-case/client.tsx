import { Artifact } from '@/components/chat/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon, ShareIcon } from '@/components/chat/icons';
import { TestCaseViewer } from '@/components/chat/test-case-viewer';
import { DocumentSkeleton } from '@/components/chat/document-skeleton';
import { toast } from 'sonner';
import { TEST_CASE_ARTIFACT, TestCaseArtifactType } from '@/artifacts/types';
import { useState, useEffect } from 'react';
import { useProject } from '@/lib/contexts/project-context';

interface TestCaseMetadata {
  testCaseId?: string;
  createdAt?: number;
  documentId?: string; // 添加documentId到metadata中
}

// 动态测试用例内容组件
function DynamicTestCaseContent({
  content,
  currentVersionIndex,
  isCurrentVersion,
  saveContent,
  status,
  mode,
  getDocumentContentById,
  isLoading,
  metadata,
}: {
  content: string;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  saveContent: (content: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  mode: 'edit' | 'diff';
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
  metadata?: TestCaseMetadata;
}) {
  const { currentProject } = useProject();
  const [testCaseData, setTestCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 优先从 metadata.documentId 获取测试用例ID，这是最可靠的来源
    let testCaseId = metadata?.documentId;
    let shouldFetchFromAPI = true;

    // 如果 metadata 中没有，尝试从 content 解析
    if (!testCaseId && content) {
      try {
        const parsed = JSON.parse(content);

        // 提取测试用例ID
        if (parsed.testCaseId) {
          testCaseId = parsed.testCaseId;
        } else if (parsed.id) {
          testCaseId = parsed.id;
        }

        // 如果 content 中已经有完整的测试用例数据，可以直接使用
        if (parsed.testCase && parsed.status === 'loaded') {
          setTestCaseData(parsed);
          shouldFetchFromAPI = false;
        }
      } catch (e) {
        console.error('解析content失败:', e);
      }
    }

    if (testCaseId && testCaseId !== 'init' && shouldFetchFromAPI) {
      // 总是从测试用例API获取最新数据
      setLoading(true);
      setError(null);

      fetch(`/api/test-case/by-id?id=${testCaseId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`无法获取测试用例信息: ${response.status}`);
          }
          return response.json();
        })
        .then(testCase => {
          const formattedData = {
            testCaseId: testCase.id,
            testCase: testCase,
            status: 'loaded'
          };
          setTestCaseData(formattedData);
          // 更新content以便保存
          saveContent(JSON.stringify(formattedData), false);
        })
        .catch(err => {
          console.error('获取测试用例失败:', err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!testCaseId || testCaseId === 'init') {
      // 如果是新创建的情况，显示加载状态而不是错误
      if (status === 'streaming') {
        setLoading(true);
        setError(null);
      } else {
        setError('未找到测试用例ID');
      }
    }
  }, [content, metadata, status]); // 添加 status 依赖

  // 如果正在加载中，显示骨架屏（但如果已有数据且在streaming，则显示数据）
  if ((isLoading || loading) || (status === 'streaming' && !testCaseData)) {
    return <DocumentSkeleton artifactKind={TEST_CASE_ARTIFACT} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!testCaseData) {
    return <DocumentSkeleton artifactKind={TEST_CASE_ARTIFACT} />;
  }
  return (
    <TestCaseViewer
      content={JSON.stringify(testCaseData)}
      currentVersionIndex={currentVersionIndex}
      isCurrentVersion={isCurrentVersion}
      saveContent={saveContent}
      status={status}
      mode={mode}
      getDocumentContentById={getDocumentContentById}
      isLoading={false}
    />
  );
}

export const testCaseArtifact = new Artifact<TestCaseArtifactType, TestCaseMetadata>({
  kind: TEST_CASE_ARTIFACT,
  description: '用于显示和管理测试用例详情',
  
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      createdAt: Date.now(),
      documentId: documentId, // 保存documentId到metadata中
    });
  },

  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    // AI SDK V5: 处理测试用例增量数据
    if (streamPart.type === 'data-test-case-delta') {
      const contentData = JSON.stringify(streamPart.data);

      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: contentData,
        // 只有在流式传输状态下才自动显示，避免历史数据加载时自动打开
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
        status: 'streaming', // 保持 streaming 状态，等待 finish 事件
      }));
    }

    // AI SDK V5: 处理ID消息
    if (streamPart.type === 'data-id') {
      const documentId = streamPart.data as string;

      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        documentId: documentId,
        status: 'streaming',
        // 只在流式传输时设置可见性，避免历史数据加载时自动打开
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
      }));

      // 同时更新 metadata 中的 documentId
      setMetadata((metadata) => ({
        ...metadata,
        documentId: documentId,
      }));
    }

    // AI SDK V5: 处理标题消息
    if (streamPart.type === 'data-title') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        title: streamPart.data as string,
        status: 'streaming',
        // 只在流式传输时设置可见性
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
      }));
    }

    // AI SDK V5: 处理类型消息
    if (streamPart.type === 'data-kind') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        kind: streamPart.data as TestCaseArtifactType,
        status: 'streaming',
        // 只在流式传输时设置可见性
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
      }));
    }

    // AI SDK V5: 处理清除消息
    if (streamPart.type === 'data-clear') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: '',
        status: 'streaming',
        // 只在流式传输时设置可见性
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
      }));
    }

    // AI SDK V5: 处理完成消息
    if (streamPart.type === 'data-finish') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        status: 'idle',
        // 完成时保持当前可见性状态，不强制显示
        isVisible: draftArtifact.isVisible,
      }));
    }
  },
  
  content: ({
    content,
    currentVersionIndex,
    isCurrentVersion,
    onSaveContent,
    status,
    mode,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    return (
      <DynamicTestCaseContent
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={isCurrentVersion}
        saveContent={onSaveContent}
        status={status}
        mode={mode}
        getDocumentContentById={getDocumentContentById}
        isLoading={isLoading}
        metadata={metadata}
      />
    );
  },
  
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: '查看上一版本',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: '查看下一版本',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: '复制测试用例链接',
      onClick: ({ content }) => {
        try {
          const contentObj = JSON.parse(content);
          const testCaseId = contentObj.testCaseId;
          if (testCaseId) {
            const url = `${window.location.origin}/test-case/${testCaseId}`;
            navigator.clipboard.writeText(url);
            toast.success('测试用例链接已复制到剪贴板！');
          } else {
            toast.error('无法获取测试用例ID');
          }
        } catch (error) {
          console.error('复制链接失败:', error);
          toast.error('复制链接失败');
        }
      },
    },
    {
      icon: <ShareIcon size={18} />,
      description: '在新标签页中打开',
      onClick: ({ content }) => {
        try {
          const contentObj = JSON.parse(content);
          const testCaseId = contentObj.testCaseId;
          if (testCaseId) {
            const url = `/test-case/${testCaseId}`;
            window.open(url, '_blank');
          } else {
            toast.error('无法获取测试用例ID');
          }
        } catch (error) {
          console.error('打开链接失败:', error);
          toast.error('打开链接失败');
        }
      },
    },
  ],
  
  toolbar: [
    {
      icon: <RedoIcon size={20} />,
      description: '刷新测试用例数据',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '请刷新当前测试用例的数据',
            },
          ],
        });
      },
    },
  ],
});
