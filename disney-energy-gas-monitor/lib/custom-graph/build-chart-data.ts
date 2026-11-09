import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
  parseISO,
  differenceInDays,
  differenceInMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { getCustomGraphSeriesDefinition } from "@/lib/custom-graph/catalog";
import type {
  CustomGraphAxisConfig,
  CustomGraphChartPayload,
  CustomGraphDataPoint,
  CustomGraphSeriesMeta,
  CustomGraphUnit,
} from "@/lib/custom-graph/types";
import { buildDailyBreakdown } from "@/lib/executive-summary";
import type { DailyContext } from "@/lib/daily-context";
import type { EnergyRecord } from "@/lib/types";
import { readFile } from "fs/promises";
import path from "path";
import { formatIsoDateShort, formatIsoMonthShort } from "@/lib/date-display";

const SERIES_COLORS = [
  "#1d70b8",
  "#ea580c",
  "#059669",
  "#7c3aed",
  "#ca8a04",
  "#db2777",
  "#0d9488",
  "#64748b",
];

type DailyContextFile = Record<string, DailyContext>;

async function loadStaticContexts(): Promise<DailyContextFile> {
  const filePath = path.join(process.cwd(), "data", "daily-context.json");
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as DailyContextFile;
  } catch {
    return {};
  }
}

function resolveGranularity(
  from: string,
  to: string,
): "daily" | "monthly" | "yearly" {
  const start = parseISO(from);
  const end = parseISO(to);
  const days = differenceInDays(end, start) + 1;
  if (days <= 62) return "daily";
  const months =
    differenceInMonths(startOfMonth(end), startOfMonth(start)) + 1;
  if (months <= 24) return "monthly";
  return "yearly";
}

function bucketKeys(
  from: string,
  to: string,
  granularity: "daily" | "monthly" | "yearly",
): Array<{ period: string; label: string; dates: string[] }> {
  const start = parseISO(from);
  const end = parseISO(to);

  if (granularity === "daily") {
    return eachDayOfInterval({ start, end }).map((day) => {
      const period = format(day, "yyyy-MM-dd");
      return { period, label: formatIsoDateShort(period), dates: [period] };
    });
  }

  if (granularity === "monthly") {
    return eachMonthOfInterval({ start, end }).map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const rangeStart = monthStart < start ? start : monthStart;
      const rangeEnd = monthEnd > end ? end : monthEnd;
      const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(
        (d) => format(d, "yyyy-MM-dd"),
      );
      const period = format(monthStart, "yyyy-MM");
      return {
        period,
        label: formatIsoMonthShort(period),
        dates,
      };
    });
  }

  return eachYearOfInterval({ start, end }).map((yearStart) => {
    const year = format(yearStart, "yyyy");
    const yearEnd = parseISO(`${year}-12-31`);
    const rangeStart = yearStart < start ? start : yearStart;
    const rangeEnd = yearEnd > end ? end : yearEnd;
    const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(
      (d) => format(d, "yyyy-MM-dd"),
    );
    return { period: year, label: year, dates };
  });
}

function dailyValueForSeries(
  seriesId: string,
  date: string,
  records: EnergyRecord[],
  context: DailyContext,
): number | null {
  const breakdown = buildDailyBreakdown(records, date);

  switch (seriesId) {
    case "park":
      return breakdown.park || null;
    case "ccp":
      return breakdown.ccp || null;
    case "hccp":
      return breakdown.hccp || null;
    case "csb": {
      const v = records.find(
        (r) =>
          r.date === date && r.sourceId === "csb" && r.energyType === "electricity",
      )?.valueKwh;
      return v != null && v > 0 ? v : v === 0 ? 0 : null;
    }
    case "dhh":
      return breakdown.dhh || null;
    case "dlh":
      return breakdown.dlh || null;
    case "del":
      return breakdown.del || null;
    case "hotel-total":
      return breakdown.hotelTotal || null;
    case "resort-electricity":
      return breakdown.resortElectricityTotal || null;
    case "resort-gas-kwh":
      return breakdown.gasKwh || null;
    case "solar-total":
      return breakdown.solarTotal || null;
    case "gas-units":
      return context.gasUnits ?? null;
    case "outdoor-temp":
      return context.outdoorTempC ?? null;
    case "ballroom":
      return context.ballroomUtilizationPct ?? null;
    case "hotel-occupancy":
      return context.hotelOccupancyPct ?? null;
    case "dhh-occupancy":
      return context.dhhOccupancyPct ?? null;
    case "dlh-occupancy":
      return context.dlhOccupancyPct ?? null;
    case "del-occupancy":
      return context.delOccupancyPct ?? null;
    case "sunshine":
      return context.sunshineHours ?? null;
    case "rainfall":
      return context.rainfallMm ?? null;
    default:
      return null;
  }
}

function aggregateBucket(
  values: number[],
  seriesId: string,
  granularity: "daily" | "monthly" | "yearly",
): number | null {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return null;

  const sumSeries = new Set([
    "park",
    "ccp",
    "hccp",
    "csb",
    "dhh",
    "dlh",
    "del",
    "hotel-total",
    "resort-electricity",
    "resort-gas-kwh",
    "solar-total",
    "gas-units",
    "rainfall",
  ]);

  if (granularity === "daily") {
    return filtered[0] ?? null;
  }

  if (sumSeries.has(seriesId)) {
    return filtered.reduce((a, b) => a + b, 0);
  }

  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

const UNIT_DISPLAY_ORDER: CustomGraphUnit[] = [
  "kwh",
  "gas_units",
  "celsius",
  "percent",
  "hours",
  "mm",
];

function niceStep(span: number, unit: CustomGraphUnit): number {
  if (unit === "percent") return span <= 25 ? 5 : 10;
  if (unit === "celsius") return span <= 12 ? 2 : 5;
  if (unit === "mm") {
    if (span <= 5) return 1;
    if (span <= 20) return 2;
    return 5;
  }
  if (unit === "hours") return span <= 6 ? 1 : 2;
  if (unit === "gas_units") return 2000;
  const rough = span / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  return Math.max(pow, 1);
}

function buildTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let t = min; t <= max + step * 0.001; t += step) {
    ticks.push(Math.round(t * 1000) / 1000);
  }
  return ticks;
}

function computeAxisDomain(
  unit: CustomGraphUnit,
  values: number[],
): { min: number; max: number; ticks: number[] } {
  if (values.length === 0) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }

  let minV = Math.min(...values);
  let maxV = Math.max(...values);

  if (unit === "kwh" || unit === "gas_units") {
    const padded = maxV <= 0 ? 1 : maxV * 1.08;
    const step = niceStep(padded, unit);
    const max = Math.ceil(padded / step) * step;
    return { min: 0, max, ticks: buildTicks(0, max, step) };
  }

  if (unit === "percent") {
    if (minV === maxV) {
      minV = Math.max(0, minV - 5);
      maxV = Math.min(100, maxV + 5);
    } else {
      const pad = Math.max(2, (maxV - minV) * 0.08);
      minV = Math.max(0, minV - pad);
      maxV = Math.min(100, maxV + pad);
    }
    const span = Math.max(maxV - minV, 8);
    const step = niceStep(span, unit);
    const min = Math.floor(minV / step) * step;
    const max = Math.ceil(maxV / step) * step;
    return { min, max, ticks: buildTicks(min, max, step) };
  }

  if (unit === "celsius") {
    if (minV === maxV) {
      minV -= 3;
      maxV += 3;
    } else {
      minV -= 2;
      maxV += 2;
    }
    const span = maxV - minV;
    const step = niceStep(span, unit);
    const min = Math.floor(minV / step) * step;
    const max = Math.ceil(maxV / step) * step;
    return { min, max, ticks: buildTicks(min, max, step) };
  }

  if (unit === "mm") {
    minV = 0;
    if (maxV <= 0) maxV = 5;
    else maxV = maxV * 1.15 + 0.25;
    const step = niceStep(maxV, unit);
    const max = Math.ceil(maxV / step) * step;
    return { min: 0, max, ticks: buildTicks(0, max, step) };
  }

  if (unit === "hours") {
    minV = 0;
    maxV = maxV <= 0 ? 8 : maxV * 1.12 + 0.5;
    const step = niceStep(maxV, unit);
    const max = Math.ceil(maxV / step) * step;
    return { min: 0, max, ticks: buildTicks(0, max, step) };
  }

  return { min: 0, max: 1, ticks: [0, 1] };
}

function buildAxisConfig(
  unit: CustomGraphUnit,
  values: number[],
  orientation: "left" | "right",
): CustomGraphAxisConfig {
  const { min, max, ticks } = computeAxisDomain(unit, values);
  return {
    unit,
    label: unitAxisLabel(unit),
    min,
    max,
    ticks,
    orientation,
  };
}

function unitAxisLabel(unit: CustomGraphUnit): string {
  switch (unit) {
    case "kwh":
      return "kWh";
    case "gas_units":
      return "Gas units";
    case "celsius":
      return "°C";
    case "percent":
      return "%";
    case "hours":
      return "Hours";
    case "mm":
      return "mm";
  }
}

export async function buildCustomGraphChart(
  seriesIds: string[],
  from: string,
  to: string,
): Promise<CustomGraphChartPayload> {
  const validIds = seriesIds.filter((id) => getCustomGraphSeriesDefinition(id));
  if (validIds.length === 0) {
    throw new Error("No valid series selected");
  }

  const store = getDataStore();
  const [records, masterContexts, staticContexts] = await Promise.all([
    store.getRecords(),
    store.getDailyContexts(),
    loadStaticContexts(),
  ]);

  const granularity = resolveGranularity(from, to);
  const buckets = bucketKeys(from, to, granularity);

  const data: CustomGraphDataPoint[] = buckets.map((bucket) => {
    const point: CustomGraphDataPoint = {
      period: bucket.period,
      label: bucket.label,
    };

    for (const seriesId of validIds) {
      const dailyValues: number[] = [];
      for (const date of bucket.dates) {
        const context = {
          ...(staticContexts[date] ?? {}),
          ...(masterContexts[date] ?? {}),
        };
        const value = dailyValueForSeries(seriesId, date, records, context);
        if (value !== null) dailyValues.push(value);
      }
      point[seriesId] = aggregateBucket(dailyValues, seriesId, granularity);
    }

    return point;
  });

  const unitsPresent = new Set<CustomGraphUnit>();
  for (const id of validIds) {
    unitsPresent.add(getCustomGraphSeriesDefinition(id)!.unit);
  }

  const orderedUnits = UNIT_DISPLAY_ORDER.filter((unit) => unitsPresent.has(unit));

  const series: CustomGraphSeriesMeta[] = validIds.map((id, index) => {
    const def = getCustomGraphSeriesDefinition(id)!;
    return {
      id,
      label: def.label,
      unit: def.unit,
      unitLabel: def.unitLabel,
      color: SERIES_COLORS[index % SERIES_COLORS.length]!,
      yAxisId: def.unit,
    };
  });

  const valuesByUnit = new Map<CustomGraphUnit, number[]>();
  for (const unit of orderedUnits) {
    valuesByUnit.set(unit, []);
  }
  for (const point of data) {
    for (const meta of series) {
      const raw = point[meta.id];
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      valuesByUnit.get(meta.unit)?.push(raw);
    }
  }

  const axes: CustomGraphAxisConfig[] = orderedUnits.map((unit, index) =>
    buildAxisConfig(
      unit,
      valuesByUnit.get(unit) ?? [],
      index === 0 ? "left" : "right",
    ),
  );

  return {
    from,
    to,
    granularity,
    series,
    data,
    axes,
  };
}
