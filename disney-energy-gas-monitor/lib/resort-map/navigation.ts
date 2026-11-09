import {
  MAP_ZONE_DEFINITIONS,
  ROOT_MAP_ZONE_IDS,
  childZones,
  getMapZone,
} from "@/lib/resort-map/registry";

export function hiddenOverlayIds(navStack: string[]): Set<string> {
  const hidden = new Set<string>();
  for (const zoneId of navStack) {
    const overlay = getMapZone(zoneId)?.overlaySvgId;
    if (overlay) hidden.add(overlay);
  }
  return hidden;
}

function addZoneGraphics(
  visible: Set<string>,
  hiddenOverlays: Set<string>,
  zoneId: string,
): void {
  const zone = getMapZone(zoneId);
  if (!zone) return;
  if (zone.overlaySvgId && !hiddenOverlays.has(zone.overlaySvgId)) {
    visible.add(zone.overlaySvgId);
  }
  for (const hit of zone.svgHitIds) {
    if (!hiddenOverlays.has(hit)) visible.add(hit);
  }
}

/** When a zone overlay is peeled, show its children; roots stay until their own overlay peels. */
function addVisibleUnderParent(
  visible: Set<string>,
  hiddenOverlays: Set<string>,
  parentId: string,
): void {
  for (const child of childZones(parentId)) {
    addZoneGraphics(visible, hiddenOverlays, child.id);
    const overlay = child.overlaySvgId;
    if (overlay && hiddenOverlays.has(overlay)) {
      addVisibleUnderParent(visible, hiddenOverlays, child.id);
    }
  }
}

export function visibleSvgElementIds(
  hiddenOverlays: Set<string> = new Set(),
): Set<string> {
  const visible = new Set<string>();

  for (const rootId of ROOT_MAP_ZONE_IDS) {
    addZoneGraphics(visible, hiddenOverlays, rootId);
    const root = getMapZone(rootId);
    const rootOverlay = root?.overlaySvgId;
    if (rootOverlay && hiddenOverlays.has(rootOverlay)) {
      addVisibleUnderParent(visible, hiddenOverlays, rootId);
    }
  }

  return visible;
}

/** Navigation stack for layer visibility (aggregate ancestors + selected aggregate). */
export function buildNavStackForZone(zoneId: string | null): string[] {
  if (!zoneId) return [];
  const chain: string[] = [];
  let id: string | null = zoneId;
  while (id) {
    chain.unshift(id);
    id = getMapZone(id)?.parentId ?? null;
  }
  return chain.filter((zid) => {
    if (zid !== zoneId) return true;
    return getMapZone(zid)?.data.type === "aggregate";
  });
}

function zoneDepth(zoneId: string): number {
  let depth = 0;
  let parentId = getMapZone(zoneId)?.parentId ?? null;
  while (parentId) {
    depth += 1;
    parentId = getMapZone(parentId)?.parentId ?? null;
  }
  return depth;
}

/** Map any configured SVG id to its zone (deepest when ids are nested). */
export function zoneIdForSvgElementId(elementId: string): string | null {
  let match: { id: string; depth: number } | null = null;

  for (const zone of MAP_ZONE_DEFINITIONS) {
    const isHit =
      zone.svgHitIds.includes(elementId) ||
      zone.overlaySvgId === elementId;
    if (!isHit) continue;

    const depth = zoneDepth(zone.id);
    if (!match || depth > match.depth) {
      match = { id: zone.id, depth };
    }
  }

  return match?.id ?? null;
}

/** Walk DOM ancestors and return the deepest configured map zone. */
export function zoneIdFromDomTarget(
  svg: SVGSVGElement,
  target: Element,
): string | null {
  let best: { id: string; depth: number } | null = null;
  let current: Element | null = target;

  while (current && current !== svg) {
    const elementId = current.getAttribute("id");
    if (elementId) {
      const zoneId = zoneIdForSvgElementId(elementId);
      if (zoneId) {
        const depth = zoneDepth(zoneId);
        if (!best || depth > best.depth) {
          best = { id: zoneId, depth };
        }
      }
    }
    current = current.parentElement;
  }

  return best?.id ?? null;
}

export function zoneIdForHitElement(
  elementId: string,
  navStack: string[],
): string | null {
  const direct = zoneIdForSvgElementId(elementId);
  if (direct) return direct;

  const parentId =
    navStack.length === 0 ? null : navStack[navStack.length - 1];

  const candidates =
    navStack.length === 0
      ? ROOT_MAP_ZONE_IDS.map((id) => getMapZone(id)).filter(Boolean)
      : childZones(parentId!);

  for (const zone of candidates) {
    if (!zone) continue;
    if (zone.svgHitIds.includes(elementId)) return zone.id;
    if (zone.overlaySvgId === elementId) return zone.id;
  }

  return null;
}
