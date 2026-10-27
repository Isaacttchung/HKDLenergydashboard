import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import type { DailyReportPayload } from "@/lib/daily-report/build-daily-report-data";
import {
  formatPct,
  formatReportNumber,
  formatTempC,
} from "@/lib/daily-report/format";
import {
  ccpComparisonPanelChartSvg,
  hccpGasChartSvg,
  hotelsKwhChartSvg,
  parkVsHotelChartSvg,
  solarGenerationChartSvg,
  top10BuildingChartSvg,
} from "@/lib/daily-report/svg-charts";
import {
  buildCcpPanelTableRows,
  buildTop10BuildingTableRows,
  formatGasTableUnits,
  formatSolarTableSunshine,
  formatSolarTableTotal,
  type HccpGasDailyTable,
  type SolarDailyTable,
} from "@/lib/daily-report/section-tables";
import type {
  CcpComparisonChart,
  CcpComparisonPanel,
  Top10BuildingChart,
} from "@/lib/types";
import { resortYoYSentenceParts } from "@/lib/daily-report/yoy";

const PAGE_MARGIN = 44;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const HEADER_FILL = "#e9f2f9";
const SUBHEADER_FILL = "#f4f9fd";
const BORDER = "#b3d4ef";
const TEXT = "#0d2137";
const SECTION_GAP = 14;
const CHART_GAP = 18;
const FOOTER_BLOCK_HEIGHT = 48;

type PDFDoc = InstanceType<typeof PDFDocument>;

type TableColumn = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

function pageBottom(): number {
  return PAGE_HEIGHT - PAGE_MARGIN;
}

function syncCursor(doc: PDFDoc, y: number): void {
  doc.x = PAGE_MARGIN;
  doc.y = y;
}

function ensureSpace(doc: PDFDoc, y: number, needed: number): number {
  if (y + needed > pageBottom()) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function drawSectionTitle(doc: PDFDoc, y: number, title: string): number {
  y = ensureSpace(doc, y + SECTION_GAP, 32);
  syncCursor(doc, y);
  doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(12);
  doc.text(title, PAGE_MARGIN, y, { width: CONTENT_WIDTH, lineBreak: true });
  return doc.y + 10;
}

function drawParagraph(doc: PDFDoc, y: number, text: string): number {
  y = ensureSpace(doc, y, 28);
  syncCursor(doc, y);
  doc.fillColor(TEXT).font("Helvetica").fontSize(10);
  doc.text(text, PAGE_MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
  return doc.y + 10;
}

function drawYoYSentence(doc: PDFDoc, y: number, changePct: number): number {
  const { prefix, emphasis, suffix } = resortYoYSentenceParts(changePct);
  y = ensureSpace(doc, y, 28);
  syncCursor(doc, y);
  doc.fillColor(TEXT).font("Helvetica").fontSize(10);
  doc.text(prefix, PAGE_MARGIN, y, {
    width: CONTENT_WIDTH,
    lineGap: 2,
    continued: true,
  });
  doc.font("Helvetica-Bold").text(emphasis, { continued: true });
  doc.font("Helvetica").text(suffix);
  return doc.y + 10;
}

function measureCellsHeight(
  doc: PDFDoc,
  columns: TableColumn[],
  cells: string[],
  fontName: string,
  fontSize: number,
  cellPadding: number,
): number {
  doc.font(fontName).fontSize(fontSize);
  let maxHeight = fontSize + cellPadding * 2;
  for (let i = 0; i < columns.length; i += 1) {
    const innerWidth = columns[i].width - cellPadding * 2;
    const textHeight = doc.heightOfString(cells[i] ?? "—", {
      width: Math.max(innerWidth, 8),
      align: columns[i].align ?? "left",
    });
    maxHeight = Math.max(maxHeight, textHeight + cellPadding * 2);
  }
  return maxHeight;
}

function drawTable(
  doc: PDFDoc,
  y: number,
  columns: TableColumn[],
  rows: string[][],
  fontSize = 8,
  startX: number = PAGE_MARGIN,
): number {
  const cellPadding = 5;
  const x0 = startX;

  const headerCells = columns.map((col) => col.label);
  const headerHeight = measureCellsHeight(
    doc,
    columns,
    headerCells,
    "Helvetica-Bold",
    fontSize,
    cellPadding,
  );

  y = ensureSpace(doc, y, headerHeight + 8);

  let x = x0;
  doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(TEXT);
  for (const col of columns) {
    doc.rect(x, y, col.width, headerHeight).fillAndStroke(HEADER_FILL, BORDER);
    doc.fillColor(TEXT);
    doc.text(col.label, x + cellPadding, y + cellPadding, {
      width: col.width - cellPadding * 2,
      align: col.align ?? "left",
      lineBreak: true,
    });
    x += col.width;
  }
  y += headerHeight;

  doc.font("Helvetica").fontSize(fontSize).fillColor(TEXT);
  for (const row of rows) {
    const rowHeight = measureCellsHeight(
      doc,
      columns,
      row,
      "Helvetica",
      fontSize,
      cellPadding,
    );
    y = ensureSpace(doc, y, rowHeight);

    x = x0;
    for (let i = 0; i < columns.length; i += 1) {
      const col = columns[i];
      const cell = row[i] ?? "";
      doc.rect(x, y, col.width, rowHeight).stroke(BORDER);
      doc.fillColor(TEXT);
      doc.text(cell, x + cellPadding, y + cellPadding, {
        width: col.width - cellPadding * 2,
        align: col.align ?? "left",
        lineBreak: true,
      });
      x += col.width;
    }
    y += rowHeight;
  }

  syncCursor(doc, y + 12);
  return y + 12;
}

function drawTableRow(
  doc: PDFDoc,
  y: number,
  x0: number,
  columns: TableColumn[],
  cells: string[],
  fontSize: number,
  cellPadding: number,
  options?: { bold?: boolean; fill?: string },
): number {
  const fontName = options?.bold ? "Helvetica-Bold" : "Helvetica";
  const rowHeight = measureCellsHeight(
    doc,
    columns,
    cells,
    fontName,
    fontSize,
    cellPadding,
  );
  y = ensureSpace(doc, y, rowHeight);

  doc.font(fontName).fontSize(fontSize).fillColor(TEXT);
  let x = x0;
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    if (options?.fill) {
      doc.rect(x, y, col.width, rowHeight).fillAndStroke(options.fill, BORDER);
    } else {
      doc.rect(x, y, col.width, rowHeight).stroke(BORDER);
    }
    doc.fillColor(TEXT);
    doc.text(cells[i] ?? "", x + cellPadding, y + cellPadding, {
      width: col.width - cellPadding * 2,
      align: col.align ?? "left",
      lineBreak: true,
    });
    x += col.width;
  }
  return y + rowHeight;
}

function drawHccpGasDailyTable(doc: PDFDoc, y: number, table: HccpGasDailyTable): number {
  const columns: TableColumn[] = [
    { label: "Date", width: 48, align: "center" },
    {
      label: "Previous year gas consumption (Unit)",
      width: 138,
      align: "center",
    },
    {
      label: "Current year gas consumption (Unit)",
      width: 138,
      align: "center",
    },
    { label: "Difference in %", width: 88, align: "center" },
  ];
  const x0 = PAGE_MARGIN;
  const fontSize = 8;
  const cellPadding = 5;

  y = drawTableRow(
    doc,
    y,
    x0,
    columns,
    columns.map((c) => c.label),
    fontSize,
    cellPadding,
    { bold: true, fill: HEADER_FILL },
  );
  y = drawTableRow(
    doc,
    y,
    x0,
    columns,
    ["", table.priorYear, table.currentYear, ""],
    fontSize,
    cellPadding,
    { bold: true, fill: SUBHEADER_FILL },
  );
  y = drawTableRow(
    doc,
    y,
    x0,
    columns,
    [
      table.dateLabel,
      formatGasTableUnits(table.previousGas),
      formatGasTableUnits(table.currentGas),
      table.differencePct,
    ],
    fontSize,
    cellPadding,
  );
  syncCursor(doc, y + 12);
  return y + 12;
}

function buildFixedWidthTableColumns(
  tableWidth: number,
  labelColWidth: number,
  headerLabels: string[],
): TableColumn[] {
  const dataCols = Math.max(headerLabels.length, 1);
  const dataWidth = Math.max(0, tableWidth - labelColWidth);
  const baseWidth = Math.floor(dataWidth / dataCols);
  const remainder = dataWidth - baseWidth * dataCols;
  return [
    { label: "", width: labelColWidth, align: "left" },
    ...headerLabels.map((label, index) => ({
      label,
      width: baseWidth + (index < remainder ? 1 : 0),
      align: "center" as const,
    })),
  ];
}

function drawCcpPanelSummaryTable(
  doc: PDFDoc,
  y: number,
  startX: number,
  tableWidth: number,
  panel: CcpComparisonPanel,
  granularity: CcpComparisonChart["granularity"],
): number {
  const { headerLabels, rows } = buildCcpPanelTableRows(panel, granularity);
  const columns = buildFixedWidthTableColumns(tableWidth, 48, headerLabels);
  return drawTable(doc, y, columns, rows, 7, startX);
}

function drawSideBySideSvgCharts(
  doc: PDFDoc,
  y: number,
  leftSvg: string,
  rightSvg: string,
  panelWidth: number,
  gap: number,
): number {
  const leftSize = svgLayoutSize(leftSvg, panelWidth);
  const rightSize = svgLayoutSize(rightSvg, panelWidth);
  const height = Math.max(leftSize.height, rightSize.height);
  y = ensureSpace(doc, y, height + CHART_GAP);
  syncCursor(doc, y);

  SVGtoPDF(doc, leftSvg, PAGE_MARGIN, y, {
    width: panelWidth,
    height: leftSize.height,
    preserveAspectRatio: "xMidYMid meet",
  });
  SVGtoPDF(doc, rightSvg, PAGE_MARGIN + panelWidth + gap, y, {
    width: panelWidth,
    height: rightSize.height,
    preserveAspectRatio: "xMidYMid meet",
  });

  const nextY = y + height + CHART_GAP;
  syncCursor(doc, nextY);
  return nextY;
}

function drawTop10BuildingSummaryTable(
  doc: PDFDoc,
  y: number,
  chart: Top10BuildingChart,
): number {
  const built = buildTop10BuildingTableRows(chart);
  if (!built) return y;

  const { headerLabels, rows } = built;
  const labelColWidth = 76;
  const buildingCount = Math.max(headerLabels.length, 1);
  const dataColWidth = Math.max(
    44,
    Math.floor((CONTENT_WIDTH - labelColWidth) / buildingCount),
  );
  const columns: TableColumn[] = [
    { label: "", width: labelColWidth, align: "left" },
    ...headerLabels.map((label) => ({
      label,
      width: dataColWidth,
      align: "center" as const,
    })),
  ];
  return drawTable(doc, y, columns, rows, 7);
}

function drawSolarDailyTable(doc: PDFDoc, y: number, table: SolarDailyTable): number {
  const columns: TableColumn[] = [
    { label: "Date", width: 120, align: "center" },
    { label: "Total", width: 120, align: "center" },
    { label: "Sunshine (Hr)", width: 120, align: "center" },
  ];
  return drawTable(doc, y, columns, [
    [
      table.dateLabel,
      formatSolarTableTotal(table.totalKwh),
      formatSolarTableSunshine(table.sunshineHours),
    ],
  ]);
}

function svgLayoutSize(svg: string, targetWidthPt: number): {
  width: number;
  height: number;
} {
  const widthMatch = svg.match(/\bwidth="([\d.]+)"/);
  const heightMatch = svg.match(/\bheight="([\d.]+)"/);
  const svgWidth = Number(widthMatch?.[1] ?? 520);
  const svgHeight = Number(heightMatch?.[1] ?? 260);
  const height = targetWidthPt * (svgHeight / svgWidth);
  return { width: targetWidthPt, height };
}

function drawSvgChart(doc: PDFDoc, y: number, svg: string): number {
  const { width, height } = svgLayoutSize(svg, CONTENT_WIDTH);
  y = ensureSpace(doc, y, height + CHART_GAP);
  syncCursor(doc, y);

  SVGtoPDF(doc, svg, PAGE_MARGIN, y, {
    width,
    height,
    preserveAspectRatio: "xMidYMid meet",
  });

  const nextY = y + height + CHART_GAP;
  syncCursor(doc, nextY);
  return nextY;
}

function drawClosing(doc: PDFDoc, y: number): void {
  y = ensureSpace(doc, y + SECTION_GAP, FOOTER_BLOCK_HEIGHT);
  syncCursor(doc, y);
  doc.fillColor(TEXT).font("Helvetica").fontSize(10);
  doc.text("Best Regards,", PAGE_MARGIN, y, { width: CONTENT_WIDTH, lineBreak: false });
  doc.text("EMS Team", PAGE_MARGIN, y + 16, { width: CONTENT_WIDTH, lineBreak: false });
}

export async function renderDailyReportPdf(
  payload: DailyReportPayload,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = PAGE_MARGIN;

    y = drawParagraph(doc, y, "Dear All,");
    y = drawParagraph(
      doc,
      y,
      "Daily power and gas consumption summary are listed below for your information.",
    );

    const summaryCols: TableColumn[] = [
      { label: "Date", width: 54 },
      { label: "Avg outdoor temp", width: 62 },
      { label: "Ballroom utilization", width: 64 },
      { label: "Hotel occupancy", width: 60 },
      {
        label: "Total gas consumption\n(1 unit = 100ft³)",
        width: 92,
      },
      { label: "Park (kWh)", width: 58 },
      { label: "Hotel (kWh)", width: 58 },
      { label: "CCP (kWh)", width: 57 },
    ];

    const s = payload.summaryRow;
    y = drawTable(doc, y, summaryCols, [
      [
        s.date,
        s.outdoorTempC != null ? formatTempC(s.outdoorTempC) : "—",
        s.ballroomUtilizationPct != null
          ? formatPct(s.ballroomUtilizationPct)
          : "—",
        s.hotelOccupancyPct != null ? formatPct(s.hotelOccupancyPct) : "—",
        s.gasUnits != null
          ? `${formatReportNumber(s.gasUnits)} Units`
          : "—",
        formatReportNumber(s.parkKwh),
        formatReportNumber(s.hotelKwh),
        formatReportNumber(s.ccpKwh),
      ],
    ]);

    y = drawSectionTitle(doc, y, "1. Daily Power Consumption of Theme Park & Hotel");
    if (payload.yoyChangePct != null) {
      y = drawYoYSentence(doc, y, payload.yoyChangePct);
    }

    const powerCols: TableColumn[] = [
      { label: "Area", width: 88 },
      {
        label: "Previous year daily usage (kWh) [Park OPEN]",
        width: 142,
        align: "right",
      },
      {
        label: "Current year daily usage (kWh) [Park OPEN]",
        width: 142,
        align: "right",
      },
      { label: "Difference in %", width: 135, align: "right" },
    ];

    y = drawTable(doc, y, powerCols, [
      ["Date", payload.priorYearDateLabel, payload.dateLabel, ""],
      ...payload.powerComparisonRows.map((row) => [
        row.area,
        row.previousKwh != null ? formatReportNumber(row.previousKwh) : "—",
        formatReportNumber(row.currentKwh),
        row.differencePct,
      ]),
    ]);

    if (payload.parkVsHotelChart.data.length > 0) {
      y = drawSvgChart(doc, y, parkVsHotelChartSvg(payload.parkVsHotelChart));
    }

    y = drawSectionTitle(doc, y, "2. Daily kWh of DHH, DLH, DEL");
    y = drawTable(
      doc,
      y,
      [
        { label: "Date", width: 127 },
        { label: "DHH kWh", width: 127, align: "right" },
        { label: "DLH kWh", width: 127, align: "right" },
        { label: "DEL kWh", width: 126, align: "right" },
      ],
      [
        [
          payload.dateLabel,
          formatReportNumber(payload.hotelsTable.dhh),
          formatReportNumber(payload.hotelsTable.dlh),
          formatReportNumber(payload.hotelsTable.del),
        ],
      ],
      9,
    );

    if (payload.hotelsKwhChart.data.length > 0) {
      y = drawSvgChart(doc, y, hotelsKwhChartSvg(payload.hotelsKwhChart));
    }

    y = drawSectionTitle(doc, y, "3. Daily Gas Consumption of HCCP");
    if (payload.hccpGasDailyTable) {
      y = drawHccpGasDailyTable(doc, y, payload.hccpGasDailyTable);
    }
    if (payload.hccpGasChart.data.length > 0) {
      y = drawSvgChart(doc, y, hccpGasChartSvg(payload.hccpGasChart));
    }

    y = drawSectionTitle(
      doc,
      y,
      "4. Daily Solar Energy Feed-in Tariff of HCCP & Theme Park",
    );
    if (payload.solarDailyTable) {
      y = drawSolarDailyTable(doc, y, payload.solarDailyTable);
    }
    if (payload.solarGenerationTrendChart.data.length > 0) {
      y = drawSvgChart(
        doc,
        y,
        solarGenerationChartSvg(payload.solarGenerationTrendChart),
      );
    }

    y = drawSectionTitle(doc, y, "5. Theme Park CCP1 kWh");
    if (payload.ccpComparisonChart) {
      const chart = payload.ccpComparisonChart;
      const gap = 12;
      const panelWidth = Math.floor((CONTENT_WIDTH - gap) / 2);
      const panelHeight = 240;

      const yAfterLeftTable = drawCcpPanelSummaryTable(
        doc,
        y,
        PAGE_MARGIN,
        panelWidth,
        chart.leftPanel,
        chart.granularity,
      );
      const yAfterRightTable = drawCcpPanelSummaryTable(
        doc,
        y,
        PAGE_MARGIN + panelWidth + gap,
        panelWidth,
        chart.rightPanel,
        chart.granularity,
      );
      y = Math.max(yAfterLeftTable, yAfterRightTable);

      const leftSvg = ccpComparisonPanelChartSvg(
        chart.leftPanel,
        chart.axis,
        "#1d70b8",
        "#ea580c",
        panelWidth,
        panelHeight,
      );
      const rightSvg = ccpComparisonPanelChartSvg(
        chart.rightPanel,
        chart.axis,
        "#ca8a04",
        "#fcd34d",
        panelWidth,
        panelHeight,
      );
      y = drawSideBySideSvgCharts(doc, y, leftSvg, rightSvg, panelWidth, gap);
    }

    y = drawSectionTitle(doc, y, "6. Theme Park Top 10 Daily kWh");
    if (payload.top10BuildingChart && payload.top10BuildingChart.data.length > 0) {
      y = drawTop10BuildingSummaryTable(doc, y, payload.top10BuildingChart);
      const top10Svg = top10BuildingChartSvg(payload.top10BuildingChart);
      const { height: top10Height } = svgLayoutSize(top10Svg, CONTENT_WIDTH);
      y = ensureSpace(doc, y, top10Height + CHART_GAP + FOOTER_BLOCK_HEIGHT);
      y = drawSvgChart(doc, y, top10Svg);
    }

    drawClosing(doc, y);

    doc.end();
  });
}
