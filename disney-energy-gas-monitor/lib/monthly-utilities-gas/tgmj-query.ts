import { eachMonthOfInterval, format, parseISO } from "date-fns";
import {
  backOfHouseColumns,
  hotelAreaColumnsInDisplayOrder,
  parkAreaColumnsInDisplayOrder,
  type TgmjColumnDef,
} from "@/lib/monthly-utilities-gas/tgmj-column-config";
import {
  aggregateTgmjKeys,
  sumBackOfHouse,
} from "@/lib/monthly-utilities-gas/parse-tgmj-workbook";
import { loadTgmjBundle } from "@/lib/monthly-utilities-gas/tgmj-store";
import {
  everyMonthRecordedInStore,
  isCalendarMonthAlignedRange,
} from "@/lib/monthly-data-month-coverage";
import type { MonthlyResortGasSummary, ResortGasMjLine, TimePreset } from "@/lib/types";

function monthsInRange(from: string, to: string): string[] {
  const start = parseISO(from.length === 7 ? `${from}-01` : from);
  const end = parseISO(to.length === 7 ? `${to}-01` : to);
  return eachMonthOfInterval({ start, end }).map((d) => format(d, "yyyy-MM"));
}

function unavailable(isMonthlyForDay = false): MonthlyResortGasSummary {
  return {
    available: false,
    areas: [],
    hotelMj: null,
    hotelBreakdown: [],
    backOfHouseMj: null,
    backOfHouseBreakdown: [],
    isMonthlyGranularity: isMonthlyForDay,
  };
}

function buildSummaryFromMonths(
  months: string[],
  store: Record<string, { byKey: Record<string, number> }>,
  layout: TgmjColumnDef[],
  options: { monthlyForDay?: boolean } = {},
): MonthlyResortGasSummary {
  if (!everyMonthRecordedInStore(store, months)) {
    return unavailable(options.monthlyForDay);
  }

  const parkCols = parkAreaColumnsInDisplayOrder(layout);
  const hotelCols = hotelAreaColumnsInDisplayOrder(layout);
  const bohCols = backOfHouseColumns(layout);
  const allKeys = [...parkCols, ...hotelCols, ...bohCols].map((c) => c.key);
  const totalsByKey = aggregateTgmjKeys(store, months, allKeys);

  const areas: ResortGasMjLine[] = parkCols.map((col) => ({
    label: col.label,
    mj: totalsByKey[col.key] ?? 0,
  }));

  const hotelBreakdown: ResortGasMjLine[] = hotelCols.map((col) => ({
    label: col.label,
    mj: totalsByKey[col.key] ?? 0,
  }));

  const hotelMj = hotelBreakdown.reduce((sum, line) => sum + line.mj, 0);

  const backOfHouseBreakdown: ResortGasMjLine[] = bohCols.map((col) => ({
    label: col.label,
    mj: totalsByKey[col.key] ?? 0,
  }));

  return {
    available: true,
    areas,
    hotelMj,
    hotelBreakdown,
    backOfHouseMj: sumBackOfHouse(totalsByKey, bohCols),
    backOfHouseBreakdown,
    isMonthlyGranularity: options.monthlyForDay ?? false,
  };
}

export async function getMonthlyResortGasSummary(
  timePreset: TimePreset,
  from: string,
  to: string,
): Promise<MonthlyResortGasSummary | null> {
  const { store, columnLayout } = await loadTgmjBundle();
  if (Object.keys(store).length === 0) return null;

  if (timePreset === "custom") {
    if (!isCalendarMonthAlignedRange(from, to)) {
      return unavailable();
    }
    const months = monthsInRange(from, to);
    return buildSummaryFromMonths(months, store, columnLayout);
  }

  if (timePreset === "day") {
    const ym = from.slice(0, 7);
    return buildSummaryFromMonths([ym], store, columnLayout, {
      monthlyForDay: true,
    });
  }

  const months = monthsInRange(from, to);
  return buildSummaryFromMonths(months, store, columnLayout);
}
