"use client";

import { formatNumber } from "@/lib/utils";
import type { PeriodReportExtremum } from "@/lib/types";

interface PeriodExtremaCardsProps {
  highest: PeriodReportExtremum;
  lowest: PeriodReportExtremum;
  highestLabel: string;
  lowestLabel: string;
}

export function PeriodExtremaCards({
  highest,
  lowest,
  highestLabel,
  lowestLabel,
}: PeriodExtremaCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-brand-border bg-white p-4">
        <p className="text-xs text-slate-500">{highestLabel}</p>
        <p className="mt-1 text-lg font-semibold text-brand-foreground">{highest.label}</p>
        <p className="mt-1 text-sm text-orange-600">
          {formatNumber(highest.resortElectricityTotal)} kWh resort electricity
        </p>
      </div>
      <div className="rounded-lg border border-brand-border bg-white p-4">
        <p className="text-xs text-slate-500">{lowestLabel}</p>
        <p className="mt-1 text-lg font-semibold text-brand-foreground">{lowest.label}</p>
        <p className="mt-1 text-sm text-orange-600">
          {formatNumber(lowest.resortElectricityTotal)} kWh resort electricity
        </p>
      </div>
    </div>
  );
}
