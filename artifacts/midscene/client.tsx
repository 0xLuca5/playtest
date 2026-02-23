import { Artifact } from '@/components/chat/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon } from '@/components/chat/icons';
import { TestingEditor } from '@/components/chat/testing-editor';
import { DocumentSkeleton } from '@/components/chat/document-skeleton';
import { toast } from 'sonner';
import { MIDSCENE_REPORT, MidsceneReportType } from '@/artifacts/types';

interface MidsceneMetadata {
  // 可以添加特定于测试的元数据
  lastRunTimestamp?: number;
}

export const midsceneArtifact = new Artifact<MidsceneReportType, MidsceneMetadata>({
  kind: MIDSCENE_REPORT,
  description: '用于执行网页测试并生成测试报告',
  
  initialize: async ({ setMetadata }) => {
    setMetadata({
      lastRunTimestamp: Date.now(),
    });
  },
  
  onStreamPart: ({ streamPart, setArtifact }) => {
    console.log('midsceneArtifact streamPart', streamPart);

    // AI SDK V5: 处理 midscene 增量数据
    if (streamPart.type === 'data-midscene-delta') {
      console.log("==============data-midscene-delta=================");
      console.log(streamPart);
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: JSON.stringify(streamPart.data),
        // 只有在流式传输状态下才自动显示，避免历史数据加载时自动打开
        isVisible: draftArtifact.status === 'streaming' ? true : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }

    // AI SDK V5: 处理ID消息
    if (streamPart.type === 'data-id') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        documentId: streamPart.data as string,
        status: 'streaming',
      }));
    }

    // AI SDK V5: 处理标题消息
    if (streamPart.type === 'data-title') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        title: streamPart.data as string,
        status: 'streaming',
      }));
    }

    // AI SDK V5: 处理类型消息
    if (streamPart.type === 'data-kind') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        kind: streamPart.data as MidsceneReportType,
        status: 'streaming',
      }));
    }

    // AI SDK V5: 处理清除消息
    if (streamPart.type === 'data-clear') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: '',
        status: 'streaming',
      }));
    }

    // AI SDK V5: 处理完成消息
    if (streamPart.type === 'data-finish') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        status: 'idle',
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
  }) => {
    console.log('testingArtifact content', content);
    if (isLoading) {
      return <DocumentSkeleton artifactKind={MIDSCENE_REPORT} />;
    }
    
    // 如果内容为空或很短且正在流式传输，显示骨架屏
    if ((!content || content.length < 50) && status === 'streaming') {
      return <DocumentSkeleton artifactKind={MIDSCENE_REPORT} />;
    }
    
    return (
      <TestingEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={isCurrentVersion}
        saveContent={onSaveContent}
        status={status}
        mode={mode}
        getDocumentContentById={getDocumentContentById}
        isLoading={isLoading}
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
      description: '复制测试报告',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('测试报告已复制到剪贴板！');
      },
    },
  ],
  
  toolbar: [
    {
      icon: <RedoIcon size={20} />,
      description: '点击立即重新运行测试',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: '请使用相同的URL和YAML重新运行测试',
        });
      },
    },
  ],
}); 