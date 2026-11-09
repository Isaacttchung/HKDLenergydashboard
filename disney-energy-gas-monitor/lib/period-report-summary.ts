import {
  differenceInCalendarDays,
  format,
  getDaysInMonth,
  getDaysInYear,
  parseISO,
} from "date-fns";
import { buildDailyBreakdown } from "@/lib/executive-summary";
import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import { SOLAR_INSTALLATION_SITES } from "@/lib/solar-installations/config";
import type {
  CustomRangeReportSummary,
  DailyBreakdown,
  EnergyRecord,
  MonthlyReportSummary,
  PeriodReportExtremum,
  YearlyReportSummary,
} from "@/lib/types";

function emptyBreakdown(): DailyBreakdown {
  return {
    park: 0,
    ccp: 0,
    hccp: 0,
    dhh: 0,
    dlh: 0,
    del: 0,
    hotelTotal: 0,
    gasUnits: 0,
    gasKwh: 0,
    solarPark: 0,
    solarHccp: 0,
    solarTotal: 0,
    solarSites: [],
    resortElectricityTotal: 0,
  };
}

function sumBreakdowns(breakdowns: DailyBreakdown[]): DailyBreakdown {
  const total = emptyBreakdown();
  const solarKwhBySiteId = new Map<string, number>();

  for (const breakdown of breakdowns) {
    total.park += breakdown.park;
    total.ccp += breakdown.ccp;
    total.hccp += breakdown.hccp;
    total.dhh += breakdown.dhh;
    total.dlh += breakdown.dlh;
    total.del += breakdown.del;
    total.hotelTotal += breakdown.hotelTotal;
    total.gasUnits += breakdown.gasUnits;
    total.gasKwh += breakdown.gasKwh;
    total.solarPark += breakdown.solarPark;
    total.solarHccp += breakdown.solarHccp;
    total.solarTotal += breakdown.solarTotal;
    total.resortElectricityTotal += breakdown.resortElectricityTotal;

    for (const site of breakdown.solarSites) {
      solarKwhBySiteId.set(
        site.id,
        (solarKwhBySiteId.get(site.id) ?? 0) + site.kWh,
      );
    }
  }

  if (solarKwhBySiteId.size > 0) {
    total.solarSites = SOLAR_INSTALLATION_SITES.map((site) => ({
      id: site.id,
      label: site.displayLabel,
      kWh: solarKwhBySiteId.get(site.id) ?? 0,
      mapZoneIds: site.mapZoneIds,
    }));
  }

  return total;
}

function formatDateLabel(date: string): string {
  return parseISO(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getDailyBreakdownsInRange(
  records: EnergyRecord[],
  from: string,
  to: string,
  solarIndex?: SolarInstallationIndex,
): { date: string; breakdown: DailyBreakdown }[] {
  const dates = new Set(
    records
      .filter((record) => record.date >= from && record.date <= to)
      .map((record) => record.date),
  );

  return Array.from(dates)
    .sort()
    .map((date) => ({
      date,
      breakdown: buildDailyBreakdown(records, date, solarIndex),
    }))
    .filter(({ breakdown }) => breakdown.resortElectricityTotal > 0);
}

function toDayExtremum(
  date: string,
  breakdown: DailyBreakdown,
): PeriodReportExtremum {
  return {
    period: date,
    label: formatDateLabel(date),
    resortElectricityTotal: breakdown.resortElectricityTotal,
  };
}

function findDayExtrema(
  dailyBreakdowns: { date: string; breakdown: DailyBreakdown }[],
): { highest: PeriodReportExtremum; lowest: PeriodReportExtremum } {
  if (dailyBreakdowns.length === 0) {
    const fallback = toDayExtremum(fromFallbackDate(), emptyBreakdown());
    return { highest: fallback, lowest: fallback };
  }

  let highest = dailyBreakdowns[0];
  let lowest = dailyBreakdowns[0];

  for (const entry of dailyBreakdowns) {
    if (
      entry.breakdown.resortElectricityTotal >
      highest.breakdown.resortElectricityTotal
    ) {
      highest = entry;
    }
    if (
      entry.breakdown.resortElectricityTotal <
      lowest.breakdown.resortElectricityTotal
    ) {
      lowest = entry;
    }
  }

  return {
    highest: toDayExtremum(highest.date, highest.breakdown),
    lowest: toDayExtremum(lowest.date, lowest.breakdown),
  };
}

function fromFallbackDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function buildMonthlyReportSummary(
  records: EnergyRecord[],
  from: string,
  to: string,
  solarIndex?: SolarInstallationIndex,
): MonthlyReportSummary {
  const dailyBreakdowns = getDailyBreakdownsInRange(
    records,
    from,
    to,
    solarIndex,
  );
  const { highest, lowest } = findDayExtrema(dailyBreakdowns);
  const monthKey = from.slice(0, 7);

  return {
    from,
    to,
    periodLabel: formatMonthLabel(monthKey),
    totals: sumBreakdowns(dailyBreakdowns.map((entry) => entry.breakdown)),
    daysInMonth: getDaysInMonth(parseISO(from)),
    highestDay: highest,
    lowestDay: lowest,
  };
}

function formatRangeLabel(from: string, to: string): string {
  return `${formatDateLabel(from)} – ${formatDateLabel(to)}`;
}

export function buildCustomRangeReportSummary(
  records: EnergyRecord[],
  from: string,
  to: string,
  solarIndex?: SolarInstallationIndex,
): CustomRangeReportSummary {
  const dailyBreakdowns = getDailyBreakdownsInRange(
    records,
    from,
    to,
    solarIndex,
  );
  const { highest, lowest } = findDayExtrema(dailyBreakdowns);

  return {
    from,
    to,
    periodLabel: formatRangeLabel(from, to),
    totals: sumBreakdowns(dailyBreakdowns.map((entry) => entry.breakdown)),
    daysInRange: differenceInCalendarDays(parseISO(to), parseISO(from)) + 1,
    highestDay: highest,
    lowestDay: lowest,
  };
}

export function buildYearlyReportSummary(
  records: EnergyRecord[],
  from: string,
  to: string,
  solarIndex?: SolarInstallationIndex,
): YearlyReportSummary {
  const dailyBreakdowns = getDailyBreakdownsInRange(
    records,
    from,
    to,
    solarIndex,
  );
  const monthlyBuckets = new Map<string, DailyBreakdown[]>();

  for (const { date, breakdown } of dailyBreakdowns) {
    const monthKey = date.slice(0, 7);
    const bucket = monthlyBuckets.get(monthKey) ?? [];
    bucket.push(breakdown);
    monthlyBuckets.set(monthKey, bucket);
  }

  const monthlyTotals = Array.from(monthlyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, breakdowns]) => ({
      monthKey,
      breakdown: sumBreakdowns(breakdowns),
    }));

  const highestMonthEntry = monthlyTotals.reduce(
    (best, current) =>
      current.breakdown.resortElectricityTotal >
      best.breakdown.resortElectricityTotal
        ? current
        : best,
    monthlyTotals[0] ?? {
      monthKey: from.slice(0, 7),
      breakdown: emptyBreakdown(),
    },
  );

  const lowestMonthEntry = monthlyTotals.reduce(
    (best, current) =>
      current.breakdown.resortElectricityTotal <
      best.breakdown.resortElectricityTotal
        ? current
        : best,
    monthlyTotals[0] ?? {
      monthKey: from.slice(0, 7),
      breakdown: emptyBreakdown(),
    },
  );

  const yearLabel = from.slice(0, 4);

  return {
    from,
    to,
    periodLabel: yearLabel,
    totals: sumBreakdowns(dailyBreakdowns.map((entry) => entry.breakdown)),
    daysInYear: getDaysInYear(parseISO(from)),
    highestMonth: {
      period: highestMonthEntry.monthKey,
      label: formatMonthLabel(highestMonthEntry.monthKey),
      resortElectricityTotal: highestMonthEntry.breakdown.resortElectricityTotal,
    },
    lowestMonth: {
      period: lowestMonthEntry.monthKey,
      label: formatMonthLabel(lowestMonthEntry.monthKey),
      resortElectricityTotal: lowestMonthEntry.breakdown.resortElectricityTotal,
    },
  };
}
