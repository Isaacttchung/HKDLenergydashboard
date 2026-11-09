/** Label / title paths that sit beside overlay paths in the same SVG group. */
export function overlayCompanionElementIds(
  svg: SVGSVGElement,
  overlayId: string,
): string[] {
  const overlay =
    svg.querySelector(`#${CSS.escape(overlayId)}`) ??
    svg.querySelector(`[id="${overlayId}"]`);
  if (!overlay?.parentElement) return [overlayId];

  const ids = new Set<string>([overlayId]);
  const parent = overlay.parentElement;

  for (const child of parent.children) {
    if (child === overlay) continue;
    const id = child.getAttribute("id");
    if (!id) continue;
    if (child instanceof SVGGraphicsElement) {
      ids.add(id);
    }
  }

  return [...ids];
}

export function buildOverlayCompanionIndex(
  svg: SVGSVGElement,
  overlayIds: string[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const overlayId of overlayIds) {
    map.set(overlayId, overlayCompanionElementIds(svg, overlayId));
  }
  return map;
}
