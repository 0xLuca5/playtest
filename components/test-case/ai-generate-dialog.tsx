'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useProject } from '@/lib/contexts/project-context';
import { toast } from 'sonner';

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
  onSuccess?: (result: any) => void;
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  parentFolderId,
  onSuccess
}: AIGenerateDialogProps) {
  const intl = useIntl();
  const { currentProject } = useProject();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 翻译函数
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error(t('testCase.aiGenerate.inputRequired'));
      return;
    }

    if (!currentProject) {
      toast.error(t('testCase.aiGenerate.projectRequired'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      console.log('🤖 Generating test cases with description:', description);
      console.log('📁 Parent folder ID:', parentFolderId);
      console.log('🏗️ Project ID:', currentProject.id);

      const response = await fetch('/api/test-case/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': intl.locale || 'zh',
        },
        body: JSON.stringify({
          description: description.trim(),
          parentFolderId,
          projectId: currentProject.id,
          locale: intl.locale || 'zh'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Generation result:', result);

      // 调用成功回调
      if (onSuccess) {
        onSuccess(result);
      }

      // 重置表单并关闭对话框
      setDescription('');
      onOpenChange(false);

    } catch (error) {
      console.error('❌ Generation failed:', error);
      toast.error(error instanceof Error ? error.message : t('testCase.aiGenerate.failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setDescription('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            {t('testCase.aiGenerate.title')}
          </DialogTitle>
          <DialogDescription>
            {t('testCase.aiGenerate.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t('testCase.aiGenerate.inputLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('testCase.aiGenerate.inputPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isGenerating}
            />
            <p className="text-sm text-muted-foreground">
              {t('testCase.aiGenerate.inputHelp')}
            </p>
          </div>

          {parentFolderId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('testCase.aiGenerate.folderNotice')}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                ❌ {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            {t('testCase.aiGenerate.cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('testCase.aiGenerate.generating')}
              </>
            ) : (
              <>
                <span className="mr-2">🤖</span>
                {t('testCase.aiGenerate.generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
