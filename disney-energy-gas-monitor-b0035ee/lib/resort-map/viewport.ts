import { MAP_VIEWBOX } from "@/lib/resort-map-config";

export interface MapViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAP_VIEWBOX_FULL: MapViewBox = {
  x: 0,
  y: 0,
  w: MAP_VIEWBOX.width,
  h: MAP_VIEWBOX.height,
};

export function parseViewBox(viewBox: string): MapViewBox {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  return { x, y, w, h };
}

export function formatViewBox(vb: MapViewBox): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
}

export function viewBoxScale(vb: MapViewBox): number {
  return MAP_VIEWBOX.width / vb.w;
}

export function clampViewBox(vb: MapViewBox): MapViewBox {
  const minW = MAP_VIEWBOX.width / 24;
  const maxW = MAP_VIEWBOX.width;
  let { x, y, w, h } = vb;
  w = Math.min(maxW, Math.max(minW, w));
  h = w * (MAP_VIEWBOX.height / MAP_VIEWBOX.width);

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > MAP_VIEWBOX.width) x = MAP_VIEWBOX.width - w;
  if (y + h > MAP_VIEWBOX.height) y = MAP_VIEWBOX.height - h;

  return { x, y, w, h };
}

export function zoomViewBoxAtPoint(
  vb: MapViewBox,
  svgPoint: { x: number; y: number },
  factor: number,
): MapViewBox {
  const nextW = vb.w * factor;
  const nextH = vb.h * factor;
  const ratioX = (svgPoint.x - vb.x) / vb.w;
  const ratioY = (svgPoint.y - vb.y) / vb.h;
  const x = svgPoint.x - ratioX * nextW;
  const y = svgPoint.y - ratioY * nextH;
  return clampViewBox({ x, y, w: nextW, h: nextH });
}

export function panViewBox(vb: MapViewBox, dx: number, dy: number): MapViewBox {
  return clampViewBox({ ...vb, x: vb.x - dx, y: vb.y - dy });
}

export function viewBoxCenter(vb: MapViewBox): { x: number; y: number } {
  return { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
}

export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}
