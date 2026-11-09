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
import type { PeriodContextSummary } from "@/lib/types";

interface PeriodContextCardsProps {
  dailyContext?: DailyContext | null;
  periodContext?: PeriodContextSummary | null;
  gasKwh?: number;
  gasUnits?: number;
  electricityKwh?: number;
  electricityLabel?: string;
}

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
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-0.5">
        <p className="text-xs text-slate-500">{label}</p>
        {labelExtra}
      </div>
      <p className={`text-xl font-semibold ${valueClassName ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
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

  const hasContextCards =
    outdoorTemp !== undefined ||
    ballroom !== undefined ||
    hotelOccupancy !== undefined ||
    sunshine !== undefined ||
    rainfall !== undefined;

  const hasEnergyRow = electricityKwh > 0 || hasGasConsumption;
  const showCombinedEnergy =
    electricityKwh > 0 && hasGasConsumption;
  const combinedEnergyKwh = electricityKwh + gasKwh;

  if (!hasContextCards && !hasEnergyRow) return null;

  const tempLabel = isPeriod ? "Avg Outdoor Temperature" : "Avg Outdoor Temperature";
  const ballroomLabel = isPeriod ? "Avg Ballroom Utilization" : "Ballroom Utilization";
  const occupancyLabel = isPeriod
    ? "Avg Overall Hotel Occupancy"
    : "Overall Hotel Occupancy";
  const sunshineLabel = isPeriod ? "Avg Sunshine" : "Sunshine";
  const gasLabel = isPeriod ? "Total Gas Consumption" : "Total Gas Consumption";

  return (
    <div className="space-y-4">
      {hasContextCards && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {outdoorTemp !== undefined && (
              <StatCard
                label={tempLabel}
                value={`${formatNumber(outdoorTemp, isPeriod ? 1 : 0)} °C`}
              />
            )}
            {sunshine !== undefined && (
              <StatCard
                label={sunshineLabel}
                value={`${formatNumber(sunshine, isPeriod ? 1 : 0)} hr`}
              />
            )}
            {rainfall !== undefined && (
              <StatCard
                label={isPeriod ? "Avg Rainfall" : "Rainfall"}
                value={`${formatNumber(rainfall, rainfall % 1 === 0 ? 0 : 1)} mm`}
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ballroom !== undefined && (
              <StatCard
                label={ballroomLabel}
                value={`${formatNumber(ballroom, isPeriod ? 1 : 0)}%`}
              />
            )}
            {hotelOccupancy !== undefined && (
              <StatCard
                label={occupancyLabel}
                value={`${formatNumber(hotelOccupancy, 1)}%`}
              />
            )}
          </div>
        </div>
      )}

      {hasEnergyRow && (
        <div
          className={`grid gap-4 ${showCombinedEnergy ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {electricityKwh > 0 && (
            <StatCard
              label={electricityLabel}
              value={`${formatNumber(electricityKwh)} kWh`}
            />
          )}
          {hasGasConsumption && (
            <StatCard
              label={gasLabel}
              labelExtra={
                <GasUnitMenu
                  unit={gasDisplayUnit}
                  onUnitChange={setGasDisplayUnit}
                />
              }
              value={
                gasDisplayUnit === "mj"
                  ? `${formatNumber(gasUnitsToMj(resolvedGasUnits))} MJ`
                  : `${formatNumber(gasKwh)} kWh`
              }
              sub={
                resolvedGasUnits >= 0 && (isPeriod || dailyContext?.gasUnits !== undefined)
                  ? `${formatNumber(resolvedGasUnits)} units`
                  : undefined
              }
            />
          )}
          {showCombinedEnergy && (
            <StatCard
              label="Total Electricity + Gas"
              value={`${formatNumber(combinedEnergyKwh)} kWh`}
            />
          )}
        </div>
      )}
    </div>
  );
}
