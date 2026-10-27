import type { DailyBreakdown } from "@/lib/types";
import { formatYoYDifferencePct } from "@/lib/daily-report/format";

export interface PowerComparisonRow {
  area: string;
  previousKwh: number | null;
  currentKwh: number;
  differencePct: string;
}

const AREA_DEFS: { area: string; pick: (b: DailyBreakdown) => number }[] = [
  { area: "Theme Park", pick: (b) => b.park },
  { area: "Hotel", pick: (b) => b.hotelTotal },
  { area: "CCP", pick: (b) => b.ccp },
  { area: "HCCP", pick: (b) => b.hccp },
  { area: "Resort Total", pick: (b) => b.resortElectricityTotal },
];

export function buildPowerComparisonRows(
  current: DailyBreakdown,
  previous: DailyBreakdown | null,
): PowerComparisonRow[] {
  return AREA_DEFS.map(({ area, pick }) => {
    const currentKwh = pick(current);
    const previousKwh = previous ? pick(previous) : null;
    return {
      area,
      previousKwh,
      currentKwh,
      differencePct:
        previousKwh != null
          ? formatYoYDifferencePct(currentKwh, previousKwh)
          : "—",
    };
  });
}
