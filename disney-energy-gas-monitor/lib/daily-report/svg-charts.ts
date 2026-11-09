import type {
  CcpComparisonChart,
  HccpGasChart,
  HotelsKwhChart,
  ParkVsHotelChart,
  SolarGenerationTrendChart,
  Top10BuildingChart,
} from "@/lib/types";
import { formatReportNumber } from "@/lib/daily-report/format";
import { hccpGasChartTitle } from "@/lib/hccp-gas-chart";
import { hotelsKwhChartTitle } from "@/lib/hotels-kwh-chart";
import { parkVsHotelChartTitle } from "@/lib/park-vs-hotel-chart";
import { solarGenerationChartTitle } from "@/lib/solar-generation-trend-chart";

const BRAND = "#1d70b8";
const ORANGE = "#ea580c";
const SLATE = "#94a3b8";
const GRID = "#e2e8f0";
const TEXT = "#0d2137";
const MUTED = "#64748b";
const CHART_BORDER = "#b3d4ef";
const CHART_RADIUS = 8;
/** Matches Recharts clustered layout: ~20% gap between categories, bars touch within category. */
const BAR_CATEGORY_GAP_RATIO = 0.2;

interface ChartSvgOptions {
  /** Outer stroke around the chart (graph 5 combined view keeps this off). */
  bordered?: boolean;
  rounded?: boolean;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function buildTicks(max: number, count = 5): number[] {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) =>
    Math.round(step * i),
  );
}

function chartSvg(
  inner: string,
  width: number,
  height: number,
  options: ChartSvgOptions = {},
): string {
  const bordered = options.bordered ?? true;
  const rounded = options.rounded ?? true;
  const r = rounded ? CHART_RADIUS : 0;
  const rx = r ? ` rx="${r}" ry="${r}"` : "";
  const clipId = `chart-clip-${width}x${height}`;
  const bg = `<rect width="${width}" height="${height}" fill="#ffffff"${rx}/>`;
  const border = bordered
    ? `<rect x="0.75" y="0.75" width="${(width - 1.5).toFixed(2)}" height="${(height - 1.5).toFixed(2)}" fill="none" stroke="${CHART_BORDER}" stroke-width="1.5"${rx}/>`
    : "";
  const clipDef = rounded
    ? `<defs><clipPath id="${clipId}"><rect width="${width}" height="${height}"${rx}/></clipPath></defs>`
    : "";
  const body = rounded
    ? `<g clip-path="url(#${clipId})">${inner}</g>`
    : inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${clipDef}${bg}${body}${border}</svg>`;
}

/** Bordered panel (CCP side-by-side panels only). */
function framedPanelSvg(inner: string, width: number, height: number): string {
  const r = CHART_RADIUS;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff" rx="${r}" ry="${r}"/><rect x="0.75" y="0.75" width="${(width - 1.5).toFixed(2)}" height="${(height - 1.5).toFixed(2)}" fill="none" stroke="${CHART_BORDER}" stroke-width="1.5" rx="${r}" ry="${r}"/>${inner}</svg>`;
}

function gridLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GRID}" stroke-width="1" stroke-dasharray="3 3"/>`;
}

/** Bar with rounded top corners only (flat base on the x-axis). */
function roundedTopBar(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  radius = 4,
): string {
  if (h <= 0 || w <= 0) return "";
  const r = Math.min(radius, w / 2, h);
  if (r <= 0) {
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`;
  }
  const x0 = x;
  const x1 = x + w;
  const y0 = y;
  const y1 = y + h;
  const d = [
    `M ${x0.toFixed(1)} ${y1.toFixed(1)}`,
    `L ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `L ${x1.toFixed(1)} ${(y0 + r).toFixed(1)}`,
    `Q ${x1.toFixed(1)} ${y0.toFixed(1)} ${(x1 - r).toFixed(1)} ${y0.toFixed(1)}`,
    `L ${(x0 + r).toFixed(1)} ${y0.toFixed(1)}`,
    `Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${x0.toFixed(1)} ${(y0 + r).toFixed(1)}`,
    "Z",
  ].join(" ");
  return `<path d="${d}" fill="${fill}"/>`;
}

/** Keep titles inside the rounded border stroke. */
const BORDER_INSET = 12;
/** Shift right-axis titles slightly left (away from the border). */
const RIGHT_AXIS_TITLE_NUDGE = 14;

function leftAxisTitleX(
  marginLeft: number,
  tickAnchorOffset = 6,
  tickLabelWidth = 36,
): number {
  const tickAnchorX = marginLeft - tickAnchorOffset;
  const numbersInnerEdge = tickAnchorX - tickLabelWidth;
  return (BORDER_INSET + numbersInnerEdge) / 2;
}

function rightAxisTitleX(
  width: number,
  marginRight: number,
  tickAnchorOffset = 6,
  tickLabelWidth = 36,
): number {
  const tickAnchorX = width - marginRight + tickAnchorOffset;
  const numbersOuterEdge = tickAnchorX + tickLabelWidth;
  const borderEdge = width - BORDER_INSET - RIGHT_AXIS_TITLE_NUDGE;
  return (numbersOuterEdge + borderEdge) / 2;
}

function verticalAxisTitle(
  x: number,
  yCenter: number,
  label: string,
  side: "left" | "right",
  fontSize = 10,
): string {
  const rotation = side === "left" ? -90 : 90;
  return `<text x="${x.toFixed(1)}" y="${yCenter.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${MUTED}" transform="rotate(${rotation} ${x.toFixed(1)} ${yCenter.toFixed(1)})">${esc(label)}</text>`;
}

const CHART_MAIN_TITLE_Y = 28;

function chartMainTitle(title: string | undefined, width: number): string {
  if (!title) return "";
  const x = width / 2;
  return `<text x="${x}" y="${CHART_MAIN_TITLE_Y}" text-anchor="middle" font-size="11" font-weight="600" fill="${TEXT}">${esc(title)}</text>`;
}

function drawLegend(
  parts: string[],
  items: { color: string; label: string; kind?: "bar" | "line" }[],
  width: number,
  legendY: number,
): void {
  const totalChars = items.reduce((sum, item) => sum + item.label.length, 0);
  const approxWidth = items.length * 22 + totalChars * 4.6;
  let legendX = Math.max(12, (width - approxWidth) / 2);
  for (const item of items) {
    if (item.kind === "line") {
      parts.push(
        `<line x1="${legendX}" y1="${legendY - 4}" x2="${legendX + 12}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="2.5"/>`,
      );
      parts.push(
        `<circle cx="${legendX + 6}" cy="${legendY - 4}" r="3" fill="#fff" stroke="${item.color}" stroke-width="1.5"/>`,
      );
      parts.push(
        `<text x="${legendX + 16}" y="${legendY}" font-size="9" fill="${TEXT}">${esc(item.label)}</text>`,
      );
      legendX += 16 + item.label.length * 4.6 + 14;
    } else {
      parts.push(
        `<rect x="${legendX}" y="${legendY - 9}" width="10" height="10" fill="${item.color}" rx="1"/>`,
      );
      parts.push(
        `<text x="${legendX + 14}" y="${legendY}" font-size="9" fill="${TEXT}">${esc(item.label)}</text>`,
      );
      legendX += 14 + item.label.length * 4.6 + 14;
    }
  }
}

interface ClusteredBarLayout {
  bottomMargin?: number;
  xLabelOffset?: number;
  legendY?: number;
  topMargin?: number;
  title?: string;
}

function clusteredBarSvg(
  labels: string[],
  series: ChartSeries[],
  values: Record<string, Record<string, number>>,
  width: number,
  height: number,
  yLabel: string,
  yMax?: number,
  layout: ClusteredBarLayout = {},
): string {
  const margin = {
    top: layout.topMargin ?? (layout.title ? 48 : 22),
    right: 16,
    bottom: layout.bottomMargin ?? 88,
    left: 68,
  };
  const xLabelOffset = layout.xLabelOffset ?? 14;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  let maxVal = 0;
  for (const label of labels) {
    for (const s of series) {
      maxVal = Math.max(maxVal, values[label]?.[s.key] ?? 0);
    }
  }
  const axisMax = yMax ?? niceMax(maxVal);

  const groupW = innerW / Math.max(labels.length, 1);
  const bandWidth = groupW * (1 - BAR_CATEGORY_GAP_RATIO);
  const bandOffset = (groupW - bandWidth) / 2;
  const barW = bandWidth / Math.max(series.length, 1);

  const parts: string[] = [chartMainTitle(layout.title, width)];

  for (const tick of buildTicks(axisMax, 4)) {
    const y = margin.top + innerH - (tick / axisMax) * innerH;
    parts.push(gridLine(margin.left, y, width - margin.right, y));
    parts.push(
      `<text x="${margin.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="${MUTED}">${esc(formatReportNumber(tick))}</text>`,
    );
  }

  labels.forEach((label, gi) => {
    const gx = margin.left + gi * groupW;
    series.forEach((s, si) => {
      const val = values[label]?.[s.key] ?? 0;
      const h = (val / axisMax) * innerH;
      const x = gx + bandOffset + si * barW;
      const y = margin.top + innerH - h;
      const w = Math.max(barW, 1);
      parts.push(roundedTopBar(x, y, w, h, s.color));
    });
    const lx = gx + groupW / 2;
    const ly = height - margin.bottom + xLabelOffset;
    parts.push(
      `<text x="${lx}" y="${ly}" text-anchor="end" font-size="9" fill="${TEXT}" transform="rotate(-45 ${lx} ${ly})">${esc(label)}</text>`,
    );
  });

  parts.push(
    verticalAxisTitle(
      leftAxisTitleX(margin.left, 6, 40),
      margin.top + innerH / 2,
      yLabel,
      "left",
      10,
    ),
  );

  drawLegend(
    parts,
    series.map((s) => ({ color: s.color, label: s.label, kind: "bar" as const })),
    width,
    layout.legendY ?? height - 14,
  );

  return chartSvg(parts.join(""), width, height);
}

function linePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function composedGasSolarSvg(
  labels: string[],
  bars: { key: string; label: string; color: string; values: number[] },
  lines: { key: string; label: string; color: string; values: (number | undefined)[] }[],
  width: number,
  height: number,
  leftMax: number,
  rightMax: number,
  leftLabel: string,
  rightLabel = "% / °C",
  title?: string,
): string {
  const margin = { top: title ? 48 : 22, right: 52, bottom: 88, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const groupW = innerW / Math.max(labels.length, 1);
  const bandWidth = groupW * (1 - BAR_CATEGORY_GAP_RATIO);
  const bandOffset = (groupW - bandWidth) / 2;

  const parts: string[] = [chartMainTitle(title, width)];

  for (const tick of buildTicks(leftMax, 4)) {
    const y = margin.top + innerH - (tick / leftMax) * innerH;
    parts.push(gridLine(margin.left, y, width - margin.right, y));
    parts.push(
      `<text x="${margin.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="${MUTED}">${tick.toLocaleString()}</text>`,
    );
  }

  labels.forEach((label, i) => {
    const val = bars.values[i] ?? 0;
    const h = (val / leftMax) * innerH;
    const x = margin.left + i * groupW + bandOffset;
    const y = margin.top + innerH - h;
    parts.push(roundedTopBar(x, y, bandWidth, h, bars.color));
    const lx = margin.left + i * groupW + groupW / 2;
    const ly = height - margin.bottom + 14;
    parts.push(
      `<text x="${lx}" y="${ly}" text-anchor="end" font-size="9" fill="${TEXT}" transform="rotate(-45 ${lx} ${ly})">${esc(label)}</text>`,
    );
  });

  for (const tick of buildTicks(rightMax, 4)) {
    const y = margin.top + innerH - (tick / rightMax) * innerH;
    parts.push(
      `<text x="${width - margin.right + 6}" y="${y + 4}" text-anchor="start" font-size="9" fill="${MUTED}">${esc(formatReportNumber(tick))}</text>`,
    );
  }

  for (const line of lines) {
    const pts = line.values.map((v, i) => {
      const val = v ?? 0;
      const x = margin.left + i * groupW + groupW / 2;
      const y = margin.top + innerH - (val / rightMax) * innerH;
      return { x, y };
    });
    parts.push(
      `<path d="${linePath(pts)}" fill="none" stroke="${line.color}" stroke-width="2.5"/>`,
    );
    pts.forEach((p, i) => {
      if (line.values[i] == null) return;
      parts.push(
        `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" stroke="${line.color}" stroke-width="2"/>`,
      );
    });
  }

  const yMid = margin.top + innerH / 2;
  parts.push(
    verticalAxisTitle(
      leftAxisTitleX(margin.left, 6, 34),
      yMid,
      leftLabel,
      "left",
      9,
    ),
  );
  parts.push(
    verticalAxisTitle(
      rightAxisTitleX(width, margin.right, 6, 34),
      yMid,
      rightLabel,
      "right",
      9,
    ),
  );

  drawLegend(
    parts,
    [
      { color: bars.color, label: bars.label, kind: "bar" },
      ...lines.map((l) => ({ color: l.color, label: l.label, kind: "line" as const })),
    ],
    width,
    height - 14,
  );

  return chartSvg(parts.join(""), width, height);
}

export function parkVsHotelChartSvg(chart: ParkVsHotelChart): string {
  const labels = chart.data.map((d) => d.label);
  const values: Record<string, Record<string, number>> = {};
  for (const d of chart.data) {
    values[d.label] = { themePark: d.themePark, hotel: d.hotel };
  }
  return clusteredBarSvg(
    labels,
    [
      { key: "themePark", label: "Theme Park", color: BRAND },
      { key: "hotel", label: "Hotel", color: ORANGE },
    ],
    values,
    520,
    260,
    "kWh",
    undefined,
    { title: parkVsHotelChartTitle(chart.granularity) },
  );
}

export function hotelsKwhChartSvg(chart: HotelsKwhChart): string {
  const labels = chart.data.map((d) => d.label);
  const values: Record<string, Record<string, number>> = {};
  for (const d of chart.data) {
    values[d.label] = { dhh: d.dhh, dlh: d.dlh, del: d.del };
  }
  return clusteredBarSvg(
    labels,
    [
      { key: "dhh", label: "DHH kWh", color: BRAND },
      { key: "dlh", label: "DLH kWh", color: ORANGE },
      { key: "del", label: "DEL kWh", color: SLATE },
    ],
    values,
    520,
    260,
    "kWh",
    undefined,
    { title: hotelsKwhChartTitle(chart.granularity) },
  );
}

export function hccpGasChartSvg(chart: HccpGasChart): string {
  const labels = chart.data.map((d) => d.label);
  return composedGasSolarSvg(
    labels,
    {
      key: "gasUnits",
      label: "Gas Consumption (units)",
      color: ORANGE,
      values: chart.data.map((d) => d.gasUnits),
    },
    [
      {
        key: "ballroom",
        label: "Ballroom Utilization (%)",
        color: "#1e293b",
        values: chart.data.map((d) => d.ballroomUtilization),
      },
      {
        key: "occupancy",
        label: "Overall Occupancy (%)",
        color: "#c4a574",
        values: chart.data.map((d) => d.overallOccupancyPct),
      },
      {
        key: "temp",
        label: "Outdoor Air Temperature (oC)",
        color: "#7ab3dd",
        values: chart.data.map((d) => d.outdoorTempC),
      },
    ],
    520,
    260,
    chart.axis.leftMax,
    chart.axis.rightMax,
    "Gas (units)",
    "% / °C",
    hccpGasChartTitle(chart.granularity),
  );
}

export function solarGenerationChartSvg(chart: SolarGenerationTrendChart): string {
  const labels = chart.data.map((d) => d.label);
  return composedGasSolarSvg(
    labels,
    {
      key: "gen",
      label: "Total (kWh)",
      color: BRAND,
      values: chart.data.map((d) => d.generationKwh),
    },
    [
      {
        key: "sun",
        label: "Sunshine (Hr)",
        color: ORANGE,
        values: chart.data.map((d) => d.sunshineHours),
      },
    ],
    520,
    260,
    chart.axis.leftMax,
    chart.axis.rightMax,
    "kWh",
    "Sunshine (Hr)",
    solarGenerationChartTitle(chart.granularity),
  );
}

function ccpPanelSvg(
  title: string,
  subtitle: string,
  labels: string[],
  barValues: number[],
  lineValues: (number | undefined)[],
  barColor: string,
  lineColor: string,
  barLegendLabel: string,
  lineLegendLabel: string,
  leftMax: number,
  rightMax: number,
  width: number,
  height: number,
): string {
  const margin = { top: 42, right: 40, bottom: 52, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const groupW = innerW / Math.max(labels.length, 1);
  const bandWidth = groupW * (1 - BAR_CATEGORY_GAP_RATIO);
  const bandOffset = (groupW - bandWidth) / 2;
  const titleX = width / 2;

  const parts: string[] = [
    `<text x="${titleX}" y="18" text-anchor="middle" font-size="11" font-weight="600" fill="${TEXT}">${esc(title)}</text>`,
    `<text x="${titleX}" y="32" text-anchor="middle" font-size="9" fill="${MUTED}">${esc(subtitle)}</text>`,
  ];

  for (const tick of buildTicks(leftMax, 3)) {
    const y = margin.top + innerH - (tick / leftMax) * innerH;
    parts.push(gridLine(margin.left, y, width - margin.right, y));
    parts.push(
      `<text x="${margin.left - 5}" y="${y + 3}" text-anchor="end" font-size="8" fill="${MUTED}">${esc(formatReportNumber(tick))}</text>`,
    );
  }

  for (const tick of buildTicks(rightMax, 3)) {
    const y = margin.top + innerH - (tick / rightMax) * innerH;
    parts.push(
      `<text x="${width - margin.right + 5}" y="${y + 3}" text-anchor="start" font-size="8" fill="${MUTED}">${esc(formatReportNumber(tick))}</text>`,
    );
  }

  labels.forEach((label, i) => {
    const val = barValues[i] ?? 0;
    const h = (val / leftMax) * innerH;
    const x = margin.left + i * groupW + bandOffset;
    const y = margin.top + innerH - h;
    parts.push(roundedTopBar(x, y, bandWidth, h, barColor));
    const lx = margin.left + i * groupW + groupW / 2;
    parts.push(
      `<text x="${lx}" y="${height - 28}" text-anchor="middle" font-size="8" fill="${TEXT}">${esc(label)}</text>`,
    );
  });

  const pts = lineValues.map((v, i) => {
    const val = v ?? 0;
    const x = margin.left + i * groupW + groupW / 2;
    const y = margin.top + innerH - (val / rightMax) * innerH;
    return { x, y };
  });
  parts.push(
    `<path d="${linePath(pts)}" fill="none" stroke="${lineColor}" stroke-width="2.5"/>`,
  );
  pts.forEach((p, i) => {
    if (lineValues[i] == null) return;
    parts.push(
      `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" stroke="${lineColor}" stroke-width="2"/>`,
    );
  });

  const yMid = margin.top + innerH / 2;
  parts.push(
    verticalAxisTitle(
      leftAxisTitleX(margin.left, 5, 28),
      yMid,
      "kWh",
      "left",
      8,
    ),
  );
  parts.push(
    verticalAxisTitle(
      rightAxisTitleX(width, margin.right, 5, 28),
      yMid,
      "Temp (°C)",
      "right",
      8,
    ),
  );

  drawLegend(
    parts,
    [
      { color: barColor, label: barLegendLabel, kind: "bar" },
      { color: lineColor, label: lineLegendLabel, kind: "line" },
    ],
    width,
    height - 8,
  );

  return framedPanelSvg(parts.join(""), width, height);
}

export function ccpComparisonPanelChartSvg(
  panel: CcpComparisonChart["leftPanel"],
  axis: CcpComparisonChart["axis"],
  barColor: string,
  lineColor: string,
  width: number,
  height: number,
): string {
  return ccpPanelSvg(
    panel.title,
    panel.dateRangeLabel,
    panel.data.map((d) => d.label),
    panel.data.map((d) => d.ccpKwh),
    panel.data.map((d) => d.outdoorTempC),
    barColor,
    lineColor,
    "Sum CCP1",
    "Outdoor temp (oC)",
    axis.leftMax,
    axis.rightMax,
    width,
    height,
  );
}

export function ccpComparisonChartSvg(chart: CcpComparisonChart): string {
  const panelW = 250;
  const panelH = 240;
  const leftPanel = ccpComparisonPanelChartSvg(
    chart.leftPanel,
    chart.axis,
    "#1d70b8",
    "#ea580c",
    panelW,
    panelH,
  );
  const rightPanel = ccpComparisonPanelChartSvg(
    chart.rightPanel,
    chart.axis,
    "#ca8a04",
    "#fcd34d",
    panelW,
    panelH,
  );

  const stripOuter = (svg: string) =>
    svg
      .replace(/^[\s\S]*?<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "");

  const gap = 12;
  const totalW = panelW * 2 + gap;
  return chartSvg(
    `<g transform="translate(0,0)">${stripOuter(leftPanel)}</g><g transform="translate(${panelW + gap},0)">${stripOuter(rightPanel)}</g>`,
    totalW,
    panelH,
    { bordered: false, rounded: true },
  );
}

export function top10BuildingChartSvg(chart: Top10BuildingChart): string {
  const labels = chart.data.map((d) => d.label);
  const values: Record<string, Record<string, number>> = {};
  for (const row of chart.data) {
    values[row.label] = {};
    for (const s of chart.series) {
      values[row.label][s.dataKey] = Number(row[s.dataKey] ?? 0);
    }
  }
  return clusteredBarSvg(
    labels,
    chart.series.map((s) => ({
      key: s.dataKey,
      label: s.name,
      color: s.color,
    })),
    values,
    520,
    320,
    "kWh",
    chart.axis.leftMax,
    {
      bottomMargin: 132,
      xLabelOffset: 18,
      legendY: 308,
      topMargin: 48,
      title: chart.title,
    },
  );
}
