import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/hooks/use-i18n';

// 报告链接组件
function ReportLink({ src }: { src: string }) {
  const { t } = useI18n();

  return (
    <div className="my-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
      <span className="text-sm text-blue-600 dark:text-blue-400">
        📊 {t('testCase.testReport')}: <a href={src} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800 dark:hover:text-blue-200">{t('testCase.viewDetailedReport')}</a>
      </span>
    </div>
  );
}

// 专门用于测试用例助手的CodeBlock组件，避免HTML嵌套问题
function TestCaseCodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}) {
  if (!inline) {
    return (
      <code
        {...props}
        className={`block text-sm w-full overflow-x-auto dark:bg-zinc-900 bg-zinc-50 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900 whitespace-pre-wrap break-words`}
      >
        {children}
      </code>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}

const components: Partial<Components> = {
  // @ts-expect-error
  code: TestCaseCodeBlock,
  pre: ({ children }) => <div className="not-prose">{children}</div>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-4" {...props}> 
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    const href = props.href || '#';
    return (
      <a
        className="text-blue-500 hover:text-blue-700 underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
        href={href}
      >
        {children}
      </a>
    );
  },
  img: ({ node, ...props }) => {
    // 简单的img处理器，主要用于处理报告链接
    const src = typeof props.src === 'string' ? props.src : '';
    if (src && src.includes('/report/')) {
      return (
        <ReportLink src={src} />
      );
    }

    // 对于其他图片，使用默认处理
    return (
      <img
        className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 my-2"
        {...props}
        loading="lazy"
      />
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-2xl font-bold mt-8 mb-4" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-xl font-bold mt-6 mb-3" {...props}> 
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
  p: ({ node, children, ...props }) => {
    // 为了避免HTML嵌套问题，统一使用div而不是p标签
    return (
      <div className="mb-3 text-slate-700 dark:text-slate-300 leading-relaxed" {...props}>
        {children}
      </div>
    );
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedTestCaseMarkdown = ({ children }: { children: string }) => {
  // 使用富文本渲染器来处理内容，特别是图片
  const renderRichContent = (content: string) => {
    // 分割内容为段落和图片
    const parts = content.split(/(\!\[([^\]]*)\]\((data:image\/[^)]+)\))/g);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // 检查是否是图片语法
      if (part.startsWith('![') && part.includes('](data:image/')) {
        const match = part.match(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/);
        if (match) {
          const [, alt, src] = match;
          console.log('富文本渲染图片:', { srcPrefix: src?.substring(0, 50) + '...', alt });

          elements.push(
            <div key={i} className="my-4">
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
                loading="lazy"
                onError={(e) => {
                  console.error('富文本图片加载失败:', src?.substring(0, 50) + '...');
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              {alt && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                  {alt}
                </p>
              )}
            </div>
          );
          continue;
        }
      }

      // 处理普通文本内容
      if (part.trim()) {
        // 使用简单的Markdown渲染处理其他内容
        elements.push(
          <div key={i}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
              {part}
            </ReactMarkdown>
            </div>
        );
      }
    }

    return elements;
  };

  const richElements = renderRichContent(children);

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      {richElements}
    </div>
  );
};

export const TestCaseMarkdown = memo(
  NonMemoizedTestCaseMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
