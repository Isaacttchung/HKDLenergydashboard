import { eachDayOfInterval, format, parseISO } from "date-fns";
import { readFile } from "fs/promises";
import path from "path";
import type { DailyContext } from "@/lib/daily-context";
import { getDataStore } from "@/lib/datastore/master-sheet-store";
import type { DailyBreakdown, PeriodContextSummary } from "@/lib/types";

type DailyContextFile = Record<string, DailyContext>;

const AVERAGE_FIELDS: Array<{
  source: keyof DailyContext;
  target: keyof Pick<
    PeriodContextSummary,
    | "outdoorTempCAvg"
    | "ballroomUtilizationPctAvg"
    | "hotelOccupancyPctAvg"
    | "sunshineHoursAvg"
    | "rainfallMmAvg"
  >;
}> = [
  { source: "outdoorTempC", target: "outdoorTempCAvg" },
  { source: "ballroomUtilizationPct", target: "ballroomUtilizationPctAvg" },
  { source: "hotelOccupancyPct", target: "hotelOccupancyPctAvg" },
  { source: "sunshineHours", target: "sunshineHoursAvg" },
  { source: "rainfallMm", target: "rainfallMmAvg" },
];

let staticCache: DailyContextFile | null = null;

async function loadStaticContextFile(): Promise<DailyContextFile> {
  if (staticCache) return staticCache;
  const filePath = path.join(process.cwd(), "data", "daily-context.json");
  try {
    const content = await readFile(filePath, "utf-8");
    staticCache = JSON.parse(content) as DailyContextFile;
  } catch {
    staticCache = {};
  }
  return staticCache;
}

function averageMetric(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function getPeriodContextSummary(
  from: string,
  to: string,
): Promise<PeriodContextSummary | null> {
  const store = getDataStore();
  const [masterContexts, staticContexts] = await Promise.all([
    store.getDailyContexts(),
    loadStaticContextFile(),
  ]);

  const interval = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  });

  const metricValues = new Map<string, number[]>();
  let gasUnitsTotal = 0;
  let daysWithGasReadings = 0;
  let daysWithContext = 0;

  for (const day of interval) {
    const date = format(day, "yyyy-MM-dd");
    const context = {
      ...(staticContexts[date] ?? {}),
      ...(masterContexts[date] ?? {}),
    };

    if (Object.keys(context).length === 0) continue;
    daysWithContext += 1;

    for (const field of AVERAGE_FIELDS) {
      const value = context[field.source];
      if (typeof value === "number" && Number.isFinite(value)) {
        const bucket = metricValues.get(field.target) ?? [];
        bucket.push(value);
        metricValues.set(field.target, bucket);
      }
    }

    if (typeof context.gasUnits === "number") {
      gasUnitsTotal += context.gasUnits;
      daysWithGasReadings += 1;
    }
  }

  const summary: PeriodContextSummary = {
    gasUnitsTotal,
    daysWithContext,
    daysWithGasReadings,
  };

  for (const field of AVERAGE_FIELDS) {
    const avg = averageMetric(metricValues.get(field.target) ?? []);
    if (avg !== undefined) {
      summary[field.target] = avg;
    }
  }

  const hasAverages = AVERAGE_FIELDS.some(
    (field) => summary[field.target] !== undefined,
  );

  if (
    !hasAverages &&
    gasUnitsTotal === 0 &&
    daysWithGasReadings === 0 &&
    daysWithContext === 0
  ) {
    return null;
  }

  return summary;
}

export function applyPeriodContextToBreakdown(
  totals: DailyBreakdown,
  context: PeriodContextSummary | null,
): DailyBreakdown {
  if (!context) return totals;
  return {
    ...totals,
    gasUnits:
      context.daysWithGasReadings > 0
        ? context.gasUnitsTotal
        : totals.gasUnits,
  };
}
