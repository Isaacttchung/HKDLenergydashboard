import {
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { Top10MeterSeries } from "@/lib/datastore/parsers/hkdl-top10-parser";
import { filterTop10EligibleMeters } from "@/lib/top10-exclusions";
import type {
  ParkVsHotelChartGranularity,
  Top10BuildingChart,
  Top10BuildingChartPoint,
  Top10BuildingChartSeries,
} from "@/lib/types";
import type { ResortTrendTimePreset } from "@/lib/resort-trend-chart-granularity";

export const TOP10_CHART_TITLE = "Top 10 - Building Consumption (kWh)";

const TOP10_COUNT = 10;

const TOP10_CUSTOM_DAY_LIMIT = 60;
const TOP10_CUSTOM_MONTH_LIMIT = 24;

export const TOP10_SERIES_COLORS = {
  minus2: "#1d70b8",
  minus1: "#ea580c",
  current: "#94a3b8",
  priorYear: "#ca8a04",
} as const;

interface PeriodSpec {
  id: string;
  color: string;
}

function resolveGranularity(
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
  if (daysInclusive <= TOP10_CUSTOM_DAY_LIMIT) {
    return "daily";
  }

  const monthsInclusive =
    differenceInMonths(startOfMonth(end), startOfMonth(start)) + 1;
  if (monthsInclusive <= TOP10_CUSTOM_MONTH_LIMIT) {
    return "monthly";
  }

  return "yearly";
}

function formatSumLabel(
  period: string,
  granularity: ParkVsHotelChartGranularity,
): string {
  if (granularity === "daily") {
    return `Sum of ${format(parseISO(period), "dd-MMM-yyyy")}`;
  }
  if (granularity === "monthly") {
    return `Sum of ${format(parseISO(`${period}-01`), "MMM-yyyy")}`;
  }
  return `Sum of ${period}`;
}

function buildDailyPeriodSpecs(anchorDay: string): PeriodSpec[] {
  const anchor = parseISO(anchorDay);
  const dayMinus1 = format(subDays(anchor, 1), "yyyy-MM-dd");
  const dayMinus2 = format(subDays(anchor, 2), "yyyy-MM-dd");
  const priorYearDay = format(subYears(anchor, 1), "yyyy-MM-dd");

  return [
    { id: dayMinus2, color: TOP10_SERIES_COLORS.minus2 },
    { id: dayMinus1, color: TOP10_SERIES_COLORS.minus1 },
    { id: anchorDay, color: TOP10_SERIES_COLORS.current },
    { id: priorYearDay, color: TOP10_SERIES_COLORS.priorYear },
  ];
}

function buildMonthlyPeriodSpecs(anchorMonth: string): PeriodSpec[] {
  const anchor = parseISO(`${anchorMonth}-01`);
  const monthMinus1 = format(subMonths(anchor, 1), "yyyy-MM");
  const monthMinus2 = format(subMonths(anchor, 2), "yyyy-MM");
  const priorYearMonth = format(subMonths(anchor, 12), "yyyy-MM");

  return [
    { id: monthMinus2, color: TOP10_SERIES_COLORS.minus2 },
    { id: monthMinus1, color: TOP10_SERIES_COLORS.minus1 },
    { id: anchorMonth, color: TOP10_SERIES_COLORS.current },
    { id: priorYearMonth, color: TOP10_SERIES_COLORS.priorYear },
  ];
}

function buildYearlyPeriodSpecs(anchorYear: string): PeriodSpec[] {
  const year = Number(anchorYear);
  return [
    { id: String(year - 2), color: TOP10_SERIES_COLORS.minus2 },
    { id: String(year - 1), color: TOP10_SERIES_COLORS.minus1 },
    { id: anchorYear, color: TOP10_SERIES_COLORS.current },
  ];
}

function resolveAnchor(
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  granularity: ParkVsHotelChartGranularity,
): string {
  if (granularity === "daily") {
    return timePreset === "day" ? summaryTo : summaryTo;
  }
  if (granularity === "monthly") {
    if (timePreset === "month") {
      return summaryFrom.slice(0, 7);
    }
    return summaryTo.slice(0, 7);
  }
  if (timePreset === "ytd") {
    return summaryFrom.slice(0, 4);
  }
  return summaryTo.slice(0, 4);
}

function readingOnDate(meter: Top10MeterSeries, date: string): number {
  return meter.readingsByDate[date] ?? 0;
}

function monthTotal(meter: Top10MeterSeries, monthKey: string): number {
  const start = startOfMonth(parseISO(`${monthKey}-01`));
  const end = endOfMonth(start);
  let total = 0;
  for (const day of eachDayOfInterval({ start, end })) {
    const date = format(day, "yyyy-MM-dd");
    total += meter.readingsByDate[date] ?? 0;
  }
  return total;
}

function yearTotal(meter: Top10MeterSeries, year: string): number {
  let total = 0;
  for (const [date, value] of Object.entries(meter.readingsByDate)) {
    if (date.startsWith(`${year}-`)) {
      total += value;
    }
  }
  return total;
}

function valueForPeriod(
  meter: Top10MeterSeries,
  periodId: string,
  granularity: ParkVsHotelChartGranularity,
): number {
  if (granularity === "daily") {
    return readingOnDate(meter, periodId);
  }
  if (granularity === "monthly") {
    return monthTotal(meter, periodId);
  }
  return yearTotal(meter, periodId);
}

function rankTopMeters(
  meters: Top10MeterSeries[],
  anchor: string,
  granularity: ParkVsHotelChartGranularity,
): Top10MeterSeries[] {
  return [...meters]
    .map((meter) => ({
      meter,
      score: valueForPeriod(meter, anchor, granularity),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP10_COUNT)
    .map((entry) => entry.meter);
}

function pickKwhTickStep(maxKwh: number): number {
  if (maxKwh <= 1_000) return 200;
  if (maxKwh <= 5_000) return 500;
  if (maxKwh <= 20_000) return 2_000;
  if (maxKwh <= 50_000) return 5_000;
  if (maxKwh <= 100_000) return 10_000;
  return 20_000;
}

function buildAxis(maxKwh: number): Top10BuildingChart["axis"] {
  const step = pickKwhTickStep(maxKwh);
  const leftMax = Math.max(step, Math.ceil(maxKwh / step) * step);
  const leftTicks: number[] = [];
  for (let value = 0; value <= leftMax; value += step) {
    leftTicks.push(value);
  }
  return { leftMax, leftTicks };
}

function classifyTop10LabelToken(token: string): "number" | "word" | "other" {
  const stripped = token.replace(/^[^\w\d]+|[^\w\d]+$/g, "");
  if (!stripped) return "other";
  const hasDigit = /\d/.test(stripped);
  const hasLetter = /[a-zA-Z]/.test(stripped);
  if (hasDigit) return "number";
  if (hasLetter) return "word";
  return "other";
}

/** Axis labels: up to three number tokens and two word tokens, then an ellipsis. */
export function truncateTop10AxisLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let numbers = 0;
  let words = 0;
  const kept: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const kind = classifyTop10LabelToken(token);

    if (kind === "number") {
      if (numbers >= 3) {
        return `${kept.join(" ")}…`;
      }
      numbers += 1;
      kept.push(token);
      continue;
    }

    if (kind === "word") {
      if (words >= 2) {
        return `${kept.join(" ")}…`;
      }
      words += 1;
      kept.push(token);
      continue;
    }

    if (kept.length > 0) {
      kept.push(token);
    }
  }

  return kept.join(" ") || trimmed;
}

function displayLocationLabel(location: string, meterId: string): string {
  const text = location.trim() || meterId;
  return truncateTop10AxisLabel(text);
}

export function buildTop10BuildingChart(
  top10: Top10MeterSeries[] | null | undefined,
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
): Top10BuildingChart | null {
  if (!top10 || top10.length === 0) {
    return null;
  }

  const eligibleMeters = filterTop10EligibleMeters(top10);
  if (eligibleMeters.length === 0) {
    return null;
  }

  const granularity = resolveGranularity(timePreset, summaryFrom, summaryTo);
  const anchor = resolveAnchor(
    timePreset,
    summaryFrom,
    summaryTo,
    granularity,
  );

  const periodSpecs =
    granularity === "daily"
      ? buildDailyPeriodSpecs(anchor)
      : granularity === "monthly"
        ? buildMonthlyPeriodSpecs(anchor)
        : buildYearlyPeriodSpecs(anchor);

  const ranked = rankTopMeters(eligibleMeters, anchor, granularity);
  if (ranked.length === 0) {
    return null;
  }

  const series: Top10BuildingChartSeries[] = periodSpecs.map((spec) => ({
    dataKey: spec.id,
    name: formatSumLabel(spec.id, granularity),
    color: spec.color,
  }));

  let maxKwh = 0;
  const data: Top10BuildingChartPoint[] = ranked.map((meter) => {
    const values: Record<string, number> = {};
    for (const spec of periodSpecs) {
      const value = valueForPeriod(meter, spec.id, granularity);
      values[spec.id] = value;
      maxKwh = Math.max(maxKwh, value);
    }

    const location = meter.location.trim() || meter.meterId;
    return {
      meterId: meter.meterId,
      label: displayLocationLabel(location, meter.meterId),
      fullLabel: location,
      ...values,
    };
  });

  return {
    title: TOP10_CHART_TITLE,
    granularity,
    anchor,
    series,
    data,
    axis: buildAxis(maxKwh),
  };
}
