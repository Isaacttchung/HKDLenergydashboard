"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { SolarInstallationBreakdownItem } from "@/lib/types";

const cellPadding = "px-2 py-2 sm:px-4 sm:py-3";

interface MapZoneSummaryTableProps {
  categoryColumnLabel: string;
  valueColumnLabel: string;
  totalKwh: number;
  solarKwh: number | null;
  solarSites: SolarInstallationBreakdownItem[];
  emptyMessage?: string | null;
}

export function MapZoneSummaryTable({
  categoryColumnLabel,
  valueColumnLabel,
  totalKwh,
  solarKwh,
  solarSites,
  emptyMessage,
}: MapZoneSummaryTableProps) {
  const [solarExpanded, setSolarExpanded] = useState(false);
  const showSolarBreakdown = solarSites.length > 0;
  const showSolarRow = solarKwh !== null && solarKwh !== undefined;

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-lg border border-brand-border bg-white">
      <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-brand-light text-brand-foreground">
            <th
              className={cn(
                cellPadding,
                "w-[55%] border-b border-brand-border/60 text-left font-medium",
              )}
            >
              {categoryColumnLabel}
            </th>
            <th
              className={cn(
                cellPadding,
                "w-[45%] border-b border-brand-border/60 text-right font-medium break-words",
              )}
            >
              {valueColumnLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/60">
          <tr>
            <td className={cn(cellPadding, "font-medium")}>Electricity (kWh)</td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {emptyMessage ? "—" : formatNumber(totalKwh)}
            </td>
          </tr>
          {emptyMessage && (
            <tr>
              <td
                colSpan={2}
                className={cn(cellPadding, "text-slate-600")}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {showSolarRow && (
            <tr>
              <td className={cn(cellPadding, "font-medium")}>
                {showSolarBreakdown ? (
                  <button
                    type="button"
                    onClick={() => setSolarExpanded((open) => !open)}
                    className="inline-flex max-w-full items-center gap-1 text-left hover:text-brand"
                    aria-expanded={solarExpanded}
                  >
                    <span className="min-w-0 whitespace-normal leading-snug">
                      Solar Generated (kWh)
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                        solarExpanded && "rotate-180",
                      )}
                    />
                  </button>
                ) : (
                  "Solar Generated (kWh)"
                )}
              </td>
              <td
                className={cn(
                  cellPadding,
                  "text-right font-medium tabular-nums text-green-600",
                )}
              >
                {formatNumber(solarKwh ?? 0)}
              </td>
            </tr>
          )}
          {showSolarBreakdown &&
            solarExpanded &&
            solarSites.map((site) => (
              <tr key={site.id} className="bg-brand-light/40">
                <td className={cn(cellPadding, "pl-6 text-black sm:pl-12")}>
                  <span className="mr-1 sm:mr-2">•</span>
                  {site.label}
                </td>
                <td
                  className={cn(
                    cellPadding,
                    "text-right font-medium tabular-nums text-green-600",
                  )}
                >
                  {formatNumber(site.kWh)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
