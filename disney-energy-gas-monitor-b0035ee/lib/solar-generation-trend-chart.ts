import {
  addDays,
  addMonths,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { DailyContext } from "@/lib/daily-context";
import { getMainChartSpanGranularity } from "@/lib/chart-granularity";
import { resolveChartDateRange } from "@/lib/chart-date-range";
import { formatIsoDateShort, formatIsoMonthShort } from "@/lib/date-display";
import { resolveResortTrendChartWindow } from "@/lib/resort-trend-chart-granularity";
import type {
  EnergyRecord,
  ParkVsHotelChartGranularity,
  SolarGenerationTrendChart,
  TimePreset,
} from "@/lib/types";
import { DATA_MIN_DATE } from "@/lib/time-presets";

const KWH_TICK_STEP = 2000;

export function solarGenerationChartTitle(
  granularity: ParkVsHotelChartGranularity,
): string {
  switch (granularity) {
    case "daily":
      return "Daily Solar Energy Generation";
    case "monthly":
      return "Monthly Solar Energy Generation";
    case "yearly":
      return "Yearly Solar Energy Generation";
  }
}

type SolarTrendTimePreset = Extract<
  TimePreset,
  "day" | "month" | "ytd" | "custom"
>;

interface BucketAgg {
  generationValues: number[];
  sunshineValues: number[];
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

function sumGeneration(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0);
}

function totalSunshineHours(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0);
}

function resolveWindowAndGranularity(
  timePreset: SolarTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string,
): { from: string; to: string; granularity: ParkVsHotelChartGranularity } | null {
  if (timePreset === "custom") {
    const window = resolveResortTrendChartWindow(
      timePreset,
      summaryFrom,
      summaryTo,
      dataMinDate,
    );
    if (!window) return null;
    const spanGranularity = getMainChartSpanGranularity(
      window.from,
      window.to,
    );
    return {
      ...window,
      granularity: spanGranularity as ParkVsHotelChartGranularity,
    };
  }

  const window = resolveChartDateRange(
    timePreset,
    summaryFrom,
    summaryTo,
    dataMinDate,
  );
  if (!window) return null;

  const granularity: ParkVsHotelChartGranularity =
    timePreset === "day"
      ? "daily"
      : timePreset === "month"
        ? "monthly"
        : "yearly";

  return { ...window, granularity };
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
    if (record.energyType !== "solar") continue;
    if (record.sourceId !== "solar-total") continue;
    if (record.date < from || record.date > to) continue;

    const key = bucketKey(record.date, granularity);
    const agg = bucketMap.get(key) ?? {
      generationValues: [],
      sunshineValues: [],
    };
    agg.generationValues.push(record.valueKwh);
    bucketMap.set(key, agg);
  }

  let cursor = parseISO(from);
  const end = parseISO(to);
  while (cursor <= end) {
    const date = format(cursor, "yyyy-MM-dd");
    const context = contexts[date];
    const key = bucketKey(date, granularity);
    const agg = bucketMap.get(key) ?? {
      generationValues: [],
      sunshineValues: [],
    };

    if (context && typeof context.sunshineHours === "number") {
      agg.sunshineValues.push(context.sunshineHours);
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
) {
  const empty: BucketAgg = { generationValues: [], sunshineValues: [] };
  const data = [];

  if (granularity === "daily") {
    let cursor = parseISO(from);
    const end = parseISO(to);
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM-dd");
      const agg = bucketMap.get(period) ?? empty;
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        generationKwh: sumGeneration(agg.generationValues),
        sunshineHours: totalSunshineHours(agg.sunshineValues),
      });
      cursor = addDays(cursor, 1);
    }
    return data;
  }

  if (granularity === "monthly") {
    let cursor = startOfMonth(parseISO(from));
    const end = startOfMonth(parseISO(`${to.slice(0, 7)}-01`));
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM");
      const agg = bucketMap.get(period) ?? empty;
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        generationKwh: sumGeneration(agg.generationValues),
        sunshineHours: totalSunshineHours(agg.sunshineValues),
      });
      cursor = addMonths(cursor, 1);
    }
    return data;
  }

  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear; year += 1) {
    const period = String(year);
    const agg = bucketMap.get(period) ?? empty;
    data.push({
      period,
      label: labelForPeriod(period, granularity),
      generationKwh: sumGeneration(agg.generationValues),
      sunshineHours: totalSunshineHours(agg.sunshineValues),
    });
  }

  return data;
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

export function computeSolarDualAxis(
  data: SolarGenerationTrendChart["data"],
  granularity: ParkVsHotelChartGranularity,
): SolarGenerationTrendChart["axis"] {
  let maxGeneration = 0;
  let maxSunshine = 0;

  for (const point of data) {
    maxGeneration = Math.max(maxGeneration, point.generationKwh);
    if (point.sunshineHours != null) {
      maxSunshine = Math.max(maxSunshine, point.sunshineHours);
    }
  }

  if (granularity === "daily") {
    const neededLeft = Math.max(maxGeneration, maxSunshine * 1000);
    const leftMax = Math.max(
      KWH_TICK_STEP,
      Math.ceil(neededLeft / KWH_TICK_STEP) * KWH_TICK_STEP,
    );
    const leftTicks = buildTicks(leftMax, KWH_TICK_STEP);
    const rightMax = leftMax / 1000;

    return {
      leftMax,
      rightMax,
      leftTicks,
      rightTicks: leftTicks.map((value) => value / 1000),
    };
  }

  const kwhStep = pickKwhTickStep(maxGeneration);
  const leftMax = Math.max(
    kwhStep,
    Math.ceil(maxGeneration / kwhStep) * kwhStep,
  );
  const leftTicks = buildTicks(leftMax, kwhStep);

  const sunshineStep = granularity === "yearly" ? 250 : 50;
  const rightMax = Math.max(
    sunshineStep,
    Math.ceil(maxSunshine / sunshineStep) * sunshineStep,
  );
  const rightTicks = buildTicks(rightMax, sunshineStep);

  return {
    leftMax,
    rightMax,
    leftTicks,
    rightTicks,
  };
}

export function buildSolarGenerationTrendChart(
  records: EnergyRecord[],
  contexts: Record<string, DailyContext>,
  timePreset: SolarTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): SolarGenerationTrendChart {
  const resolved = resolveWindowAndGranularity(
    timePreset,
    summaryFrom,
    summaryTo,
    dataMinDate,
  );

  if (!resolved) {
    return {
      from: summaryFrom,
      to: summaryTo,
      granularity: "daily",
      data: [],
      axis: computeSolarDualAxis([], "daily"),
    };
  }

  const { from, to, granularity } = resolved;
  const bucketMap = accumulate(records, contexts, from, to, granularity);
  const data = buildPeriodSeries(from, to, granularity, bucketMap);

  return {
    from,
    to,
    granularity,
    data,
    axis: computeSolarDualAxis(data, granularity),
  };
}
