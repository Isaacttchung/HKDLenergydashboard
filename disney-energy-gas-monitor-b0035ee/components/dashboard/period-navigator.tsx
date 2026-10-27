"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeriodNavigatorProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export function PeriodNavigator({
  label,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
}: PeriodNavigatorProps) {
  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-border/60 bg-white text-brand transition-colors hover:bg-brand-light disabled:pointer-events-none disabled:opacity-40";

  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        className={buttonClass}
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous period"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className={cn("min-w-0 text-center")}>{label}</span>
      <button
        type="button"
        className={buttonClass}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next period"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </span>
  );
}
