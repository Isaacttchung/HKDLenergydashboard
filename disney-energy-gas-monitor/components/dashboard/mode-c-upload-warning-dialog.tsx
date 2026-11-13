"use client";

import { Button } from "@/components/ui/button";
import {
  formatYearMonthLabel,
  type ModeCOutdatedWarning,
} from "@/lib/upload/mode-c-upload-types";
import { useEffect, useRef } from "react";

interface ModeCUploadWarningDialogProps {
  message: string | null;
  unchangedFileLabels: string[];
  outdated: ModeCOutdatedWarning[];
  open: boolean;
  confirming: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function ModeCUploadWarningDialog({
  message,
  unchangedFileLabels,
  outdated,
  open,
  confirming,
  onContinue,
  onCancel,
}: ModeCUploadWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasContent = unchangedFileLabels.length > 0 || outdated.length > 0;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && hasContent) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, hasContent]);

  if (!hasContent) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[60] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-amber-200 bg-white p-0 shadow-xl backdrop:bg-black/40 open:block"
      onClose={onCancel}
    >
      <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Confirm Mode C upload
        </h2>
      </div>
      <div className="space-y-3 px-4 py-3">
        <p className="text-xs leading-snug text-slate-700">
          {message ??
            "Review the warnings below before replacing dashboard data."}
        </p>

        {unchangedFileLabels.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-medium text-slate-900">No changes detected</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {unchangedFileLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {outdated.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-slate-700">
            <p className="font-medium text-slate-900">Older than dashboard</p>
            <ul className="mt-1 space-y-1.5">
              {outdated.map((item) => (
                <li key={`${item.filename}-${item.incomingLatestMonth}`}>
                  <span className="font-medium">{item.workbookLabel}</span>
                  <span className="block text-slate-600">
                    Dashboard latest:{" "}
                    {formatYearMonthLabel(item.existingLatestMonth)} — file
                    latest: {formatYearMonthLabel(item.incomingLatestMonth)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={confirming}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={confirming}
          onClick={onContinue}
        >
          {confirming ? "Uploading…" : "Override anyway"}
        </Button>
      </div>
    </dialog>
  );
}
