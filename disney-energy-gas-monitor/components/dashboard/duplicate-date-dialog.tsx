"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface DuplicateDateDialogProps {
  duplicateDate: string | null;
  message: string | null;
  open: boolean;
  replacing: boolean;
  onReplace: () => void;
  onCancel: () => void;
}

export function DuplicateDateDialog({
  duplicateDate,
  message,
  open,
  replacing,
  onReplace,
  onCancel,
}: DuplicateDateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && duplicateDate) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, duplicateDate]);

  if (!duplicateDate) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-300 bg-white p-0 shadow-xl backdrop:bg-black/40 open:block"
      onClose={onCancel}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Date already exists</h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs leading-snug text-slate-700">
          {message ??
            "The data you are uploading is already on the dashboard/mastersheets. Replace or cancel?"}
        </p>
        <p className="text-xs text-slate-600">
          Report date:{" "}
          <span className="font-medium font-mono">{duplicateDate}</span>
        </p>
      </div>
      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={replacing}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={replacing}
          onClick={onReplace}
        >
          {replacing ? "Replacing…" : "Replace"}
        </Button>
      </div>
    </dialog>
  );
}
