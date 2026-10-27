"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  FULL_RESORT_BREAKDOWN_ROWS,
  solarSitePercentKey,
} from "@/lib/period-comparison/percent-change";
import {
  PERIOD_CONTEXT_METRIC_ROWS,
  type PeriodComparisonContextMetrics,
} from "@/lib/period-comparison/context-metric-rows";
import { cn, formatNumber } from "@/lib/utils";
import type { DailyBreakdown } from "@/lib/types";

const HOTEL_BREAKDOWN = [
  { id: "dhh", label: "DHH", value: (b: DailyBreakdown) => b.dhh },
  { id: "dlh", label: "DLH", value: (b: DailyBreakdown) => b.dlh },
  { id: "del", label: "DEL", value: (b: DailyBreakdown) => b.del },
] as const;

const cellPadding = "px-2 py-2 sm:px-3 sm:py-2.5";
const headerCell = cn(
  cellPadding,
  "bg-brand-light text-brand-foreground border-b border-brand-border/60 font-medium align-middle min-h-[3.25rem] sm:min-h-[3.5rem]",
);
const dataCell = cn(cellPadding, "align-middle h-11 sm:h-12 border-b border-brand-border/60");

const groupStart = "border-l border-brand-border/80";
const groupEnd = "border-r border-brand-border/80";
const percentGroup = cn(groupStart, groupEnd);

export interface PeriodComparisonPeriod {
  tableTitle: string;
  breakdown: DailyBreakdown;
  context: PeriodComparisonContextMetrics;
}

type InterleavedBlock =
  | { kind: "period"; periodIndex: number }
  | { kind: "percent"; percentIndex: number };

function buildInterleavedBlocks(periodCount: number): InterleavedBlock[] {
  const blocks: InterleavedBlock[] = [];
  for (let i = 0; i < periodCount; i++) {
    blocks.push({ kind: "period", periodIndex: i });
    if (i > 0) {
      blocks.push({ kind: "percent", percentIndex: i - 1 });
    }
  }
  return blocks;
}

export function PeriodComparisonResults({
  periods,
  percentChanges,
  contextPercentChanges,
}: {
  periods: PeriodComparisonPeriod[];
  percentChanges: Record<string, number | null>[];
  contextPercentChanges: Record<string, number | null>[];
}) {
  const [hotelsExpanded, setHotelsExpanded] = useState(false);
  const [solarExpanded, setSolarExpanded] = useState(false);
  const toggleHotels = () => setHotelsExpanded((open) => !open);
  const toggleSolar = () => setSolarExpanded((open) => !open);
  const solarSites = periods[0]?.breakdown.solarSites ?? [];
  const showSolarBreakdown = solarSites.length > 0;

  const blocks = buildInterleavedBlocks(periods.length);
  const minTableWidth = Math.max(
    periods.length * 240 + percentChanges.length * 88,
    640,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-brand-border bg-white">
      <table
        className="w-full table-fixed border-collapse text-xs sm:text-sm"
        style={{ minWidth: `${minTableWidth}px` }}
      >
        <thead>
          <tr>
            {blocks.map((block, blockIndex) => {
              const isFirst = blockIndex === 0;
              const isLast = blockIndex === blocks.length - 1;

              if (block.kind === "period") {
                const period = periods[block.periodIndex];
                return (
                  <Fragment key={`head-${blockIndex}`}>
                    <th
                      className={cn(
                        headerCell,
                        groupStart,
                        isFirst && "rounded-tl-lg",
                        "text-left",
                      )}
                    >
                      <span className="line-clamp-2 leading-snug">
                        {period.tableTitle}
                      </span>
                    </th>
                    <th
                      className={cn(
                        headerCell,
                        groupEnd,
                        isLast && "rounded-tr-lg",
                        "text-right",
                      )}
                    >
                      kWh
                    </th>
                  </Fragment>
                );
              }

              return (
                <th
                  key={`head-${blockIndex}`}
                  className={cn(
                    headerCell,
                    percentGroup,
                    isLast && "rounded-tr-lg",
                    "text-right",
                  )}
                >
                  % change
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {FULL_RESORT_BREAKDOWN_ROWS.map((row) => {
            if (row.id === "hotel") {
              return (
                <HotelComparisonRows
                  key={row.id}
                  blocks={blocks}
                  periods={periods}
                  percentChanges={percentChanges}
                  expanded={hotelsExpanded}
                  onToggle={toggleHotels}
                />
              );
            }

            if (row.id === "solar") {
              return (
                <SolarComparisonRows
                  key={row.id}
                  blocks={blocks}
                  periods={periods}
                  percentChanges={percentChanges}
                  solarSites={solarSites}
                  showBreakdown={showSolarBreakdown}
                  expanded={solarExpanded}
                  onToggle={toggleSolar}
                />
              );
            }

            return (
              <tr key={row.id}>
                {blocks.map((block, blockIndex) => {
                  if (block.kind === "period") {
                    const period = periods[block.periodIndex];
                    return (
                      <Fragment key={`${row.id}-${blockIndex}`}>
                        <MetricLabelCell
                          label={row.label}
                          muted={block.periodIndex > 0}
                        />
                        <ValueCell
                          value={formatNumber(row.value(period.breakdown))}
                        />
                      </Fragment>
                    );
                  }

                  return (
                    <PercentValueCell
                      key={`${row.id}-${blockIndex}`}
                      pct={percentChanges[block.percentIndex][row.id]}
                    />
                  );
                })}
              </tr>
            );
          })}
          {PERIOD_CONTEXT_METRIC_ROWS.map((row, rowIndex) => (
            <tr key={row.id}>
              {blocks.map((block, blockIndex) => {
                if (block.kind === "period") {
                  const period = periods[block.periodIndex];
                  const raw = period.context[row.id];
                  const display =
                    raw === undefined ? "—" : row.formatValue(raw);
                  return (
                    <Fragment key={`${row.id}-${blockIndex}`}>
                      <MetricLabelCell
                        label={row.label}
                        muted={block.periodIndex > 0}
                        sectionStart={rowIndex === 0}
                      />
                      <ContextValueCell value={display} sectionStart={rowIndex === 0} />
                    </Fragment>
                  );
                }

                return (
                  <PercentValueCell
                    key={`${row.id}-${blockIndex}`}
                    pct={contextPercentChanges[block.percentIndex][row.id]}
                    neutral
                    sectionStart={rowIndex === 0}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricLabelCell({
  label,
  muted,
  sectionStart,
}: {
  label: string;
  muted?: boolean;
  sectionStart?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        groupStart,
        "font-medium",
        sectionStart && "border-t-2 border-brand-border",
        muted ? "text-slate-600" : "text-brand-foreground",
      )}
    >
      {label}
    </td>
  );
}

function ValueCell({
  value,
  solar,
}: {
  value: string;
  solar?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        groupEnd,
        "text-right font-medium tabular-nums",
        solar ? "text-green-600" : "text-orange-600",
      )}
    >
      {value}
    </td>
  );
}

function ContextValueCell({
  value,
  sectionStart,
}: {
  value: string;
  sectionStart?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        groupEnd,
        sectionStart && "border-t-2 border-brand-border",
        "text-right font-medium tabular-nums text-slate-700",
      )}
    >
      {value}
    </td>
  );
}

function PercentValueCell({
  pct,
  subRow,
  solar,
  neutral,
  sectionStart,
}: {
  pct: number | null | undefined;
  subRow?: boolean;
  solar?: boolean;
  neutral?: boolean;
  sectionStart?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        percentGroup,
        sectionStart && "border-t-2 border-brand-border",
        subRow && "bg-brand-light/40",
        "text-right font-medium tabular-nums",
        percentTone(pct, solar, neutral),
      )}
    >
      {formatPercent(pct)}
    </td>
  );
}

function SolarComparisonRows({
  blocks,
  periods,
  percentChanges,
  solarSites,
  showBreakdown,
  expanded,
  onToggle,
}: {
  blocks: InterleavedBlock[];
  periods: PeriodComparisonPeriod[];
  percentChanges: Record<string, number | null>[];
  solarSites: PeriodComparisonPeriod["breakdown"]["solarSites"];
  showBreakdown: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        {blocks.map((block, blockIndex) => {
          if (block.kind === "period") {
            const period = periods[block.periodIndex];
            return (
              <Fragment key={`solar-${blockIndex}`}>
                {showBreakdown ? (
                  <SolarLabelCell
                    expanded={expanded}
                    onToggle={onToggle}
                    muted={block.periodIndex > 0}
                  />
                ) : (
                  <MetricLabelCell
                    label="Solar Generated (kWh)"
                    muted={block.periodIndex > 0}
                  />
                )}
                <ValueCell
                  value={formatNumber(period.breakdown.solarTotal)}
                  solar
                />
              </Fragment>
            );
          }

          return (
            <PercentValueCell
              key={`solar-${blockIndex}`}
              pct={percentChanges[block.percentIndex].solar}
              solar
            />
          );
        })}
      </tr>
      {showBreakdown &&
        expanded &&
        solarSites.map((site) => (
          <tr key={site.id} className="bg-brand-light/40">
            {blocks.map((block, blockIndex) => {
              if (block.kind === "period") {
                const period = periods[block.periodIndex];
                const siteValue =
                  period.breakdown.solarSites.find((s) => s.id === site.id)
                    ?.kWh ?? 0;
                return (
                  <Fragment key={`${site.id}-${blockIndex}`}>
                    <td
                      className={cn(
                        dataCell,
                        groupStart,
                        "pl-5 sm:pl-8",
                        block.periodIndex > 0 ? "text-slate-600" : "text-black",
                      )}
                    >
                      <span className="mr-1">•</span>
                      {site.label}
                    </td>
                    <ValueCell value={formatNumber(siteValue)} solar />
                  </Fragment>
                );
              }

              return (
                <PercentValueCell
                  key={`${site.id}-${blockIndex}`}
                  pct={
                    percentChanges[block.percentIndex][
                      solarSitePercentKey(site.id)
                    ]
                  }
                  subRow
                  solar
                />
              );
            })}
          </tr>
        ))}
    </>
  );
}

function SolarLabelCell({
  expanded,
  onToggle,
  muted,
}: {
  expanded: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        groupStart,
        "font-medium",
        muted ? "text-slate-600" : "text-brand-foreground",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-1.5 text-left hover:text-brand"
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1 whitespace-normal leading-snug">
          Solar Generated (kWh)
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
    </td>
  );
}

function HotelComparisonRows({
  blocks,
  periods,
  percentChanges,
  expanded,
  onToggle,
}: {
  blocks: InterleavedBlock[];
  periods: PeriodComparisonPeriod[];
  percentChanges: Record<string, number | null>[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        {blocks.map((block, blockIndex) => {
          if (block.kind === "period") {
            const period = periods[block.periodIndex];
            return (
              <Fragment key={`hotel-${blockIndex}`}>
                <HotelLabelCell
                  expanded={expanded}
                  onToggle={onToggle}
                  muted={block.periodIndex > 0}
                />
                <ValueCell value={formatNumber(period.breakdown.hotelTotal)} />
              </Fragment>
            );
          }

          return (
            <PercentValueCell
              key={`hotel-${blockIndex}`}
              pct={percentChanges[block.percentIndex].hotel}
            />
          );
        })}
      </tr>
      {expanded &&
        HOTEL_BREAKDOWN.map((hotel) => (
          <tr key={hotel.id} className="bg-brand-light/40">
            {blocks.map((block, blockIndex) => {
              if (block.kind === "period") {
                const period = periods[block.periodIndex];
                return (
                  <Fragment key={`${hotel.id}-${blockIndex}`}>
                    <td
                      className={cn(
                        dataCell,
                        groupStart,
                        "pl-5 sm:pl-8",
                        block.periodIndex > 0 ? "text-slate-600" : "text-black",
                      )}
                    >
                      <span className="mr-1">•</span>
                      {hotel.label}
                    </td>
                    <td
                      className={cn(
                        dataCell,
                        groupEnd,
                        "text-right font-medium tabular-nums text-orange-600",
                      )}
                    >
                      {formatNumber(hotel.value(period.breakdown))}
                    </td>
                  </Fragment>
                );
              }

              return (
                <PercentValueCell
                  key={`${hotel.id}-${blockIndex}`}
                  pct={percentChanges[block.percentIndex][hotel.id]}
                  subRow
                />
              );
            })}
          </tr>
        ))}
    </>
  );
}

function HotelLabelCell({
  expanded,
  onToggle,
  muted,
}: {
  expanded: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        dataCell,
        groupStart,
        "font-medium",
        muted ? "text-slate-600" : "text-brand-foreground",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-1.5 text-left hover:text-brand"
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1 whitespace-normal leading-snug">
          Hotel (kWh)
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
    </td>
  );
}

function formatPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `${pct >= 0 ? "+" : ""}${formatNumber(pct, 1)}%`;
}

function percentTone(
  pct: number | null | undefined,
  solar?: boolean,
  neutral?: boolean,
): string {
  if (pct === null || pct === undefined) return "text-slate-500";
  if (pct === 0) return "text-slate-600";
  if (neutral) return "text-slate-700";
  if (solar) {
    return pct > 0 ? "text-green-600" : "text-red-600";
  }
  return pct > 0 ? "text-red-600" : "text-green-600";
}
