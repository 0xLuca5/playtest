'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ImportDialog from './import-dialog';
import { useI18n } from '@/hooks/use-i18n';

interface ImportButtonProps {
  projectId: string;
  parentFolderId?: string; // 选中的父级文件夹（可选）
  onImportComplete?: () => void;
  className?: string;
}

export default function ImportButton({
  projectId,
  parentFolderId,
  onImportComplete,
  className
}: ImportButtonProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowImportDialog(true)}
        className={`flex items-center gap-2 ${className || ''}`}
      >
        <span className="text-lg mr-2">📄</span>
        {t('testCase.importTestCase')}
      </Button>

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        projectId={projectId}
        parentFolderId={parentFolderId}
        onImportComplete={() => {
          onImportComplete?.();
          setShowImportDialog(false);
        }}
      />
    </>
  );
}
