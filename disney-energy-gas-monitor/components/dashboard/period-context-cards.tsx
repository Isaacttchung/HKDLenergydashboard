"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { gasUnitsToMj } from "@/lib/datastore/parsers/excel-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatNumber } from "@/lib/utils";
import type { DailyContext } from "@/lib/daily-context";
import type {
  MobileFuelBreakdownLine,
  MobileFuelsSummary,
  PeriodContextSummary,
} from "@/lib/types";

interface PeriodContextCardsProps {
  dailyContext?: DailyContext | null;
  periodContext?: PeriodContextSummary | null;
  mobileFuels?: MobileFuelsSummary | null;
  gasKwh?: number;
  gasUnits?: number;
  electricityKwh?: number;
  electricityLabel?: string;
}

const NA_VALUE = "N/A";

function StatCard({
  label,
  labelExtra,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  labelExtra?: ReactNode;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  const isNa = value === NA_VALUE;
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-0.5">
        <p className="text-xs text-slate-500">{label}</p>
        {labelExtra}
      </div>
      <p
        className={cn(
          "text-xl font-semibold",
          isNa ? "text-slate-400" : (valueClassName ?? ""),
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function formatOptionalNumber(
  value: number | undefined,
  format: (n: number) => string,
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return NA_VALUE;
  }
  return format(value);
}

const DEFAULT_GASOLINE_BREAKDOWN: MobileFuelBreakdownLine[] = [
  { label: "Gasoline station", liters: 0 },
  { label: "Train station", liters: 0 },
];

const DEFAULT_DIESEL_BREAKDOWN: MobileFuelBreakdownLine[] = [
  { label: "Shuttle", liters: 0 },
  { label: "Diesel station", liters: 0 },
];

function MobileFuelStatCard({
  label,
  value,
  breakdown,
  fallbackBreakdown,
  ariaLabel,
}: {
  label: string;
  value: string;
  breakdown: MobileFuelBreakdownLine[];
  fallbackBreakdown: MobileFuelBreakdownLine[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const isNa = value === NA_VALUE;
  const lines = breakdown.length > 0 ? breakdown : fallbackBreakdown;
  const showBreakdown =
    breakdown.length > 0 || fallbackBreakdown.length > 0;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex min-w-0 items-start gap-1">
        {showBreakdown ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex max-w-full items-center gap-1 text-left text-xs text-slate-500 hover:text-slate-800"
                aria-label={ariaLabel}
                aria-expanded={open}
              >
                <span className="min-w-0 leading-snug">{label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="z-50 w-56 p-2">
              <ul className="space-y-1.5 text-xs text-slate-700">
                {lines.map((line) => (
                  <li
                    key={line.label}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-slate-600">{line.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {isNa ? NA_VALUE : `${formatNumber(line.liters)} L`}
                    </span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <p className="text-xs text-slate-500">{label}</p>
        )}
      </div>
      <p
        className={cn(
          "text-xl font-semibold",
          isNa ? "text-slate-400" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatFuelLiters(liters: number | null | undefined): string {
  if (liters === null || liters === undefined || !Number.isFinite(liters)) {
    return NA_VALUE;
  }
  return `${formatNumber(liters)} L`;
}

function GasUnitMenu({
  unit,
  onUnitChange,
}: {
  unit: "kwh" | "mj";
  onUnitChange: (unit: "kwh" | "mj") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Choose gas consumption unit"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-28 p-1">
        {(["mj", "kwh"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "flex w-full rounded px-2 py-1.5 text-left text-xs font-medium",
              unit === option
                ? "bg-brand-light text-brand-foreground"
                : "text-slate-700 hover:bg-slate-50",
            )}
            onClick={() => {
              onUnitChange(option);
              setOpen(false);
            }}
          >
            {option === "kwh" ? "kWh" : "MJ"}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function PeriodContextCards({
  dailyContext,
  periodContext,
  mobileFuels = null,
  gasKwh = 0,
  gasUnits = 0,
  electricityKwh = 0,
  electricityLabel = "Total Electricity Usage",
}: PeriodContextCardsProps) {
  const [gasDisplayUnit, setGasDisplayUnit] = useState<"kwh" | "mj">("mj");
  const isPeriod = Boolean(periodContext);
  const outdoorTemp = isPeriod
    ? periodContext?.outdoorTempCAvg
    : dailyContext?.outdoorTempC;
  const ballroom = isPeriod
    ? periodContext?.ballroomUtilizationPctAvg
    : dailyContext?.ballroomUtilizationPct;
  const hotelOccupancy = isPeriod
    ? periodContext?.hotelOccupancyPctAvg
    : dailyContext?.hotelOccupancyPct;
  const sunshine = isPeriod
    ? periodContext?.sunshineHoursAvg
    : dailyContext?.sunshineHours;
  const rainfall = isPeriod
    ? periodContext?.rainfallMmAvg
    : dailyContext?.rainfallMm;

  const resolvedGasUnits = isPeriod
    ? (periodContext?.gasUnitsTotal ?? gasUnits)
    : (dailyContext?.gasUnits ?? gasUnits);

  const hasGasConsumption = isPeriod
    ? (periodContext?.daysWithGasReadings ?? 0) > 0 || gasKwh > 0
    : dailyContext?.gasUnits !== undefined;

  const showContextMetrics = isPeriod || dailyContext != null;
  const hasEnergyRow =
    isPeriod || electricityKwh > 0 || hasGasConsumption;
  const showCombinedEnergy =
    electricityKwh > 0 && hasGasConsumption;
  const combinedEnergyKwh = electricityKwh + gasKwh;

  const showMobileFuelRow = true;
  if (!showContextMetrics && !hasEnergyRow && !showMobileFuelRow) return null;

  const tempLabel = isPeriod ? "Avg Outdoor Temperature" : "Avg Outdoor Temperature";
  const ballroomLabel = isPeriod ? "Avg Ballroom Utilization" : "Ballroom Utilization";
  const occupancyLabel = isPeriod
    ? "Avg Overall Hotel Occupancy"
    : "Overall Hotel Occupancy";
  const sunshineLabel = isPeriod ? "Avg Sunshine" : "Sunshine";
  const rainfallLabel = isPeriod ? "Avg Rainfall" : "Rainfall";
  const gasLabel = isPeriod ? "Total Gas Consumption" : "Total Gas Consumption";
  const gasolineLabel =
    !isPeriod && mobileFuels?.isMonthlyGranularity
      ? "Total Gasoline Usage (Monthly)"
      : "Total Gasoline Usage";
  const dieselLabel =
    !isPeriod && mobileFuels?.isMonthlyGranularity
      ? "Total Diesel Usage (Monthly)"
      : "Total Diesel Usage";
  const gasolineValue = formatFuelLiters(mobileFuels?.gasolineLiters);
  const dieselValue = formatFuelLiters(mobileFuels?.dieselLiters);
  const gasolineBreakdown = mobileFuels?.gasolineBreakdown ?? [];
  const dieselBreakdown = mobileFuels?.dieselBreakdown ?? [];

  const gasPrimaryValue =
    !hasGasConsumption
      ? NA_VALUE
      : gasDisplayUnit === "mj"
        ? `${formatNumber(gasUnitsToMj(resolvedGasUnits))} MJ`
        : `${formatNumber(gasKwh)} kWh`;

  const gasSub =
    hasGasConsumption &&
    resolvedGasUnits >= 0 &&
    (isPeriod || dailyContext?.gasUnits !== undefined)
      ? `${formatNumber(resolvedGasUnits)} units`
      : undefined;

  return (
    <div className="space-y-4">
      {showContextMetrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tempLabel}
            value={formatOptionalNumber(outdoorTemp, (n) =>
              `${formatNumber(n, isPeriod ? 1 : 0)} °C`,
            )}
          />
          <StatCard
            label={sunshineLabel}
            value={formatOptionalNumber(sunshine, (n) =>
              `${formatNumber(n, isPeriod ? 1 : 0)} hr`,
            )}
          />
          <StatCard
            label={ballroomLabel}
            value={formatOptionalNumber(ballroom, (n) =>
              `${formatNumber(n, isPeriod ? 1 : 0)}%`,
            )}
          />
          <StatCard
            label={occupancyLabel}
            value={formatOptionalNumber(hotelOccupancy, (n) =>
              `${formatNumber(n, 1)}%`,
            )}
          />
        </div>
      )}

      {showMobileFuelRow && (
        <div className="grid gap-4 sm:grid-cols-3">
          {showContextMetrics && (
            <StatCard
              label={rainfallLabel}
              value={formatOptionalNumber(rainfall, (n) =>
                `${formatNumber(n, n % 1 === 0 ? 0 : 1)} mm`,
              )}
            />
          )}
          {!showContextMetrics && (
            <StatCard label={rainfallLabel} value={NA_VALUE} />
          )}
          <MobileFuelStatCard
            label={gasolineLabel}
            value={gasolineValue}
            breakdown={gasolineBreakdown}
            fallbackBreakdown={DEFAULT_GASOLINE_BREAKDOWN}
            ariaLabel="Show gasoline usage by location"
          />
          <MobileFuelStatCard
            label={dieselLabel}
            value={dieselValue}
            breakdown={dieselBreakdown}
            fallbackBreakdown={DEFAULT_DIESEL_BREAKDOWN}
            ariaLabel="Show diesel usage by location"
          />
        </div>
      )}

      {hasEnergyRow && (
        <div
          className={`grid gap-4 ${isPeriod || showCombinedEnergy ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          <StatCard
            label={electricityLabel}
            value={
              electricityKwh > 0
                ? `${formatNumber(electricityKwh)} kWh`
                : NA_VALUE
            }
          />
          <StatCard
            label={gasLabel}
            labelExtra={
              hasGasConsumption ? (
                <GasUnitMenu
                  unit={gasDisplayUnit}
                  onUnitChange={setGasDisplayUnit}
                />
              ) : undefined
            }
            value={gasPrimaryValue}
            sub={gasSub}
          />
          {(isPeriod || showCombinedEnergy) && (
            <StatCard
              label="Total Electricity + Gas"
              value={
                showCombinedEnergy
                  ? `${formatNumber(combinedEnergyKwh)} kWh`
                  : NA_VALUE
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
