"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface HccpGasCapacityPreflightDialogProps {
  message: string | null;
  missingDates: string[];
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onAddCapacityFile: () => void;
  onContinueAnyway: () => void;
}

export function HccpGasCapacityPreflightDialog({
  message,
  missingDates,
  open,
  busy,
  onCancel,
  onAddCapacityFile,
  onContinueAnyway,
}: HccpGasCapacityPreflightDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && missingDates.length > 0) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, missingDates.length]);

  if (missingDates.length === 0) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[60] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-300 bg-white p-0 shadow-xl backdrop:bg-black/40 open:block"
      onClose={onCancel}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          HCCP Gas Capacity check
        </h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs leading-snug text-slate-700">{message}</p>
        <p className="text-xs text-slate-600">
          Missing midnight dates:{" "}
          <span className="font-medium font-mono">
            {missingDates.join(", ")}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={busy}
          onClick={onAddCapacityFile}
        >
          Add another HCCP Gas Capacity.csv file
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={busy}
          onClick={onContinueAnyway}
        >
          {busy ? "Uploading…" : "Continue anyway"}
        </Button>
      </div>
    </dialog>
  );
}
