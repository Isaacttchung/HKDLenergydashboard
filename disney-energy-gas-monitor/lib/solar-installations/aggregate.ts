import { normalizeHeader } from "@/lib/datastore/parsers/excel-utils";
import type { StoredSolarInstallationRow } from "@/lib/datastore/parsers/hkdl-solar-parser";
import {
  SOLAR_INSTALLATION_SITES,
  type SolarInstallationSiteConfig,
} from "@/lib/solar-installations/config";
import type { SolarInstallationBreakdownItem } from "@/lib/types";

export type SolarInstallationIndex = Record<string, Record<string, number>>;

export function buildSolarInstallationIndex(
  series: StoredSolarInstallationRow[],
): SolarInstallationIndex {
  const index: SolarInstallationIndex = {};
  for (const row of series) {
    index[row.date] = row.installations;
  }
  return index;
}

function installationValue(
  installations: Record<string, number>,
  columnName: string,
): number {
  if (columnName in installations) {
    return installations[columnName] ?? 0;
  }

  const target = normalizeHeader(columnName);
  for (const [key, value] of Object.entries(installations)) {
    if (normalizeHeader(key) === target) {
      return value;
    }
  }

  return 0;
}

export function sumSiteKwhForDay(
  installations: Record<string, number> | undefined,
  site: SolarInstallationSiteConfig,
): number {
  if (!installations) return 0;
  return site.excelColumns.reduce(
    (sum, column) => sum + installationValue(installations, column),
    0,
  );
}

export function buildSolarSitesForDay(
  index: SolarInstallationIndex,
  date: string,
): SolarInstallationBreakdownItem[] {
  const installations = index[date];
  return SOLAR_INSTALLATION_SITES.map((site) => ({
    id: site.id,
    label: site.displayLabel,
    kWh: sumSiteKwhForDay(installations, site),
    mapZoneIds: site.mapZoneIds,
  }));
}

export function sumSolarForMapZoneInRange(
  index: SolarInstallationIndex,
  zoneIdsToMatch: Set<string>,
  from: string,
  to: string,
): number | null {
  let total = 0;
  let matchedSite = false;

  for (const site of SOLAR_INSTALLATION_SITES) {
    if (!site.mapZoneIds.some((id) => zoneIdsToMatch.has(id))) {
      continue;
    }
    matchedSite = true;
    for (const [date, installations] of Object.entries(index)) {
      if (date < from || date > to) continue;
      total += sumSiteKwhForDay(installations, site);
    }
  }

  return matchedSite ? total : null;
}

/** Per-installation solar totals for map zones that include mapped panels. */
export function buildSolarSitesForMapZoneInRange(
  index: SolarInstallationIndex,
  zoneIdsToMatch: Set<string>,
  from: string,
  to: string,
): SolarInstallationBreakdownItem[] {
  const items: SolarInstallationBreakdownItem[] = [];

  for (const site of SOLAR_INSTALLATION_SITES) {
    if (!site.mapZoneIds.some((id) => zoneIdsToMatch.has(id))) {
      continue;
    }

    let total = 0;
    for (const [date, installations] of Object.entries(index)) {
      if (date < from || date > to) continue;
      total += sumSiteKwhForDay(installations, site);
    }

    items.push({
      id: site.id,
      label: site.displayLabel,
      kWh: total,
      mapZoneIds: site.mapZoneIds,
    });
  }

  return items;
}
