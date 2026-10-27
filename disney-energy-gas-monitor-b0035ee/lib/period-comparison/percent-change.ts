import { SOLAR_INSTALLATION_SITES } from "@/lib/solar-installations/config";
import type { DailyBreakdown } from "@/lib/types";

export function solarSitePercentKey(siteId: string): string {
  return `solarSite:${siteId}`;
}

function solarSiteKwh(breakdown: DailyBreakdown, siteId: string): number {
  return breakdown.solarSites.find((site) => site.id === siteId)?.kWh ?? 0;
}

export interface BreakdownMetricRow {
  id: string;
  label: string;
  value: (breakdown: DailyBreakdown) => number;
}

export const HOTEL_BREAKDOWN_ROWS: BreakdownMetricRow[] = [
  { id: "dhh", label: "DHH", value: (b) => b.dhh },
  { id: "dlh", label: "DLH", value: (b) => b.dlh },
  { id: "del", label: "DEL", value: (b) => b.del },
];

export const FULL_RESORT_BREAKDOWN_ROWS: BreakdownMetricRow[] = [
  { id: "park", label: "Park (kWh)", value: (b) => b.park },
  { id: "hotel", label: "Hotel (kWh)", value: (b) => b.hotelTotal },
  { id: "ccp", label: "CCP (kWh)", value: (b) => b.ccp },
  { id: "hccp", label: "HCCP (kWh)", value: (b) => b.hccp },
  {
    id: "solar",
    label: "Solar Generated (kWh)",
    value: (b) => b.solarTotal,
  },
];

export function percentChange(from: number, to: number): number | null {
  if (from === 0) {
    if (to === 0) return 0;
    return null;
  }
  return ((to - from) / from) * 100;
}

export function computeBreakdownPercentChanges(
  baseline: DailyBreakdown,
  comparison: DailyBreakdown,
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const row of [...FULL_RESORT_BREAKDOWN_ROWS, ...HOTEL_BREAKDOWN_ROWS]) {
    result[row.id] = percentChange(row.value(baseline), row.value(comparison));
  }
  for (const site of SOLAR_INSTALLATION_SITES) {
    result[solarSitePercentKey(site.id)] = percentChange(
      solarSiteKwh(baseline, site.id),
      solarSiteKwh(comparison, site.id),
    );
  }
  return result;
}
