import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { DailyContext } from "@/lib/daily-context";
import {
  formatIsoDateShort,
  formatIsoMonthShort,
  formatIsoRangeShort,
} from "@/lib/date-display";
import type {
  CcpComparisonChart,
  CcpComparisonPanel,
  CcpComparisonPoint,
  EnergyRecord,
  ParkVsHotelChartGranularity,
} from "@/lib/types";
import { clampIsoDate, DATA_MIN_DATE } from "@/lib/time-presets";
import type { ResortTrendTimePreset } from "@/lib/resort-trend-chart-granularity";

const KWH_TICK_STEP = 2000;
const TEMP_AXIS_MAX = 38;
const TEMP_AXIS_TICK_STEP = 2;

/** Custom range: daily bars when span is at most this many calendar days (inclusive). */
export const CCP_COMPARISON_CUSTOM_DAY_LIMIT = 60;

/** Custom range: monthly bars when span exceeds day limit but is at most this many months. */
export const CCP_COMPARISON_CUSTOM_MONTH_LIMIT = 24;

const DAY_LOOKBACK = 3;
const MONTH_LOOKBACK = 3;

export function ccpComparisonPanelTitle(kind: "lastYear" | "thisYear"): string {
  return kind === "lastYear"
    ? "CCP1 Consumption (kWh) Last Year"
    : "CCP1 Consumption (kWh) This Year";
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
  if (daysInclusive <= CCP_COMPARISON_CUSTOM_DAY_LIMIT) {
    return "daily";
  }

  const monthsInclusive =
    differenceInMonths(startOfMonth(end), startOfMonth(start)) + 1;
  if (monthsInclusive <= CCP_COMPARISON_CUSTOM_MONTH_LIMIT) {
    return "monthly";
  }

  return "yearly";
}

function resolvePanelWindows(
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string,
): {
  granularity: ParkVsHotelChartGranularity;
  thisYear: { from: string; to: string };
  lastYear: { from: string; to: string };
} | null {
  if (timePreset === "day") {
    const to = clampIsoDate(summaryTo, dataMinDate, summaryTo);
    const from = clampIsoDate(
      format(subDays(parseISO(to), DAY_LOOKBACK), "yyyy-MM-dd"),
      dataMinDate,
      to,
    );
    const thisYear = { from, to };
    const lastYear = {
      from: format(subYears(parseISO(from), 1), "yyyy-MM-dd"),
      to: format(subYears(parseISO(to), 1), "yyyy-MM-dd"),
    };
    return { granularity: "daily", thisYear, lastYear };
  }

  if (timePreset === "month") {
    const anchor = startOfMonth(parseISO(`${summaryFrom.slice(0, 7)}-01`));
    const chartEnd = endOfMonth(anchor);
    const chartStart = startOfMonth(subMonths(anchor, MONTH_LOOKBACK));
    const thisYear = {
      from: clampIsoDate(
        format(chartStart, "yyyy-MM-dd"),
        dataMinDate,
        format(chartEnd, "yyyy-MM-dd"),
      ),
      to: clampIsoDate(format(chartEnd, "yyyy-MM-dd"), dataMinDate, summaryTo),
    };
    const lastYear = {
      from: format(subYears(parseISO(thisYear.from), 1), "yyyy-MM-dd"),
      to: format(subYears(parseISO(thisYear.to), 1), "yyyy-MM-dd"),
    };
    return { granularity: "monthly", thisYear, lastYear };
  }

  if (timePreset === "ytd") {
    const selectedYear = summaryFrom.slice(0, 4);
    const previousYear = String(Number(selectedYear) - 1);
    const thisYear = {
      from: clampIsoDate(`${selectedYear}-01-01`, dataMinDate, summaryTo),
      to: clampIsoDate(`${selectedYear}-12-31`, dataMinDate, summaryTo),
    };
    const lastYear = {
      from: clampIsoDate(`${previousYear}-01-01`, dataMinDate, summaryTo),
      to: clampIsoDate(`${previousYear}-12-31`, dataMinDate, summaryTo),
    };
    return { granularity: "yearly", thisYear, lastYear };
  }

  const to = clampIsoDate(summaryTo, dataMinDate, summaryTo);
  const from = clampIsoDate(summaryFrom, dataMinDate, to);
  const granularity = resolveGranularity(timePreset, from, to);
  const thisYear = { from, to };
  const lastYear = {
    from: format(subYears(parseISO(from), 1), "yyyy-MM-dd"),
    to: format(subYears(parseISO(to), 1), "yyyy-MM-dd"),
  };
  return { granularity, thisYear, lastYear };
}

function bucketKey(
  date: string,
  granularity: ParkVsHotelChartGranularity,
): string {
  if (granularity === "daily") return date;
  if (granularity === "monthly") return date.slice(0, 7);
  return date.slice(0, 4);
}

function labelForPeriod(
  period: string,
  granularity: ParkVsHotelChartGranularity,
): string {
  if (granularity === "daily") return formatIsoDateShort(period);
  if (granularity === "monthly") return formatIsoMonthShort(period);
  return period;
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface BucketAgg {
  ccpKwh: number;
  temps: number[];
}

function accumulate(
  records: EnergyRecord[],
  contexts: Record<string, DailyContext>,
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
): Map<string, BucketAgg> {
  const bucketMap = new Map<string, BucketAgg>();

  for (const record of records) {
    if (record.energyType !== "electricity") continue;
    if (record.sourceId !== "ccp") continue;
    if (record.date < from || record.date > to) continue;

    const key = bucketKey(record.date, granularity);
    const agg = bucketMap.get(key) ?? { ccpKwh: 0, temps: [] };
    agg.ccpKwh += record.valueKwh;
    bucketMap.set(key, agg);
  }

  let cursor = parseISO(from);
  const end = parseISO(to);
  while (cursor <= end) {
    const date = format(cursor, "yyyy-MM-dd");
    const context = contexts[date];
    const key = bucketKey(date, granularity);
    const agg = bucketMap.get(key) ?? { ccpKwh: 0, temps: [] };

    if (context && typeof context.outdoorTempC === "number") {
      agg.temps.push(context.outdoorTempC);
    }

    bucketMap.set(key, agg);
    cursor = addDays(cursor, 1);
  }

  return bucketMap;
}

function finalizePoint(
  period: string,
  granularity: ParkVsHotelChartGranularity,
  agg: BucketAgg,
): CcpComparisonPoint {
  const outdoorTempC = average(agg.temps);

  return {
    period,
    label: labelForPeriod(period, granularity),
    ccpKwh: agg.ccpKwh,
    outdoorTempC,
  };
}

function buildPeriodSeries(
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
  bucketMap: Map<string, BucketAgg>,
): CcpComparisonPoint[] {
  const empty: BucketAgg = { ccpKwh: 0, temps: [] };
  const data: CcpComparisonPoint[] = [];

  if (granularity === "daily") {
    let cursor = parseISO(from);
    const end = parseISO(to);
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM-dd");
      data.push(
        finalizePoint(
          period,
          granularity,
          bucketMap.get(period) ?? empty,
        ),
      );
      cursor = addDays(cursor, 1);
    }
    return data;
  }

  if (granularity === "monthly") {
    let cursor = startOfMonth(parseISO(from));
    const end = startOfMonth(parseISO(`${to.slice(0, 7)}-01`));
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM");
      data.push(
        finalizePoint(
          period,
          granularity,
          bucketMap.get(period) ?? empty,
        ),
      );
      cursor = addMonths(cursor, 1);
    }
    return data;
  }

  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear; year += 1) {
    const period = String(year);
    data.push(
      finalizePoint(period, granularity, bucketMap.get(period) ?? empty),
    );
  }

  return data;
}

function pickDailyKwhTickStep(maxKwh: number): number {
  if (maxKwh <= 5_000) return 1_000;
  if (maxKwh <= 20_000) return 2_000;
  if (maxKwh <= 50_000) return 5_000;
  if (maxKwh <= 100_000) return 10_000;
  return 20_000;
}

function pickKwhTickStep(maxKwh: number): number {
  if (maxKwh <= 20_000) return KWH_TICK_STEP;
  if (maxKwh <= 100_000) return 10_000;
  if (maxKwh <= 500_000) return 25_000;
  if (maxKwh <= 2_000_000) return 50_000;
  return 100_000;
}

function buildTicks(max: number, step: number): number[] {
  const ceiling = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let value = 0; value <= ceiling; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function fixedTemperatureAxis(): {
  rightMax: number;
  rightTicks: number[];
} {
  const rightTicks: number[] = [];
  for (let value = 0; value <= TEMP_AXIS_MAX; value += TEMP_AXIS_TICK_STEP) {
    rightTicks.push(value);
  }
  return { rightMax: TEMP_AXIS_MAX, rightTicks };
}

function maxConsumptionKwh(data: CcpComparisonPoint[]): number {
  let maxKwh = 0;
  for (const point of data) {
    maxKwh = Math.max(maxKwh, point.ccpKwh);
  }
  return maxKwh;
}

export function computeCcpComparisonAxis(
  leftData: CcpComparisonPoint[],
  rightData: CcpComparisonPoint[],
  granularity: ParkVsHotelChartGranularity,
): CcpComparisonChart["axis"] {
  const maxKwh = Math.max(
    maxConsumptionKwh(leftData),
    maxConsumptionKwh(rightData),
  );

  const kwhStep =
    granularity === "daily"
      ? pickDailyKwhTickStep(maxKwh)
      : pickKwhTickStep(maxKwh);
  const leftMax = Math.max(kwhStep, Math.ceil(maxKwh / kwhStep) * kwhStep);
  const leftTicks = buildTicks(leftMax, kwhStep);
  const { rightMax, rightTicks } = fixedTemperatureAxis();

  return { leftMax, rightMax, leftTicks, rightTicks };
}

function buildPanel(
  kind: "lastYear" | "thisYear",
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
  records: EnergyRecord[],
  contexts: Record<string, DailyContext>,
): CcpComparisonPanel {
  const bucketMap = accumulate(records, contexts, from, to, granularity);
  const data = buildPeriodSeries(from, to, granularity, bucketMap);

  return {
    kind,
    title: ccpComparisonPanelTitle(kind),
    dateRangeLabel: formatIsoRangeShort(from, to),
    from,
    to,
    data,
  };
}

export function buildCcpComparisonChart(
  records: EnergyRecord[],
  contexts: Record<string, DailyContext>,
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): CcpComparisonChart | null {
  const resolved = resolvePanelWindows(
    timePreset,
    summaryFrom,
    summaryTo,
    dataMinDate,
  );

  if (!resolved) {
    return null;
  }

  const { granularity, thisYear, lastYear } = resolved;

  const leftPanel = buildPanel(
    "lastYear",
    lastYear.from,
    lastYear.to,
    granularity,
    records,
    contexts,
  );
  const rightPanel = buildPanel(
    "thisYear",
    thisYear.from,
    thisYear.to,
    granularity,
    records,
    contexts,
  );

  if (leftPanel.data.length === 0 && rightPanel.data.length === 0) {
    return null;
  }

  return {
    granularity,
    axis: computeCcpComparisonAxis(
      leftPanel.data,
      rightPanel.data,
      granularity,
    ),
    leftPanel,
    rightPanel,
  };
}
