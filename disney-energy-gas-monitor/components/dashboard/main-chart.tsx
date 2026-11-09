"use client";

import { CcpComparisonChartPanel } from "@/components/dashboard/ccp-comparison-chart";
import { Top10BuildingChartPanel } from "@/components/dashboard/top10-building-chart";
import { ComparisonChart } from "@/components/dashboard/comparison-chart";
import { ElectricityChart } from "@/components/dashboard/electricity-chart";
import { GasChart } from "@/components/dashboard/gas-chart";
import { HccpGasChartPanel } from "@/components/dashboard/hccp-gas-chart";
import { HotelsKwhChartPanel } from "@/components/dashboard/hotels-kwh-chart";
import { ParkVsHotelElectricityChart } from "@/components/dashboard/park-vs-hotel-chart";
import { hccpGasChartTitle } from "@/lib/hccp-gas-chart";
import { hotelsKwhChartTitle } from "@/lib/hotels-kwh-chart";
import { parkVsHotelChartTitle } from "@/lib/park-vs-hotel-chart";
import { SolarGenerationChart } from "@/components/dashboard/solar-generation-chart";
import { solarGenerationChartTitle } from "@/lib/solar-generation-trend-chart";
import { CustomGraphPanel } from "@/components/dashboard/custom-graph/custom-graph-panel";
import { TOP10_CHART_TITLE } from "@/lib/top10-building-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  EnergyApiResponse,
  MetricView,
  ParkVsHotelChartGranularity,
  TimePreset,
} from "@/lib/types";

interface MainChartProps {
  data: EnergyApiResponse;
  metric: MetricView;
  timePreset: TimePreset;
  energyQueryString: string;
  customRangeReady: boolean;
}

function chartTitle(
  metric: MetricView,
  timePreset: TimePreset,
  data: EnergyApiResponse,
): string {
  const granularity =
    timePreset === "day"
      ? "last 30 days"
      : timePreset === "month"
        ? "last 12 months"
        : timePreset === "ytd"
          ? "by year"
          : timePreset === "custom"
            ? "selected range"
            : "monthly";

  switch (metric) {
    case "electricity":
      return `Electricity Usage (${granularity})`;
    case "gas":
      return `Gas Consumption (${granularity})`;
    case "compare":
      return `Electricity vs Gas (${granularity})`;
    case "ccp-kwh":
      return "CCP1 consumption vs outdoor temperature (year over year)";
    case "top-10":
      return TOP10_CHART_TITLE;
    case "solar":
      return trendChartTitle(
        timePreset,
        data.primary.solarGenerationTrendChart?.granularity,
        solarGenerationChartTitle,
      );
    case "park-vs-hotel":
      return trendChartTitle(
        timePreset,
        data.primary.parkVsHotelChart?.granularity,
        parkVsHotelChartTitle,
      );
    case "hotels-kwh":
      return trendChartTitle(
        timePreset,
        data.primary.hotelsKwhChart?.granularity,
        hotelsKwhChartTitle,
      );
    case "hccp-gas":
      return trendChartTitle(
        timePreset,
        data.primary.hccpGasChart?.granularity,
        hccpGasChartTitle,
      );
    case "custom":
      return "Custom graph";
  }
}

function trendChartTitle(
  timePreset: TimePreset,
  chartGranularity: ParkVsHotelChartGranularity | undefined,
  titleForGranularity: (
    g: ParkVsHotelChartGranularity,
  ) => string,
): string {
  if (timePreset === "custom") {
    return titleForGranularity(chartGranularity ?? "daily");
  }
  if (timePreset === "day") return titleForGranularity("daily");
  if (timePreset === "month") return titleForGranularity("monthly");
  return titleForGranularity("yearly");
}

function trendMetricEmptyState(title: string) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="py-8 text-center text-sm text-slate-600">
        Chart data is not available for this selection.
      </CardContent>
    </Card>
  );
}

export function MainChart({
  data,
  metric,
  timePreset,
  energyQueryString,
  customRangeReady,
}: MainChartProps) {
  const title = chartTitle(metric, timePreset, data);
  const comparisonChart = data.comparison?.chart;
  const breakdown = data.primary.dailyBreakdown;

  switch (metric) {
    case "electricity":
      return (
        <ElectricityChart
          chart={data.primary.chart}
          title={title}
          comparisonChart={comparisonChart}
          breakdown={breakdown}
        />
      );
    case "gas":
      return (
        <GasChart
          chart={data.primary.chart}
          title={title}
          comparisonChart={comparisonChart}
          breakdown={breakdown}
        />
      );
    case "solar":
      if (data.primary.solarGenerationTrendChart) {
        return (
          <SolarGenerationChart chart={data.primary.solarGenerationTrendChart} />
        );
      }
      return trendMetricEmptyState(title);
    case "park-vs-hotel":
      if (data.primary.parkVsHotelChart) {
        return (
          <ParkVsHotelElectricityChart chart={data.primary.parkVsHotelChart} />
        );
      }
      return trendMetricEmptyState(title);
    case "hotels-kwh":
      if (data.primary.hotelsKwhChart) {
        return <HotelsKwhChartPanel chart={data.primary.hotelsKwhChart} />;
      }
      return trendMetricEmptyState(title);
    case "hccp-gas":
      if (data.primary.hccpGasChart) {
        return <HccpGasChartPanel chart={data.primary.hccpGasChart} />;
      }
      return trendMetricEmptyState(title);
    case "ccp-kwh":
      if (data.primary.ccpComparisonChart) {
        return (
          <CcpComparisonChartPanel chart={data.primary.ccpComparisonChart} />
        );
      }
      return trendMetricEmptyState(title);
    case "top-10":
      if (data.primary.top10BuildingChart) {
        return (
          <Top10BuildingChartPanel chart={data.primary.top10BuildingChart} />
        );
      }
      return trendMetricEmptyState(title);
    case "custom":
      return <CustomGraphPanel />;
    case "compare":
    default:
      return (
        <ComparisonChart
          chart={data.primary.chart}
          title={title}
          comparisonChart={comparisonChart}
          breakdown={breakdown}
        />
      );
  }
}
