"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";
import {
  formatYearMonthLabel,
  type ModeCOutdatedWarning,
} from "@/lib/upload/mode-c-upload-types";

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
  const hasContent = unchangedFileLabels.length > 0 || outdated.length > 0;
  if (!open || !hasContent) return null;

  return (
    <ModalOverlay
      open={open}
      onClose={onCancel}
      backdropLabel="Cancel Mode C upload"
      overlayClassName="z-[60]"
      panelClassName="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-amber-200 p-0"
      aria-labelledby="mode-c-upload-warning-title"
    >
      <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3">
        <h2
          id="mode-c-upload-warning-title"
          className="text-sm font-semibold text-slate-900"
        >
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
    </ModalOverlay>
  );
}
