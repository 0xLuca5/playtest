'use client';

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import React, { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type YamlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
};

function YamlEditor({ 
  value, 
  onChange, 
  className,
  placeholder = '# Add your YAML configuration here',
  readOnly = false,
  theme = 'light'
}: YamlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const extensions = [
        basicSetup,
        yaml(),
        EditorView.theme({
          '&': {
            fontSize: '14px',
          },
          '.cm-content': {
            padding: '12px',
            minHeight: '200px',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
            color: theme === 'dark' ? '#d4d4d4' : '#1f2937',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-editor': {
            borderRadius: '6px',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
          '.cm-line': {
            color: theme === 'dark' ? '#d4d4d4' : '#1f2937',
          },
        }),
        EditorView.lineWrapping,
      ];

      // Add dark theme if needed
      if (theme === 'dark') {
        extensions.push(oneDark);
      }

      // Add placeholder if provided
      if (placeholder) {
        extensions.push(
          EditorView.theme({
            '.cm-placeholder': {
              color: '#9ca3af',
              fontStyle: 'italic',
            },
          })
        );
      }

      const startState = EditorState.create({
        doc: value,
        extensions,
      });

      editorRef.current = new EditorView({
        state: startState,
        parent: containerRef.current,
        editable: !readOnly,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && !readOnly) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const transaction = update.transactions.find(
            (tr) => !tr.annotation(Transaction.remote),
          );

          if (transaction) {
            const newContent = update.state.doc.toString();
            onChange(newContent);
          }
        }
      });

      const currentSelection = editorRef.current.state.selection;
      const extensions = [
        basicSetup,
        yaml(),
        updateListener,
        EditorView.theme({
          '&': {
            fontSize: '14px',
          },
          '.cm-content': {
            padding: '12px',
            minHeight: '200px',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
            color: theme === 'dark' ? '#d4d4d4' : '#1f2937',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-editor': {
            borderRadius: '6px',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
          '.cm-line': {
            color: theme === 'dark' ? '#d4d4d4' : '#1f2937',
          },
        }),
        EditorView.lineWrapping,
      ];

      if (theme === 'dark') {
        extensions.push(oneDark);
      }

      const newState = EditorState.create({
        doc: editorRef.current.state.doc,
        extensions,
        selection: currentSelection,
      });

      editorRef.current.setState(newState);
    }
  }, [onChange, readOnly, theme]);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentContent = editorRef.current.state.doc.toString();

      if (currentContent !== value) {
        const transaction = editorRef.current.state.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: value,
          },
          annotations: [Transaction.remote.of(true)],
        });

        editorRef.current.dispatch(transaction);
      }
    }
  }, [value]);

  return (
    <div
      className={cn(
        "relative w-full rounded-md overflow-auto",
        "focus-within:ring-2 focus-within:ring-blue-500",
        // 只在没有 border-0 类时添加边框
        !className?.includes('border-0') && "border border-slate-200 dark:border-slate-700 focus-within:border-blue-500",
        className
      )}
      ref={containerRef}
    />
  );
}

export default memo(YamlEditor);
