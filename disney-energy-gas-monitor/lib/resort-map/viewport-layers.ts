import type { MapViewBox } from "@/lib/resort-map/viewport";
import { viewBoxCenter, viewBoxScale } from "@/lib/resort-map/viewport";
import {
  MAP_ZONE_DEFINITIONS,
  ROOT_MAP_ZONE_IDS,
  childZones,
  getMapZone,
} from "@/lib/resort-map/registry";
import type { MapZoneDefinition } from "@/lib/resort-map/types";
import { buildNavStackForZone } from "@/lib/resort-map/navigation";

export interface ZoneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Below this zoom, treat as full-resort overview (all top overlays visible). */
export const RESORT_OVERVIEW_MAX_SCALE = 1.12;

/**
 * Shared zoom for every Theme Park land overlay (Tomorrowland, BOH, Grizzly, …).
 * Once at or above this scale, any land whose shape intersects the viewport may peel.
 */
export const THEME_PARK_LAND_PEEL_MIN_SCALE = 1.52;

/** Min share of the viewport covered by a land overlay before it peels (uniform for all lands). */
export const THEME_PARK_LAND_MIN_VIEW_COVERAGE = 0.09;

function mergeBounds(a: ZoneBounds | null, b: ZoneBounds): ZoneBounds {
  if (!a) return { ...b };
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: x2 - Math.min(a.x, b.x),
    h: y2 - Math.min(a.y, b.y),
  };
}

function containsPoint(
  bounds: ZoneBounds,
  point: { x: number; y: number },
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.w &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.h
  );
}

function boundsArea(bounds: ZoneBounds): number {
  return bounds.w * bounds.h;
}

export function intersectionArea(
  viewBox: MapViewBox,
  bounds: ZoneBounds,
): number {
  const x1 = Math.max(viewBox.x, bounds.x);
  const y1 = Math.max(viewBox.y, bounds.y);
  const x2 = Math.min(viewBox.x + viewBox.w, bounds.x + bounds.w);
  const y2 = Math.min(viewBox.y + viewBox.h, bounds.y + bounds.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function zoneGraphicIds(zone: MapZoneDefinition): string[] {
  return [
    ...zone.svgHitIds,
    ...(zone.overlaySvgId ? [zone.overlaySvgId] : []),
  ];
}

function zoneBoundsFromGraphics(
  zone: MapZoneDefinition,
  bboxByElementId: Map<string, ZoneBounds>,
): ZoneBounds | null {
  let merged: ZoneBounds | null = null;
  for (const id of zoneGraphicIds(zone)) {
    const box = bboxByElementId.get(id);
    if (!box) continue;
    merged = mergeBounds(merged, box);
  }
  return merged;
}

/** Overlay + all descendant map graphics (covers PTI wings outside the top shape). */
export function aggregateZoneBounds(
  zoneId: string,
  bboxByElementId: Map<string, ZoneBounds>,
): ZoneBounds | null {
  const zone = getMapZone(zoneId);
  if (!zone) return null;

  let merged = zoneBoundsFromGraphics(zone, bboxByElementId);

  if (zone.data.type === "aggregate") {
    for (const childId of zone.data.childIds) {
      const childBounds = aggregateZoneBounds(childId, bboxByElementId);
      if (childBounds) merged = mergeBounds(merged, childBounds);
    }
  }

  return merged;
}

/** Bounds of this zone's own overlay / hit only (not spread-out child buildings). */
export function zoneSelfBounds(
  zoneId: string,
  bboxByElementId: Map<string, ZoneBounds>,
): ZoneBounds | null {
  const zone = getMapZone(zoneId);
  if (!zone) return null;
  return zoneBoundsFromGraphics(zone, bboxByElementId);
}

function viewZoneCoverage(viewBox: MapViewBox, bounds: ZoneBounds): number {
  const viewArea = viewBox.w * viewBox.h;
  return intersectionArea(viewBox, bounds) / Math.max(viewArea, 1);
}

function isDirectThemeParkLand(zoneId: string): boolean {
  return getMapZone(zoneId)?.parentId === "theme_park";
}

function isInThemeParkTree(zoneId: string): boolean {
  let current: string | null = zoneId;
  while (current) {
    if (current === "theme_park") return true;
    current = getMapZone(current)?.parentId ?? null;
  }
  return false;
}

/** When true, peel every overlay in the Theme Park subtree (lands + nested areas). */
function shouldPeelThemeParkSubtreeAtScale(viewBox: MapViewBox): boolean {
  return viewBoxScale(viewBox) >= THEME_PARK_LAND_PEEL_MIN_SCALE;
}

/** Peel when the zone largely fills the viewport (e.g. Theme Park fully in frame). */
export function shouldPeelZoneOverlay(
  viewBox: MapViewBox,
  bounds: ZoneBounds,
): boolean {
  const center = viewBoxCenter(viewBox);
  const zoneInView = viewZoneCoverage(viewBox, bounds);
  const centerInside = containsPoint(bounds, center);

  if (zoneInView >= 0.52) return true;

  if (centerInside) {
    if (zoneInView >= 0.42) return true;

    const widthRatio = viewBox.w / Math.max(bounds.w, 1);
    const heightRatio = viewBox.h / Math.max(bounds.h, 1);

    if (
      widthRatio <= 1.2 &&
      heightRatio <= 1.35 &&
      zoneInView >= 0.28
    ) {
      return true;
    }

    if (widthRatio <= 0.95 && heightRatio <= 1.05) return true;
  }

  const widthRatio = viewBox.w / Math.max(bounds.w, 1);
  if (zoneInView >= 0.3 && widthRatio <= 0.75) return true;

  return false;
}

function shouldPeelResortRoot(
  viewBox: MapViewBox,
  bounds: ZoneBounds,
): boolean {
  const zoneInView = viewZoneCoverage(viewBox, bounds);
  if (zoneInView < 0.16) return false;
  return shouldPeelZoneOverlay(viewBox, bounds);
}

/** Same peel rule for every Theme Park land overlay. */
function shouldPeelThemeParkLandOverlay(
  viewBox: MapViewBox,
  zoneId: string,
  bboxByElementId: Map<string, ZoneBounds>,
): boolean {
  const scale = viewBoxScale(viewBox);
  if (scale < THEME_PARK_LAND_PEEL_MIN_SCALE) return false;

  const bounds = zoneSelfBounds(zoneId, bboxByElementId);
  if (!bounds) return false;

  const coverage = viewZoneCoverage(viewBox, bounds);
  return coverage >= THEME_PARK_LAND_MIN_VIEW_COVERAGE;
}

function shouldPeelOtherNestedOverlay(
  viewBox: MapViewBox,
  zoneId: string,
  bboxByElementId: Map<string, ZoneBounds>,
): boolean {
  const bounds = zoneSelfBounds(zoneId, bboxByElementId);
  if (!bounds) return false;
  return shouldPeelZoneOverlay(viewBox, bounds);
}

function peelNestedOverlaysInView(
  parentId: string,
  viewBox: MapViewBox,
  bboxByElementId: Map<string, ZoneBounds>,
  peeled: Set<string>,
): void {
  for (const child of childZones(parentId)) {
    if (!child.overlaySvgId) continue;

    const peel =
      isInThemeParkTree(parentId) && shouldPeelThemeParkSubtreeAtScale(viewBox)
        ? true
        : isDirectThemeParkLand(child.id)
          ? shouldPeelThemeParkLandOverlay(viewBox, child.id, bboxByElementId)
          : shouldPeelOtherNestedOverlay(viewBox, child.id, bboxByElementId);

    if (!peel) continue;

    peeled.add(child.overlaySvgId);
    if (child.data.type === "aggregate") {
      peelNestedOverlaysInView(
        child.id,
        viewBox,
        bboxByElementId,
        peeled,
      );
    }
  }
}

/** Deepest aggregate zone most aligned with the viewport (not individual buildings). */
export function resolveViewportFocusZoneId(
  viewBox: MapViewBox,
  bboxByElementId: Map<string, ZoneBounds>,
): string | null {
  const scale = viewBoxScale(viewBox);
  if (scale < RESORT_OVERVIEW_MAX_SCALE) {
    return null;
  }

  const center = viewBoxCenter(viewBox);
  const viewArea = viewBox.w * viewBox.h;
  let best: { id: string; score: number; depth: number; area: number } | null =
    null;

  for (const zone of MAP_ZONE_DEFINITIONS) {
    if (zone.data.type !== "aggregate") continue;
    const bounds = aggregateZoneBounds(zone.id, bboxByElementId);
    if (!bounds) continue;

    const inter = intersectionArea(viewBox, bounds);
    const viewRatio = inter / Math.max(viewArea, 1);
    const centerInside = containsPoint(bounds, center);
    if (viewRatio < 0.05 && !centerInside) continue;

    const score =
      viewRatio * 1000 + (centerInside ? 80 : 0) + Math.min(viewRatio, 0.5);
    const depth = buildNavStackForZone(zone.id).length;
    const area = boundsArea(bounds);

    if (
      !best ||
      score > best.score + 0.001 ||
      (Math.abs(score - best.score) < 0.001 &&
        (depth > best.depth ||
          (depth === best.depth && area < best.area)))
    ) {
      best = { id: zone.id, score, depth, area };
    }
  }

  return best?.id ?? null;
}

/** Overlays peeled for the current viewport (multi-peel under each resort root). */
export function computePeeledOverlayIds(
  _focusZoneId: string | null,
  viewBox: MapViewBox,
  bboxByElementId: Map<string, ZoneBounds>,
): Set<string> {
  const peeled = new Set<string>();
  const scale = viewBoxScale(viewBox);

  if (scale < RESORT_OVERVIEW_MAX_SCALE) {
    return peeled;
  }

  const rootCoverage = ROOT_MAP_ZONE_IDS.map((rootId) => {
    const bounds = aggregateZoneBounds(rootId, bboxByElementId);
    return {
      rootId,
      bounds,
      coverage: bounds ? viewZoneCoverage(viewBox, bounds) : 0,
    };
  }).filter((entry) => entry.bounds);

  const maxRootCoverage = Math.max(
    0,
    ...rootCoverage.map((entry) => entry.coverage),
  );

  for (const { rootId, bounds, coverage } of rootCoverage) {
    if (!bounds || coverage < 0.14) continue;
    if (
      maxRootCoverage > 0.22 &&
      coverage < maxRootCoverage * 0.5 &&
      coverage < 0.32
    ) {
      continue;
    }
    if (!shouldPeelResortRoot(viewBox, bounds)) continue;

    const zone = getMapZone(rootId);
    if (!zone?.overlaySvgId) continue;

    peeled.add(zone.overlaySvgId);
    peelNestedOverlaysInView(rootId, viewBox, bboxByElementId, peeled);
  }

  return peeled;
}
