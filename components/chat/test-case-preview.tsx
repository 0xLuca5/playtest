'use client';

import {
  memo,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useArtifact } from '@/hooks/use-artifact';
import { FullscreenIcon, LoaderIcon, FileIcon } from '@/components/chat/icons';
import { cn } from '@/lib/utils';
import { DocumentToolCall, DocumentToolResult } from '@/components/chat/document';
import equal from 'fast-deep-equal';
import { TEST_CASE_ARTIFACT } from '@/artifacts/types';
import { useI18n } from '@/hooks/use-i18n';

interface TestCasePreviewProps {
  isReadonly: boolean;
  result?: any;
  args?: any;
}

export function TestCasePreview({
  isReadonly,
  result,
  args,
}: TestCasePreviewProps) {
  const { artifact, setArtifact } = useArtifact();
  const { t } = useI18n();
  const hitboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (artifact.documentId && boundingBox) {
      setArtifact((artifact) => ({
        ...artifact,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    }
  }, [artifact.documentId, setArtifact]);

  // 如果artifact已经可见，显示工具结果
  if (artifact.isVisible) {
    if (result) {
      return (
        <DocumentToolResult
          type="create"
          result={{
            id: result.id || '',
            title: result.title || t('testCase.testCase'),
            kind: result.kind || TEST_CASE_ARTIFACT
          }}
          isReadonly={isReadonly}
        />
      );
    }

    if (args) {
      return (
        <DocumentToolCall
          type="create"
          args={{ title: args.name || args.title || t('testCase.newTestCase') }}
          isReadonly={isReadonly}
        />
      );
    }
  }

  // 显示测试用例预览
  // 处理不同格式的 result 数据
  let testCaseData = result || args;

  // 如果 result 是字符串，尝试解析为 JSON
  if (typeof testCaseData === 'string') {
    try {
      testCaseData = JSON.parse(testCaseData);
    } catch (error) {
      console.warn('Failed to parse result as JSON:', error);
      // 如果解析失败，保持原始字符串，后续逻辑会处理
    }
  }

  // 标准工具消息格式：result 直接包含测试用例数据
  // 确保我们有有效的测试用例数据
  const title = testCaseData?.title || testCaseData?.name || t('testCase.testCase');
  const testCaseId = testCaseData?.testCaseId || testCaseData?.id;
  const isStreaming = artifact.status === 'streaming';

  console.log('🔍 [TestCasePreview] Data extraction:', {
    hasResult: !!result,
    hasArgs: !!args,
    testCaseId,
    title,
    dataType: typeof testCaseData,
    isStreaming
  });

  return (
    <div className="relative w-full cursor-pointer">
      <HitboxLayer
        hitboxRef={hitboxRef}
        result={result}
        setArtifact={setArtifact}
        isStreaming={isStreaming}
      />
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-800/50 transition-all duration-300 overflow-hidden group hover:-translate-y-0.5">
        <TestCaseHeader
          title={title}
          testCaseId={testCaseId}
          isStreaming={isStreaming}
        />
        <TestCaseContent testCase={testCaseData} isStreaming={isStreaming} />
      </div>
    </div>
  );
}

const PureHitboxLayer = ({
  hitboxRef,
  result,
  setArtifact,
  isStreaming,
}: {
  hitboxRef: React.RefObject<HTMLDivElement>;
  result: any;
  setArtifact: (
    updaterFn: any | ((currentArtifact: any) => any),
  ) => void;
  isStreaming: boolean;
}) => {
  const { t } = useI18n();
  const [isClicking, setIsClicking] = useState(false);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      // 防止重复点击
      if (isClicking) {
        console.log(t('testCase.clickTooFast'));
        return;
      }

      // 检查是否正在流式传输
      setArtifact((artifact: any) => {
        if (artifact.status === 'streaming') {
          console.log(t('testCase.generatingPleaseWait'));
          return artifact; // 不做任何改变
        }

        // 检查是否有必要的数据
        const testCaseId = result?.testCaseId || result?.id;
        if (!testCaseId) {
          console.warn(t('testCase.noTestCaseIdFound'));
          return artifact;
        }

        setIsClicking(true);

        const boundingBox = event.currentTarget.getBoundingClientRect();
        console.log("TestCase result:", result);
        console.log("Using testCaseId for artifact:", testCaseId);

        // 500ms后重置点击状态
        setTimeout(() => {
          setIsClicking(false);
        }, 500);

        return {
          ...artifact,
          title: result?.title || result?.name || t('testCase.testCase'),
          documentId: testCaseId, // 使用testCaseId而不是文档ID
          kind: result?.kind || TEST_CASE_ARTIFACT,
          isVisible: true,
          boundingBox: {
            left: boundingBox.x,
            top: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
          },
        };
      });
    },
    [setArtifact, result, isClicking],
  );

  // 检查是否可以点击（测试用例完全生成且有ID，且不在流式传输中）
  const testCaseId = result?.testCaseId || result?.id;
  const canClick = !!testCaseId && !isClicking && !isStreaming;

  return (
    <div
      className={cn(
        "size-full absolute top-0 left-0 rounded-xl z-10 transition-all duration-200",
        canClick ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" : "cursor-not-allowed"
      )}
      ref={hitboxRef}
      onClick={canClick ? handleClick : undefined}
      role="presentation"
      aria-hidden="true"
    >
      <div className="w-full p-4 flex justify-end items-start">
        <div className={cn(
          "p-2.5 rounded-lg backdrop-blur-sm transition-all duration-200 border",
          canClick
            ? "bg-white/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-600 hover:bg-white dark:hover:bg-zinc-700 hover:shadow-md hover:scale-105 text-zinc-600 dark:text-zinc-300"
            : "opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500"
        )}>
          <FullscreenIcon size={16} />
        </div>
      </div>
    </div>
  );
};

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  return true;
});

const TestCaseHeader = ({
  title,
  testCaseId,
  isStreaming,
}: {
  title: string;
  testCaseId?: string;
  isStreaming: boolean;
}) => (
  <div className="px-6 py-5 bg-gradient-to-br from-zinc-50 via-zinc-50 to-zinc-100 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-850 border-b border-zinc-200 dark:border-zinc-700 relative overflow-hidden">
    {/* 装饰性背景元素 */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50/30 to-transparent dark:from-blue-900/10 rounded-full -translate-y-16 translate-x-16"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-50/20 to-transparent dark:from-purple-900/5 rounded-full translate-y-12 -translate-x-12"></div>

    <div className="flex flex-row items-start sm:items-center gap-4 relative z-10">
      <div className="flex-shrink-0 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
        {isStreaming ? (
          <div className="animate-spin text-blue-500 dark:text-blue-400">
            <LoaderIcon />
          </div>
        ) : (
          <div className="text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
            <FileIcon />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300">
          {title}
        </div>
        {testCaseId && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200/80 dark:bg-zinc-700/80 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-block border border-zinc-300/50 dark:border-zinc-600/50 shadow-sm">
            <span className="text-zinc-400 dark:text-zinc-500">ID:</span> {testCaseId}
          </div>
        )}
      </div>
    </div>
  </div>
);

const TestCaseContent = ({ testCase, isStreaming }: { testCase: any; isStreaming?: boolean }) => {
  const { t } = useI18n();

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'archived':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300';
    }
  };

  const priority = testCase?.priority || testCase?.testCase?.priority || 'medium';
  const status = testCase?.status || testCase?.testCase?.status || 'draft';
  const type = testCase?.type || testCase?.testCase?.type || 'functional';
  const nature = testCase?.nature || testCase?.testCase?.nature || 'functional';

  return (
    <div className="h-[300px] overflow-y-auto bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/80 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent">
      <div className="p-6 space-y-6">
        {/* Description Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              {t('testCase.description')}
            </div>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed p-4 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800 dark:to-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm backdrop-blur-sm">
            {testCase?.description || testCase?.testCase?.description || t('testCase.noDescription')}
          </div>
        </div>

        {/* Properties Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t('testCase.priority')}
                </div>
              </div>
              <div className={cn(
                "text-xs font-semibold px-4 py-2 rounded-full inline-block shadow-sm border transition-all duration-200 hover:scale-105",
                getPriorityColor(priority)
              )}>
                {priority}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t('testCase.status')}
                </div>
              </div>
              <div className={cn(
                "text-xs font-semibold px-4 py-2 rounded-full inline-block shadow-sm border transition-all duration-200 hover:scale-105",
                getStatusColor(status)
              )}>
                {status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-gradient-to-b from-purple-500 to-violet-500 rounded-full"></div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t('testCase.type')}
                </div>
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 p-3 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800 dark:to-zinc-800/50 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm font-medium">
                {type}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t('testCase.nature')}
                </div>
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 p-3 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800 dark:to-zinc-800/50 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm font-medium">
                {nature}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-5 border-t border-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700">
          <div className="flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 bg-gradient-to-r from-zinc-50/50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 rounded-lg p-3 border border-zinc-200/50 dark:border-zinc-700/50">
            <div className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              isStreaming
                ? "bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"
                : "bg-green-500 shadow-lg shadow-green-500/30"
            )}></div>
            <span className="font-medium">
              {isStreaming
                ? t('testCase.generatingClickAfterComplete')
                : t('testCase.clickFullscreenToView')
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TestCasePreview);
