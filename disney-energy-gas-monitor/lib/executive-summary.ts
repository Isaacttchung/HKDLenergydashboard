import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import { buildSolarSitesForDay } from "@/lib/solar-installations/aggregate";
import type { DailyBreakdown, EnergyRecord } from "@/lib/types";
import { getAllSourceIds } from "@/lib/taxonomy";

/** Sources used in the EMS daily PDF executive summary (avoids double-counting top 10 vs park total). */
export const EXECUTIVE_SUMMARY_SOURCES = new Set([
  "park",
  "ccp",
  "hccp",
  "dhh",
  "dlh",
  "del",
  "resort-gas",
  "solar-total",
]);

export function isFullResortView(sourceIds: string[]): boolean {
  const all = getAllSourceIds();
  if (sourceIds.length !== all.length) return false;
  return all.every((id) => sourceIds.includes(id));
}

export function resolveAggregationSources(sourceIds: string[]): string[] {
  if (isFullResortView(sourceIds)) {
    return Array.from(EXECUTIVE_SUMMARY_SOURCES);
  }
  return sourceIds;
}

export function buildDailyBreakdown(
  records: EnergyRecord[],
  date: string,
  solarIndex?: SolarInstallationIndex,
): DailyBreakdown {
  const dayRecords = records.filter((r) => r.date === date);
  const get = (sourceId: string, type: EnergyRecord["energyType"]) =>
    dayRecords.find((r) => r.sourceId === sourceId && r.energyType === type)
      ?.valueKwh ?? 0;

  const park = get("park", "electricity");
  const ccp = get("ccp", "electricity");
  const hccp = get("hccp", "electricity");
  const dhh = get("dhh", "electricity");
  const dlh = get("dlh", "electricity");
  const del = get("del", "electricity");
  const gasKwh = get("resort-gas", "gas");
  const solarFromTotal = get("solar-total", "solar");
  const solarPark = get("solar-park", "solar");
  const solarHccp = get("solar-hccp", "solar");
  const solarTotal =
    solarFromTotal > 0 ? solarFromTotal : solarPark + solarHccp;

  return {
    park,
    ccp,
    hccp,
    dhh,
    dlh,
    del,
    hotelTotal: dhh + dlh + del,
    gasUnits: 0,
    gasKwh,
    solarPark,
    solarHccp,
    solarTotal,
    solarSites: solarIndex ? buildSolarSitesForDay(solarIndex, date) : [],
    resortElectricityTotal: park + ccp + hccp + dhh + dlh + del,
  };
}
