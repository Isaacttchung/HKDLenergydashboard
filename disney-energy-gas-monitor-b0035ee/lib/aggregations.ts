import { format, parseISO } from "date-fns";
import type {
  ChartDataPoint,
  ChartGranularity,
  EnergyChart,
  EnergyRecord,
  EnergyTotals,
  TimePreset,
} from "@/lib/types";
import {
  getConsumptionGranularity,
  getSolarGranularity,
} from "@/lib/chart-granularity";

function periodKey(date: string, granularity: ChartGranularity): string {
  if (granularity === "yearly") {
    return format(parseISO(date), "yyyy");
  }
  if (granularity === "monthly") {
    return format(parseISO(date), "yyyy-MM");
  }
  return date;
}

export function filterRecords(
  records: EnergyRecord[],
  sourceIds: string[],
  from: string,
  to: string,
): EnergyRecord[] {
  const idSet = new Set(sourceIds);
  return records.filter(
    (r) =>
      idSet.has(r.sourceId) && r.date >= from && r.date <= to,
  );
}

export function computeTotals(records: EnergyRecord[]): EnergyTotals {
  const totals: EnergyTotals = {
    electricity: { value: 0, cost: 0 },
    gas: { value: 0, cost: 0 },
    solar: { value: 0, cost: null },
  };

  for (const record of records) {
    if (record.energyType === "electricity") {
      totals.electricity.value += record.valueKwh;
      totals.electricity.cost += record.costHkd ?? 0;
    } else if (record.energyType === "gas") {
      totals.gas.value += record.valueKwh;
      totals.gas.cost += record.costHkd ?? 0;
    } else if (record.energyType === "solar") {
      totals.solar.value += record.valueKwh;
    }
  }

  return totals;
}

function buildConsumptionChart(
  records: EnergyRecord[],
  granularity: ChartGranularity,
): EnergyChart {
  const buckets = new Map<string, { electricity: number; gas: number }>();

  for (const record of records) {
    if (record.energyType === "solar") continue;
    const key = periodKey(record.date, granularity);
    const bucket = buckets.get(key) ?? { electricity: 0, gas: 0 };
    if (record.energyType === "electricity") {
      bucket.electricity += record.valueKwh;
    } else if (record.energyType === "gas") {
      bucket.gas += record.valueKwh;
    }
    buckets.set(key, bucket);
  }

  const data: ChartDataPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({
      period,
      electricity: values.electricity,
      gas: values.gas,
    }));

  return { granularity, data };
}

function buildSolarChart(
  records: EnergyRecord[],
  granularity: ChartGranularity,
): EnergyChart {
  if (granularity === "by_installation") {
    const byInstallation: Record<string, number> = {};
    for (const record of records) {
      if (record.energyType !== "solar") continue;
      byInstallation[record.sourceId] =
        (byInstallation[record.sourceId] ?? 0) + record.valueKwh;
    }

    const total = Object.values(byInstallation).reduce((a, b) => a + b, 0);
    return {
      granularity,
      data: [
        {
          period: records[0]?.date ?? "total",
          generation: total,
          byInstallation,
        },
      ],
    };
  }

  const buckets = new Map<
    string,
    { generation: number; byInstallation: Record<string, number> }
  >();

  for (const record of records) {
    if (record.energyType !== "solar") continue;
    const key = periodKey(record.date, granularity);
    const bucket = buckets.get(key) ?? {
      generation: 0,
      byInstallation: {},
    };
    bucket.generation += record.valueKwh;
    bucket.byInstallation[record.sourceId] =
      (bucket.byInstallation[record.sourceId] ?? 0) + record.valueKwh;
    buckets.set(key, bucket);
  }

  const data: ChartDataPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({
      period,
      generation: values.generation,
      byInstallation: values.byInstallation,
    }));

  return { granularity, data };
}

export function buildPeriodCharts(
  records: EnergyRecord[],
  timePreset: TimePreset,
  from: string,
  to: string,
  extendedTrendChart = false,
): { chart: EnergyChart; solarChart: EnergyChart } {
  const consumptionGranularity = getConsumptionGranularity(
    timePreset,
    from,
    to,
    extendedTrendChart,
  );
  const solarGranularity = getSolarGranularity(
    timePreset,
    from,
    to,
    extendedTrendChart,
  );

  return {
    chart: buildConsumptionChart(records, consumptionGranularity),
    solarChart: buildSolarChart(records, solarGranularity),
  };
}
