import {
  addDays,
  addMonths,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { formatIsoDateShort, formatIsoMonthShort } from "@/lib/date-display";
import {
  resolveResortTrendChartWindow,
  resolveResortTrendGranularity,
  type ResortTrendTimePreset,
} from "@/lib/resort-trend-chart-granularity";
import type {
  EnergyRecord,
  ParkVsHotelChart,
  ParkVsHotelChartGranularity,
} from "@/lib/types";
import { DATA_MIN_DATE } from "@/lib/time-presets";

export function parkVsHotelChartTitle(
  granularity: ParkVsHotelChartGranularity,
): string {
  switch (granularity) {
    case "daily":
      return "Daily Power Consumption of Theme Park and Hotel";
    case "monthly":
      return "Monthly Power Consumption of Theme Park and Hotel";
    case "yearly":
      return "Yearly Power Consumption of Theme Park and Hotel";
  }
}

const HOTEL_SOURCE_IDS = new Set(["dhh", "dlh", "del"]);

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

function accumulateRecords(
  records: EnergyRecord[],
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
): Map<string, { themePark: number; hotel: number }> {
  const bucketMap = new Map<string, { themePark: number; hotel: number }>();

  for (const record of records) {
    if (record.energyType !== "electricity") continue;
    if (record.date < from || record.date > to) continue;

    const key = bucketKey(record.date, granularity);
    const bucket = bucketMap.get(key) ?? { themePark: 0, hotel: 0 };
    if (record.sourceId === "park") {
      bucket.themePark += record.valueKwh;
    } else if (HOTEL_SOURCE_IDS.has(record.sourceId)) {
      bucket.hotel += record.valueKwh;
    }
    bucketMap.set(key, bucket);
  }

  return bucketMap;
}

function buildPeriodSeries(
  from: string,
  to: string,
  granularity: ParkVsHotelChartGranularity,
  bucketMap: Map<string, { themePark: number; hotel: number }>,
) {
  const data = [];

  if (granularity === "daily") {
    let cursor = parseISO(from);
    const end = parseISO(to);
    while (cursor <= end) {
      const period = format(cursor, "yyyy-MM-dd");
      const values = bucketMap.get(period) ?? { themePark: 0, hotel: 0 };
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        themePark: values.themePark,
        hotel: values.hotel,
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
      const values = bucketMap.get(period) ?? { themePark: 0, hotel: 0 };
      data.push({
        period,
        label: labelForPeriod(period, granularity),
        themePark: values.themePark,
        hotel: values.hotel,
      });
      cursor = addMonths(cursor, 1);
    }
    return data;
  }

  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear; year += 1) {
    const period = String(year);
    const values = bucketMap.get(period) ?? { themePark: 0, hotel: 0 };
    data.push({
      period,
      label: labelForPeriod(period, granularity),
      themePark: values.themePark,
      hotel: values.hotel,
    });
  }

  return data;
}

export function buildParkVsHotelChart(
  records: EnergyRecord[],
  timePreset: ResortTrendTimePreset,
  summaryFrom: string,
  summaryTo: string,
  dataMinDate: string = DATA_MIN_DATE,
): ParkVsHotelChart {
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
