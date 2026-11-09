import {
  buildPeriodCharts,
  computeTotals,
  filterRecords,
} from "@/lib/aggregations";
import { attachDelta } from "@/lib/comparisons";
import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { getDailyContext } from "@/lib/daily-context";
import {
  buildDailyBreakdown,
  resolveAggregationSources,
} from "@/lib/executive-summary";
import {
  hasDailyReportData,
  hasResortGasReading,
} from "@/lib/reporting-date";
import {
  applyPeriodContextToBreakdown,
  getPeriodContextSummary,
} from "@/lib/period-context";
import {
  buildCustomRangeReportSummary,
  buildMonthlyReportSummary,
  buildYearlyReportSummary,
} from "@/lib/period-report-summary";
import { resolveSourceIds, getScopeLabel } from "@/lib/taxonomy";
import { resolveChartDateRange } from "@/lib/chart-date-range";
import { buildCcpComparisonChart } from "@/lib/ccp-comparison-chart";
import { buildTop10BuildingChart } from "@/lib/top10-building-chart";
import { buildHccpGasChart } from "@/lib/hccp-gas-chart";
import { buildHotelsKwhChart } from "@/lib/hotels-kwh-chart";
import { buildParkVsHotelChart } from "@/lib/park-vs-hotel-chart";
import { buildSolarGenerationTrendChart } from "@/lib/solar-generation-trend-chart";
import {
  DATA_MIN_DATE,
  resolveComparisonRange,
  resolveDateRange,
} from "@/lib/time-presets";
import type {
  DailyBreakdown,
  EnergyApiResponse,
  EnergyQueryParams,
  MetricView,
  PeriodContextSummary,
  PeriodData,
} from "@/lib/types";

async function enrichPeriodSummary<
  T extends {
    from: string;
    to: string;
    totals: DailyBreakdown;
    context?: PeriodContextSummary | null;
  },
>(summary: T): Promise<T> {
  const context = await getPeriodContextSummary(summary.from, summary.to);
  return {
    ...summary,
    context,
    totals: applyPeriodContextToBreakdown(summary.totals, context),
  };
}

async function buildPeriodData(
  records: Parameters<typeof filterRecords>[0],
  sourceIds: string[],
  from: string,
  to: string,
  metric: MetricView,
  timePreset: EnergyQueryParams["timePreset"] = "ytd",
): Promise<PeriodData> {
  const aggregationSources = resolveAggregationSources(sourceIds);
  const filtered = filterRecords(records, aggregationSources, from, to);
  const totals = computeTotals(filtered);

  const chartWindow = resolveChartDateRange(
    timePreset ?? "ytd",
    from,
    to,
    DATA_MIN_DATE,
  );
  const chartFrom = chartWindow?.from ?? from;
  const chartTo = chartWindow?.to ?? to;
  const chartRecords = filterRecords(
    records,
    aggregationSources,
    chartFrom,
    chartTo,
  );
  const { chart, solarChart } = buildPeriodCharts(
    chartRecords,
    timePreset ?? "ytd",
    chartFrom,
    chartTo,
    chartWindow != null,
  );

  const result: PeriodData = { totals, metric, chart, solarChart };

  if (
    timePreset === "day" ||
    timePreset === "month" ||
    timePreset === "ytd" ||
    timePreset === "custom"
  ) {
    const contexts = await getDataStore().getDailyContexts();
    result.parkVsHotelChart = buildParkVsHotelChart(
      records,
      timePreset,
      from,
      to,
    );
    result.hotelsKwhChart = buildHotelsKwhChart(
      records,
      timePreset,
      from,
      to,
    );
    result.hccpGasChart = buildHccpGasChart(
      contexts,
      timePreset,
      from,
      to,
    );
    result.solarGenerationTrendChart = buildSolarGenerationTrendChart(
      records,
      contexts,
      timePreset,
      from,
      to,
    );
    const ccpComparison = buildCcpComparisonChart(
      records,
      contexts,
      timePreset,
      from,
      to,
    );
    if (ccpComparison) {
      result.ccpComparisonChart = ccpComparison;
    }

    const top10Data = await getDataStore().getTop10Data();
    const top10Chart = buildTop10BuildingChart(
      top10Data?.meters,
      timePreset,
      from,
      to,
    );
    if (top10Chart) {
      result.top10BuildingChart = top10Chart;
    }
  }

  if (timePreset === "day" && from === to) {
    if (hasDailyReportData(records, from)) {
      const solarIndex = await getDataStore().getSolarInstallationIndex();
      const breakdown = buildDailyBreakdown(records, from, solarIndex);
      if (hasResortGasReading(records, from)) {
        const context = await getDailyContext(from);
        if (context?.gasUnits !== undefined) {
          breakdown.gasUnits = context.gasUnits;
        }
      }
      result.dailyBreakdown = breakdown;
    }
  }

  if (
    timePreset === "month" ||
    timePreset === "ytd" ||
    timePreset === "custom"
  ) {
    const solarIndex = await getDataStore().getSolarInstallationIndex();
    if (timePreset === "month") {
      const summary = buildMonthlyReportSummary(
        records,
        from,
        to,
        solarIndex,
      );
      result.monthlyReportSummary = await enrichPeriodSummary(summary);
    }
    if (timePreset === "ytd") {
      const summary = buildYearlyReportSummary(
        records,
        from,
        to,
        solarIndex,
      );
      result.yearlyReportSummary = await enrichPeriodSummary(summary);
    }
    if (timePreset === "custom") {
      const summary = buildCustomRangeReportSummary(
        records,
        from,
        to,
        solarIndex,
      );
      result.customRangeReportSummary = await enrichPeriodSummary(summary);
    }
  }

  return result;
}

export async function getEnergyData(
  params: EnergyQueryParams & {
    groupIds?: string[];
    buildingIds?: string[];
  },
): Promise<EnergyApiResponse> {
  const store = getDataStore();
  const records = await store.getRecords();

  const timePreset = params.timePreset ?? "ytd";
  const metric = params.metric ?? "compare";
  const { from, to } = resolveDateRange(
    timePreset,
    params.from,
    params.to,
    params.singleDay ?? params.from,
    params.selectedMonth,
    params.selectedYear,
  );

  const sourceIds =
    params.sourceIds ??
    resolveSourceIds(params.groupIds, params.buildingIds);

  const primary = await buildPeriodData(
    records,
    sourceIds,
    from,
    to,
    metric,
    timePreset,
  );

  const response: EnergyApiResponse = {
    primary,
    scopeLabel: getScopeLabel(params.groupIds, params.buildingIds),
  };

  if (params.compare) {
    const compareType = params.compareType ?? "year";
    const comparisonRange = resolveComparisonRange(
      compareType,
      from,
      to,
      params.compareFrom,
      params.compareTo,
    );

    const comparisonBase = await buildPeriodData(
      records,
      sourceIds,
      comparisonRange.from,
      comparisonRange.to,
      metric,
      timePreset,
    );

    response.comparison = attachDelta(comparisonBase, primary.totals);
  }

  return response;
}
