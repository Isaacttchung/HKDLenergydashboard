import { endOfMonth, format, parseISO } from "date-fns";
import { buildDailyBreakdown } from "@/lib/executive-summary";
import {
  buildMonthlyReportSummary,
  buildYearlyReportSummary,
} from "@/lib/period-report-summary";
import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import type { DailyBreakdown, EnergyRecord } from "@/lib/types";

export type PeriodComparisonMode = "day" | "month" | "year";

export interface ResolvedPeriodBreakdown {
  periodKey: string;
  label: string;
  breakdown: DailyBreakdown;
}

function formatDayLabel(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function resolvePeriodBreakdown(
  mode: PeriodComparisonMode,
  periodKey: string,
  records: EnergyRecord[],
  solarIndex?: SolarInstallationIndex,
): ResolvedPeriodBreakdown {
  if (mode === "day") {
    return {
      periodKey,
      label: formatDayLabel(periodKey),
      breakdown: buildDailyBreakdown(records, periodKey, solarIndex),
    };
  }

  if (mode === "month") {
    const from = `${periodKey}-01`;
    const to = format(endOfMonth(parseISO(from)), "yyyy-MM-dd");
    const summary = buildMonthlyReportSummary(records, from, to, solarIndex);
    return {
      periodKey,
      label: formatMonthLabel(periodKey),
      breakdown: summary.totals,
    };
  }

  const from = `${periodKey}-01-01`;
  const to = `${periodKey}-12-31`;
  const summary = buildYearlyReportSummary(records, from, to, solarIndex);
  return {
    periodKey,
    label: periodKey,
    breakdown: summary.totals,
  };
}

export function fullResortTableTitle(label: string): string {
  return `Full resort data ${label}`;
}
