import {
  differenceInDays,
  differenceInMonths,
  parseISO,
  startOfMonth,
} from "date-fns";
import { RESORT_TREND_CUSTOM_MONTH_LIMIT } from "@/lib/resort-trend-chart-granularity";
import type { ChartGranularity, TimePreset } from "@/lib/types";

/** Custom range (Electricity / Gas / Solar tabs): daily while span ≤ this many days (inclusive). */
export const MAIN_CHART_CUSTOM_DAY_LIMIT = 90;

export function getMainChartSpanGranularity(
  from: string,
  to: string,
): ChartGranularity {
  return granularityForSelectedSpan(from, to, MAIN_CHART_CUSTOM_DAY_LIMIT);
}

function granularityForSelectedSpan(
  from: string,
  to: string,
  dayLimit: number,
): ChartGranularity {
  const start = parseISO(from);
  const end = parseISO(to);
  const daysInclusive = differenceInDays(end, start) + 1;
  if (daysInclusive <= dayLimit) {
    return "daily";
  }

  const monthsInclusive =
    differenceInMonths(startOfMonth(end), startOfMonth(start)) + 1;
  if (monthsInclusive <= RESORT_TREND_CUSTOM_MONTH_LIMIT) {
    return "monthly";
  }

  return "yearly";
}

export function getConsumptionGranularity(
  timePreset: TimePreset,
  from: string,
  to: string,
  extendedTrendChart = false,
): ChartGranularity {
  if (extendedTrendChart) {
    if (timePreset === "day") return "daily";
    if (timePreset === "month") return "monthly";
    if (timePreset === "ytd") return "yearly";
  }

  if (timePreset === "day") return "by_installation";
  if (timePreset === "month") return "daily";

  return granularityForSelectedSpan(from, to, MAIN_CHART_CUSTOM_DAY_LIMIT);
}

export function getSolarGranularity(
  timePreset: TimePreset,
  from: string,
  to: string,
  extendedTrendChart = false,
): ChartGranularity {
  if (extendedTrendChart) {
    if (timePreset === "day") return "daily";
    if (timePreset === "month") return "monthly";
    if (timePreset === "ytd") return "yearly";
  }

  if (timePreset === "day") return "by_installation";
  if (timePreset === "month") return "daily";

  return granularityForSelectedSpan(from, to, MAIN_CHART_CUSTOM_DAY_LIMIT);
}
