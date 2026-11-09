import { endOfMonth, format, parseISO } from "date-fns";
import { getPeriodContextSummary } from "@/lib/period-context";
import type { PeriodComparisonMode } from "@/lib/period-comparison/resolve-breakdown";
import { percentChange } from "@/lib/period-comparison/percent-change";
import {
  PERIOD_CONTEXT_METRIC_ROWS,
  type PeriodComparisonContextMetrics,
} from "@/lib/period-comparison/context-metric-rows";

export type { PeriodComparisonContextMetrics } from "@/lib/period-comparison/context-metric-rows";
export { PERIOD_CONTEXT_METRIC_ROWS } from "@/lib/period-comparison/context-metric-rows";

function summaryToMetrics(
  summary: Awaited<ReturnType<typeof getPeriodContextSummary>>,
): PeriodComparisonContextMetrics {
  if (!summary) return {};
  return {
    outdoorTempC: summary.outdoorTempCAvg,
    sunshineHours: summary.sunshineHoursAvg,
    rainfallMm: summary.rainfallMmAvg,
    ballroomUtilizationPct: summary.ballroomUtilizationPctAvg,
    hotelOccupancyPct: summary.hotelOccupancyPctAvg,
  };
}

export async function resolvePeriodContextMetrics(
  mode: PeriodComparisonMode,
  periodKey: string,
): Promise<PeriodComparisonContextMetrics> {
  let from = periodKey;
  let to = periodKey;

  if (mode === "month") {
    from = `${periodKey}-01`;
    to = format(endOfMonth(parseISO(from)), "yyyy-MM-dd");
  } else if (mode === "year") {
    from = `${periodKey}-01-01`;
    to = `${periodKey}-12-31`;
  }

  return summaryToMetrics(await getPeriodContextSummary(from, to));
}

export function computeContextPercentChanges(
  baseline: PeriodComparisonContextMetrics,
  comparison: PeriodComparisonContextMetrics,
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const row of PERIOD_CONTEXT_METRIC_ROWS) {
    const from = baseline[row.id];
    const to = comparison[row.id];
    if (from === undefined || to === undefined) {
      result[row.id] = null;
      continue;
    }
    result[row.id] = percentChange(from, to);
  }
  return result;
}
