import rawConfig from "@/config/resort-map-zones.json";
import type { MapZoneDataSource, MapZoneDefinition } from "@/lib/resort-map/types";

type RawZone = {
  id: string;
  parent: string | null;
  label: string;
  hits: string[];
  overlay: string | null;
  data: MapZoneDataSource;
};

const rawZones = (rawConfig as { zones: RawZone[] }).zones;

export const MAP_ZONE_DEFINITIONS: MapZoneDefinition[] = rawZones.map(
  (zone) => ({
    id: zone.id,
    label: zone.label,
    parentId: zone.parent,
    overlaySvgId: zone.overlay ?? undefined,
    svgHitIds: zone.hits,
    data: zone.data,
  }),
);

const zoneById = new Map(MAP_ZONE_DEFINITIONS.map((z) => [z.id, z]));

export function getMapZone(id: string): MapZoneDefinition | undefined {
  return zoneById.get(id);
}

export const ROOT_MAP_ZONE_IDS = MAP_ZONE_DEFINITIONS.filter(
  (z) => z.parentId === null,
).map((z) => z.id);

export function childZones(parentId: string): MapZoneDefinition[] {
  return MAP_ZONE_DEFINITIONS.filter((z) => z.parentId === parentId);
}

/** All SVG element ids referenced by the map config (for visibility wiring). */
export function allMapSvgElementIds(): string[] {
  const ids = new Set<string>();
  for (const zone of MAP_ZONE_DEFINITIONS) {
    for (const hit of zone.svgHitIds) ids.add(hit);
    if (zone.overlaySvgId) ids.add(zone.overlaySvgId);
  }
  return [...ids];
}

export function resolveSelectionGroupZoneIds(
  zoneId: string,
): string[] {
  const zone = getMapZone(zoneId);
  if (!zone?.selectionGroup) return [zoneId];
  return MAP_ZONE_DEFINITIONS.filter(
    (z) => z.selectionGroup === zone.selectionGroup,
  ).map((z) => z.id);
}

export function aggregateChildIds(zoneId: string): string[] {
  const zone = getMapZone(zoneId);
  if (!zone) return [];
  if (zone.data.type === "aggregate") return zone.data.childIds;
  return [zoneId];
}

export function collectLeafZoneIds(zoneId: string): string[] {
  const zone = getMapZone(zoneId);
  if (!zone) return [];
  if (zone.data.type === "aggregate") {
    return zone.data.childIds.flatMap((childId) => collectLeafZoneIds(childId));
  }
  return [zoneId];
}

/** Overlay + hit ids for this zone and every descendant (for map selection outlines). */
export function collectZoneSvgGraphicIds(zoneId: string): string[] {
  const ids = new Set<string>();

  const visit = (id: string) => {
    const zone = getMapZone(id);
    if (!zone) return;
    for (const hit of zone.svgHitIds) ids.add(hit);
    if (zone.overlaySvgId) ids.add(zone.overlaySvgId);
    if (zone.data.type === "aggregate") {
      for (const childId of zone.data.childIds) visit(childId);
    }
  };

  visit(zoneId);
  return [...ids];
}
