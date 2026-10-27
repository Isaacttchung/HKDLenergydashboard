import {
  addDays,
  addMonths,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { DailyContext } from "@/lib/daily-context";
import {
  resolveResortTrendChartWindow,
  resolveResortTrendGranularity,
  type ResortTrendTimePreset,
} from "@/lib/resort-trend-chart-granularity";
import { formatIsoDateShort, formatIsoMonthShort } from "@/lib/date-display";
import type {
  HccpGasChart,
  HccpGasChartPoint,
  ParkVsHotelChartGranularity,
} from "@/lib/types";
import { DATA_MIN_DATE } from "@/lib/time-presets";

const UNITS_TICK_STEP = 2000;
const METRICS_AXIS_MAX = 120;
const METRICS_AXIS_TICK_STEP = 20;

export function hccpGasChartTitle(
  granularity: ParkVsHotelChartGranularity,
): string {
  switch (granularity) {
    case "daily":
      return "Daily Gas Consumption of HCCP";
    case "monthly":
      return "Monthly Gas Consumption of HCCP";
    case "yearly":
      return "Yearly Gas Consumption of HCCP";
  }
}

interface BucketAgg {
  gasUnitValues: number[];
  temps: number[];
  occupancies: number[];
  ballrooms: number[];
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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function finalizeBucket(
  period: string,
  granularity: ParkVsHotelChartGranularity,
  agg: BucketAgg,
): HccpGasChartPoint {
  return {
    period,
    label: labelForPeriod(period, granularity),
    gasUnits: sum(agg.gasUnitValues),
    outdoorTempC: average(agg.temps),
    overallOccupancyPct: average(agg.occupancies),
    ballroomUtilization: average(agg.ballrooms),
  };
}

function accumulateContexts(
  contexts: Record<string, DailyContext>,
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
): Map<string, BucketAgg> {
  const bucketMap = new Map<string, BucketAgg>();

  let cursor = parseISO(from);
  const end = parseISO(to);
  while (cursor <= end) {
    const date = format(cursor, "yyyy-MM-dd");
    const context = contexts[date];
    const key = bucketKey(date, granularity);

    const agg = bucketMap.get(key) ?? {
      gasUnitValues: [],
      temps: [],
      occupancies: [],
      ballrooms: [],
    };

    if (context) {
      if (typeof context.gasUnits === "number") {
        agg.gasUnitValues.push(context.gasUnits);
      }
      if (typeof context.outdoorTempC === "number") {
        agg.temps.push(context.outdoorTempC);
      }
      if (typeof context.hotelOccupancyPct === "number") {
        agg.occupancies.push(context.hotelOccupancyPct);
      }
      if (typeof context.ballroomUtilizationPct === "number") {
        agg.ballrooms.push(context.ballroomUtilizationPct);
      }
    }

    bucketMap.set(key, agg);
    cursor = addDays(cursor, 1);
  }

  return bucketMap;
}

function buildPeriodSeries(
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
  bucketMap: Map<string, BucketAgg>,
): HccpGasChartPoint[] {
  const empty: BucketAgg = {
    gasUnitValues: [],
    temps: [],
    occupancies: [],
    ballrooms: [],
  };
  const data: HccpGasChartPoint[] = [];

  if (granularity === "daily") {
    let cursor = parseISO(from);
    const end = parseISO(to);
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM-dd");
      data.push(
        finalizeBucket(
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
        finalizeBucket(
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
      finalizeBucket(period, granularity, bucketMap.get(period) ?? empty),
    );
  }

  return data;
}

function pickDailyGasUnitsTickStep(maxUnits: number): number {
  if (maxUnits <= 500) return 100;
  if (maxUnits <= 2_000) return 200;
  if (maxUnits <= 5_000) return 500;
  if (maxUnits <= 10_000) return 1_000;
  return UNITS_TICK_STEP;
}

function pickGasUnitsTickStep(maxUnits: number): number {
  if (maxUnits <= 20_000) return UNITS_TICK_STEP;
  if (maxUnits <= 100_000) return 10_000;
  if (maxUnits <= 500_000) return 25_000;
  if (maxUnits <= 2_000_000) return 50_000;
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

function fixedMetricsAxisTicks(): number[] {
  const ticks: number[] = [];
  for (
    let value = 0;
    value <= METRICS_AXIS_MAX;
    value += METRICS_AXIS_TICK_STEP
  ) {
    ticks.push(value);
  }
  return ticks;
}

function maxMetricsValue(point: HccpGasChartPoint): number {
  let max = 0;
  if (point.outdoorTempC != null) {
    max = Math.max(max, point.outdoorTempC);
  }
  if (point.overallOccupancyPct != null) {
    max = Math.max(max, point.overallOccupancyPct);
  }
  if (point.ballroomUtilization != null) {
    max = Math.max(max, point.ballroomUtilization);
  }
  return max;
}

function pickMetricsTickStep(maxMetric: number): number {
  if (maxMetric <= 40) return 10;
  if (maxMetric <= 120) return METRICS_AXIS_TICK_STEP;
  return 25;
}

function buildDynamicMetricsAxis(maxMetric: number): {
  rightMax: number;
  rightTicks: number[];
} {
  if (maxMetric <= 0) {
    return {
      rightMax: METRICS_AXIS_MAX,
      rightTicks: fixedMetricsAxisTicks(),
    };
  }

  const step = pickMetricsTickStep(maxMetric);
  const rightMax = Math.max(step, Math.ceil(maxMetric / step) * step);

  return {
    rightMax,
    rightTicks: buildTicks(rightMax, step),
  };
}

export function computeHccpGasDualAxis(
  data: HccpGasChartPoint[],
  granularity: ParkVsHotelChartGranularity,
): {
  leftMax: number;
  rightMax: number;
  leftTicks: number[];
  rightTicks: number[];
} {
  let maxGas = 0;
  let maxMetric = 0;

  for (const point of data) {
    maxGas = Math.max(maxGas, point.gasUnits);
    maxMetric = Math.max(maxMetric, maxMetricsValue(point));
  }

  if (granularity === "daily") {
    const unitsStep = pickDailyGasUnitsTickStep(maxGas);
    const leftMax = Math.max(
      unitsStep,
      Math.ceil(maxGas / unitsStep) * unitsStep,
    );
    const leftTicks = buildTicks(leftMax, unitsStep);
    const { rightMax, rightTicks } = buildDynamicMetricsAxis(maxMetric);

    return {
      leftMax,
      rightMax,
      leftTicks,
      rightTicks,
    };
  }

  const unitsStep = pickGasUnitsTickStep(maxGas);
  const leftMax = Math.max(
    unitsStep,
    Math.ceil(maxGas / unitsStep) * unitsStep,
  );
  const leftTicks = buildTicks(leftMax, unitsStep);
  const rightTicks = fixedMetricsAxisTicks();

  return {
    leftMax,
    rightMax: METRICS_AXIS_MAX,
    leftTicks,
    rightTicks,
  };
}

export function buildHccpGasChart(
  contexts: Record<string, DailyContext>,
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): HccpGasChart {
  const granularity = resolveResortTrendGranularity(
    timePreset,
    summaryFrom,
    summaryTo,
  );
  const window = resolveResortTrendChartWindow(
    timePreset,
    summaryFrom,
    summaryTo,
    dataMinDate,
  );

  if (!window) {
    return {
      from: summaryFrom,
      to: summaryTo,
      granularity,
      data: [],
      axis: computeHccpGasDualAxis([], granularity),
    };
  }

  const { from, to } = window;
  const bucketMap = accumulateContexts(contexts, from, to, granularity);
  const data = buildPeriodSeries(from, to, granularity, bucketMap);

  return {
    from,
    to,
    granularity,
    data,
    axis: computeHccpGasDualAxis(data, granularity),
  };
}
