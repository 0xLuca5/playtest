'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,

  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dropzone, DropzoneEmptyState, DropzoneContent } from '@/components/ui/shadcn-io/dropzone';

import { Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentFolderId?: string; // 选中的父级文件夹（可选）
  onImportComplete?: () => void;
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: string[];
  createdTestCases: Array<{ id: string; name: string }>;
  createdTestSteps: Array<{ id: string; testCaseId: string; stepNumber: number }>;
}

export default function ImportDialog({
  open,
  onOpenChange,
  projectId,
  parentFolderId,
  onImportComplete
}: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useI18n();

  // 简单的字符串插值函数
  const interpolate = (template: string, values: Record<string, any>) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });
  };

  // 下载Excel模板
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);

      const response = await fetch(`/api/test-case/template?locale=${locale || 'zh'}`);
      if (!response.ok) {
        throw new Error(t('testCase.import.downloadFailed'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 从响应头获取文件名，如果没有则根据语言生成
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `测试用例导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      } else {
        // 根据语言生成文件名
        const fileNames = {
          zh: `测试用例导入模板_${new Date().toISOString().split('T')[0]}.xlsx`,
          en: `TestCase_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`,
          ja: `テストケースインポートテンプレート_${new Date().toISOString().split('T')[0]}.xlsx`
        };
        fileName = fileNames[locale as keyof typeof fileNames] || fileNames.zh;
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('testCase.import.downloadSuccess'));
    } catch (error) {
      console.error('Template download failed:', error);
      toast.error(`${t('testCase.import.downloadFailed')}: ${(error as Error).message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 通过普通 <input type="file"> 选择文件的旧逻辑已被 Dropzone 替换
  // 保留占位以便回退需求时参考
  // const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
  //       toast.error(t('testCase.import.fileFormat'));
  //       return;
  //     }
  //     if (file.size > 10 * 1024 * 1024) {
  //       toast.error(t('testCase.import.fileSizeLimit'));
  //       return;
  //     }
  //     setSelectedFile(file);
  //     setImportResult(null);
  //   }
  // };

  // 导入Excel文件
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error(t('testCase.import.pleaseSelectFile'));
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      if (parentFolderId) formData.append('parentFolderId', parentFolderId);

      const response = await fetch('/api/test-case/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('testCase.import.importFailed'));
      }

      setImportResult(result.results);
      
      if (result.results.successCount > 0) {
        toast.success(interpolate(t('testCase.import.successMessage'), { count: result.results.successCount }));

        // 调用完成回调
        onImportComplete?.();
      }

      if (result.results.errorCount > 0) {
        toast.error(interpolate(t('testCase.import.errorMessage'), { count: result.results.errorCount }));
      }

    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`${t('testCase.import.importFailed')}: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  // 关闭对话框
  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('testCase.import.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 下载模板（靠右） */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('testCase.import.downloadTemplate')}
            </Button>
          </div>

          {/* 上传文件 */}
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="relative">
                <Dropzone
                  accept={{
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.ms-excel': ['.xls'],
                  }}
                  maxFiles={1}
                  maxSize={10 * 1024 * 1024}
                  onDrop={(accepted) => {
                    const file = accepted?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setImportResult(null);
                    }
                  }}
                  onError={(err) => {
                    const msg = (err as Error)?.message?.toLowerCase?.() || '';
                    if (msg.includes('invalid') || msg.includes('file type')) {
                      toast.error(t('testCase.import.fileFormat'));
                    } else if (msg.includes('large') || msg.includes('max size')) {
                      toast.error(t('testCase.import.fileSizeLimit'));
                    } else if (msg.includes('too many') || msg.includes('max files')) {
                      toast.error(t('testCase.import.pleaseSelectFile'));
                    } else {
                      toast.error((err as Error).message || t('testCase.import.importFailed'));
                    }
                  }}
                  src={selectedFile ? [selectedFile] : undefined}
                  className="py-8"
                >
                  <DropzoneEmptyState>
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Upload className="h-4 w-4" />
                      </div>
                      <p className="my-2 text-sm font-medium">
                        {t('testCase.import.dropOrClick')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('testCase.import.acceptsTypes')} .xlsx, .xls · {t('testCase.import.maxSize')}
                      </p>
                    </div>
                  </DropzoneEmptyState>
                  <DropzoneContent>
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Upload className="h-4 w-4" />
                      </div>
                      <p className="my-2 text-sm font-medium">
                        {selectedFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('testCase.import.replaceFile')}
                      </p>
                    </div>
                  </DropzoneContent>
                </Dropzone>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('testCase.import.close')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t('testCase.import.startImport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
