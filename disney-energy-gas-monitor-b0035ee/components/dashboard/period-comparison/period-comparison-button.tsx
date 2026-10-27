"use client";

import { Button } from "@/components/ui/button";

interface PeriodComparisonButtonProps {
  onClick: () => void;
}

export function PeriodComparisonButton({ onClick }: PeriodComparisonButtonProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-brand-foreground">Comparison</h3>
      <Button type="button" variant="secondary" className="w-full" onClick={onClick}>
        Period comparison
      </Button>
    </div>
  );
}
