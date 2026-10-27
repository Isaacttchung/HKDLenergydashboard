import {
  addDays,
  addMonths,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  resolveResortTrendChartWindow,
  resolveResortTrendGranularity,
  type ResortTrendTimePreset,
} from "@/lib/resort-trend-chart-granularity";
import { formatIsoDateShort, formatIsoMonthShort } from "@/lib/date-display";
import type {
  EnergyRecord,
  HotelsKwhChart,
  ParkVsHotelChartGranularity,
} from "@/lib/types";
import { DATA_MIN_DATE } from "@/lib/time-presets";

export function hotelsKwhChartTitle(
  granularity: ParkVsHotelChartGranularity,
): string {
  switch (granularity) {
    case "daily":
      return "Hotel's Daily kWh";
    case "monthly":
      return "Hotel's Monthly kWh";
    case "yearly":
      return "Hotel's Yearly kWh";
  }
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

type HotelBucket = { dhh: number; dlh: number; del: number };

function accumulateRecords(
  records: EnergyRecord[],
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
): Map<string, HotelBucket> {
  const bucketMap = new Map<string, HotelBucket>();

  for (const record of records) {
    if (record.energyType !== "electricity") continue;
    if (record.date < from || record.date > to) continue;

    const key = bucketKey(record.date, granularity);
    const bucket = bucketMap.get(key) ?? { dhh: 0, dlh: 0, del: 0 };

    if (record.sourceId === "dhh") {
      bucket.dhh += record.valueKwh;
    } else if (record.sourceId === "dlh") {
      bucket.dlh += record.valueKwh;
    } else if (record.sourceId === "del") {
      bucket.del += record.valueKwh;
    } else {
      continue;
    }

    bucketMap.set(key, bucket);
  }

  return bucketMap;
}

function buildPeriodSeries(
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
  bucketMap: Map<string, HotelBucket>,
) {
  const data = [];
  const empty: HotelBucket = { dhh: 0, dlh: 0, del: 0 };

  if (granularity === "daily") {
    let cursor = parseISO(from);
    const end = parseISO(to);
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM-dd");
      const values = bucketMap.get(period) ?? empty;
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        ...values,
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
      const values = bucketMap.get(period) ?? empty;
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        ...values,
      });
      cursor = addMonths(cursor, 1);
    }
    return data;
  }

  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear; year += 1) {
    const period = String(year);
    const values = bucketMap.get(period) ?? empty;
    data.push({
      period,
      label: labelForPeriod(period, granularity),
      ...values,
    });
  }

  return data;
}

export function buildHotelsKwhChart(
  records: EnergyRecord[],
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): HotelsKwhChart {
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
    };
  }

  const { from, to } = window;
  const bucketMap = accumulateRecords(records, from, to, granularity);
  const data = buildPeriodSeries(from, to, granularity, bucketMap);

  return { from, to, granularity, data };
}
