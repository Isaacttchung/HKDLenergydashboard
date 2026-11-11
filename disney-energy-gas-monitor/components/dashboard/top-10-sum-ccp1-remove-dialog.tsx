"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";

interface Top10SumCcp1RemoveDialogProps {
  open: boolean;
  meter: string;
  location: string;
  applying: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function Top10SumCcp1RemoveDialog({
  open,
  meter,
  location,
  applying,
  onContinue,
  onCancel,
}: Top10SumCcp1RemoveDialogProps) {
  return (
    <ModalOverlay
      open={open}
      onClose={onCancel}
      backdropLabel="Cancel remove"
      overlayClassName="z-[70]"
      panelClassName="max-w-md rounded-lg border border-slate-300 p-0 shadow-xl"
    >
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-amber-950">
          This meter feeds Sum CCP1
        </h2>
      </div>
      <div className="space-y-2 px-4 py-3 text-xs leading-snug text-slate-700">
        <p>
          <span className="font-mono font-medium">{meter}</span>
          <span className="text-slate-500"> @ </span>
          <span>{location}</span> is used when raw data is converted to compute{" "}
          <span className="font-medium">Sum CCP1</span>. Removing it can break
          or change that total on the next Top 10 upload until the mapping is
          fixed.
        </p>
        <p className="text-slate-600">Remove this row anyway?</p>
      </div>
      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={applying}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 bg-red-600 text-white hover:bg-red-700"
          disabled={applying}
          onClick={onContinue}
        >
          {applying ? "Removing…" : "Continue remove"}
        </Button>
      </div>
    </ModalOverlay>
  );
}
