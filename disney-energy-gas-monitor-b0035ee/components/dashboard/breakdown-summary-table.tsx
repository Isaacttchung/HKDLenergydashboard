"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import type { DailyBreakdown } from "@/lib/types";

interface BreakdownSummaryTableProps {
  breakdown: DailyBreakdown;
  categoryColumnLabel: string;
  valueColumnLabel: string;
}

const HOTEL_BREAKDOWN = [
  { id: "dhh", label: "DHH", value: (b: DailyBreakdown) => b.dhh },
  { id: "dlh", label: "DLH", value: (b: DailyBreakdown) => b.dlh },
  { id: "del", label: "DEL", value: (b: DailyBreakdown) => b.del },
] as const;

const cellPadding = "px-2 py-2 sm:px-4 sm:py-3";

export function BreakdownSummaryTable({
  breakdown,
  categoryColumnLabel,
  valueColumnLabel,
}: BreakdownSummaryTableProps) {
  const [hotelsExpanded, setHotelsExpanded] = useState(false);
  const [solarExpanded, setSolarExpanded] = useState(false);
  const solarSites = breakdown.solarSites ?? [];
  const showSolarBreakdown = solarSites.length > 0;

  return (
    <div
      className="min-w-0 w-full overflow-hidden rounded-lg border border-brand-border bg-white"
    >
      <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-brand-light text-brand-foreground">
            <th
              className={cn(
                cellPadding,
                "w-[55%] border-b border-brand-border/60 font-medium text-left",
              )}
            >
              {categoryColumnLabel}
            </th>
            <th
              className={cn(
                cellPadding,
                "w-[45%] border-b border-brand-border/60 font-medium text-right break-words",
              )}
            >
              {valueColumnLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/60">
          <tr>
            <td className={cn(cellPadding, "font-medium")}>Park (kWh)</td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatNumber(breakdown.park)}
            </td>
          </tr>
          <tr>
            <td className={cn(cellPadding, "font-medium")}>
              <button
                type="button"
                onClick={() => setHotelsExpanded((open) => !open)}
                className="flex max-w-full items-center gap-1.5 text-left hover:text-brand sm:gap-2"
                aria-expanded={hotelsExpanded}
              >
                <span className="min-w-0 whitespace-normal leading-snug">
                  Hotel (kWh)
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                    hotelsExpanded && "rotate-180",
                  )}
                />
              </button>
            </td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatNumber(breakdown.hotelTotal)}
            </td>
          </tr>
          {hotelsExpanded &&
            HOTEL_BREAKDOWN.map((hotel) => (
              <tr key={hotel.id} className="bg-brand-light/40">
                <td className={cn(cellPadding, "pl-6 text-black sm:pl-12")}>
                  <span className="mr-1 sm:mr-2">•</span>
                  {hotel.label}
                </td>
                <td
                  className={cn(
                    cellPadding,
                    "text-right font-medium tabular-nums text-orange-600",
                  )}
                >
                  {formatNumber(hotel.value(breakdown))}
                </td>
              </tr>
            ))}
          <tr>
            <td className={cn(cellPadding, "font-medium")}>CCP (kWh)</td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatNumber(breakdown.ccp)}
            </td>
          </tr>
          <tr>
            <td className={cn(cellPadding, "font-medium")}>HCCP (kWh)</td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatNumber(breakdown.hccp)}
            </td>
          </tr>
          <tr>
            <td className={cn(cellPadding, "font-medium")}>
              {showSolarBreakdown ? (
                <button
                  type="button"
                  onClick={() => setSolarExpanded((open) => !open)}
                  className="flex max-w-full items-center gap-1.5 text-left hover:text-brand sm:gap-2"
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
              {formatNumber(breakdown.solarTotal)}
            </td>
          </tr>
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
