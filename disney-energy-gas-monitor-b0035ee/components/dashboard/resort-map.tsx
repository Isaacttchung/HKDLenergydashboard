"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RESORT_MAP_INTERACTIVE } from "@/lib/resort-map-config";
import {
  collectZoneSvgGraphicIds,
  getMapZone,
  MAP_ZONE_DEFINITIONS,
} from "@/lib/resort-map/registry";
import {
  buildNavStackForZone,
  visibleSvgElementIds,
  zoneIdForHitElement,
  zoneIdFromDomTarget,
} from "@/lib/resort-map/navigation";
import { allMapSvgElementIds } from "@/lib/resort-map/registry";
import { buildOverlayCompanionIndex } from "@/lib/resort-map/svg-companions";
import type { ZoneBounds } from "@/lib/resort-map/viewport-layers";
import {
  computePeeledOverlayIds,
  resolveViewportFocusZoneId,
} from "@/lib/resort-map/viewport-layers";
import {
  clientToSvgPoint,
  clampViewBox,
  formatViewBox,
  MAP_VIEWBOX_FULL,
  panViewBox,
  type MapViewBox,
  zoomViewBoxAtPoint,
} from "@/lib/resort-map/viewport";
import { cn } from "@/lib/utils";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

interface ResortMapProps {
  selectedMapZones: string[];
  onToggleMapZone: (zoneId: string) => void;
  onClearMapZones: () => void;
}

function findRegionElement(svg: SVGSVGElement, elementId: string): Element | null {
  return (
    svg.querySelector(`#${CSS.escape(elementId)}`) ??
    svg.querySelector(`[id="${elementId}"]`)
  );
}

function resolveClickTarget(el: Element): string | null {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const id = current.getAttribute("id");
    if (id) return id;
    current = current.parentElement;
  }
  return null;
}

const SHAPE_TAGS = new Set([
  "path",
  "polygon",
  "rect",
  "polyline",
  "circle",
  "ellipse",
]);

function isMapLabelElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === "text" || tag === "tspan" || el.classList.contains("resort-map-label");
}

function isBlackFillPath(path: SVGPathElement): boolean {
  const fill = (path.getAttribute("fill") ?? "").trim().toLowerCase();
  return fill === "black" || fill === "#000" || fill === "#000000";
}

function isAnnotationShapePath(path: SVGPathElement): boolean {
  if (isBlackFillPath(path)) return true;
  const id = path.getAttribute("id") ?? "";
  if (/_\d+$/.test(id)) return true;
  return false;
}

function isVisibleMapGraphic(el: Element, svg: SVGSVGElement): boolean {
  let node: Element | null = el;
  while (node && node !== svg) {
    if (node instanceof SVGGraphicsElement) {
      if (node.classList.contains("resort-map-hidden")) return false;
    }
    node = node.parentElement;
  }
  return true;
}

/** Min area (SVG units²) for a path to count as building/land footprint vs label glyph. */
const MIN_SELECTION_FOOTPRINT_AREA = 900;

function isLabelSizedShape(el: SVGGraphicsElement): boolean {
  try {
    const box = el.getBBox();
    return box.width * box.height < MIN_SELECTION_FOOTPRINT_AREA;
  } catch {
    return false;
  }
}

function collectSelectionFootprintShapes(
  root: SVGGraphicsElement,
  labelIds: Set<string>,
): SVGGraphicsElement[] {
  const shapes = [
    ...root.querySelectorAll("path, polygon, rect, polyline, circle, ellipse"),
  ].filter((el): el is SVGGraphicsElement => el instanceof SVGGraphicsElement);

  return shapes.filter((el) => {
    if (isMapLabelElement(el)) return false;
    const id = el.getAttribute("id");
    if (id && labelIds.has(id)) return false;
    if (el.classList.contains("resort-map-label")) return false;
    if (el instanceof SVGPathElement && isBlackFillPath(el)) return false;
    if (isLabelSizedShape(el)) return false;
    return true;
  });
}

function applySelectionToShape(
  root: SVGGraphicsElement,
  labelIds: Set<string>,
): void {
  if (isMapLabelElement(root)) return;

  const rootId = root.getAttribute("id");
  if (rootId && labelIds.has(rootId)) return;

  if (root instanceof SVGGElement) {
    const footprint = collectSelectionFootprintShapes(root, labelIds);

    for (const el of footprint) {
      el.classList.add("resort-map-selected");
    }
    return;
  }

  const tag = root.tagName.toLowerCase();
  if (SHAPE_TAGS.has(tag)) {
    if (root instanceof SVGPathElement && isBlackFillPath(root)) return;
    if (isLabelSizedShape(root)) return;
    root.classList.add("resort-map-selected");
  }
}

function clearSelectionFromMapLabels(svg: SVGSVGElement): void {
  for (const el of svg.querySelectorAll("text, tspan")) {
    el.classList.remove("resort-map-selected");
  }
  for (const el of svg.querySelectorAll(".resort-map-label")) {
    el.classList.remove("resort-map-selected");
  }
}

function MapZoneSelectionList({
  selectedMapZones,
  onToggleMapZone,
  onClearAll,
  placement,
}: {
  selectedMapZones: string[];
  onToggleMapZone: (zoneId: string) => void;
  onClearAll?: () => void;
  placement: "top" | "bottom";
}) {
  const showEmpty = placement === "top" || selectedMapZones.length > 0;

  if (!showEmpty) return null;

  return (
    <div
      className={cn(
        "space-y-2",
        placement === "top" &&
          "shrink-0 border-b border-brand-border pb-2",
        placement === "bottom" && "border-t border-brand-border pt-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Selected</p>
        {placement === "bottom" && selectedMapZones.length > 0 && onClearAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={onClearAll}
          >
            Clear
          </Button>
        )}
      </div>
      {selectedMapZones.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedMapZones.map((zoneId) => {
            const zone = getMapZone(zoneId);
            return (
              <li key={zoneId}>
                <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                  {zone?.label ?? zoneId}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-slate-200"
                    aria-label={`Remove ${zone?.label ?? zoneId}`}
                    onClick={() => onToggleMapZone(zoneId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No region selected</p>
      )}
    </div>
  );
}

function cacheZoneBounds(svg: SVGSVGElement): Map<string, ZoneBounds> {
  const map = new Map<string, ZoneBounds>();
  for (const id of allMapSvgElementIds()) {
    const el = findRegionElement(svg, id);
    if (!(el instanceof SVGGraphicsElement)) continue;
    const box = el.getBBox();
    map.set(id, { x: box.x, y: box.y, w: box.width, h: box.height });
  }
  return map;
}

export function ResortMap({
  selectedMapZones,
  onToggleMapZone,
  onClearMapZones,
}: ResortMapProps) {
  const titleId = useId();
  const svgHostRef = useRef<HTMLDivElement>(null);
  const wiredRef = useRef(false);
  const navStackRef = useRef<string[]>([]);
  const bboxCacheRef = useRef<Map<string, ZoneBounds>>(new Map());
  const companionIndexRef = useRef<Map<string, string[]>>(new Map());
  const viewBoxRef = useRef<MapViewBox>(MAP_VIEWBOX_FULL);
  const panSessionRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const handlersRef = useRef({ onToggleMapZone, onClearMapZones });
  handlersRef.current = { onToggleMapZone, onClearMapZones };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<MapViewBox>(MAP_VIEWBOX_FULL);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  viewBoxRef.current = viewBox;

  const focusZoneId = useMemo(
    () => resolveViewportFocusZoneId(viewBox, bboxCacheRef.current),
    [viewBox],
  );
  const peeledOverlays = useMemo(
    () =>
      computePeeledOverlayIds(
        focusZoneId,
        viewBox,
        bboxCacheRef.current,
      ),
    [focusZoneId, viewBox],
  );
  const navStack = useMemo(
    () => (focusZoneId ? buildNavStackForZone(focusZoneId) : []),
    [focusZoneId],
  );
  navStackRef.current = navStack;
  const peeledKey = useMemo(() => [...peeledOverlays].sort().join(","), [peeledOverlays]);

  const setViewBoxState = useCallback((next: MapViewBox) => {
    const clamped = clampViewBox(next);
    viewBoxRef.current = clamped;
    setViewBox(clamped);
  }, []);

  const expandHiddenOverlays = useCallback((overlayIds: Set<string>) => {
    const hidden = new Set<string>();
    for (const overlayId of overlayIds) {
      const companions =
        companionIndexRef.current.get(overlayId) ?? [overlayId];
      for (const id of companions) hidden.add(id);
    }
    return hidden;
  }, []);

  const applyVisibility = useCallback(
    (svg: SVGSVGElement, peeled: Set<string>) => {
      const hidden = expandHiddenOverlays(peeled);
      const visible = visibleSvgElementIds(hidden);
      const known = new Set(allMapSvgElementIds());

      for (const id of known) {
        const el = findRegionElement(svg, id);
        if (!el || !(el instanceof SVGGraphicsElement)) continue;
        const show = visible.has(id) && !hidden.has(id);
        el.classList.toggle("resort-map-hidden", !show);
        const interactive = show && RESORT_MAP_INTERACTIVE;
        el.classList.toggle("resort-map-region", interactive);
        if (interactive && el instanceof SVGGElement) {
          for (const child of el.querySelectorAll(
            "path, polygon, rect, polyline",
          )) {
            child.classList.add("resort-map-region");
          }
        }
      }

      for (const [overlayId, companions] of companionIndexRef.current) {
        for (const id of companions) {
          if (known.has(id)) continue;
          const el = findRegionElement(svg, id);
          if (!el || !(el instanceof SVGGraphicsElement)) continue;
          const hide = hidden.has(id) || hidden.has(overlayId);
          el.classList.toggle("resort-map-hidden", hide);
          if (id !== overlayId) {
            el.classList.add("resort-map-label");
          }
        }
      }
    },
    [expandHiddenOverlays],
  );

  const applySelectionStyles = useCallback(
    (svg: SVGSVGElement, zoneIds: string[]) => {
      for (const el of svg.querySelectorAll(".resort-map-selected")) {
        el.classList.remove("resort-map-selected");
      }
      for (const zoneId of zoneIds) {
        const zone = getMapZone(zoneId);
        if (!zone) continue;

        const graphicIds = collectZoneSvgGraphicIds(zoneId);

        for (const id of graphicIds) {
          const el = findRegionElement(svg, id);
          if (!(el instanceof SVGGraphicsElement)) continue;
          if (!isVisibleMapGraphic(el, svg)) continue;

          const labelIds = new Set<string>();
          const zoneForGraphic = MAP_ZONE_DEFINITIONS.find(
            (entry) =>
              entry.overlaySvgId === id || entry.svgHitIds.includes(id),
          );
          const overlayId = zoneForGraphic?.overlaySvgId ?? id;
          const companions =
            companionIndexRef.current.get(overlayId) ?? [overlayId];
          for (const companionId of companions) {
            if (companionId !== overlayId) labelIds.add(companionId);
          }

          applySelectionToShape(el, labelIds);
        }
      }

      clearSelectionFromMapLabels(svg);
    },
    [],
  );

  const handleZoneActivation = useCallback((zoneId: string) => {
    handlersRef.current.onToggleMapZone(zoneId);
  }, []);

  const wireInteractivity = useCallback(
    (svg: SVGSVGElement) => {
      if (!RESORT_MAP_INTERACTIVE) return;
      if (wiredRef.current) return;
      wiredRef.current = true;

      svg.setAttribute("role", "img");
      svg.setAttribute("aria-labelledby", titleId);

      svg.addEventListener("click", (event) => {
        const target = event.target as Element;
        let blocked = false;
        let node: Element | null = target;
        while (node && node !== svg) {
          if (
            node instanceof SVGGraphicsElement &&
            node.classList.contains("resort-map-hidden")
          ) {
            blocked = true;
            break;
          }
          node = node.parentElement;
        }
        if (blocked) return;

        const zoneId =
          zoneIdFromDomTarget(svg, target) ??
          (() => {
            const elementId = resolveClickTarget(target);
            return elementId
              ? zoneIdForHitElement(elementId, navStackRef.current)
              : null;
          })();
        if (!zoneId) return;

        event.stopPropagation();
        event.preventDefault();
        handleZoneActivation(zoneId);
        setHoverLabel(getMapZone(zoneId)?.label ?? zoneId);
      });

      svg.addEventListener("mousemove", (event) => {
        const target = event.target as Element;
        const zoneId =
          zoneIdFromDomTarget(svg, target) ??
          (() => {
            const elementId = resolveClickTarget(target);
            return elementId
              ? zoneIdForHitElement(elementId, navStackRef.current)
              : null;
          })();
        setHoverLabel(zoneId ? (getMapZone(zoneId)?.label ?? zoneId) : null);
      });

      svg.addEventListener("mouseleave", () => setHoverLabel(null));
    },
    [titleId, handleZoneActivation],
  );

  useEffect(() => {
    let cancelled = false;
    if (!svgHostRef.current) return;
    fetch("/hkdl-resort-map.svg")
      .then((res) => {
        if (!res.ok) throw new Error(`Map failed to load (${res.status})`);
        return res.text();
      })
      .then((markup) => {
        if (cancelled || !svgHostRef.current) return;
        svgHostRef.current.innerHTML = markup;
        const svg = svgHostRef.current.querySelector("svg");
        if (!svg) throw new Error("Invalid map file");
        svg.setAttribute("viewBox", formatViewBox(MAP_VIEWBOX_FULL));
        svg.classList.add("h-full", "w-full");
        bboxCacheRef.current = cacheZoneBounds(svg);
        const overlayIds = MAP_ZONE_DEFINITIONS.map(
          (zone) => zone.overlaySvgId,
        ).filter((id): id is string => Boolean(id));
        companionIndexRef.current = buildOverlayCompanionIndex(svg, overlayIds);
        wiredRef.current = false;
        wireInteractivity(svg);
        const focusId = resolveViewportFocusZoneId(
          viewBoxRef.current,
          bboxCacheRef.current,
        );
        const peeled = computePeeledOverlayIds(
          focusId,
          viewBoxRef.current,
          bboxCacheRef.current,
        );
        applyVisibility(svg, peeled);
        applySelectionStyles(svg, selectedMapZones);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wireInteractivity, applyVisibility, applySelectionStyles]);

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", formatViewBox(viewBox));
  }, [viewBox]);

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg");
    if (!svg) return;
    applyVisibility(svg, peeledOverlays);
    applySelectionStyles(svg, selectedMapZones);
  }, [peeledKey, selectedMapZones, applyVisibility, applySelectionStyles]);

  useEffect(() => {
    if (selectedMapZones.length === 0) {
      setViewBoxState(MAP_VIEWBOX_FULL);
    }
  }, [selectedMapZones, setViewBoxState]);

  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || loading) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const svg = host.querySelector("svg");
      if (!svg) return;
      const factor = event.deltaY > 0 ? 1.07 : 1 / 1.07;
      const point = clientToSvgPoint(svg, event.clientX, event.clientY);
      setViewBoxState(
        zoomViewBoxAtPoint(viewBoxRef.current, point, factor),
      );
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      panSessionRef.current = {
        active: true,
        lastX: event.clientX,
        lastY: event.clientY,
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!panSessionRef.current.active) return;
      event.preventDefault();
      const svg = host.querySelector("svg");
      if (!svg) return;
      const dxPx = event.clientX - panSessionRef.current.lastX;
      const dyPx = event.clientY - panSessionRef.current.lastY;
      panSessionRef.current.lastX = event.clientX;
      panSessionRef.current.lastY = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const dx = dxPx / ctm.a;
      const dy = dyPx / ctm.d;
      setViewBoxState(panViewBox(viewBoxRef.current, dx, dy));
    };

    const endPan = () => {
      panSessionRef.current.active = false;
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endPan);

    return () => {
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endPan);
    };
  }, [loading, setViewBoxState]);

  const clearSelection = () => {
    setViewBoxState(MAP_VIEWBOX_FULL);
    handlersRef.current.onClearMapZones();
  };

  const levelHint = RESORT_MAP_INTERACTIVE
    ? "Click to add/remove · Scroll to zoom · Middle-click drag to pan"
    : "Resort map preview";

  const mapSurface = (
    <div
      className={cn(
        "resort-map-host relative w-full overflow-hidden rounded-lg border border-brand-border bg-[#F5F5F5] select-none",
        expanded ? "min-h-0 flex-1 cursor-grab active:cursor-grabbing" : "aspect-[1395/1205]",
        loading && !expanded && "min-h-[160px]",
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-red-600">
          {loadError}
        </div>
      )}
      <div
        ref={svgHostRef}
        className={cn("h-full w-full [&_svg]:block", loading && "opacity-0")}
      />
      {hoverLabel && !loading && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
          {hoverLabel}
        </div>
      )}
      {!loading && !loadError && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 z-10 h-8 w-8 border border-brand-border bg-white/95 shadow-sm hover:bg-white"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse map" : "Expand map for filtering"}
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/45"
          aria-label="Close expanded map"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        className={cn(
          "space-y-2",
          expanded &&
            "fixed inset-3 z-50 flex max-h-[calc(100vh-1.5rem)] flex-col gap-2 rounded-xl border border-brand-border bg-white p-3 shadow-2xl sm:inset-6 sm:max-h-[calc(100vh-3rem)] sm:p-4",
        )}
      >
        <span id={titleId} className="sr-only">
          Hong Kong Disneyland resort map filter
        </span>

        {expanded && (
          <MapZoneSelectionList
            selectedMapZones={selectedMapZones}
            onToggleMapZone={onToggleMapZone}
            placement="top"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{levelHint}</p>
          {selectedMapZones.length > 0 && expanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={clearSelection}
            >
              Clear
            </Button>
          )}
        </div>
        {mapSurface}
        {!expanded && (
          <MapZoneSelectionList
            selectedMapZones={selectedMapZones}
            onToggleMapZone={onToggleMapZone}
            onClearAll={clearSelection}
            placement="bottom"
          />
        )}
      </div>
    </>
  );
}
