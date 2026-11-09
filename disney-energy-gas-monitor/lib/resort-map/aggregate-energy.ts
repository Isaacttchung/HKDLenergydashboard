import type { Top10MeterSeries } from "@/lib/datastore/parsers/hkdl-top10-parser";
import {
  collectLeafZoneIds,
  getMapZone,
  resolveSelectionGroupZoneIds,
} from "@/lib/resort-map/registry";
import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import {
  buildSolarSitesForMapZoneInRange,
  sumSolarForMapZoneInRange,
} from "@/lib/solar-installations/aggregate";
import type { EnergyRecord, SolarInstallationBreakdownItem } from "@/lib/types";

export interface MapZoneEnergyResult {
  zoneId: string;
  label: string;
  totalKwh: number;
  solarKwh: number | null;
  solarSites: SolarInstallationBreakdownItem[];
  emptyMessage?: string;
  hasData: boolean;
}

function normalizeLocationKey(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function sumTop10Locations(
  meters: Top10MeterSeries[],
  locations: string[],
  from: string,
  to: string,
): number {
  const wanted = new Set(locations.map((l) => normalizeLocationKey(l)));
  let total = 0;
  for (const meter of meters) {
    const locationKey = normalizeLocationKey(meter.location);
    if (!wanted.has(locationKey)) continue;
    for (const [date, value] of Object.entries(meter.readingsByDate)) {
      if (date >= from && date <= to) total += value;
    }
  }
  return total;
}

function sumHotelMetric(
  records: EnergyRecord[],
  metric: "dhh" | "dlh" | "del" | "hccp" | "csb",
  from: string,
  to: string,
): number {
  let total = 0;
  for (const record of records) {
    if (record.energyType !== "electricity") continue;
    if (record.sourceId !== metric) continue;
    if (record.date < from || record.date > to) continue;
    total += record.valueKwh;
  }
  return total;
}

function mapZoneIdsForSolarMatch(zoneId: string): Set<string> {
  const ids = new Set(resolveSelectionGroupZoneIds(zoneId));
  for (const leafId of collectLeafZoneIds(zoneId)) {
    ids.add(leafId);
  }
  return ids;
}

export function computeMapZoneEnergy(
  zoneId: string,
  from: string,
  to: string,
  top10Meters: Top10MeterSeries[] | null | undefined,
  records: EnergyRecord[],
  solarIndex?: SolarInstallationIndex,
): MapZoneEnergyResult {
  const zone = getMapZone(zoneId);
  if (!zone) {
    return {
      zoneId,
      label: zoneId,
      totalKwh: 0,
      solarKwh: null,
      solarSites: [],
      hasData: false,
      emptyMessage: "Unknown map zone",
    };
  }

  const leafIds = collectLeafZoneIds(zoneId);
  let total = 0;
  let anyData = false;
  let allEmpty = true;

  for (const leafId of leafIds) {
    const leaf = getMapZone(leafId);
    if (!leaf) continue;

    if (leaf.data.type === "empty") {
      continue;
    }

    if (leaf.data.type === "hotel") {
      const value = sumHotelMetric(records, leaf.data.metric, from, to);
      total += value;
      if (value > 0) {
        anyData = true;
        allEmpty = false;
      }
      continue;
    }

    if (leaf.data.type === "top10") {
      const value = sumTop10Locations(
        top10Meters ?? [],
        leaf.data.locations,
        from,
        to,
      );
      total += value;
      if (value > 0) {
        anyData = true;
        allEmpty = false;
      }
    }
  }

  if (leafIds.length === 1) {
    const only = getMapZone(leafIds[0]);
    if (only?.data.type === "empty") {
      return {
        zoneId,
        label: zone.label,
        totalKwh: 0,
        solarKwh: null,
        solarSites: [],
        hasData: false,
        emptyMessage: only.data.message,
      };
    }
  }

  if (!anyData && allEmpty && leafIds.every((id) => getMapZone(id)?.data.type === "empty")) {
    return {
      zoneId,
      label: zone.label,
      totalKwh: 0,
      solarKwh: null,
      solarSites: [],
      hasData: false,
      emptyMessage: "No recorded data yet",
    };
  }

  const solarZoneIds = mapZoneIdsForSolarMatch(zoneId);
  const solarKwh = solarIndex
    ? sumSolarForMapZoneInRange(solarIndex, solarZoneIds, from, to)
    : null;
  const solarSites =
    solarIndex && solarKwh !== null
      ? buildSolarSitesForMapZoneInRange(
          solarIndex,
          solarZoneIds,
          from,
          to,
        )
      : [];

  return {
    zoneId,
    label: zone.label,
    totalKwh: total,
    solarKwh,
    solarSites,
    hasData: anyData || total > 0 || (solarKwh !== null && solarKwh > 0),
  };
}
