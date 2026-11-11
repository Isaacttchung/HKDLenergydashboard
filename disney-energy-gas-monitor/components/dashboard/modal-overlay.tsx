"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  backdropLabel: string;
  children: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  "aria-labelledby"?: string;
}

/** Same pattern as period comparison: backdrop button closes; panel stays interactive (Radix Select works). */
export function ModalOverlay({
  open,
  onClose,
  backdropLabel,
  children,
  overlayClassName = "z-50",
  panelClassName,
  "aria-labelledby": ariaLabelledBy,
}: ModalOverlayProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4",
        overlayClassName,
      )}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label={backdropLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby={ariaLabelledBy}
        className={cn("relative z-10 w-full bg-white shadow-2xl", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
