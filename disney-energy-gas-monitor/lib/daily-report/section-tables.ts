import { format, parseISO } from "date-fns";
import { formatIsoMonthShort } from "@/lib/date-display";
import { formatReportNumber, formatYoYDifferencePct } from "@/lib/daily-report/format";
import type { DailyContext } from "@/lib/daily-context";
import type {
  CcpComparisonPanel,
  CcpComparisonPoint,
  DailyBreakdown,
  ParkVsHotelChartGranularity,
  Top10BuildingChart,
} from "@/lib/types";

export interface HccpGasDailyTable {
  dateLabel: string;
  priorYear: string;
  currentYear: string;
  previousGas: number | null;
  currentGas: number | null;
  differencePct: string;
}

export interface SolarDailyTable {
  dateLabel: string;
  totalKwh: number;
  sunshineHours: number | null;
}

export function buildHccpGasDailyTable(
  date: string,
  priorYearDate: string,
  currentContext: DailyContext | null,
  priorContext: DailyContext | null,
  breakdownGasUnits?: number,
): HccpGasDailyTable | null {
  const currentGas = currentContext?.gasUnits ?? breakdownGasUnits ?? null;
  const previousGas = priorContext?.gasUnits ?? null;

  if (currentGas == null && previousGas == null) {
    return null;
  }

  return {
    dateLabel: format(parseISO(date), "d-MMM"),
    priorYear: priorYearDate.slice(0, 4),
    currentYear: date.slice(0, 4),
    previousGas,
    currentGas,
    differencePct:
      previousGas != null && currentGas != null
        ? formatYoYDifferencePct(currentGas, previousGas)
        : "—",
  };
}

export function buildSolarDailyTable(
  date: string,
  breakdown: DailyBreakdown,
  context: DailyContext | null,
): SolarDailyTable | null {
  const totalKwh = breakdown.solarTotal;
  if (totalKwh <= 0 && context?.sunshineHours == null) {
    return null;
  }

  return {
    dateLabel: format(parseISO(date), "M/d/yyyy"),
    totalKwh,
    sunshineHours: context?.sunshineHours ?? null,
  };
}

export function formatSolarTableTotal(kwh: number): string {
  return formatReportNumber(kwh);
}

export function formatSolarTableSunshine(hours: number | null): string {
  if (hours == null) return "—";
  return hours.toLocaleString("en-HK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatGasTableUnits(value: number | null): string {
  if (value == null) return "—";
  return formatReportNumber(value);
}

export function ccpPanelColumnHeader(
  point: CcpComparisonPoint,
  granularity: ParkVsHotelChartGranularity,
): string {
  if (granularity === "daily") {
    return `Sum of ${format(parseISO(point.period), "dd-MMM-yyyy")}`;
  }
  if (granularity === "monthly") {
    return `Sum of ${formatIsoMonthShort(point.period)}`;
  }
  return `Sum of ${point.label}`;
}

export function buildCcpPanelTableRows(
  panel: CcpComparisonPanel,
  granularity: ParkVsHotelChartGranularity,
): { headerLabels: string[]; rows: string[][] } {
  const headerLabels = panel.data.map((point) =>
    ccpPanelColumnHeader(point, granularity),
  );
  const kwhRow = panel.data.map((point) => formatReportNumber(point.ccpKwh));
  const tempRow = panel.data.map((point) =>
    point.outdoorTempC != null
      ? point.outdoorTempC.toLocaleString("en-HK", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—",
  );
  return {
    headerLabels,
    rows: [
      ["Sum CCP1", ...kwhRow],
      ["°C", ...tempRow],
    ],
  };
}

export function buildTop10BuildingTableRows(
  chart: Top10BuildingChart,
): { headerLabels: string[]; rows: string[][] } | null {
  if (chart.data.length === 0 || chart.series.length === 0) {
    return null;
  }

  const headerLabels = chart.data.map((row) => row.fullLabel || row.label);
  const rows = chart.series.map((series) => [
    series.name,
    ...chart.data.map((row) =>
      formatReportNumber(Number(row[series.dataKey] ?? 0)),
    ),
  ]);

  return { headerLabels, rows };
}
