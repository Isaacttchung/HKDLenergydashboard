"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  AREA_HEADER_ORDER,
  BACK_OF_HOUSE_HEADER_MATCHERS,
  HOTEL_AREA_KEYS,
} from "@/lib/monthly-utilities-gas/tgmj-column-config";
import type { MonthlyResortGasSummary } from "@/lib/types";

interface ResortGasSummaryTableProps {
  summary: MonthlyResortGasSummary | null | undefined;
  categoryColumnLabel: string;
  valueColumnLabel?: string;
}

const NA_VALUE = "N/A";
const cellPadding = "px-2 py-2 sm:px-4 sm:py-3";
const MJ_SUFFIX = " (MJ)";

const FALLBACK_PARK_AREA_LABELS = AREA_HEADER_ORDER.filter(
  (a) => !(HOTEL_AREA_KEYS as readonly string[]).includes(a.key),
).map((a) => a.label);

const HOTEL_BREAKDOWN_LABELS = AREA_HEADER_ORDER.filter((a) =>
  (HOTEL_AREA_KEYS as readonly string[]).includes(a.key),
).map((a) => a.label);

function formatMjValue(
  available: boolean,
  mj: number | null | undefined,
): string {
  if (!available || mj === null || mj === undefined) return NA_VALUE;
  return formatNumber(mj);
}

export function ResortGasSummaryTable({
  summary,
  categoryColumnLabel,
  valueColumnLabel = "MJ",
}: ResortGasSummaryTableProps) {
  const [hotelsExpanded, setHotelsExpanded] = useState(false);
  const [bohExpanded, setBohExpanded] = useState(false);
  const available = summary?.available === true;

  const areaRows =
    available && summary?.areas.length
      ? summary.areas
      : FALLBACK_PARK_AREA_LABELS.map((label) => ({ label, mj: 0 }));

  const hotelBreakdown =
    available && (summary?.hotelBreakdown.length ?? 0) > 0
      ? summary!.hotelBreakdown
      : [];

  const bohBreakdown =
    available && (summary?.backOfHouseBreakdown.length ?? 0) > 0
      ? summary!.backOfHouseBreakdown
      : [];

  const bohExpandLines =
    bohBreakdown.length > 0
      ? bohBreakdown
      : BACK_OF_HOUSE_HEADER_MATCHERS.map((b) => ({
          label: b.label,
          mj: 0,
        }));

  const showHotelDropdown = available
    ? hotelBreakdown.length > 0
    : HOTEL_BREAKDOWN_LABELS.length > 0;

  const showBohDropdown = bohExpandLines.length > 0;

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
          {areaRows.map((row) => (
            <tr key={row.label}>
              <td className={cn(cellPadding, "font-medium")}>
                {row.label}
                {MJ_SUFFIX}
              </td>
              <td
                className={cn(
                  cellPadding,
                  "text-right font-medium tabular-nums text-orange-600",
                )}
              >
                {formatMjValue(available, row.mj)}
              </td>
            </tr>
          ))}
          <tr>
            <td className={cn(cellPadding, "font-medium")}>
              {showHotelDropdown ? (
                <button
                  type="button"
                  onClick={() => setHotelsExpanded((open) => !open)}
                  className="flex max-w-full items-center gap-1.5 text-left hover:text-brand sm:gap-2"
                  aria-expanded={hotelsExpanded}
                >
                  <span className="min-w-0 whitespace-normal leading-snug">
                    Hotel
                    {MJ_SUFFIX}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      hotelsExpanded && "rotate-180",
                    )}
                  />
                </button>
              ) : (
                <>
                  Hotel
                  {MJ_SUFFIX}
                </>
              )}
            </td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatMjValue(available, summary?.hotelMj)}
            </td>
          </tr>
          {hotelsExpanded &&
            (hotelBreakdown.length > 0
              ? hotelBreakdown
              : HOTEL_BREAKDOWN_LABELS.map((label) => ({ label, mj: 0 }))
            ).map((line) => (
              <tr key={line.label} className="bg-brand-light/40">
                <td className={cn(cellPadding, "pl-6 text-black sm:pl-12")}>
                  <span className="mr-1 sm:mr-2">•</span>
                  {line.label}
                </td>
                <td
                  className={cn(
                    cellPadding,
                    "text-right font-medium tabular-nums text-orange-600",
                  )}
                >
                  {formatMjValue(available, line.mj)}
                </td>
              </tr>
            ))}
          <tr>
            <td className={cn(cellPadding, "font-medium")}>
              {showBohDropdown ? (
                <button
                  type="button"
                  onClick={() => setBohExpanded((open) => !open)}
                  className="flex max-w-full items-center gap-1.5 text-left hover:text-brand sm:gap-2"
                  aria-expanded={bohExpanded}
                >
                  <span className="min-w-0 whitespace-normal leading-snug">
                    Back of House
                    {MJ_SUFFIX}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      bohExpanded && "rotate-180",
                    )}
                  />
                </button>
              ) : (
                <>
                  Back of House
                  {MJ_SUFFIX}
                </>
              )}
            </td>
            <td
              className={cn(
                cellPadding,
                "text-right font-medium tabular-nums text-orange-600",
              )}
            >
              {formatMjValue(available, summary?.backOfHouseMj)}
            </td>
          </tr>
          {bohExpanded &&
            bohExpandLines.map((line) => (
              <tr key={line.label} className="bg-brand-light/40">
                <td className={cn(cellPadding, "pl-6 text-black sm:pl-12")}>
                  <span className="mr-1 sm:mr-2">•</span>
                  {line.label}
                </td>
                <td
                  className={cn(
                    cellPadding,
                    "text-right font-medium tabular-nums text-orange-600",
                  )}
                >
                  {formatMjValue(available, line.mj)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
