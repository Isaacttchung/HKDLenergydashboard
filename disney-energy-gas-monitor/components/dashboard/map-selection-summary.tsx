"use client";

import { formatNumber } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface MapSelectionSummaryProps {
  label: string | null;
  totalKwh: number | null;
  solarKwh?: number | null;
  emptyMessage?: string | null;
  loading?: boolean;
}

export function MapSelectionSummary({
  label,
  totalKwh,
  solarKwh,
  emptyMessage,
  loading,
}: MapSelectionSummaryProps) {
  if (!label && !loading) return null;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-light/50 px-3 py-2 text-sm">
      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map selection…
        </div>
      ) : (
        <>
          <p className="font-medium text-brand-foreground">{label}</p>
          {emptyMessage ? (
            <p className="text-slate-600">{emptyMessage}</p>
          ) : (
            <p className="tabular-nums text-slate-700">
              Total electricity:{" "}
              <strong>{formatNumber(totalKwh ?? 0)} kWh</strong>
            </p>
          )}
          {solarKwh !== null && solarKwh !== undefined && (
            <p className="tabular-nums text-green-700">
              Solar generated: <strong>{formatNumber(solarKwh)} kWh</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}
