"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StableSelect } from "@/components/ui/stable-select";
import {
  EXCEL_EDITOR_WORKBOOKS,
  resolveExcelEditorTarget,
  type ExcelEditorTarget,
  type ExcelEditorWorkbookId,
} from "@/lib/master-editor/excel-editor-catalog";
import { useEffect, useMemo, useState } from "react";

interface ExcelEditorPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (target: ExcelEditorTarget) => void;
}

export function ExcelEditorPickerDialog({
  open,
  onClose,
  onConfirm,
}: ExcelEditorPickerDialogProps) {
  const [workbookId, setWorkbookId] = useState("");
  const sheets = useMemo(
    () =>
      workbookId
        ? (EXCEL_EDITOR_WORKBOOKS.find((w) => w.id === workbookId)?.sheets ??
          [])
        : [],
    [workbookId],
  );
  const [sheetId, setSheetId] = useState("");

  useEffect(() => {
    if (!open) return;
    setWorkbookId("");
    setSheetId("");
  }, [open]);

  const workbookOptions = useMemo(
    () =>
      EXCEL_EDITOR_WORKBOOKS.map((w) => ({
        value: w.id,
        label: w.filename,
      })),
    [],
  );

  const sheetOptions = useMemo(
    () => sheets.map((s) => ({ value: s.id, label: s.label })),
    [sheets],
  );

  const canContinue =
    workbookId !== "" &&
    sheetId !== "" &&
    resolveExcelEditorTarget(
      workbookId as ExcelEditorWorkbookId,
      sheetId,
    ) !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    const target = resolveExcelEditorTarget(
      workbookId as ExcelEditorWorkbookId,
      sheetId,
    );
    if (!target) return;
    onConfirm(target);
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      backdropLabel="Close Edit Excels"
      panelClassName="max-w-[26rem] rounded-lg border border-slate-300 p-0 shadow-xl"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Edit Excels</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Choose a master workbook and sheet. Feed-in tariff is edited manually
          outside the dashboard and is not listed here.
        </p>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="space-y-2">
          <Label htmlFor="excel-editor-workbook">Master workbook</Label>
          <StableSelect
            id="excel-editor-workbook"
            value={workbookId}
            placeholder="Select workbook"
            options={workbookOptions}
            onValueChange={(next) => {
              setWorkbookId(next);
              setSheetId("");
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="excel-editor-sheet">Sheet</Label>
          <StableSelect
            id="excel-editor-sheet"
            value={sheetId}
            placeholder="Select sheet"
            disabled={!workbookId}
            options={sheetOptions}
            onValueChange={setSheetId}
          />
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </ModalOverlay>
  );
}
