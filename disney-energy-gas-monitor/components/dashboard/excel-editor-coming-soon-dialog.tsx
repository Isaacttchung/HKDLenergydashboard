"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";
import {
  EXCEL_EDITOR_WORKBOOKS,
  type ExcelEditorWorkbookId,
} from "@/lib/master-editor/excel-editor-catalog";

interface ExcelEditorComingSoonDialogProps {
  open: boolean;
  workbookId: ExcelEditorWorkbookId | null;
  sheetLabel: string | null;
  onClose: () => void;
}

export function ExcelEditorComingSoonDialog({
  open,
  workbookId,
  sheetLabel,
  onClose,
}: ExcelEditorComingSoonDialogProps) {
  if (!workbookId || !sheetLabel) return null;

  const workbook = EXCEL_EDITOR_WORKBOOKS.find((w) => w.id === workbookId);

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      backdropLabel="Close"
      panelClassName="max-w-[24rem] rounded-lg border border-slate-300 p-0 shadow-xl"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Editor coming soon</h2>
      </div>
      <div className="px-4 py-3 text-xs text-slate-600 leading-snug">
        <p>
          In-app editing for{" "}
          <span className="font-medium">{workbook?.filename ?? workbookId}</span> →{" "}
          <span className="font-medium">{sheetLabel}</span> is not built yet.
        </p>
        <p className="mt-2 text-slate-500">
          Use Excel for this sheet for now. Top 10 → WebSS_Data is available under
          Edit Excels.
        </p>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <Button type="button" size="sm" onClick={onClose}>
          OK
        </Button>
      </div>
    </ModalOverlay>
  );
}
