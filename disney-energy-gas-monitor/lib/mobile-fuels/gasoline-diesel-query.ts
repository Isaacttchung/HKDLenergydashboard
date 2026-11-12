import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { MobileFuelMonthlyStore } from "@/lib/mobile-fuels/parse-gasoline-diesel-workbook";
import { loadGasolineDieselMonthlyStore } from "@/lib/mobile-fuels/gasoline-diesel-store";
import type { MobileFuelsSummary, TimePreset } from "@/lib/types";

const DIESEL_LABELS: Record<string, string> = {
  shuttle: "Shuttle",
  diesel_station: "Diesel station",
};

const GASOLINE_LABELS: Record<string, string> = {
  gasoline_station: "Gasoline station",
  train_station: "Train station",
};

function labelForKey(
  key: string,
  map: Record<string, string>,
): string {
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sumBuckets(
  store: MobileFuelMonthlyStore,
  months: string[],
): { diesel: Record<string, number>; gasoline: Record<string, number> } {
  const diesel: Record<string, number> = {};
  const gasoline: Record<string, number> = {};

  for (const ym of months) {
    const bucket = store[ym];
    if (!bucket) continue;
    for (const [k, v] of Object.entries(bucket.dieselByLocation)) {
      diesel[k] = (diesel[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(bucket.gasolineByLocation)) {
      gasoline[k] = (gasoline[k] ?? 0) + v;
    }
  }

  return { diesel, gasoline };
}

function monthsInRange(from: string, to: string): string[] {
  const start = parseISO(from.length === 7 ? `${from}-01` : from);
  const end = parseISO(to.length === 7 ? `${to}-01` : to);
  return eachMonthOfInterval({ start, end }).map((d) => format(d, "yyyy-MM"));
}

/** Custom ranges must start on the 1st and end on the last day of a month. */
export function isCalendarMonthAlignedRange(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return false;
  }
  const start = parseISO(from);
  const end = parseISO(to);
  if (end < start) return false;
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}

function emptyMobileFuelsSummary(
  options: { monthlyForDay?: boolean } = {},
): MobileFuelsSummary {
  return {
    dieselLiters: null,
    gasolineLiters: null,
    dieselBreakdown: [],
    gasolineBreakdown: [],
    isMonthlyGranularity: options.monthlyForDay ?? false,
  };
}

/** Every calendar month in the period must exist in the uploaded workbook store. */
export function everyMonthRecordedInStore(
  store: MobileFuelMonthlyStore,
  months: string[],
): boolean {
  if (months.length === 0) return false;
  return months.every((ym) => ym in store);
}

function summarizeRecordedMonths(
  store: MobileFuelMonthlyStore,
  months: string[],
  options: { monthlyForDay?: boolean } = {},
): MobileFuelsSummary {
  if (!everyMonthRecordedInStore(store, months)) {
    return emptyMobileFuelsSummary(options);
  }
  const { diesel, gasoline } = sumBuckets(store, months);
  return toSummary(diesel, gasoline, options);
}

function totalOf(map: Record<string, number>): number | null {
  const values = Object.values(map);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

function toSummary(
  diesel: Record<string, number>,
  gasoline: Record<string, number>,
  options: { monthlyForDay?: boolean } = {},
): MobileFuelsSummary {
  const dieselTotal = totalOf(diesel);
  const gasolineTotal = totalOf(gasoline);

  return {
    dieselLiters: dieselTotal,
    gasolineLiters: gasolineTotal,
    dieselBreakdown: Object.entries(diesel).map(([key, liters]) => ({
      label: labelForKey(key, DIESEL_LABELS),
      liters,
    })),
    gasolineBreakdown: Object.entries(gasoline).map(([key, liters]) => ({
      label: labelForKey(key, GASOLINE_LABELS),
      liters,
    })),
    isMonthlyGranularity: options.monthlyForDay ?? false,
  };
}

export async function getMobileFuelsSummary(
  timePreset: TimePreset,
  from: string,
  to: string,
): Promise<MobileFuelsSummary | null> {
  const store = await loadGasolineDieselMonthlyStore();
  if (Object.keys(store).length === 0) return null;

  if (timePreset === "custom") {
    if (!isCalendarMonthAlignedRange(from, to)) {
      return emptyMobileFuelsSummary();
    }
    const months = monthsInRange(from, to);
    return summarizeRecordedMonths(store, months);
  }

  if (timePreset === "day") {
    const ym = from.slice(0, 7);
    return summarizeRecordedMonths(store, [ym], { monthlyForDay: true });
  }

  const months = monthsInRange(from, to);
  return summarizeRecordedMonths(store, months);
}
