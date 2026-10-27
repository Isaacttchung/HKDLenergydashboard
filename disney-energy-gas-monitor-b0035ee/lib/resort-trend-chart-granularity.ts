import {
  differenceInDays,
  differenceInMonths,
  parseISO,
  startOfMonth,
} from "date-fns";
import { resolveChartDateRange } from "@/lib/chart-date-range";
import type { ParkVsHotelChartGranularity, TimePreset } from "@/lib/types";
import { clampIsoDate, DATA_MIN_DATE } from "@/lib/time-presets";

/** Custom range: daily bars when the span is at most this many calendar days (inclusive). */
export const RESORT_TREND_CUSTOM_DAY_LIMIT = 60;

/** Custom range: monthly bars when span exceeds day limit but is at most this many calendar months. */
export const RESORT_TREND_CUSTOM_MONTH_LIMIT = 48;

export type ResortTrendTimePreset = Extract<
  TimePreset,
  "day" | "month" | "ytd" | "custom"
>;

export function resolveResortTrendGranularity(
  timePreset: ResortTrendTimePreset,
  from: string,
  to: string,
): ParkVsHotelChartGranularity {
  if (timePreset === "day") return "daily";
  if (timePreset === "month") return "monthly";
  if (timePreset === "ytd") return "yearly";

  const start = parseISO(from);
  const end = parseISO(to);
  const daysInclusive = differenceInDays(end, start) + 1;
  if (daysInclusive <= RESORT_TREND_CUSTOM_DAY_LIMIT) {
    return "daily";
  }

  const monthsInclusive =
    differenceInMonths(startOfMonth(end), startOfMonth(start)) + 1;
  if (monthsInclusive <= RESORT_TREND_CUSTOM_MONTH_LIMIT) {
    return "monthly";
  }

  return "yearly";
}

export function resolveResortTrendChartWindow(
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): { from: string; to: string } | null {
  if (timePreset === "custom") {
    const to = clampIsoDate(summaryTo, dataMinDate, summaryTo);
    const from = clampIsoDate(summaryFrom, dataMinDate, to);
    return { from, to };
  }

  return resolveChartDateRange(
    timePreset,
    summaryFrom,
    summaryTo,
    dataMinDate,
  );
}
