import { getDataStore } from "@/lib/datastore/master-sheet-store";
import {
  computeBreakdownPercentChanges,
  FULL_RESORT_BREAKDOWN_ROWS,
} from "@/lib/period-comparison/percent-change";
import {
  computeContextPercentChanges,
  resolvePeriodContextMetrics,
} from "@/lib/period-comparison/context-metrics";
import {
  fullResortTableTitle,
  resolvePeriodBreakdown,
  type PeriodComparisonMode,
} from "@/lib/period-comparison/resolve-breakdown";

export const runtime = "nodejs";

function parseMode(value: string | null): PeriodComparisonMode | null {
  if (value === "day" || value === "month" || value === "year") return value;
  return null;
}

function parsePeriodKeys(searchParams: URLSearchParams): string[] {
  const fromList = searchParams.getAll("periods").flatMap((entry) =>
    entry
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );

  if (fromList.length > 0) return fromList;

  const period1 = searchParams.get("period1")?.trim();
  const period2 = searchParams.get("period2")?.trim();
  if (period1 && period2) return [period1, period2];

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = parseMode(searchParams.get("mode"));
  const periodKeys = parsePeriodKeys(searchParams);

  if (!mode || periodKeys.length < 2) {
    return Response.json(
      { error: "Provide mode (day|month|year) and at least two periods." },
      { status: 400 },
    );
  }

  const unique = new Set(periodKeys);
  if (unique.size !== periodKeys.length) {
    return Response.json(
      { error: "Each period must be different." },
      { status: 400 },
    );
  }

  const store = getDataStore();
  const [records, solarIndex] = await Promise.all([
    store.getRecords(),
    store.getSolarInstallationIndex(),
  ]);

  const resolved = await Promise.all(
    periodKeys.map(async (key) => ({
      ...resolvePeriodBreakdown(mode, key, records, solarIndex),
      context: await resolvePeriodContextMetrics(mode, key),
    })),
  );

  /** Each entry: change from period i to period i+1. */
  const percentChanges = resolved.slice(1).map((period, index) =>
    computeBreakdownPercentChanges(
      resolved[index].breakdown,
      period.breakdown,
    ),
  );

  const contextPercentChanges = resolved.slice(1).map((period, index) =>
    computeContextPercentChanges(resolved[index].context, period.context),
  );

  return Response.json({
    mode,
    rows: FULL_RESORT_BREAKDOWN_ROWS.map((row) => ({
      id: row.id,
      label: row.label,
    })),
    periods: resolved.map((period) => ({
      periodKey: period.periodKey,
      label: period.label,
      breakdown: period.breakdown,
      context: period.context,
      tableTitle: fullResortTableTitle(period.label),
    })),
    percentChanges,
    contextPercentChanges,
    /** @deprecated use periods + percentChanges */
    period1: {
      ...resolved[0],
      tableTitle: fullResortTableTitle(resolved[0].label),
    },
    period2: {
      ...resolved[1],
      tableTitle: fullResortTableTitle(resolved[1].label),
    },
    percentChange: percentChanges[0],
  });
}
