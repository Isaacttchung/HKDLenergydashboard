import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { getDailyContext } from "@/lib/daily-context";
import { buildCcpComparisonChart } from "@/lib/ccp-comparison-chart";
import { buildDailyBreakdown } from "@/lib/executive-summary";
import { buildHccpGasChart } from "@/lib/hccp-gas-chart";
import { buildHotelsKwhChart } from "@/lib/hotels-kwh-chart";
import { buildParkVsHotelChart } from "@/lib/park-vs-hotel-chart";
import { buildSolarGenerationTrendChart } from "@/lib/solar-generation-trend-chart";
import { buildTop10BuildingChart } from "@/lib/top10-building-chart";
import {
  formatReportDate,
  priorYearIsoDate,
} from "@/lib/daily-report/format";
import {
  buildPowerComparisonRows,
  type PowerComparisonRow,
} from "@/lib/daily-report/power-comparison";
import {
  buildHccpGasDailyTable,
  buildSolarDailyTable,
  type HccpGasDailyTable,
  type SolarDailyTable,
} from "@/lib/daily-report/section-tables";
import {
  buildResortYoYSentence,
  resolveResortYoYChangePct,
} from "@/lib/daily-report/yoy";
import { hasDailyReportData, hasResortGasReading } from "@/lib/reporting-date";
import type { DailyContext } from "@/lib/daily-context";
import type {
  CcpComparisonChart,
  DailyBreakdown,
  HccpGasChart,
  HotelsKwhChart,
  ParkVsHotelChart,
  SolarGenerationTrendChart,
  Top10BuildingChart,
} from "@/lib/types";

export interface DailyReportSummaryRow {
  date: string;
  outdoorTempC?: number;
  ballroomUtilizationPct?: number;
  hotelOccupancyPct?: number;
  gasUnits?: number;
  parkKwh: number;
  hotelKwh: number;
  ccpKwh: number;
}

export interface DailyReportPayload {
  date: string;
  dateLabel: string;
  priorYearDate: string;
  priorYearDateLabel: string;
  context: DailyContext | null;
  breakdown: DailyBreakdown;
  priorBreakdown: DailyBreakdown | null;
  summaryRow: DailyReportSummaryRow;
  yoySentence: string | null;
  yoyChangePct: number | null;
  powerComparisonRows: PowerComparisonRow[];
  hotelsTable: { dhh: number; dlh: number; del: number };
  parkVsHotelChart: ParkVsHotelChart;
  hotelsKwhChart: HotelsKwhChart;
  hccpGasChart: HccpGasChart;
  solarGenerationTrendChart: SolarGenerationTrendChart;
  ccpComparisonChart: CcpComparisonChart | null;
  top10BuildingChart: Top10BuildingChart | null;
  hccpGasDailyTable: HccpGasDailyTable | null;
  solarDailyTable: SolarDailyTable | null;
}

export async function buildDailyReportPayload(
  date: string,
): Promise<DailyReportPayload | null> {
  const store = getDataStore();
  const [records, solarIndex] = await Promise.all([
    store.getRecords(),
    store.getSolarInstallationIndex(),
  ]);

  if (!hasDailyReportData(records, date)) {
    return null;
  }

  const priorYearDate = priorYearIsoDate(date);
  const priorHasData = hasDailyReportData(records, priorYearDate);

  const breakdown = buildDailyBreakdown(records, date, solarIndex);
  if (hasResortGasReading(records, date)) {
    const context = await getDailyContext(date);
    if (context?.gasUnits !== undefined) {
      breakdown.gasUnits = context.gasUnits;
    }
  }

  const priorBreakdown = priorHasData
    ? buildDailyBreakdown(records, priorYearDate, solarIndex)
    : null;

  const context = await getDailyContext(date);
  const priorContext = priorHasData
    ? await getDailyContext(priorYearDate)
    : null;
  const contexts = await store.getDailyContexts();

  const yoyPct = resolveResortYoYChangePct(
    breakdown.resortElectricityTotal,
    priorBreakdown?.resortElectricityTotal ?? 0,
    context?.yoyChangePct,
  );

  const timePreset = "day" as const;
  const from = date;
  const to = date;

  const parkVsHotelChart = buildParkVsHotelChart(
    records,
    timePreset,
    from,
    to,
  );
  const hotelsKwhChart = buildHotelsKwhChart(records, timePreset, from, to);
  const hccpGasChart = buildHccpGasChart(contexts, timePreset, from, to);
  const solarGenerationTrendChart = buildSolarGenerationTrendChart(
    records,
    contexts,
    timePreset,
    from,
    to,
  );
  const ccpComparisonChart =
    buildCcpComparisonChart(records, contexts, timePreset, from, to) ?? null;

  const top10Data = await store.getTop10Data();
  const top10BuildingChart =
    buildTop10BuildingChart(top10Data?.meters, timePreset, from, to) ?? null;

  return {
    date,
    dateLabel: formatReportDate(date),
    priorYearDate,
    priorYearDateLabel: formatReportDate(priorYearDate),
    context,
    breakdown,
    priorBreakdown,
    summaryRow: {
      date: formatReportDate(date),
      outdoorTempC: context?.outdoorTempC,
      ballroomUtilizationPct: context?.ballroomUtilizationPct,
      hotelOccupancyPct: context?.hotelOccupancyPct,
      gasUnits: breakdown.gasUnits || context?.gasUnits,
      parkKwh: breakdown.park,
      hotelKwh: breakdown.hotelTotal,
      ccpKwh: breakdown.ccp,
    },
    yoySentence: yoyPct != null ? buildResortYoYSentence(yoyPct) : null,
    yoyChangePct: yoyPct,
    powerComparisonRows: buildPowerComparisonRows(breakdown, priorBreakdown),
    hotelsTable: {
      dhh: breakdown.dhh,
      dlh: breakdown.dlh,
      del: breakdown.del,
    },
    parkVsHotelChart,
    hotelsKwhChart,
    hccpGasChart,
    solarGenerationTrendChart,
    ccpComparisonChart,
    top10BuildingChart,
    hccpGasDailyTable: buildHccpGasDailyTable(
      date,
      priorYearDate,
      context,
      priorContext,
      breakdown.gasUnits,
    ),
    solarDailyTable: buildSolarDailyTable(date, breakdown, context),
  };
}
