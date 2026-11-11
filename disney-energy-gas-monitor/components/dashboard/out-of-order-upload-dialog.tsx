"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface OutOfOrderUploadDialogProps {
  incomingDate: string | null;
  latestUploadDate: string | null;
  message: string | null;
  open: boolean;
  confirming: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function OutOfOrderUploadDialog({
  incomingDate,
  latestUploadDate,
  message,
  open,
  confirming,
  onContinue,
  onCancel,
}: OutOfOrderUploadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && incomingDate) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, incomingDate]);

  if (!incomingDate) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[60] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-300 bg-white p-0 shadow-xl backdrop:bg-black/40 open:block"
      onClose={onCancel}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Upload date out of sequence
        </h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs leading-snug text-slate-700">
          {message ??
            "This batch is not the next calendar day after your latest master data. Excel sheets may be out of chronological order."}
        </p>
        <p className="text-xs text-slate-600">
          Latest upload date:{" "}
          <span className="font-medium font-mono">{latestUploadDate ?? "—"}</span>
          <br />
          This batch:{" "}
          <span className="font-medium font-mono">{incomingDate}</span>
        </p>
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
          {confirming ? "Uploading…" : "Continue"}
        </Button>
      </div>
    </dialog>
  );
}
